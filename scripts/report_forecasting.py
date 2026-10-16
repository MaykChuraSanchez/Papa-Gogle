"""Generate documentation from the actual verified run, never hand-enter scores."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from agrodecide.v4.storage import DATA,ROOT
from agrodecide.forecasting.engine import IMPLEMENTATION


def run():
    report=json.loads((DATA/'forecasting/reports/Única.json').read_text(encoding='utf-8'))
    if report['implementation_hash']!=IMPLEMENTATION or not report.get('enriched_at'):raise ValueError('Se requiere ejecución actual enriquecida')
    def f(v):return '—' if v is None else f'{v:.4f}'
    lines=['# Resultados verificados · motor 2.0',f"\nEjecución: {report['generated_at']}. Enriquecimiento: {report['enriched_at']}. Papa Única, GMML Lima, PEN/kg. Último precio real {report['last_price']:.2f}, observado el {report['last_date']}.",
           f"\nCódigo `{report['implementation_hash']}`. Precios `{report['data_hash']}`. Variables `{report['feature_data_hash']}`. Estos resultados se generaron desde predicciones guardadas; los anteriores resultados de desarrollo no se publican.",
           '\nLas métricas del motor anterior usan cortes diferentes y no se comparan directamente como si fueran el mismo experimento. Seis orígenes de auditoría por horizonte, posteriores a selección y calibración. Las métricas son retrospectivas; en horizontes largos las ventanas internas se solapan. No son una garantía de acierto ni un experimento causal.',
           '\n## Política publicada',
           '\n| Días | Modelo publicado | MAE | MAE Naive | RMSE | WAPE % | MASE | Sesgo | Cobertura 80 % | Cobertura 95 % | n |',
           '|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    for e in report['evaluations']:
        m=e['audit'];lines.append(f"| {e['horizon']} | {e['deployed'].replace(' | ',' · ')} | {f(m['mae'])} | {f(e['baseline_audit']['mae'])} | {f(m['rmse'])} | {f(m['wape'])} | {f(m['mase'])} | {f(m['bias'])} | {100*m['coverage80']:.1f} | {100*m['coverage95']:.1f} | {m['n']} |")
    lines.extend(['\n## Candidato elegido antes de auditoría','\n| Días | Candidato de validación | MAE auditoría del candidato | Mejora frente a Naive % | Decisión |','|---:|---|---:|---:|---|'])
    for e in report['evaluations']:
        c=next(c for c in e['candidates'] if c['id']==e['selected'])
        lines.append(f"| {e['horizon']} | {e['selected'].replace(' | ',' · ')} | {f(c['audit']['mae'])} | {e['selection_skill_audit']*100:.2f} | {e['reason']} |")
    lines.extend(['\nUna línea plana puede ser la referencia de último precio cuando los modelos más complejos no la superan. No se introduce una tendencia para hacer atractivo el gráfico. Una reducción de MAE puede coexistir con rangos insuficientes; ambos resultados se muestran por separado.',
                  '\n## Ablación pareada con alertas ENFEN','\nΔ = MAE(A+ENFEN) − MAE(A), mismos modelos, estrategia directa y cortes. Negativo indica menor error. No equivale a efecto causal ni a validación de la cadena C/D/E.',
                  '\n| Días | Modelo | MAE A | MAE A+ENFEN | Δ MAE |','|---:|---|---:|---:|---:|'])
    for e in report['evaluations']:
        for a in e['ablations']:
            if a['configuration']!='A+ENFEN':continue
            base=next((x for x in e['ablations'] if x['model']==a['model'] and x['configuration']=='A'),{})
            lines.append(f"| {e['horizon']} | {a['model']} | {f(base.get('mae'))} | {f(a.get('mae'))} | {f(a.get('delta_mae'))} |")
    lines.extend(['\nSARIMAX A no se ejecuta: sin exógenas sería ARIMA. Guiones indican ajustes no disponibles, no errores cero. El detalle de cada restricción está en el JSON del horizonte y en el laboratorio.',
                  '\n## Periodos y ejecución','\n| Días | Selección (pesos / ranking) | Calibración | Auditoría | Candidatos válidos | Fallos registrados |','|---:|---|---|---|---:|---:|'])
    for e in report['evaluations']:
        p=e['plan'];lines.append(f"| {e['horizon']} | {', '.join(p['selection'][:3])} / {', '.join(p['selection'][3:])} | {', '.join(p['calibration'])} | {', '.join(p['audit'])} | {len(e['candidates'])} | {len(e['failures'])} |")
    lines.extend(['\n## Interpretación y pendientes',f"\n{report['price_vintage_caveat']}",f"\n{report['alert_availability_caveat']}",
                  '\nC/D/E no tienen métricas mientras falten publicaciones originales de macro/clima y oferta elegible. ICEN, ONI/RONI y BCRP revisados se preservan como contexto; no se usan como si las revisiones ya hubieran sido publicadas. La oferta SISAP se analiza en B como investigación. No se validaron efectos regionales ni una cadena causal océano → clima → producción → precio.',
                  '\nLas sensibilidades modifican la alerta actual de un modelo con ENFEN, sin alterar sus rezagos. El resultado puede ser nulo. No son una predicción climática ni una recomendación de hectáreas a sembrar. Las emisiones futuras se guardan por separado para poder medir posteriormente el error prospectivo.',
                  '\nLos seis reportes web incluyen todos los candidatos, sus parámetros, cortes, fallos, métricas y curvas actuales. El registro local conserva el reporte completo y hashes para reproducir la ejecución. Ver [manual](MOTOR_PRONOSTICOS_V2.md) y [fuentes](FUENTES_V2.md).'])
    (ROOT/'docs/RESULTADOS_V2.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    sources={name:json.loads((DATA/'forecasting/sources'/f'{name}.json').read_text(encoding='utf-8')) for name in ['icen','enfen','macro','central','emmsa','weather','status']}
    rows=[('SISAP','http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/','POST público, HTML tabular','Precios diarios y volumen; 28.752 registros, 2019–15/10/2026. Única: 2.834 precios.','Operativo; precios usados por fecha de cotización, publicación original desconocida. Volumen solo investigación.'),
          ('EMMSA','https://www.emmsa.com.pe/estadistica/estBoletines/bol_semanal.php','POST a controller/bol_semanal.php?op=listar, enlaces PDF',f"{len(sources['emmsa'].get('catalog',[]))} boletines/enlaces oficiales. PDF semanal 01–07/06/2026 inspeccionado.",'Catálogo verificado; contraste diario por variedad pendiente de extracción comprobada o archivo oficial estructurado.'),
          ('MIDAGRI · Agro en Cifras','https://www.gob.pe/institucion/midagri/colecciones/388-boletin-estadistico-mensual-el-agro-en-cifras','Excel oficial, snapshot conservado','Producción regional enero–junio 2026, cuadro C.18, 26 unidades.','Contexto cartográfico; no pesos históricos de procedencia ni producción futura. Superficie/rendimiento históricos pendientes.'),
          ('ICEN · IGP / IMARPE','https://siofen.imarpe.gob.pe/nivel2/indice-costero-el-nino-icen','TXT público enlazado oficialmente: http://met.igp.gob.pe/datos/ICEN.txt',f"{len(sources['icen']['rows'])} meses; {sources['icen']['rows'][0]['periodo_observacion']} a {sources['icen']['rows'][-1]['periodo_observacion']}; versión ENFEN 2024.",'Descarga verificada; revisión actual, sin vintages originales, fuera del backtest operativo.'),
          ('ENFEN','https://enfen.imarpe.gob.pe/','Catálogo público paginado y PDFs, fecha impresa y marcador público del archivo',f"{len(sources['enfen']['rows'])} comunicados parseados; {len(sources['enfen']['failures'])} incidencias registradas; emisión más reciente {max(r['fecha_publicacion'] for r in sources['enfen']['rows'])}.",'Alertas candidatas A+ENFEN, reconstrucción conservadora de disponibilidad; regímenes separados.'),
          ('BCRPData','https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api','API JSON oficial',f"{len(sources['macro']['rows'])} registros; PN01210PM, PN01271PM, PN01313PM, PN01368PM.",'FX, IPC, alimentos y combustibles descargados. Sin fecha original por observación; C pendiente. Fertilizantes y actividad agrícola vintage no validados.'),
          ('NOAA CPC','https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/','Tablas HTML públicas ONI v5 y RONI v6',f"{len(sources['central']['rows'])} valores Niño 3.4, separados por índice y metodología.",'Contexto revisado. RONI operacional desde febrero 2026; no retrofechar ni mezclar con ICEN.'),
          ('SENAMHI','https://www.senamhi.gob.pe/site/descarga-datos/','Catálogo público stationList; detalle por estación',f"{len(sources['weather']['rows'])} estaciones, códigos y coordenadas.",'Catálogo verificado; descarga detallada con ingreso de usuario. Faltan diarios regionales con estación, unidades, publicación, disponibilidad y calidad; D pendiente.'),
          ('SIEA / Power BI','https://siea.midagri.gob.pe/index.php','Visores de referencia, fuente SISAP identificada','Comparativos de precios y abastecimiento.','No se afirma acceso al PBIX o consultas internas. Ingesta usa las fuentes oficiales originales.'),
          ('Datero Agrario','https://www.datosabiertos.gob.pe/dataset/midagri-02-datero-agrario-ministerio-de-desarrollo-agrario-y-riego','38 CSV previamente inspeccionados','Actividad de consultas/telefonía.','Excluido: no contiene el histórico de precios objetivo.')]
    lines=['# Matriz de fuentes verificadas · V2',f"\nDocumento generado desde el estado local de fuentes. Última revisión del catálogo: {sources['status']['at']}. La fecha de consulta no reemplaza observación o publicación.",
           '\n| Fuente | Mecanismo comprobado | Variables / cobertura | Estado y uso |','|---|---|---|---|']
    lines += [f'| [{name}]({url}) | {mechanism} | {coverage} | {state} |' for name,url,mechanism,coverage,state in rows]
    lines.extend(['\n## Estado de acceso registrado','\n| Fuente | Acceso | Registros/enlaces | Fallos | Última comprobación |','|---|---|---:|---:|---|'])
    for r in sources['status']['sources']:lines.append(f"| {r['source']} | {r['state']} | {r.get('records','—')} | {r.get('failures','—')} | {r.get('checked_at',sources['status']['at'])} |")
    lines.extend(['\nCACHE corresponde al original conservado e íntegro; no significa datos de hoy. ENFEN con incidencias puede tener cobertura parcial. Cada archivo conserva SHA-256, URL y fecha de recuperación. El frontend expone metadatos y las fechas reales del dato. Los PDFs grandes y credenciales no se incorporan al bundle web.',
                  '\n## Pendientes explícitos','\nContraste diario SISAP–EMMSA por variedad/calidad/unidad; producción, superficie y rendimiento con publicaciones históricas; macros vintage; mediciones y pronósticos meteorológicos regionales; procedencia histórica para ponderaciones; índices oceánicos cuantitativos vintage y probabilidades oficiales estructuradas. No se suplen con ceros, multiplicadores manuales ni datos sintéticos.',
                  '\nVer [importación oficial y contrato temporal](MOTOR_PRONOSTICOS_V2.md). El acceso a un catálogo o gráfico no acredita disponer de la serie diaria apta para entrenar.'])
    (ROOT/'docs/FUENTES_V2.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print('Documentación generada desde la ejecución actual enriquecida.')


if __name__=='__main__':run()
