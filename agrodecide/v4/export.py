"""Generate immutable public forecast artifacts; index is the atomic publication point."""
from hashlib import sha256
from pathlib import Path
import json
import os
import tempfile
from .storage import DATA, ROOT, now, read, atomic_json

SOURCES=[
 {'id':'enfen','name':'ENFEN · Comunicados fechados','state':'conectado','kind':'Alertas históricas candidatas en el motor V2',
  'url':'https://enfen.imarpe.gob.pe/',
  'detail':'Comunicados con fecha impresa verificada; regímenes 2015/2024/2026 separados. ICEN revisado, ONI y RONI se preservan por separado y no se retrofechan. Aporte de alertas evaluado frente a precio solo para Única.'},
 {'id':'sisap','name':'MIDAGRI · SISAP','state':'conectado','kind':'Precios y volumen diarios',
  'url':'http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/',
  'detail':'Consulta pública POST verificada. Papa, mercado 15011501. Volumen ausente se conserva como nulo. HTTP legado: contrastar con boletines antes de decisiones.'},
 {'id':'bcrp','name':'BCRPData','state':'conectado','kind':'Tipo de cambio e inflación mensual',
  'url':'https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api',
  'detail':'API JSON oficial: PN01210PM, PN01271PM, PN01313PM y PN01368PM. Los valores actuales revisables no se retrofechan; su uso predictivo espera vintages con publicación verificable.'},
 {'id':'regional','name':'MIDAGRI · El Agro en Cifras','state':'snapshot','kind':'Producción por región',
  'url':'https://www.gob.pe/institucion/midagri/informes-publicaciones/7910469-boletin-estadistico-mensual-el-agro-en-cifras-2026',
  'detail':'Libro de junio de 2026 conservado en v3. Cuadro C.18, producción preliminar enero–junio; total regional reconciliado con nacional.'},
 {'id':'emmsa','name':'EMMSA','state':'catálogo verificado','kind':'Contraste de cotizaciones',
  'url':'https://www.emmsa.com.pe/index.php/precios-diarios/',
  'detail':'Catálogo público de boletines semanales verificado. Los gráficos PDF no se asignan a una variedad o día sin un adaptador comprobado; importación oficial CSV/XLSX con unidades y fechas explícitas.'},
 {'id':'datero','name':'Datero Agrario · Datos Abiertos','state':'descartado','kind':'Actividad del servicio',
  'url':'https://www.datosabiertos.gob.pe/dataset/midagri-02-datero-agrario-ministerio-de-desarrollo-agrario-y-riego',
  'detail':'Los 38 CSV locales contienen consultas/transacciones telefónicas y operador. No contienen precios de papa; excluidos del entrenamiento.'},
 {'id':'senamhi','name':'SENAMHI','state':'pendiente','kind':'Lluvia, temperatura y heladas',
  'url':'https://www.senamhi.gob.pe/',
  'detail':'Catálogo oficial de estaciones verificado. La descarga detallada incluye ingreso de usuario; faltan archivos con publicación y disponibilidad histórica verificable. No se utiliza el clima de Lima como sustituto.'},
 {'id':'powerbi','name':'SIEA · Dashboards Power BI','state':'referencia','kind':'Visualización de fuentes originales',
  'url':'https://siea.midagri.gob.pe/index.php/herramientas/estadistica-agropecuarias',
  'detail':'Se identificaron Comparativa de Precios Mercados Lima, Comportamiento de Precios Semanales y Abastecimiento Mercados y Precios. El primero declara SISAP como fuente. No se afirma acceso al PBIX, Power Query o base interna de los tres reportes.'},
]

def load_context(name, default):
    path=DATA/'context'/f'{name}.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default

def run():
    artifact=json.loads((DATA/'forecasts.json').read_text(encoding='utf-8'))
    from agrodecide.forecasting.publish import attach
    advanced=attach(artifact)
    web=ROOT/'public'/'data';web.mkdir(parents=True,exist_ok=True)
    summaries=[]
    for report in artifact['series']:
        # Dated audit rows live in lazy-loaded diagnostics, not the home index.
        # Retain them internally for independent reconciliation below.
        published={**report,'evaluations':[{k:v for k,v in e.items() if k!='embedded_audit'} for e in report['evaluations']]}
        content=json.dumps(published,ensure_ascii=False,allow_nan=False,separators=(',',':')).encode('utf-8')
        name=sha256(content).hexdigest()[:20]+'.json'
        # Content-addressed assets are never partially published by a failed job.
        atomic_json(web/name,published)
        summaries.append({k:published[k] for k in ['variety','market','market_id','last_date','last_price','observations','coverage','evaluations','run_id','model_version']})
        summaries[-1]['file']=name
        summaries[-1]['evaluated_at']=report.get('evaluated_at',report['generated_at'])
    status_path=DATA/'status.json'
    if advanced:
        artifact['methodology']['advanced']='Motor V2 para Única: 10 clásicos, 6 multivariables, estrategias directa/recursiva, alertas ENFEN fechadas, pesos, calibración y auditoría separadas. Volumen solo investigación; macros y clima pendientes de vintages.'
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
