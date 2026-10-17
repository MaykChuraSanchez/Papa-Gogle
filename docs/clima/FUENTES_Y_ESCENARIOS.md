# Inteligencia climática: evidencia verificada al 16 de octubre de 2026

El módulo agrega contexto oficial para Tarma/Junín y el mercado GMML de Lima. No aplica un coeficiente climático al precio ni convierte la alerta de El Niño en un consejo de siembra. El código está en `agrodecide/climate_v5/` y la app consume `public/climate-v5/index.json`.

| Fuente revisada | Resultado verificable | Uso y límite |
|---|---|---|
| [ENFEN 17-2026, 28 septiembre](https://enfen.imarpe.gob.pe/download/comunicado-oficial-enfen-n-17-2026/) | Alerta costera y perspectiva de calentamiento extraordinario hasta enero de 2027 | Pronóstico institucional oceánico. No es una observación de enero ni una clasificación de parcela en Tarma. |
| [Catálogo ENFEN](https://enfen.imarpe.gob.pe/?wpdmtask=get_downloads&cp=1) | La consulta directa todavía ofrece 17-2026 como comunicado más reciente en esa ruta | El documento anunció otra emisión para el 15 octubre. Estado `update_due`; no se inventa el número 18 ni se afirma que no exista en otra ruta. |
| [NOAA CPC, diagnóstico 8 octubre](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml) | Reporta anomalías recientes Niño 1+2 +3,9 °C y Niño 3.4 +2,1 °C; anticipa evento fuerte a muy fuerte hacia enero–marzo de 2027 | Dos zonas distintas y anomalías, no temperaturas absolutas. El texto no precisa las fechas inicial/final de la semana de esos indicadores; no se inventan. La proyección no determina lluvia o pérdidas locales. |
| [SENAMHI, riesgo papa octubre–diciembre 2026](https://www.senamhi.gob.pe/load/file/02954SENA-104.pdf) | Sierra central: riesgo mayormente bajo/medio, con focos altos; humedad disponible, fase y altitud condicionan el riesgo | Contexto regional para Junín. El PDF no certifica riesgo puntual de Tarma ni imprime un día de emisión verificable: `issue_date=null`, `issue_month=2026-10`, disponibilidad desde la recuperación del 16 octubre. |
| [SENAMHI, agrometeorología papa](https://www.senamhi.gob.pe/load/file/02949SENA-311.pdf) | El PDF pronostica del 3 al 12 octubre y anuncia actualización el 14 | **Vencido** al 16 octubre. El catálogo lo rotula 21–30 octubre; se conserva la discrepancia y prevalece la vigencia impresa del PDF. |
| Mismo PDF, anexo fenológico | CO-Tarma, Junín: terreno en descanso al 30 septiembre; latitud −11,397, longitud −75,690, altitud 3025 m | Observación histórica de esa estación; no se extrapola a toda la provincia. |
| [IGP/IMARPE, ICEN](http://met.igp.gob.pe/datos/ICEN.txt) | Serie revisada actual, metodología ENFEN 2024 y climatología 1991–2020 | Descripción histórica; sin fechas originales de publicación por valor. No se incorpora retrospectivamente como feature. |
| [NOAA RONI](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/), [ONI v5](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v5/) | Series revisadas separadas por índice y versión ERSST | RONI/ONI e ICEN no se concatenan como una sola serie. Los últimos periodos disponibles difieren. |

Se renderizaron y revisaron las páginas 1–2 del boletín de riesgo y 1/4 del agrometeorológico. Las copias locales, metadatos, texto extraído y PNG están en `docs/clima/originales/` (ignorados en Git); cada evidencia pública conserva URL, SHA-256 y hora real de consulta. Los números oceánicos no se tomaron del prompt del usuario: fueron comprobados en la página institucional.

## Comparación de eventos

`event_comparisons` alinea julio–junio para 1982/83, 1997/98, 2015/16 y 2026/27. Cada panel usa una única serie revisada: ICEN o RONI ERSSTv6. Los meses sin dato y el futuro permanecen nulos. La semejanza de curvas no permite inferir la misma precipitación de Tarma ni el mismo impacto sobre precio. Esta comparación es descriptiva y no participa del entrenamiento.

## Escenarios regionales

Los cuatro escenarios (`base`, `wetter`, `drier`, `logistics`) contienen condiciones, medidas genéricas de preparación y límites explícitos. Su tipo es `agricultural_hypothesis`.

- Base: confirmar calendario, agua y costos conocidos; consultar el pronóstico de precio validado.
- Más húmedo: usar solo si un pronóstico local vigente y el estado de la parcela lo respaldan; revisar drenaje y labores.
- Más seco: requerir evidencia local de humedad y lluvia; verificar riego. No transferir el escenario de sierra sur a Tarma.
- Logística: requiere un aviso vial y una ruta afectada; este snapshot no verifica cierres ni fletes adicionales.

Todos mantienen `price_effect=null`, `probability=null` y `price_simulation_enabled=false`. La aplicación puede usar costos elegidos por el usuario en una simulación económica, identificándolos como supuestos del usuario. No debe presentar esa sensibilidad como una estimación causal del clima sobre el precio.

## Lo que falta para un efecto climático cuantificado

Se necesitan series diarias verificadas de lluvia y temperatura local, fechas de publicación, altitud/representatividad, calendario y estado del cultivo, datos de procedencias/participación de oferta hacia GMML y un archivo histórico de pronósticos institucionales. Después se puede construir una evaluación temporal con y sin esas variables. Por ahora quedan explícitamente no disponibles días secos, acumulados de precipitación, heladas, humedad del suelo, coeficientes de rendimiento/oferta y sus probabilidades.

Las cifras externas sobre récords de temperatura absoluta, comparación diaria con 1997, calor subsuperficial y conteos de estaciones no se replicaron. Permanecen fuera del dataset productivo y de los titulares. NASA POWER no se consultó como sustituto de observación exacta de parcela.

## Reproducción y actualización

```powershell
python -m agrodecide.climate_v5.build --as-of 2026-10-16 --refresh
python -m unittest tests.test_climate_v5 -v
```

Sin `--refresh` se reutilizan originales íntegros locales. Si falta el cache V2, las series/metadata se leen del artefacto público de fuentes V2; el PDF ENFEN se recupera por su URL versionada en el modo refresh. No se escribe DuckDB ni se modifica el fingerprint del motor de precios.

El constructor falla ante una nueva discusión NOAA o una versión no revisada de los PDFs regionales. Es una compuerta de revisión de interpretación, no una promesa de extracción automática universal. El fallo ocurre antes de reemplazar `index.json`; se conserva el último artefacto con su fecha. La app debe mostrar la antigüedad y el vencimiento de cada evidencia.

Pruebas del módulo: 24 casos, incluyendo fechas as-of, anomalía frente a temperatura absoluta, PDF/catálogo contradictorios, región frente a parcela, series revisadas, huecos de 2026/27 y prohibición de coeficientes/probabilidades de precio inventados.
