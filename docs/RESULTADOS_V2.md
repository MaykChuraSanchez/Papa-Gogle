# Resultados verificados · motor 2.0

Ejecución: 2026-10-15T23:51:19.933004-05:00. Enriquecimiento: 2026-10-15T23:59:14.782730-05:00. Papa Única, GMML Lima, PEN/kg. Último precio real 1.81, observado el 2026-10-15.

Código `b11aa4231021f0031bd7571ad3036b116cd0b9f1955089ca7b2152dce1c5e30f`. Precios `d68cbd76f386b453a6cd2e07702e41b6b037c5eec0b7089cba3f1dba69601445`. Variables `2589b1e7c8958e2984a71997cd9f1768c8249eb8d863b7d7c3b873c849585706`. Estos resultados se generaron desde predicciones guardadas; los anteriores resultados de desarrollo no se publican.

Las métricas del motor anterior usan cortes diferentes y no se comparan directamente como si fueran el mismo experimento. Seis orígenes de auditoría por horizonte, posteriores a selección y calibración. Las métricas son retrospectivas; en horizontes largos las ventanas internas se solapan. No son una garantía de acierto ni un experimento causal.

## Política publicada

| Días | Modelo publicado | MAE | MAE Naive | RMSE | WAPE % | MASE | Sesgo | Cobertura 80 % | Cobertura 95 % | n |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7 | Naive · PRICE_ONLY · classical | 0.0610 | 0.0610 | 0.0883 | 3.4792 | 1.6816 | 0.0048 | 90.5 | 97.6 | 42 |
| 15 | Naive · PRICE_ONLY · classical | 0.0948 | 0.0948 | 0.1333 | 5.3570 | 2.6152 | -0.0126 | 86.7 | 93.3 | 90 |
| 30 | Naive · PRICE_ONLY · classical | 0.1681 | 0.1681 | 0.2630 | 9.0745 | 4.6537 | -0.0569 | 82.8 | 91.7 | 180 |
| 90 | Naive · PRICE_ONLY · classical | 0.3566 | 0.3566 | 0.4589 | 18.7786 | 9.9151 | 0.0045 | 66.1 | 81.9 | 540 |
| 180 | Holt-Winters aditivo amortiguado · PRICE_ONLY · classical | 0.6140 | 0.7011 | 0.7543 | 34.3095 | 17.0619 | -0.1894 | 71.6 | 84.4 | 1080 |
| 240 | Naive · PRICE_ONLY · classical | 0.7476 | 0.7476 | 0.9402 | 46.3232 | 20.6773 | -0.7206 | 60.9 | 63.6 | 1440 |

## Candidato elegido antes de auditoría

| Días | Candidato de validación | MAE auditoría del candidato | Mejora frente a Naive % | Decisión |
|---:|---|---:|---:|---|
| 7 | Holt Damped · PRICE_ONLY · classical | 0.0771 | -26.42 | El candidato no reduce el MAE de Naive en auditoría; se publica la referencia y se conserva la comparación completa. |
| 15 | CatBoost · A · recursive | 0.1343 | -41.67 | El candidato no reduce el MAE de Naive en auditoría; se publica la referencia y se conserva la comparación completa. |
| 30 | LightGBM · A · recursive | 0.2454 | -46.04 | El candidato no reduce el MAE de Naive en auditoría; se publica la referencia y se conserva la comparación completa. |
| 90 | Seasonal Naive · PRICE_ONLY · classical | 0.5765 | -61.68 | El candidato no reduce el MAE de Naive en auditoría; se publica la referencia y se conserva la comparación completa. |
| 180 | Holt-Winters aditivo amortiguado · PRICE_ONLY · classical | 0.6140 | 12.42 | El candidato reduce el MAE respecto de Naive en auditoría. La cobertura de sus intervalos es insuficiente: interpretar los límites como rangos de error histórico, no como cobertura futura garantizada. |
| 240 | ARIMA · PRICE_ONLY · classical | 0.7476 | 0.00 | El candidato no reduce el MAE de Naive en auditoría; se publica la referencia y se conserva la comparación completa. |

Una línea plana puede ser la referencia de último precio cuando los modelos más complejos no la superan. No se introduce una tendencia para hacer atractivo el gráfico. Una reducción de MAE puede coexistir con rangos insuficientes; ambos resultados se muestran por separado.

## Ablación pareada con alertas ENFEN

Δ = MAE(A+ENFEN) − MAE(A), mismos modelos, estrategia directa y cortes. Negativo indica menor error. No equivale a efecto causal ni a validación de la cadena C/D/E.

