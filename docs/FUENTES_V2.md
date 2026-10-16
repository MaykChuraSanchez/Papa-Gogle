# Matriz de fuentes verificadas · V2

Documento generado desde el estado local de fuentes. Última revisión del catálogo: 2026-10-15T23:39:30.820560-05:00. La fecha de consulta no reemplaza observación o publicación.

| Fuente | Mecanismo comprobado | Variables / cobertura | Estado y uso |
|---|---|---|---|
| [SISAP](http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/) | POST público, HTML tabular | Precios diarios y volumen; 28.752 registros, 2019–15/10/2026. Única: 2.834 precios. | Operativo; precios usados por fecha de cotización, publicación original desconocida. Volumen solo investigación. |
| [EMMSA](https://www.emmsa.com.pe/estadistica/estBoletines/bol_semanal.php) | POST a controller/bol_semanal.php?op=listar, enlaces PDF | 387 boletines/enlaces oficiales. PDF semanal 01–07/06/2026 inspeccionado. | Catálogo verificado; contraste diario por variedad pendiente de extracción comprobada o archivo oficial estructurado. |
| [MIDAGRI · Agro en Cifras](https://www.gob.pe/institucion/midagri/colecciones/388-boletin-estadistico-mensual-el-agro-en-cifras) | Excel oficial, snapshot conservado | Producción regional enero–junio 2026, cuadro C.18, 26 unidades. | Contexto cartográfico; no pesos históricos de procedencia ni producción futura. Superficie/rendimiento históricos pendientes. |
| [ICEN · IGP / IMARPE](https://siofen.imarpe.gob.pe/nivel2/indice-costero-el-nino-icen) | TXT público enlazado oficialmente: http://met.igp.gob.pe/datos/ICEN.txt | 919 meses; 1950-01-01 a 2026-07-01; versión ENFEN 2024. | Descarga verificada; revisión actual, sin vintages originales, fuera del backtest operativo. |
| [ENFEN](https://enfen.imarpe.gob.pe/) | Catálogo público paginado y PDFs, fecha impresa y marcador público del archivo | 127 comunicados parseados; 2 incidencias registradas; emisión más reciente 2026-09-28. | Alertas candidatas A+ENFEN, reconstrucción conservadora de disponibilidad; regímenes separados. |
| [BCRPData](https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api) | API JSON oficial | 420 registros; PN01210PM, PN01271PM, PN01313PM, PN01368PM. | FX, IPC, alimentos y combustibles descargados. Sin fecha original por observación; C pendiente. Fertilizantes y actividad agrícola vintage no validados. |
| [NOAA CPC](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/) | Tablas HTML públicas ONI v5 y RONI v6 | 1837 valores Niño 3.4, separados por índice y metodología. | Contexto revisado. RONI operacional desde febrero 2026; no retrofechar ni mezclar con ICEN. |
| [SENAMHI](https://www.senamhi.gob.pe/site/descarga-datos/) | Catálogo público stationList; detalle por estación | 293 estaciones, códigos y coordenadas. | Catálogo verificado; descarga detallada con ingreso de usuario. Faltan diarios regionales con estación, unidades, publicación, disponibilidad y calidad; D pendiente. |
| [SIEA / Power BI](https://siea.midagri.gob.pe/index.php) | Visores de referencia, fuente SISAP identificada | Comparativos de precios y abastecimiento. | No se afirma acceso al PBIX o consultas internas. Ingesta usa las fuentes oficiales originales. |
| [Datero Agrario](https://www.datosabiertos.gob.pe/dataset/midagri-02-datero-agrario-ministerio-de-desarrollo-agrario-y-riego) | 38 CSV previamente inspeccionados | Actividad de consultas/telefonía. | Excluido: no contiene el histórico de precios objetivo. |

## Estado de acceso registrado

| Fuente | Acceso | Registros/enlaces | Fallos | Última comprobación |
|---|---|---:|---:|---|
| icen | CACHE | 919 | 0 | 2026-10-15T23:38:57.078610-05:00 |
| macro | CACHE | 420 | 0 | 2026-10-15T23:38:57.266959-05:00 |
| emmsa | CACHE | 387 | 0 | 2026-10-15T23:38:57.317959-05:00 |
| central | CACHE | 1837 | 0 | 2026-10-15T23:38:57.420199-05:00 |
| weather | CACHE | 293 | 0 | 2026-10-15T23:38:57.491706-05:00 |
| enfen | CACHE | 127 | 2 | 2026-10-15T23:39:30.820560-05:00 |

CACHE corresponde al original conservado e íntegro; no significa datos de hoy. ENFEN con incidencias puede tener cobertura parcial. Cada archivo conserva SHA-256, URL y fecha de recuperación. El frontend expone metadatos y las fechas reales del dato. Los PDFs grandes y credenciales no se incorporan al bundle web.

## Pendientes explícitos

Contraste diario SISAP–EMMSA por variedad/calidad/unidad; producción, superficie y rendimiento con publicaciones históricas; macros vintage; mediciones y pronósticos meteorológicos regionales; procedencia histórica para ponderaciones; índices oceánicos cuantitativos vintage y probabilidades oficiales estructuradas. No se suplen con ceros, multiplicadores manuales ni datos sintéticos.

Ver [importación oficial y contrato temporal](MOTOR_PRONOSTICOS_V2.md). El acceso a un catálogo o gráfico no acredita disponer de la serie diaria apta para entrenar.
