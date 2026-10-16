# AgroDecide · motor de pronósticos 2.0

## Alcance y diagnóstico

Se mejora la aplicación React/Vite existente; Vercel sirve resultados precalculados y la función del asistente. Python 3.12 ejecuta ingesta, DuckDB, modelos y auditoría fuera de las peticiones web. La versión Streamlit anterior se conserva archivada. No se creó una aplicación nueva ni una base remota.

La línea base pasó 20 pruebas TypeScript/servidor y 13 Python antes de los cambios. El motor anterior comparaba cinco candidatos, carecía del horizonte de 15 días y del rango 95%, usaba pocos bloques de auditoría y no evaluaba alertas climáticas como entradas. La misma curva combinaba tramos de distintos horizontes. Una trayectoria constante correspondía a persistencia; no era evidencia de que el mercado permanecería estable. Tampoco existía evidencia para prometer que añadir modelos mejoraría la precisión.

La primera variedad del nuevo motor es **Única, Papa, GMML Lima, mercado 15011501, precio mayorista PEN/kg**. Las otras nueve variedades actuales conservan el motor anterior y sus métricas, sin atribuirles los resultados nuevos. El CSV incluye una variedad histórica discontinuada. El diseño verde y los módulos históricos, mapa, siembra, cosecha, costos, cuaderno, exportaciones y asistente se conservan.

## Datos y límites temporales

La base SISAP contiene 28.752 observaciones desde enero de 2019 hasta el 15/10/2026. Única tiene 2.834 cotizaciones; su calendario de 2.845 días conserva 11 ausencias. Hay precios dominicales: no se impone una semana de lunes a viernes. Los volúmenes ausentes permanecen nulos, no se convierten en cero. Los precios extremos se señalan; no se eliminan para mejorar métricas.

`master_prices` conserva el original y añade observación, publicación, disponibilidad, región de procedencia, unidades, validación y actualización. Las fechas históricas de publicación y revisión SISAP son **desconocidas** y permanecen nulas. Por ello el backtest es condicionado a la historia vigente por fecha de cotización: no acredita una reconstrucción point-in-time completa ni descarta revisiones del proveedor. El volumen sin fecha original solo entra en experimentos de investigación, excluidos de la recomendación operativa.

Los originales descargados se guardan por SHA-256 en Bronze y los procesados en tablas separadas. El histórico actualizado de ICEN, ONI/RONI y BCRP no entrega las publicaciones originales de cada observación. Se conserva como contexto revisable, sin retrofecharlo para entrenamiento.

ENFEN se integra **como entrada predictiva candidata**, mediante categorías publicadas en PDFs. Se conserva fecha impresa, enlace, hash, versión del archivo y metodología. El marcador público `ind` del archivo se interpreta como epoch en milisegundos; la disponibilidad reconstruida es el máximo de emisión y versión de archivo, más un día. Algunos archivos antiguos fueron cargados mucho después: no se usan antes de esa fecha. Es una aproximación conservadora, **no un log certificado de primera publicación**. Sin marcador verificable, el boletín queda fuera del backtest. Una carga tardía de un comunicado antiguo no reemplaza otro de emisión más reciente. Más de 100 días sin comunicado conocido produce categoría desconocida, nunca neutral por defecto.

Se separan regímenes de alerta ENFEN 2015/2024/2026. El **índice ICEN 2024**, las categorías de alerta y la metodología de estas últimas no son equivalentes. ICEN costero Niño 1+2, ONI ERSSTv5 y RONI ERSSTv6 central Niño 3.4 se conservan separados. El cambio operacional NOAA hacia RONI en febrero de 2026 no cambia retrospectivamente el ICEN costero.

## Modelos ejecutables

| Familia | Implementación y restricciones |
|---|---|
| Naive | Último precio observado, referencia obligatoria |
| Seasonal Naive | Repite el ciclo respaldado por entrenamiento |
| Holt lineal / amortiguado | Nivel y tendencia, con o sin amortiguación |
| Cuatro Holt-Winters | Estación aditiva/multiplicativa y tendencia con/sin amortiguación; suavizado elegido en holdout interno de 30 días |
| ARIMA | Logaritmos, ADF para d, pequeña búsqueda p/q por AIC dentro del entrenamiento, Ljung–Box de residuos |
| SARIMA | Estacionalidad solo si hay evidencia; anual sobre semanas completas con diferenciación 52 e inversión documentada, o semanal diaria |
| SARIMAX | Covariables conocidas en origen; selección Spearman dentro del entrenamiento, imputación y escalamiento internos; escenario futuro de último estado constante |
| Decision Tree / Random Forest | Árboles de profundidad y hojas limitadas, semilla fija |
| XGBoost / LightGBM / CatBoost | Implementaciones independientes con regularización, número de iteraciones acotado y dos hilos |

Los diez clásicos tienen una interfaz que recibe **exclusivamente precios**, sin exógenas. Se exigen al menos 730 días utilizables y no se rellenan interrupciones mayores a siete días. La evidencia estacional se estima solo en entrenamiento con al menos tres ciclos y fuerza mínima 0,15; no se obliga a ejecutar un modelo estacional sin evidencia.

