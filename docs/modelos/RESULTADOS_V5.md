# Evaluación reproducible V5

Run `research-v5-d8d020466b89b190691f`; código `08791f8d02eea62053ea784863ecc7aef3a107919b674a0bd1404e1d55c0e367`; entrada `b9d336569e01db61d16850e357a9e1d129a28779b5f7d97da52c6c31f055e16e`.

No se recuperaron las supuestas mejoras de 17/29/28% del encargo: no eran resultados existentes en este repositorio. Este experimento vuelve a medirlas con otro protocolo; no se comparan directamente scores de cortes distintos.

| Variedad | h | Challenger seleccionado | Mejora audit % | p Holm | Bloques efectivos | Recomendado por compuerta | MAE recomendado | MAE endpoint |
|---|---:|---|---:|---:|---:|---|---:|---:|
| Amarilla | 7 | AR1 log · ventana validada | 0.14 | 1.0000 | 6.00 | Naive | 0.1154 | 0.2167 |
| Amarilla | 15 | Random walk con drift | 1.10 | 1.0000 | 6.00 | Naive | 0.2077 | 0.2892 |
| Amarilla | 30 | Random walk con drift | 1.80 | 1.0000 | 6.00 | Naive | 0.2636 | 0.1817 |
| Amarilla | 90 | AR1 log · ventana validada | 6.18 | 1.0000 | 4.00 | Naive | 0.3508 | 0.2925 |
| Amarilla | 180 | AR1 log · ventana validada | 18.24 | 1.0000 | 2.00 | Naive | 0.4404 | 0.3925 |
| Amarilla | 240 | EWM 0.1 | -5.26 | 1.0000 | 1.50 | Naive | 0.5478 | 0.5117 |
| Blanca | 7 | Random walk con drift | -1.03 | 1.0000 | 6.00 | Naive | 0.0585 | 0.0867 |
| Blanca | 15 | Random walk con drift | 1.04 | 1.0000 | 6.00 | Naive | 0.0976 | 0.1158 |
| Blanca | 30 | Random walk con drift | 2.67 | 1.0000 | 6.00 | Naive | 0.1249 | 0.1575 |
| Blanca | 90 | AR1 log · ventana validada | -0.64 | 1.0000 | 4.00 | Naive | 0.1994 | 0.2917 |
| Blanca | 180 | AR1 log · ventana validada | 36.71 | 0.0120 | 2.00 | Naive | 0.4087 | 0.5742 |
| Blanca | 240 | Media 28 días | -6.92 | 1.0000 | 1.50 | Naive | 0.4480 | 0.4092 |
| Canchán | 7 | AR1 log · ventana validada | 0.48 | 1.0000 | 6.00 | Naive | 0.0577 | 0.0733 |
| Canchán | 15 | Random walk con drift | -0.47 | 1.0000 | 6.00 | Naive | 0.0897 | 0.1533 |
| Canchán | 30 | Random walk con drift | 1.36 | 1.0000 | 6.00 | Naive | 0.1127 | 0.1750 |
| Canchán | 90 | AR1 log · ventana validada | 9.34 | 1.0000 | 4.00 | Naive | 0.1923 | 0.2742 |
| Canchán | 180 | AR1 log · ventana validada | 22.40 | 0.0120 | 2.00 | Naive | 0.3007 | 0.3142 |
| Canchán | 240 | Media 28 días | -7.27 | 1.0000 | 1.50 | Naive | 0.3518 | 0.2683 |
| Color | 7 | Random walk con drift | 2.82 | 1.0000 | 6.00 | Naive | 0.0420 | 0.0583 |
| Color | 15 | Random walk con drift | 2.08 | 1.0000 | 6.00 | Naive | 0.0724 | 0.1292 |
| Color | 30 | AR1 log · ventana validada | 1.69 | 1.0000 | 6.00 | Naive | 0.1077 | 0.1550 |
| Color | 90 | Random walk con drift | -5.47 | 1.0000 | 4.00 | Naive | 0.2049 | 0.3525 |
| Color | 180 | AR1 log · ventana validada | 13.72 | 1.0000 | 2.00 | Naive | 0.3576 | 0.4367 |
| Color | 240 | Media 28 días | -2.48 | 1.0000 | 1.50 | Naive | 0.4104 | 0.3108 |
| Huamantanga | 7 | Random walk con drift | -0.20 | 1.0000 | 6.00 | Naive | 0.0975 | 0.1725 |
| Huamantanga | 15 | Random walk con drift | -1.58 | 1.0000 | 6.00 | Naive | 0.1236 | 0.1350 |
| Huamantanga | 30 | Random walk con drift | -3.02 | 1.0000 | 6.00 | Naive | 0.1646 | 0.2383 |
| Huamantanga | 90 | AR1 log · ventana validada | 9.25 | 1.0000 | 4.00 | Naive | 0.1720 | 0.1975 |
| Huamantanga | 180 | AR1 log · ventana validada | 3.69 | 1.0000 | 2.00 | Naive | 0.2037 | 0.2350 |
| Huamantanga | 240 | Media 28 días | -4.30 | 1.0000 | 1.50 | Naive | 0.2275 | 0.2975 |
| Huayro | 7 | EWM 0.1 | -2.16 | 1.0000 | 6.00 | Naive | 0.1202 | 0.2008 |
| Huayro | 15 | EWM 0.1 | 15.16 | 1.0000 | 6.00 | Naive | 0.1558 | 0.2025 |
| Huayro | 30 | Random walk con drift | -3.39 | 1.0000 | 6.00 | Naive | 0.1849 | 0.2800 |
| Huayro | 90 | AR1 log · ventana validada | -0.76 | 1.0000 | 4.00 | Naive | 0.2146 | 0.3058 |
| Huayro | 180 | AR1 log · ventana validada | 2.88 | 1.0000 | 2.00 | Naive | 0.2628 | 0.4442 |
| Huayro | 240 | EWM 0.1 | -5.36 | 1.0000 | 1.50 | Naive | 0.3070 | 0.4733 |
| Negra Andina | 7 | AR1 log · ventana validada | 2.14 | 1.0000 | 6.00 | Naive | 0.0617 | 0.0717 |
| Negra Andina | 15 | AR1 log · ventana validada | 0.78 | 1.0000 | 6.00 | Naive | 0.0856 | 0.1100 |
| Negra Andina | 30 | Random walk con drift | 1.19 | 1.0000 | 6.00 | Naive | 0.1120 | 0.1225 |
| Negra Andina | 90 | AR1 log · ventana validada | 11.98 | 1.0000 | 4.00 | Naive | 0.1573 | 0.2200 |
| Negra Andina | 180 | AR1 log · ventana validada | 34.32 | 0.0120 | 2.00 | Naive | 0.3511 | 0.4950 |
| Negra Andina | 240 | Media 28 días | -2.85 | 1.0000 | 1.50 | Naive | 0.4262 | 0.4800 |
| Peruanita | 7 | AR1 log · ventana validada | 7.62 | 1.0000 | 6.00 | Naive | 0.0920 | 0.1125 |
| Peruanita | 15 | AR1 log · ventana validada | -0.43 | 1.0000 | 6.00 | Naive | 0.1322 | 0.2158 |
| Peruanita | 30 | AR1 log · ventana validada | 1.97 | 1.0000 | 6.00 | Naive | 0.1817 | 0.1383 |
| Peruanita | 90 | AR1 log · ventana validada | -0.87 | 1.0000 | 4.00 | Naive | 0.1925 | 0.2817 |
| Peruanita | 180 | AR1 log · ventana validada | 20.68 | 1.0000 | 2.00 | Naive | 0.2816 | 0.3650 |
| Peruanita | 240 | Media 28 días | 4.61 | 1.0000 | 1.50 | Naive | 0.3052 | 0.3250 |
| Yungay | 7 | Random walk con drift | -1.03 | 1.0000 | 6.00 | Naive | 0.0585 | 0.0867 |
| Yungay | 15 | Random walk con drift | 1.04 | 1.0000 | 6.00 | Naive | 0.0976 | 0.1158 |
| Yungay | 30 | Random walk con drift | 2.67 | 1.0000 | 6.00 | Naive | 0.1249 | 0.1575 |
| Yungay | 90 | AR1 log · ventana validada | -1.04 | 1.0000 | 4.00 | Naive | 0.1994 | 0.2917 |
| Yungay | 180 | AR1 log · ventana validada | 38.47 | 0.0120 | 2.00 | Naive | 0.4200 | 0.5867 |
| Yungay | 240 | Media 28 días | -4.30 | 1.0000 | 1.50 | Naive | 0.4598 | 0.4233 |
| Única | 7 | Random walk con drift | 1.52 | 1.0000 | 6.00 | Naive | 0.0505 | 0.0625 |
| Única | 15 | AR1 log · ventana validada | 4.90 | 1.0000 | 6.00 | Naive | 0.0753 | 0.1258 |
| Única | 30 | AR1 log · ventana validada | -1.64 | 1.0000 | 6.00 | Naive | 0.1314 | 0.2142 |
| Única | 90 | AR1 log · ventana validada | -4.06 | 1.0000 | 4.00 | Naive | 0.2555 | 0.4567 |
| Única | 180 | AR1 log · ventana validada | 12.48 | 1.0000 | 2.00 | Naive | 0.4495 | 0.6133 |
| Única | 240 | Media 28 días | 1.08 | 1.0000 | 1.50 | Naive | 0.5265 | 0.4567 |

