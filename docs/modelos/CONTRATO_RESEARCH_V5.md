# Contrato de investigación V5 → frontend

Fuente local: `data/v4/research_v5/report.json`, generado por `python -m agrodecide.research_v5.run`. No es un manifiesto de producción; la exportación valida huellas y genera archivos inmutables como paso separado. El campeón V2 de Única sigue siendo otra evaluación con otros cortes.

| Campo | Significado / validación |
|---|---|
| `schema_version` | `5.0.0` |
| `run_id` | Identificador determinista del experimento: código + entrada + umbral |
| `code_hash` | SHA256 de nombre+bytes de cada `.py` del paquete ordenado por ruta |
| `input_hash` | SHA256 CSV de todas las filas de `prices`, filas ordenadas variedad/mercado/fecha y columnas por nombre |
| `generated_at` | Emisión de resultados, America/Lima con offset |
| `series[].data_hash` | SHA256 de `y.to_csv()` igual al motor existente; no publicar si difiere del JSON principal |
| `series[].quality` / `eda` | Calidad con limitaciones, estadísticas y diagnósticos descriptivos |
| `series[].evaluations[]` | Exactamente los seis horizontes7/15/30/90/180/240 si evaluables |
| `evaluation.forecast_paths[model]` | Trayectoria diaria **completa**, precio+bandas80/95 y metadatos; se puede seleccionar para explorar |
| `evaluation.forecast` | Trayectoria del recomendado por la compuerta; no mezclar entre horizontes |
| `series[].forecasts_by_horizon[h]` | Misma curva recomendada, mapa para consumidor de escenarios |
| `evaluation.published_model` | Nombre del recomendado en este experimento. El nombre histórico del campo no autoriza sustituir V2 |
| `evaluation.promoted` | Mejora robusta según todas las condiciones declaradas; false implica conservar Naive |
| `evaluation.candidates[]` | Métricas selección/auditoría, bandas, parámetros por origen y parámetros actuales |
| `candidate.audit` | MAE/RMSE/WAPE/MASE/bias/sMAPE y cobertura80/95 de **trayectoria diaria** |
| `candidate.endpoint_audit` | Métricas **sólo t+h**; no mezclar con trayectoria ni con precio promedio de ventana |
| `evaluation.comparison` | Sólo challenger preseleccionado por selección contra Naive: bloque, réplicas, CI, p bruto/Holm, mejora, potencia aproximada |
| `evaluation.phases` | Orígenes exactos selección/calibración/auditoría; objetivos del bloque anterior terminan antes del próximo origen |
| `evaluation.sealed_test` | Últimos240d sin puntuar por este protocolo; NO test globalmente nuevo porque V2 ya vio historia |
| `evaluation.audit_rows[model]` | Filas fechadas Naive, AR1 y challenger, sólo objetivos observados; descargables y cálculo independiente |
| `evaluation.failures` | Rechazos aislados y motivos; no inventar curva o score de modelo fallido |
| `evaluation.gate` / `threshold_sensitivity` | Regla de mejora configurable y sensibilidad sin retunear auditoría |

Al seleccionar una curva de investigación, rotular **referencia / investigación**, objetivo, run y fecha. No usar el score del campeón V2 como si midiera esa curva. La confianza nominal es cobertura marginal agrupada por horizonte, no garantía simultánea de toda la trayectoria. Las coberturas históricas observadas deben quedar visibles, aun cuando estén por debajo80/95.

El índice web debe ser ligero. EDA por variedad y detalles por horizonte se descargan sólo al consultarlos; las auditorías pueden comprimirse deterministicamente. Nunca incrustar el informe local entero (~decenasMB) en el índice del inicio.

La investigación final es sólo de precio. No exponer `LIVE` como sinónimo de fuente recién consultada: esta ejecución lee el warehouse local y registra último dato y hash. La fecha original de publicación SISAP sigue desconocida. `source_urls` y `raw_files` señalan la procedencia disponible por serie; no inventan un registro de revisiones.

Se corrigió un problema encontrado durante la ejecución: algunas fechas internas mensuales caían en ausencia de cotización real (p.ej.2023-08-03). Ahora se retrocede a una cotización observada dentro de7d, sin adelantar fecha ni mirar precios objetivo. Esa reparación no cambia la compuerta ni selecciona el modelo por resultados de auditoría.

Una mejora adicional exige más historia homogénea fechada y/o evaluación prospectiva. Añadir días solapados o tratar variedades correlacionadas como réplicas independientes no crea potencia estadística. El volumen, IPC y clima pendientes requieren publicación/revisión verificable antes de poder atribuir mejora incremental.
