"""Generate immutable public forecast artifacts; index is the atomic publication point."""
from hashlib import sha256
from pathlib import Path
import json
import os
import tempfile
from .storage import DATA, ROOT, now, read, atomic_json

SOURCES=[
 {'id':'sisap','name':'MIDAGRI · SISAP','state':'conectado','kind':'Precios y volumen diarios',
  'url':'http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/',
  'detail':'Consulta pública POST verificada. Papa, mercado 15011501. Volumen ausente se conserva como nulo. HTTP legado: contrastar con boletines antes de decisiones.'},
 {'id':'bcrp','name':'BCRPData','state':'contexto','kind':'Tipo de cambio mensual · PN01210PM',
  'url':'https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api',
  'detail':'API JSON oficial. Se exploran cambios mensuales rezagados; no participa aún en el modelo. No se confunde correlación con mejora predictiva.'},
 {'id':'regional','name':'MIDAGRI · El Agro en Cifras','state':'snapshot','kind':'Producción por región',
  'url':'https://www.gob.pe/institucion/midagri/informes-publicaciones/7910469-boletin-estadistico-mensual-el-agro-en-cifras-2026',
  'detail':'Libro de junio de 2026 conservado en v3. Cuadro C.18, producción preliminar enero–junio; total regional reconciliado con nacional.'},
 {'id':'emmsa','name':'EMMSA','state':'pendiente','kind':'Contraste de cotizaciones',
  'url':'https://www.emmsa.com.pe/index.php/precios-diarios/',
  'detail':'El portal redirige al sistema old.emmsa.com.pe. La extracción directa falló por validación del certificado TLS; no se desactivó la verificación.'},
 {'id':'datero','name':'Datero Agrario · Datos Abiertos','state':'descartado','kind':'Actividad del servicio',
  'url':'https://www.datosabiertos.gob.pe/dataset/midagri-02-datero-agrario-ministerio-de-desarrollo-agrario-y-riego',
  'detail':'Los 38 CSV locales contienen consultas/transacciones telefónicas y operador. No contienen precios de papa; excluidos del entrenamiento.'},
 {'id':'senamhi','name':'SENAMHI','state':'pendiente','kind':'Lluvia, temperatura y heladas',
  'url':'https://www.senamhi.gob.pe/',
  'detail':'Falta seleccionar estaciones y contratos de descarga por zona productora, fechas de disponibilidad, calidad y pronóstico meteorológico. No hay clima conectado al modelo.'},
 {'id':'powerbi','name':'SIEA · Dashboards Power BI','state':'referencia','kind':'Visualización de fuentes originales',
  'url':'https://siea.midagri.gob.pe/index.php/herramientas/estadistica-agropecuarias',
  'detail':'Se identificaron Comparativa de Precios Mercados Lima, Comportamiento de Precios Semanales y Abastecimiento Mercados y Precios. El primero declara SISAP como fuente. No se afirma acceso al PBIX, Power Query o base interna de los tres reportes.'},
]

def load_context(name, default):
    path=DATA/'context'/f'{name}.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default

def run():
    artifact=json.loads((DATA/'forecasts.json').read_text(encoding='utf-8'))
    web=ROOT/'public'/'data';web.mkdir(parents=True,exist_ok=True)
    summaries=[]
    for report in artifact['series']:
        content=json.dumps(report,ensure_ascii=False,allow_nan=False,separators=(',',':')).encode('utf-8')
        name=sha256(content).hexdigest()[:20]+'.json'
        # Content-addressed assets are never partially published by a failed job.
        atomic_json(web/name,report)
        summaries.append({k:report[k] for k in ['variety','market','market_id','last_date','last_price','observations','coverage','evaluations','run_id','model_version']})
        summaries[-1]['file']=name
        summaries[-1]['evaluated_at']=report.get('evaluated_at',report['generated_at'])
    status_path=DATA/'status.json'
    index={'generated_at':artifact['generated_at'],'exported_at':now().isoformat(),
           'series':summaries,'excluded':artifact['excluded'],'methodology':artifact['methodology'],
           'sources':SOURCES,'regional':load_context('regional',{'regions':[]}),
           'macro':load_context('macro',{'rows':[]}), 'correlations':load_context('correlations',[]),
           'ingestion':json.loads(status_path.read_text(encoding='utf-8')) if status_path.exists() else {'state':'unknown'},
           'cycles':{'Canchán':{'min':115,'max':130,'reference':120,'source':'https://www.inia.gob.pe/wp-content/uploads/investigacion/programa/sistProductivo/variedad/papa/INIA_303.pdf','note':'INIA: periodo vegetativo de referencia 120 días. Ventana 115–130 es un supuesto editable, no una predicción agronómica local.'}},
           'forecast_horizon_days':240,'stale_after_days':7,
           'geography':{'source':'https://www.geoboundaries.org/api/current/gbOpen/PER/ADM1/','license':'Public Domain','year':2008,'note':'Límites de referencia geoBoundaries, 26 unidades; sin validez catastral.'}}
    monitoring=DATA/'monitoring.json'
    index['monitoring']=json.loads(monitoring.read_text(encoding='utf-8')) if monitoring.exists() else {'series':[]}
    prices=read('prices')
    from .diagnostics import run as diagnostics
    diagnostics(artifact, prices)
    csv_path=web/'prices.csv'
    fd,temp=tempfile.mkstemp(dir=web,suffix='.tmp');os.close(fd)
    try:
        prices.to_csv(temp,index=False,encoding='utf-8-sig');os.replace(temp,csv_path)
    finally:
        if os.path.exists(temp):os.unlink(temp)
    # Publish index only after every referenced JSON is complete.
    atomic_json(web/'index.json',index)
    print(f'Exportadas {len(summaries)} series y {len(prices):,} observaciones a {web}')

if __name__=='__main__':
    run()
