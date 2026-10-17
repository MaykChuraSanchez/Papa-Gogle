# AR(1) log con validación interna · investigación V5

Este candidato es nuevo en este encargo; el repositorio V2 no contenía el supuesto modelo ni resultados de 17/29/28% descritos en el documento. No se copian esas afirmaciones como resultados.

`log(P_t) − μ = φ(log(P_t−1) − μ) + ε_t`. μ es la media de log-precios de la ventana de ajuste. φ se estima por mínimos cuadrados sobre pares centrados y se rechaza si `|φ|≥1`; no se recorta para fabricar convergencia. Se guarda vida media sólo si 0<φ<1. La referencia geométrica exp(μ) no equivale a media aritmética de precios.

Cada origen externo elige 365/540/730/1095 días o ventana expansiva usando tres validaciones internas mensuales cuyo último objetivo termina, como máximo, en ese origen. Deben completarse los tres cortes; una ventana no disponible o inestable queda fuera. Se minimiza MAE de toda la trayectoria diaria, nunca el tramo de auditoría. Las ventanas no son cinco contrastes sobre el test.

La trayectoria diaria se obtiene analíticamente para cada k: `m_k = μ + φ^k(log(P_T)−μ)`, `v_k = σ²(1−φ^(2k))/(1−φ²)` y `E[P_T+k|P_T] = exp(m_k + v_k/2)` bajo el supuesto lognormal condicional. Se conserva la mediana exp(m_k) para auditar la corrección. No se llama corrección no paramétrica de Duan/smearing a esta fórmula gaussiana. Las bandas públicas proceden de errores empíricos de calibración, no de afirmar que los residuos cumplen normalidad.

La validación contiene 6 orígenes de selección, 6 de calibración, 12 de auditoría y separación del horizonte completo entre fases. Los últimos 240 días no se puntúan para seleccionar/promover en este protocolo. **Ya fueron inspeccionados por V2**; las curvas actuales son refits que aprovechan observaciones recientes, de modo que no se presentan esos 240 días como prueba final globalmente virgen. La prueba global realmente nueva debe ser prospectiva y emitida antes de observar sus objetivos.

La selección escoge un challenger entre AR1/media28/EWM0.1/drift usando exclusivamente selección. Sólo ese challenger se contrasta con Naive por auditoría. La inferencia usa pérdidas MAE por origen pareadas y bootstrap circular con 4999 réplicas, semilla 20261016; longitud de bloque `max(2,ceil(h/espaciado_mediano))`. No cuenta cientos de días solapados como cientos de experimentos independientes. Holm corrige la familia completa de 60 comparaciones variedad×horizonte. El modelo requiere mejora relativa≥3% configurable, ICbootstrap95% de reducción absoluta estrictamente positivo, pHolm≤0.05,≥6 bloques efectivos aproximados y≥8/12 orígenes favorables. Se expone sensibilidad 0/3/5/10% sin volver a ajustar parámetros a auditoría.

El bootstrap supone estabilidad aproximada de pérdidas. Con 12 orígenes y h=180/240 hay poca información independiente y la compuerta impide promoción aun cuando disminuya MAE. Ni un p pequeño ni ACF(1) grande garantizan utilidad futura. Las bandas 80/95 son cuantiles de errores absolutos en calibración separada con corrección de rango finito: la dependencia impide prometer cobertura nominal exacta.

MAE de trayectoria = promedio de errores absolutos diarios t+1…t+h sobre objetivos observados; **no** es MAE del precio medio de la ventana. MAE endpoint = error sólo en t+h por origen. Los dos scores se publican separados. Datos faltantes no se convierten en objetivos; ffill causal≤7 días se utiliza sólo al ajustar modelos. No usa macros/clima/volumen porque no se puede certificar aquí su disponibilidad histórica; el motor V2 y sus ablations quedan preservados.

## Reproducción y trazabilidad

`python -m agrodecide.research_v5.run --min-improvement 0.03`

Un solo lector DuckDB `read_only=True` carga la tabla `prices`; cero escrituras DuckDB y cero cambios automáticos a `public/`. Los cachés dependen de SHA256 del código de todo el paquete y de la serie. El informe guarda run_id, hash de filas completas, hash compatible de precio, parámetros y versiones de librerías. La publicación es un paso explícito separado. Si cambia código/dato, no se reutiliza una evaluación de otra implementación.

## Referencias primarias consultadas

- [Forecasting: Principles and Practice · transformaciones y sesgo al volver de log](https://otexts.com/fpp3/toolbox.html): distinción entre mediana y media al retransfomar; aquí la fórmula exacta es condicional al supuesto gaussiano declarado.
- [statsmodels · ADF](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html): nula de raíz unitaria y selección de rezagos.
- [statsmodels · KPSS](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html): nula de estacionariedad y p tabulados acotados.
- [arch · CircularBlockBootstrap](https://arch.readthedocs.io/en/latest/bootstrap/generated/arch.bootstrap.CircularBlockBootstrap.html): bloques de longitud fija con continuidad circular. La implementación local no añade la dependencia arch.
- [statsmodels · corrección de múltiples contrastes](https://www.statsmodels.org/stable/generated/statsmodels.stats.multitest.multipletests.html): contraste unitario contra implementación de Holm existente en tests.

Las versiones efectivamente utilizadas están en el JSON del run; las páginas `stable` pueden describir versiones posteriores.


El campo técnico de AR1 `observations` cuenta los días de ajuste regularizados de la ventana (incluye ffill causal declarado), no nuevas cotizaciones. El número de cotizaciones originales y días imputados se conserva por separado en `series.quality`. Ningún objetivo de evaluación se imputa.