Las entradas de ML incluyen precios conocidos en origen, rezagos 1/2/3/7/14/30/60/365, medias, medianas, dispersión, retornos y tendencia; calendario cíclico del objetivo y plazo. `precio_lag_1` significa el último precio conocido al emitir, no el precio de un día aún desconocido. Se requiere soporte de al menos 60% para una columna; mediana e indicadores de ausencia se ajustan dentro de cada entrenamiento. No se eliminan columnas por su correlación con la auditoría.

Cada horizonte tiene su propio ajuste. La estrategia directa aprende varios plazos conocidos mediante la variable `plazo_dias` (no un estimador independiente por cada día). La recursiva, disponible en 7/15/30, actualiza solo los precios simulados y conserva las covariables originales. SARIMAX mantiene un escenario explícito de exógenas: no recibe volúmenes, clima o índices futuros realizados. Los modelos que divergen o producen precios no válidos fallan individualmente; no se dibuja una curva corregida artificialmente.

## Validación, ensembles e incertidumbre

Se evalúan **7, 15, 30, 90, 180 y 240 días** mediante orígenes a fin de mes y al menos 80% de objetivos observados por corte. Cada horizonte tiene 18 orígenes:

1. Tres para determinar componentes y pesos de ensembles.
2. Tres posteriores para comparar todos los candidatos por MAE más 0,1 veces la dispersión del MAE entre cortes; RMSE y tiempo resuelven empates.
3. Seis para calibrar intervalos.
4. Seis posteriores para auditoría reservada.

Los objetivos de pesos terminan antes de comparar; los de selección antes de calibrar; los de calibración antes de auditar. En horizontes largos puede haber solapamiento **dentro** de una fase: las observaciones no son independientes. Los clásicos trabajan hasta cuatro años; ML usa anclas semanales y hasta cuatro años; Holt usa el último año y ARIMA los dos últimos. Ventanas y parámetros constan en código/metadatos.

Se prueban promedio de candidatos elegibles, top tres y ponderación inversa al MAE de los tres orígenes iniciales. Los pesos no usan auditoría. Stacking queda pendiente: tres orígenes de ponderación no justifican un metamodelo robusto.

MAE/RMSE y sesgo están en PEN/kg; sesgo = pronóstico − real. WAPE es porcentual. MASE usa la diferencia absoluta media de un día estimada en entrenamiento. Se calculan coberturas 80/95 en auditoría, sin MAPE como métrica principal. Las métricas de candidatos fallidos no se calculan con cortes más fáciles.

El candidato de validación se somete a un control de publicación frente a Naive en auditoría. Si no reduce MAE, se publica Naive con **sus propios** errores y rangos. No se busca otro ganador entre todos los modelos usando la auditoría. Esta decisión de publicación consultó auditoría: las métricas siguen siendo retrospectivas y requieren seguimiento prospectivo independiente. Una mejora puntual no acredita causalidad ni precisión general.

La cobertura se evalúa por separado: umbrales operativos 75% para objetivo 80 y 90% para objetivo 95. Un modelo puede mejorar MAE y tener intervalos insuficientes; se comunica esa limitación. Los rangos son cuantiles empíricos de error absoluto en calibración, con corrección finita y límite inferior positivo. No son porcentajes arbitrarios ni tienen garantía conformal bajo dependencia/cambios de régimen. La puerta de publicación reconstruye las predicciones de auditoría guardadas, reconcilia MAE y recalcula cobertura con los límites emitidos y tolerancia numérica de 1e-12 PEN/kg, para tratar consistentemente los empates de coma flotante.

En siembra y cosecha se consulta una curva completa del menor horizonte que cubre toda la ventana. No se concatenan tramos 7/15/30/90. El promedio de límites diarios **no** es un intervalo calibrado del promedio de cosecha. El precio sigue siendo mayorista en Lima: la región de la parcela no lo convierte en precio de chacra. Ciclo, rendimiento y costos son supuestos editables; el sistema no predice madurez agronómica.

## Aporte de variables y escenarios

A = precio/calendario; B = A + oferta; C = B + macro; D = C + clima; E = D + El Niño. Se conserva la comparación pareada por mismo modelo, estrategia directa, horizonte y cortes. **C/D/E están pendientes** cuando faltan vintages oficiales utilizables; sus errores se dejan vacíos. A+ENFEN es un experimento adicional real para medir las alertas sin fingir disponer de toda la cadena C/D. B usa oferta histórica sin publicaciones originales y se identifica como investigación.

Las correlaciones Pearson/Spearman, su estabilidad entre mitades, los pares colineales, autocorrelación y ADF son diagnósticos. La importancia por permutación se estima con una cola cronológica interna y purga de etiquetas; SHAP usa ejemplos de entrenamiento cuando el backend es compatible. Son explicaciones del ajuste, no mejoras individuales demostradas ni efectos causales.

