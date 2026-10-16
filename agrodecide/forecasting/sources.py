"""Official downloads, immutable originals and publication-aware ENFEN vintages.

No retrospective release date is fabricated for a current, revised monthly file.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, urlparse,parse_qs
import json
import re
import unicodedata
import pandas as pd
import requests
from lxml import html
from pypdf import PdfReader
from agrodecide.v4.storage import DATA, now, atomic_json, replace

HOME = 'https://enfen.imarpe.gob.pe/'
ICEN = 'http://met.igp.gob.pe/datos/ICEN.txt'
MONTHS = dict(zip(['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],range(1,13)))
MONTHS['setiembre']=9
ROOT = DATA/'forecasting'

def plain(text):
    return ''.join(c for c in unicodedata.normalize('NFD',text.lower()) if unicodedata.category(c)!='Mn')

def get(url, offline=False, method='GET'):
    if urlparse(url).hostname not in {'enfen.imarpe.gob.pe','met.igp.gob.pe','www.emmsa.com.pe','estadisticas.bcrp.gob.pe','www.senamhi.gob.pe','siofen.imarpe.gob.pe','www.cpc.ncep.noaa.gov','cpc.ncep.noaa.gov'}:
        raise ValueError('Fuente fuera del catálogo oficial')
    key=sha256((method+url).encode()).hexdigest()
    manifest=ROOT/'cache'/f'{key}.json'
    if manifest.exists():
        info=json.loads(manifest.read_text(encoding='utf-8'))
        f=DATA/info['file']
        if f.exists() and sha256(f.read_bytes()).hexdigest()==info['sha256']:
            # Catalogs can refresh; dated PDFs are immutable local snapshots.
            if offline or info['retrieved_at'][:10]==str(now().date()) or info.get('pdf'):
                return f.read_bytes(),{**info,'cache_hit':True}
    if offline: raise FileNotFoundError('Sin caché oficial íntegra')
    r=requests.request(method,url,timeout=(10,45));r.raise_for_status()
    digest=sha256(r.content).hexdigest();suffix='.pdf' if r.content.startswith(b'%PDF') else '.raw'
    file=Path('bronze')/'forecasting'/(digest+suffix)
    (DATA/file).parent.mkdir(parents=True,exist_ok=True);(DATA/file).write_bytes(r.content)
    info={'url':url,'final_url':r.url,'sha256':digest,'file':file.as_posix(),'retrieved_at':now().isoformat(),'pdf':suffix=='.pdf','cache_hit':False}
    atomic_json(manifest,info)
    return r.content,info

def bulletin_date(text):
    # Date printed by ENFEN, never inferred from archive order or HTTP Last-Modified.
    clean=plain(' '.join(text.split()))
    match=re.search(r'\b(\d{1,2})\s+(?:de\s+)?('+ '|'.join(MONTHS)+r')\s+(?:de(?:l)?\s+)?(20\d{2})\b',clean[:1800])
    if not match: raise ValueError('No se pudo verificar la fecha de emisión impresa')
    day,month,year=match.groups()
    return pd.Timestamp(int(year),MONTHS[month],int(day))

def parse_bulletin(content, info, page_url):
    doc=PdfReader(BytesIO(content))
    text=' '.join((p.extract_text() or '') for p in doc.pages)
    clean=plain(' '.join(text.split()))
    date=bulletin_date(text)
    head=clean[:1800]
    match=re.search(r'estado\s+del\s+sistema\s+de\s+alerta\s*:?\s*["“”]?\s*(vigilancia de (?:el nino|la nina)(?: coster[oa])?|alerta de (?:el nino|la nina)(?: coster[oa])?|no activo|no activ[oa]|inactivo)',head)
    if not match:
        match=re.search(r'\b(vigilancia de (?:el nino|la nina)(?: coster[oa])?|alerta de (?:el nino|la nina)(?: coster[oa])?|no activo|no activ[oa]|inactivo)\b',head[:900])
    if not match: raise ValueError('Alerta no reconocida en la cabecera; requiere revisión')
    alert=match.group(1)
    if date>pd.Timestamp(now().date()): raise ValueError('Comunicado con fecha futura')
    method='ENFEN 02-2026' if date>=pd.Timestamp('2026-02-05') else 'ENFEN 02-2024' if date>=pd.Timestamp('2024-12-11') else 'ENFEN 01-2015'
    identifier=parse_qs(urlparse(info['url']).query).get('ind',[''])[0]
    version_day=None
    if re.fullmatch(r'\d{13}',identifier):
        version_day=pd.Timestamp(int(identifier),unit='ms',tz='UTC').tz_convert('America/Lima').tz_localize(None).normalize()
        if version_day>pd.Timestamp(now().date()):version_day=None
    eligible=version_day is not None
    available=max(date,version_day)+pd.Timedelta(days=1) if eligible else pd.Timestamp(info['retrieved_at'][:10])
    return {'periodo_observacion':str(date.date()),'indice':'ALERTA_ENFEN','valor':None,
            'region_oceanica':'Nino 1+2','clasificacion':alert,'metodologia':method,
            'version_metodologica':method,'fuente':'ENFEN','source_url':page_url,'download_url':info['url'],
            'fecha_publicacion':str(date.date()),
            'fecha_disponibilidad':str(available.date()),'file_version_date':str(version_day.date()) if eligible else None,
            'availability_basis':'Máximo de fecha impresa y fecha de la versión de archivo indicada por el identificador público ind (epoch ms), más 1 día. Reconstrucción conservadora; no es un log certificado de primera publicación.',
            'tipo_registro':'alerta oficial publicada, versión de archivo recuperada','vintage_eligible':eligible,
            'sha256':info['sha256'],'archivo_origen':info['file'],'fecha_actualizacion':info['retrieved_at'],'retrieval_cache_hit':info.get('cache_hit',False),
            'text_excerpt':text[:800]}

def enfen(offline=False):
    links=set();failures=[]
    # Published archive paginator, discovered from the official page, 10 documents/page.
    for page in range(1,27):
        try:
            data,_=get(HOME+'?wpdmtask=get_downloads&cp='+str(page),offline)
            tree=html.fromstring(data)
            for link in tree.xpath('//a[contains(@href,"/download/")]/@href'):
                if 'comunicado-oficial' in link and re.search(r'20(?:1[89]|2[0-6])',link):links.add(link)
        except Exception as exc: failures.append({'page':page,'error':str(exc)})
    def download(link):
        try:
            raw,_=get(link,offline);tree=html.fromstring(raw)
            candidates=tree.xpath('//a[contains(@href,"wpdmdl")]/@href')
            if not candidates:raise ValueError('Sin enlace público de descarga')
            content,info=get(urljoin(link,candidates[0]),offline)
            record=parse_bulletin(content,info,link)
            return record,None
        except Exception as exc:return None,{'url':link,'error':str(exc)}
    rows=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        for record,error in pool.map(download,sorted(links)):
            if record:rows.append(record)
            else:failures.append(error)
    rows.sort(key=lambda r:(r['fecha_disponibilidad'],r['source_url']))
    if not rows:raise RuntimeError('No se verificaron comunicados ENFEN fechados')
    result={'source':HOME,'retrieved_at':now().isoformat(),'rows':rows,'failures':failures,
            'note':'Alertas categóricas, no magnitudes ICEN ni predicciones de precio. Versiones de metodología separadas.'}
    atomic_json(ROOT/'sources'/'enfen.json',result)
    replace('enfen_vintages',pd.DataFrame(rows).drop(columns=['text_excerpt']))
    return result

def icen(offline=False):
    data,info=get(ICEN,offline)
    if not re.search(r'ENFEN[,\s(;]+2024',data.decode('utf-8')[:600]):raise ValueError('Cambió la versión metodológica del ICEN; no concatenar automáticamente')
    rows=[]
    for line in data.decode('utf-8').splitlines():
        m=re.fullmatch(r'\s*(\d{4})\s+(\d{1,2})\s+(-?\d+\.\d+)\s*',line)
        if not m:continue
        year,month,value=m.groups();period=pd.Timestamp(int(year),int(month),1)
        rows.append({'periodo_observacion':str(period.date()),'indice':'ICEN','valor':float(value),
            'region_oceanica':'Nino 1+2','clasificacion':None,'metodologia':'ENFEN 01-2024 / ERSSTv5 / climatología 1991-2020',
            'version_metodologica':'2024','fuente':'IGP, enlace oficial SIOFEN IMARPE','source_url':ICEN,
            'fecha_publicacion':None,'fecha_disponibilidad':info['retrieved_at'][:10],
            'tipo_registro':'histórico revisado, vintage recuperado hoy','vintage_eligible':False,
            'sha256':info['sha256'],'fecha_actualizacion':info['retrieved_at']})
    if len(rows)<24:raise ValueError('Serie ICEN vacía o esquema cambiado')
    result={'rows':rows,'metadata':info,'model_use':False,
            'reason':'Sin archivo de vintages con fechas de publicación originales. No apto para backtest operacional.'}
    atomic_json(ROOT/'sources'/'icen.json',result);replace('ocean_indices',pd.DataFrame(rows))
    return result

def bcrp(offline=False):
    rows=[];catalog=[]
    # Codes verified against official BCRP catalog, never inferred from descriptions.
    for code in ['PN01210PM','PN01271PM','PN01313PM','PN01368PM']:
        url=f'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/{code}/json/2018-1/{now():%Y-%m}/ing'
        try:
            raw,info=get(url,offline);js=json.loads(raw);name=js['config']['series'][0]['name'];count=0
            for record in js['periods']:
                try:period=pd.to_datetime(record['name'],format='%b.%Y');value=float(record['values'][0])
                except (ValueError,TypeError):continue
                if not pd.notna(value):continue
                rows.append({'variable':code,'descripcion':name,'periodo_observacion':str(period.date()),'valor':value,
                    'fecha_publicacion':None,'fecha_disponibilidad':info['retrieved_at'][:10],
                    'vintage_eligible':False,'source_url':url,'sha256':info['sha256'],'fecha_actualizacion':info['retrieved_at']});count+=1
            catalog.append({'code':code,'description':name,'rows':count,'metadata':info,'state':'CACHE' if info.get('cache_hit') else 'LIVE','url':url})
        except Exception as exc:catalog.append({'code':code,'state':'NO DISPONIBLE','url':url,'error':str(exc)})
    result={'rows':rows,'catalog':catalog,'model_use':False,'reason':'API actual revisable, no entrega fechas originales por dato. Requiere vintages publicados/importación fechada.'}
    atomic_json(ROOT/'sources'/'macro.json',result)
    if rows:replace('macro_vintages',pd.DataFrame(rows))
    return result

def emmsa(offline=False):
    url='https://www.emmsa.com.pe/estadistica/estBoletines/controller/bol_semanal.php?op=listar'
    data,info=get(url,offline,method='POST');js=json.loads(data)
    links=[]
    for period,month,anchor in js['aaData']:
        for link in html.fromstring(anchor).xpath('//a/@href'):
            links.append({'period':period,'month':month,'url':link})
    if not links:raise ValueError('Catálogo EMMSA sin boletines')
    result={'catalog':links,'metadata':info,'state':'CACHE' if info.get('cache_hit') else 'LIVE',
            'note':'Boletines semanales oficiales. No se mezclan promedios semanales con precios diarios SISAP.'}
    atomic_json(ROOT/'sources'/'emmsa.json',result)
    return result

def central(offline=False):
    rows=[];catalog=[]
    for code,url in [('ONI_ERSSTv5','https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v5/'),('RONI_ERSSTv6','https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/')]:
        try:
            raw,info=get(url,offline);tree=html.fromstring(raw);count=0
            version=code.rsplit('v',1)[-1]
            if not re.search(r'ERSST[.\s]*v?'+version,tree.text_content(),re.I):raise ValueError('Cambió la versión ERSST; requiere un adaptador separado')
            for tr in tree.xpath('//tr'):
                cells=[' '.join(c.text_content().split()) for c in tr.xpath('./td|./th')]
                if len(cells)<2 or not re.fullmatch(r'(?:19|20)\d{2}',cells[0]):continue
                year=int(cells[0])
                for month,cell in enumerate(cells[1:13],1):
                    try:value=float(cell.replace('−','-'))
                    except ValueError:continue
                    if value<=-90 or not pd.notna(value):continue
                    rows.append({'periodo_observacion':f'{year}-{month:02d}-01','indice':code,'valor':value,'region_oceanica':'Nino 3.4','metodologia':code,
                                 'fecha_publicacion':None,'fecha_disponibilidad':info['retrieved_at'][:10],'vintage_eligible':False,'tipo_registro':'histórico revisado recuperado hoy','source_url':url,'sha256':info['sha256']});count+=1
            if count<24:raise ValueError('Tabla central cambió o no contiene 24 periodos')
            catalog.append({'code':code,'rows':count,'url':url,'metadata':info,'state':'CACHE' if info.get('cache_hit') else 'LIVE'})
        except Exception as exc:catalog.append({'code':code,'url':url,'state':'NO DISPONIBLE','error':str(exc)})
    result={'rows':rows,'catalog':catalog,'model_use':False,'reason':'NOAA cambió el monitoreo operacional de ONI a RONI en febrero de 2026. ERSSTv5/v6 y metodología relativa se mantienen como series separadas; revisiones sin vintages no se retrofechan.'}
    atomic_json(ROOT/'sources'/'central.json',result)
    return result

def weather_catalog(offline=False):
    url='https://www.senamhi.gob.pe/site/descarga-datos/map_hist_data.php'
    raw,info=get(url,offline)
    try:text=raw.decode('utf-8')
    except UnicodeDecodeError:text=raw.decode('latin-1')
    match=re.search(r'(?:var|const|let)\s+stationList\s*=\s*(.*?);',text,re.S)
    if not match:raise ValueError('Cambió el catálogo de estaciones de SENAMHI')
    # Parse only object literals. Never execute the site's JavaScript.
    literal=re.sub(r'(?<=[{,])\s*([a-zA-Z_]\w*)\s*:',r'"\1":',match.group(1))
    literal=re.sub(r',\s*]',']',literal)
    stations=json.loads(literal);rows=[]
    for station in stations:
        code=str(station['codigo']);lat,lon=station['latlng']
        if not re.fullmatch(r'\d{6}',code) or not (-19.5<=lat<=1 and -82<=lon<=-68):raise ValueError('Estación fuera del contrato geográfico')
        rows.append({'code':code,'name':station['name'],'region':station['dep'],'latitude':lat,'longitude':lon,
                     'url':'https://www.senamhi.gob.pe/site/descarga-datos/descarga/?cod='+code})
    if len(rows)<20:raise ValueError('Catálogo meteorológico incompleto')
    result={'rows':rows,'metadata':info,'state':'CACHE' if info.get('cache_hit') else 'LIVE','model_use':False,
            'reason':'Catálogo de estaciones verificado. El portal de descarga incluye ingreso de usuario; el histograma público no entrega fechas diarias completas ni vintages. Importar archivos oficiales con estación, unidades, publicación y disponibilidad verificadas.'}
    atomic_json(ROOT/'sources'/'weather.json',result)
    return result

def run(offline=False):
    ROOT.mkdir(parents=True,exist_ok=True);status=[]
    for name,fn in [('icen',icen),('macro',bcrp),('emmsa',emmsa),('central',central),('weather',weather_catalog),('enfen',enfen)]:
        try:
            value=fn(offline);print(name,'OK',len(value.get('rows',value.get('catalog',[]))),flush=True)
            meta=value.get('metadata',{})
            hits=[r.get('retrieval_cache_hit') for r in value.get('rows',[]) if 'retrieval_cache_hit' in r]
            catalogs=value.get('catalog',[])
            states=[r.get('state') for r in catalogs if isinstance(r,dict) and r.get('state')]
            state='CACHE' if offline or meta.get('cache_hit') or (hits and all(hits)) or (states and all(s=='CACHE' for s in states)) else 'LIVE'
            if states and all(s=='NO DISPONIBLE' for s in states):state='NO DISPONIBLE'
            status.append({'source':name,'state':state,'records':len(value.get('rows',value.get('catalog',[]))),'failures':len(value.get('failures',[])),'checked_at':now().isoformat()})
        except Exception as exc:
            saved=ROOT/'sources'/f'{name}.json'
            status.append({'source':name,'state':'CACHE' if saved.exists() else 'NO DISPONIBLE','error':str(exc)})
            print(name,str(exc),flush=True)
    atomic_json(ROOT/'sources'/'status.json',{'at':now().isoformat(),'sources':status})
    return status

if __name__=='__main__':run()
