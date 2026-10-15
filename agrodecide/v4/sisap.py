"""Public SISAP form adapter. No private Power BI API or authentication bypass."""
from hashlib import sha256
from pathlib import Path
import json
import re
import time
import pandas as pd
import requests
from lxml import html
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from .storage import DATA, atomic_json, now

BASE = 'http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/'
MARKET_ID = '15011501'
MARKET = 'Gran Mercado Mayorista de Lima'
VARIETIES = {'Papa Amarilla': 'Amarilla', 'Papa Blanca': 'Blanca', 'Papa Canchan': 'Canchán',
             'Papa Color': 'Color', 'Papa Huamantanga': 'Huamantanga', 'Papa Huayro': 'Huayro',
             'Papa Negra Andina': 'Negra Andina', 'Papa Peruanita': 'Peruanita',
             'Papa Unica': 'Única', 'Papa Yungay': 'Yungay', 'Papa Perricholi': 'Perricholi'}

class SchemaError(ValueError):
    pass

def number(text):
    text = text.strip().replace(',', '')
    if text in ('...', '-', '', 's/d'):
        return None
    if not re.fullmatch(r'\d+(\.\d+)?', text):
        raise SchemaError(f'Número no reconocido: {text!r}')
    return float(text)

def parse_prices(content, start, end, origin_file=''):
    tree = html.fromstring(content)
    tables = tree.xpath('//table')
    if len(tables) != 1:
        raise SchemaError('Se esperaba una tabla SISAP; no se publican datos vacíos o ambiguos.')
    trs = tables[0].xpath('./tr | ./tbody/tr')
    if len(trs) < 3:
        raise SchemaError('SISAP no devolvió observaciones')
    heads = trs[0].xpath('./td | ./th')
    labels = [' '.join(x.text_content().split()) for x in heads]
    if labels[0] != 'Fecha' or any(x not in VARIETIES for x in labels[1:]):
        raise SchemaError(f'Variedades o cabecera desconocida: {labels}')
    if any(x.get('colspan') != '2' for x in heads[1:]):
        raise SchemaError('Cambió el número de variables por variedad')
    metrics = [' '.join(x.text_content().split()) for x in trs[1].xpath('./td | ./th')]
    expected = ['Precio Promedio (S/. x Kg., S/. x Lt. o S/. x Unid.)', 'Volumen (t)'] * (len(labels)-1)
    if metrics != expected:
        raise SchemaError(f'Cambiaron métricas o unidades: {metrics}')
    rows = []
    lo, hi = pd.Timestamp(start), pd.Timestamp(end)
    for tr in trs[2:]:
        cells = [' '.join(c.text_content().split()) for c in tr.xpath('./td | ./th')]
        if len(cells) != 1 + 2*(len(labels)-1):
            raise SchemaError('Cambió el ancho de la tabla SISAP')
        day = pd.to_datetime(cells[0], format='%d/%m/%Y', errors='raise')
        if not lo <= day <= hi:
            raise SchemaError('Fecha fuera del intervalo solicitado')
        for i, product in enumerate(labels[1:]):
            price, volume = number(cells[1+2*i]), number(cells[2+2*i])
            if price is None:
                continue
            if not 0 < price <= 100 or (volume is not None and not 0 <= volume <= 100000):
                raise SchemaError('Precio o volumen fuera del contrato; revisar en cuarentena')
            rows.append(dict(fecha=day, producto='Papa', variedad=VARIETIES[product],
                             producto_original=product, precio_s_kg=price, volumen_t=volume,
                             mercado=MARKET, mercado_id=MARKET_ID, nivel='mayorista',
                             fuente='MIDAGRI SISAP', source_url=BASE+'resumenes/filtrar',
                             archivo_origen=origin_file))
    frame = pd.DataFrame(rows)
    if frame.empty or frame.duplicated(['fecha','variedad','mercado_id']).any():
        raise SchemaError('Respuesta vacía o duplicados en la clave de negocio')
    return frame

class Client:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers['User-Agent'] = 'AgroDecide/4.0 public agricultural research'
        retry = Retry(total=2, backoff_factor=1, status_forcelist=[429,500,502,503,504], allowed_methods=['GET','POST'])
        self.session.mount('http://', HTTPAdapter(max_retries=retry))
        self.token = None

    def connect(self):
        response = self.session.get(BASE+'resumenes/consultar/', timeout=(10,35))
        response.raise_for_status()
        tokens = html.fromstring(response.content).xpath('//form[@id="consulta"]//input[@name="postID"]/@value')
        if not tokens:
            raise SchemaError('Cambió el formulario de SISAP')
        self.token = tokens[0]

    def month(self, start, end, offline=False, refresh=False):
        key = f'{MARKET_ID}_{pd.Timestamp(start):%Y-%m}'
        cache = DATA/'cache'/'sisap'/f'{key}.json'
        if cache.exists() and not refresh:
            info = json.loads(cache.read_text(encoding='utf-8'))
            raw = DATA/info['archive']
            if raw.exists() and sha256(raw.read_bytes()).hexdigest() == info['sha256']:
                frame = parse_prices(raw.read_bytes(), info['start'], info['end'], info['archive'])
                if offline or pd.Timestamp(info['end']) >= pd.Timestamp(end):
                    return frame[frame.fecha.between(pd.Timestamp(start), pd.Timestamp(end))], 'CACHE'
        if offline:
            raise FileNotFoundError(f'Sin caché íntegra para {key}')
        if not self.token:
            self.connect()
        params = {'postID':self.token,'ajax':'true','__ajax_carga_final':'consulta',
                  'periodicidad':'intervalo','desde':pd.Timestamp(start).strftime('%d/%m/%Y'),
                  'hasta':pd.Timestamp(end).strftime('%d/%m/%Y'),'mercado':MARKET_ID,
                  'productos[]':'0104','variables[]':['precio_prom','volumen']}
        response = self.session.post(BASE+'resumenes/filtrar', data=params, timeout=(10,50))
        response.raise_for_status()
        digest = sha256(response.content).hexdigest()
        relative = Path('bronze')/'sisap'/f'{key}_{digest[:16]}.html'
        raw = DATA/relative
        raw.parent.mkdir(parents=True, exist_ok=True)
        raw.write_bytes(response.content)
        frame = parse_prices(response.content, start, end, relative.as_posix())
        atomic_json(cache, {'start':str(pd.Timestamp(start).date()), 'end':str(pd.Timestamp(end).date()),
                            'archive':relative.as_posix(),'sha256':digest,'retrieved_at':now().isoformat(),
                            'url':response.url,'parameters':{k:v for k,v in params.items() if k!='postID'}})
        time.sleep(.15)
        return frame, 'LIVE'