## Interpretación de resultados

La compuerta puede conservar Naive aunque una MAE retrospectiva aparente ser mejor. Con12 orígenes mensuales, h180/240 tienen aproximadamente2/1.5 bloques efectivos, insuficientes para una promoción defendible. El mínimo6 es una regla conservadora preespecificada, no un teorema. El bootstrap circular supone pérdidas aproximadamente estacionarias; cambios de régimen pueden invalidarlo.

El tramo final240d no fue puntuado para escoger un ganador, pero la historia ya fue inspeccionada por V2. Las curvas emitidas hoy son refits con datos actuales. No se afirma test final globalmente virgen: la validación verdaderamente nueva será prospectiva tras la fecha de emisión.

MAE trayectoria reúne los errores observados de cada día t+1…t+h; no significa error del precio promedio de la ventana. MAE endpoint usa sólo lead=h por origen. No se interpolan seis puntos para construir la trayectoria diaria.

Esta investigación NO sobrescribe el campeón V2 de Única: tiene cortes, gates y candidatos distintos. La app debe nombrar el run y objetivo al comparar. Modelos multivariables V2 quedan preservados; este experimento añade AR1 y cuatro referentes sencillos, no reentrena16 familias sobre10series sin justificación.

## Regenerar

`python -m agrodecide.research_v5.run --min-improvement 0.03`

Combinaciones evaluadas 60; contrastes Holm 60; promociones 0. Los umbrales0/3/5/10% se muestran como sensibilidad sin retunear la auditoría.

## Registro descargable y exclusiones

[EXPERIMENTOS_V5.csv](EXPERIMENTOS_V5.csv) contiene 299 evaluaciones completas de candidatos, objetivo de trayectoria y endpoint separados, coberturas y huellas. El contraste pHolm corresponde exclusivamente al challenger elegido por selección; los demás gains son descriptivos. [EVIDENCIA_RUN_V5.json](EVIDENCIA_RUN_V5.json) fija el run y verificación de24tests.

AR1 se excluyó únicamente en Color7d: en el corte de calibración2024-12-31 el ajuste final resultó |phi|≥1. No se recortó el coeficiente ni se fabricaron métricas. Las60combinaciones conservan Naive y curvas recomendadas completas;59 tienen además AR1 evaluable.