Las hipótesis neutral/vigilancia/alerta cambian únicamente la categoría conocida en origen en un modelo con ENFEN evaluado. No reescriben rezagos, no asignan una temperatura a una alerta ni obligan al precio a subir o bajar. No son pronósticos oficiales; sus intervalos no están calibrados para la intervención. Los escenarios agrícolas favorable/adverso, probabilidades oficiales, índices cuantitativos vintage, clima ponderado por procedencia y causalidad quedan pendientes por falta de insumos verificables.

## Archivos y operación en Windows

- `agrodecide/forecasting/`: fuentes, contratos/as-of, features, 16 modelos, evaluación, enriquecimiento, publicación e historial prospectivo.
- `agrodecide/v4/{pipeline,export,diagnostics}.py`: integra el motor con la publicación existente.
- `src/components/ForecastWorkbench.tsx`: horizonte/modelo, curvas y 80/95, comparación, auditoría, ablación, sensibilidad y calidad.
- `ClimateInsights.tsx`, `SourceEvidence.tsx`, `src/data/useForecasting.ts`: indicadores, boletines y trazabilidad bajo demanda.
- `src/data/validation.ts`, `src/utils/forecast.ts`, `server/grounding.ts`: contratos de curvas completas y respuestas del asistente basadas en la publicación.
- `tests/test_forecasting_v2.py`: pruebas controladas; ninguna serie sintética se publica.

```powershell
npm ci
npm run dev
# En otro terminal, solo para trabajar con datos/modelos:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-v4.txt
python -m agrodecide.v4.pipeline --bootstrap --retrain
```

Con un warehouse existente, `python -m agrodecide.v4.pipeline` actualiza fuentes y resultados. Para ejecutar por etapas:

```powershell
python -m agrodecide.forecasting.sources
python -m agrodecide.forecasting.engine --variety Única --horizons 7 15 30 90 180 240
python -m agrodecide.forecasting.enrich
python -m agrodecide.forecasting.monitor
python -m agrodecide.v4.export
python -m unittest discover -s tests -p 'test_*.py'
npm test
npm run build
```

`AGRODECIDE_DATA` permite cambiar el directorio de trabajo. `requirements-ops.txt` incluye SHAP opcional; MLflow permanece opcional, sin un servidor desplegado. El registro verificable utilizado es JSON por ejecución con hash de código, precios, features, boletines y versiones de bibliotecas. La caché se invalida por código, datos, variables, parámetros y horizonte. `.gitattributes` conserva los bytes de los cuatro archivos usados por la huella de entrenamiento, para que Windows y Linux validen la misma ejecución. Cambiar pestaña no entrena.

Importación manual oficial, sin inventar disponibilidad:

```powershell
python -m agrodecide.forecasting.import_data "C:\datos\archivo_oficial.csv"
```

CSV/XLSX requiere `variable,periodo_observacion,valor,unidad,fuente,source_url,fecha_publicacion,fecha_disponibilidad,metodologia,tipo_registro`; este último debe ser `observado`. Clima exige `region,estacion`; índices oceánicos, `region` identificando Niño 1+2 o 3.4; volumen exige `producto,variedad,mercado_id`, toneladas no negativas. No se convierten sacos a kg sin factor documentado. Cada revisión conserva su identidad y fecha. Usar nombres de variable únicos por estación, variedad y mercado (por ejemplo `volumen_unica_15011501`); el importador rechaza identidades o unidades ambiguas y no promedia estaciones. Un archivo actual sin publicaciones históricas no es elegible por escribirle fechas supuestas. Las variables deben seguir nombres documentados: `volumen`, `produccion/superficie/rendimiento`, `precipitacion/temperatura/helada`, `ICEN/ONI/RONI/TSM`; otras se tratan como macro. Repetir backtest/enriquecimiento/exportación tras importar. El entrenamiento solo habilita familias con soporte suficiente en el primer corte de selección.

La publicación exige seis horizontes completos, hash de código actual, mismo histórico y enriquecimiento realizado. Archivos con nombres por contenido se escriben antes de actualizar índices. Un error de modelo no derriba la interfaz; un fallo global no se presenta como actualización exitosa. Los índices forman parte de un despliegue Vercel atómico. Una respuesta individual puede fallar y el consumidor detecta diferencias de hash.

El historial `issued/` guarda pronósticos desde su emisión real. El monitor solo puntúa objetivos posteriores al día de emisión cuando ya existen precios reales; no convierte backtest en experiencia de producción. Inicialmente puede haber cero resultados prospectivos.

GitHub Actions conserva la ejecución de las 03:00 de Perú y validaciones previas a despliegue. **La publicación nocturna requiere los secrets de Vercel**; el push de código a main sí genera despliegue conectado. Cache de Actions y artefactos de 30 días no sustituyen almacenamiento durable del worker. No se configuraron alertas Telegram/email ni se creó una base remota. El asistente funciona localmente sin clave; no se afirma GPT activo.

## Verificación y lectura de resultados

Ver [resultados reales](RESULTADOS_V2.md), [matriz de fuentes](FUENTES_V2.md) y [aceptación por fase](ACEPTACION_V2.md). Toda conclusión depende de los cortes y los vintages descritos. No se declara que este conjunto garantice beneficio ni que se haya demostrado el efecto de las variables ausentes.
