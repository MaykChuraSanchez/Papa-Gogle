"""Read-only official-source discovery helper, no application artifact mutation."""
from pathlib import Path
from urllib.parse import urljoin
from hashlib import sha256
from datetime import datetime,timezone
from io import BytesIO
import json
import sys
import requests
from lxml import html
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'docs/clima/originales'
URLS = {
    'senamhi_riesgo_catalog': 'https://www.senamhi.gob.pe/?p=riesgo-agro',
    'senamhi_boletines_catalog': 'https://www.senamhi.gob.pe/?p=boletines',
    'enfen_catalog': 'https://enfen.imarpe.gob.pe/?wpdmtask=get_downloads&cp=1',
    'noaa_diagnostic': 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml',
}

def retrieve(pdf=False):
    DEST.mkdir(parents=True, exist_ok=True)
    pdfs={
        'enfen_latest':'https://enfen.imarpe.gob.pe/download/comunicado-oficial-enfen-n-17-2026/?wpdmdl=2161&ind=1790780276174',
        'senamhi_papa_riesgo_2026_10':'https://www.senamhi.gob.pe/load/file/02954SENA-104.pdf',
        'senamhi_papa_agromet_latest':'https://www.senamhi.gob.pe/load/file/02949SENA-311.pdf',
        'senamhi_trimestre_2026_ond':'https://www.senamhi.gob.pe/load/file/02262SENA-76.pdf',
    }
    failures=[]
    for name,url in (pdfs if pdf else URLS).items():
        try:
            r=requests.get(url,timeout=(10,45));r.raise_for_status()
            if pdf and not r.content.startswith(b'%PDF'):
                raise ValueError('Se esperaba PDF oficial; se preserva versión anterior')
            timestamp=datetime.now(timezone.utc).isoformat()
            meta={'url':url,'final_url':r.url,'sha256':sha256(r.content).hexdigest(),'retrieved_at':timestamp,'status_code':r.status_code,'bytes':len(r.content)}
            previous=DEST/(name+'.metadata.json')
            if previous.exists():
                old=json.loads(previous.read_text(encoding='utf-8'))
                if old['sha256']==meta['sha256']:meta['first_retrieved_at']=old.get('first_retrieved_at',old['retrieved_at'])
            meta.setdefault('first_retrieved_at',timestamp)
            previous.write_text(json.dumps(meta,indent=2),encoding='utf-8')
            if r.content.startswith(b'%PDF'):
                (DEST/(name+'.pdf')).write_bytes(r.content)
                pages=[p.extract_text() or '' for p in PdfReader(BytesIO(r.content)).pages]
                (DEST/(name+'.txt')).write_text('\n\n'.join(f'PAGE {i+1}\n'+p for i,p in enumerate(pages)),encoding='utf-8')
                print(name,'PDF',len(r.content),'bytes',len(pages),'pages',meta['sha256'])
                continue
            (DEST/(name+'.html')).write_bytes(r.content)
            tree=html.fromstring(r.content)
            print(name, r.status_code, len(r.content))
            links=[{'title':' '.join(a.text_content().split()),'url':urljoin(url,a.get('href'))} for a in tree.xpath('//a[@href]') if any(k in a.get('href','') for k in ('load/file','download/comunicado'))]
            (DEST/(name+'_links.json')).write_text(json.dumps(links,ensure_ascii=False,indent=2),encoding='utf-8')
            print('Document links:',len(links))
        except Exception as exc:
            failures.append({'source':name,'error':str(exc)})
            print(name,type(exc).__name__,str(exc))
    return failures

if __name__=='__main__':
    if retrieve(pdf='--pdf' in sys.argv):raise SystemExit(1)