| Días | Modelo | MAE A | MAE A+ENFEN | Δ MAE |
|---:|---|---:|---:|---:|
| 7 | SARIMAX | — | 0.0614 | — |
| 7 | Decision Tree | 0.0577 | 0.0540 | -0.0037 |
| 7 | Random Forest | 0.0561 | 0.0565 | 0.0004 |
| 7 | XGBoost | 0.0558 | 0.0655 | 0.0097 |
| 7 | LightGBM | 0.0694 | 0.0681 | -0.0014 |
| 7 | CatBoost | 0.0527 | 0.0543 | 0.0017 |
| 15 | SARIMAX | — | 0.0949 | — |
| 15 | Decision Tree | 0.1198 | 0.1206 | 0.0008 |
| 15 | Random Forest | 0.0775 | 0.0777 | 0.0002 |
| 15 | XGBoost | 0.0857 | 0.0868 | 0.0011 |
| 15 | LightGBM | 0.0863 | 0.0905 | 0.0042 |
| 15 | CatBoost | 0.0855 | 0.0822 | -0.0033 |
| 30 | SARIMAX | — | 0.1677 | — |
| 30 | Decision Tree | 0.1891 | 0.2030 | 0.0138 |
| 30 | Random Forest | 0.1574 | 0.1698 | 0.0125 |
| 30 | XGBoost | 0.1468 | 0.1579 | 0.0110 |
| 30 | LightGBM | 0.1616 | 0.1687 | 0.0071 |
| 30 | CatBoost | 0.1634 | 0.1737 | 0.0103 |
| 90 | SARIMAX | — | 0.3566 | — |
| 90 | Decision Tree | 0.3512 | 0.3157 | -0.0355 |
| 90 | Random Forest | 0.3319 | 0.3506 | 0.0187 |
| 90 | XGBoost | 0.3539 | 0.3247 | -0.0292 |
| 90 | LightGBM | 0.3239 | 0.3185 | -0.0055 |
| 90 | CatBoost | 0.3607 | 0.3465 | -0.0142 |
| 180 | SARIMAX | — | — | — |
| 180 | Decision Tree | 0.4548 | — | — |
| 180 | Random Forest | 0.4719 | — | — |
| 180 | XGBoost | 0.4155 | — | — |
| 180 | LightGBM | 0.4210 | — | — |
| 180 | CatBoost | 0.4571 | — | — |
| 240 | SARIMAX | — | — | — |
| 240 | Decision Tree | 0.4166 | — | — |
| 240 | Random Forest | 0.4547 | — | — |
| 240 | XGBoost | 0.4321 | — | — |
| 240 | LightGBM | 0.4113 | — | — |
| 240 | CatBoost | 0.4570 | — | — |

SARIMAX A no se ejecuta: sin exógenas sería ARIMA. Guiones indican ajustes no disponibles, no errores cero. El detalle de cada restricción está en el JSON del horizonte y en el laboratorio.

## Periodos y ejecución

| Días | Selección (pesos / ranking) | Calibración | Auditoría | Candidatos válidos | Fallos registrados |
|---:|---|---|---|---:|---:|
| 7 | 2025-04-30, 2025-05-31, 2025-06-30 / 2025-07-31, 2025-08-31, 2025-09-30 | 2025-10-31, 2025-11-30, 2025-12-31, 2026-01-31, 2026-02-28, 2026-03-31 | 2026-04-30, 2026-05-31, 2026-06-30, 2026-07-31, 2026-08-31, 2026-09-30 | 45 | 0 |
| 15 | 2025-04-30, 2025-05-31, 2025-06-30 / 2025-07-31, 2025-08-31, 2025-09-30 | 2025-10-31, 2025-11-30, 2025-12-31, 2026-01-31, 2026-02-28, 2026-03-31 | 2026-04-30, 2026-05-31, 2026-06-30, 2026-07-31, 2026-08-31, 2026-09-30 | 45 | 0 |
| 30 | 2025-03-31, 2025-04-30, 2025-05-31 / 2025-06-30, 2025-07-31, 2025-08-31 | 2025-09-30, 2025-10-31, 2025-11-30, 2025-12-31, 2026-01-31, 2026-02-28 | 2026-03-31, 2026-04-30, 2026-05-31, 2026-06-30, 2026-07-31, 2026-08-31 | 45 | 0 |
| 90 | 2024-07-31, 2024-08-31, 2024-09-30 / 2024-12-31, 2025-01-31, 2025-02-28 | 2025-05-31, 2025-06-30, 2025-07-31, 2025-08-31, 2025-09-30, 2025-10-31 | 2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31, 2026-06-30 | 28 | 2 |
| 180 | 2023-07-31, 2023-08-31, 2023-09-30 / 2024-03-31, 2024-04-30, 2024-05-31 | 2024-11-30, 2024-12-31, 2025-01-31, 2025-02-28, 2025-03-31, 2025-04-30 | 2025-10-31, 2025-11-30, 2025-12-31, 2026-01-31, 2026-02-28, 2026-03-31 | 22 | 8 |
| 240 | 2022-11-30, 2022-12-31, 2023-01-31 / 2023-09-30, 2023-10-31, 2023-11-30 | 2024-07-31, 2024-08-31, 2024-09-30, 2024-10-31, 2024-11-30, 2024-12-31 | 2025-08-31, 2025-09-30, 2025-10-31, 2025-11-30, 2025-12-31, 2026-01-31 | 22 | 8 |

## Interpretación y pendientes

Precios históricos actuales de SISAP, sin vintages de revisión ni publicación por observación. Evaluación quote-date, no verificación de un archivo point-in-time completo.

Disponibilidad ENFEN reconstruida como máximo de fecha impresa y versión pública del archivo (ind), más un día. No es un log certificado de primera publicación; archivos sin versión verificable quedan excluidos.

C/D/E no tienen métricas mientras falten publicaciones originales de macro/clima y oferta elegible. ICEN, ONI/RONI y BCRP revisados se preservan como contexto; no se usan como si las revisiones ya hubieran sido publicadas. La oferta SISAP se analiza en B como investigación. No se validaron efectos regionales ni una cadena causal océano → clima → producción → precio.

Las sensibilidades modifican la alerta actual de un modelo con ENFEN, sin alterar sus rezagos. El resultado puede ser nulo. No son una predicción climática ni una recomendación de hectáreas a sembrar. Las emisiones futuras se guardan por separado para poder medir posteriormente el error prospectivo.

Los seis reportes web incluyen todos los candidatos, sus parámetros, cortes, fallos, métricas y curvas actuales. El registro local conserva el reporte completo y hashes para reproducir la ejecución. Ver [manual](MOTOR_PRONOSTICOS_V2.md) y [fuentes](FUENTES_V2.md).
