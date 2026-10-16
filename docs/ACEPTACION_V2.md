# Aceptación y pendientes · motor V2

Este documento distingue código implementado, verificaciones realizadas e insumos externos ausentes. Los valores de la ejecución se generan en [RESULTADOS_V2.md](RESULTADOS_V2.md); los accesos y cobertura en [FUENTES_V2.md](FUENTES_V2.md).

| Fase del encargo | Implementación | Límite / pendiente |
|---|---|---|
| 0. Auditoría | Repositorio, arquitectura React/Python/DuckDB, motor anterior y pruebas iniciales inspeccionados | La versión Streamlit anterior es archivo; no se migra de vuelta a Streamlit |
| 1. Base maestra | Originales, hashes, producto/variedad/mercado/unidades, ausencias, duplicados, atípicos, fechas y tabla separada | Publicaciones/revisiones SISAP desconocidas; contraste diario EMMSA sin extractor estructurado validado |
| 2. Clásicos | Diez implementaciones exclusivas de precios, parámetros y ejecución independiente | Estacionales se rechazan sin evidencia; fallos reales conservados, no curvas sustituidas |
| 3. Multivariables | Seis familias independientes; directo y recursivo en cortos, SARIMAX condicionado a exógenas conocidas | Covariables futuras mantenidas como escenario, no predicciones meteorológicas oficiales |
| 4. Macros | API real BCRP para tipo de cambio, IPC, alimentos y combustibles; contrato importación/as-of | Historial original de publicación/revisiones ausente; C sin puntuaciones; fertilizantes/actividad agrícola no validados |
| 5. El Niño | ICEN/ONI/RONI reales y separados, PDFs ENFEN fechados, alertas y rezagos candidatos, ablación A vs A+ENFEN | Disponibilidad de PDFs reconstruida de forma conservadora, no certificada. Sin índices cuantitativos vintage ni probabilidades oficiales estructuradas |
| 6. Análisis | Pearson/Spearman y estabilidad, colinealidad, ACF, ADF, importancia por permutación y SHAP compatible | No se afirma causalidad, selección individual óptima de rezagos o validación regional sin datos; diagnósticos no deciden sobre auditoría |
| 7. Futuros | Entradas causales en origen, mediana/escalamiento internos, SARIMAX con estado futuro documentado | No se suministran realizaciones futuras para aparentar precisión |
| 8. Backtesting | Seis horizontes, 18 orígenes, purga entre fases, MAE/RMSE/WAPE/MASE/sesgo/cobertura y errores por grupos | Ventanas largas dentro de cada fase se solapan; pocos eventos no justifican inferencia causal o garantía de cobertura |
| 9. Ensembles | Promedio, top tres, pesos por validación previa; mismo calendario y benchmarks | Stacking pendiente por insuficientes orígenes reservados para un metamodelo |
| 10. Escenarios | Sensibilidad aprendida a hipótesis de alerta neutral/vigilancia/alerta, diferencias absolutas/% | Favorable/adverso agrícola, contrafactual causal y escenarios con probabilidades oficiales pendientes; no se presentan como ejecutados |
| 11. Incertidumbre | Rangos empíricos 80/95, calibración separada, cobertura real y calificación | No se garantiza conformalidad bajo dependencia; cobertura insuficiente se informa sin ocultarla |
| 12. Plataforma | Laboratorio, tablas/descargas, comparaciones, curvas por horizonte, auditoría por origen, clima/fuentes y asistente conectado a resultados | Modelos nuevos solo para Única; otras variedades conservan motor previo. Entrenamiento no se lanza desde el navegador |
| 13. Velocidad | Cachés de fuentes/modelos por hash, dos hilos, archivos por contenido, carga diferida y curvas precalculadas | Latencia móvil depende de red/dispositivo; no se promete medio segundo universal |
| 14. Resiliencia | Caché oficial íntegra, fallos individuales aislados, estados y fechas, publicaciones incompatibles rechazadas, último despliegue válido preservado | Sin alertas externas Telegram/email; notificaciones de Actions dependen de configuración del propietario |
| 15. Pruebas | Contratos, calendarios, vintages, fuga temporal, familias, métricas, pesos, cachés, escenarios, regresión y publicación | No equivalen a validar campañas futuras, un servicio remoto o causalidad |
| 16. Integración | Cambios modulares sobre el repositorio existente; dependencias maduras, sin secretos ni base nueva | Python entrena en worker; Vercel sirve artefactos y asistente Node |
| 17. Aceptación | Criterios verificables de código, datos y métricas comprobados mediante pruebas y artefactos | No se declaran completos los insumos climáticos/macros ni los escenarios ausentes |
| 18. Entrega | Código, manual, resultados, matriz de fuentes, comandos Windows y pendientes | Publicación nocturna necesita secrets Vercel y almacenamiento durable para operación sostenida |

## Verificación reproducible

```powershell
python -m unittest discover -s tests -p 'test_*.py'
npm test
npm run build
python scripts/report_forecasting.py
```

La línea base fue 20 pruebas TypeScript/servidor y 13 Python aprobadas. Los nuevos casos agregan fechas de publicación y revisión, archivos ENFEN cargados tarde, ausencia frente a neutral, independencia de los 16 modelos, invalidación/reutilización de caché, escenarios sin reescribir rezagos y curvas completas sin mezclar horizontes. Las pruebas de publicación recalculan las métricas desde los pares reales/pronosticados y cotejan el histórico oficial.

Los sintéticos se usan únicamente en pruebas controladas. Los documentos finales de resultados y fuentes se generan desde el reporte actual enriquecido con hash de código coincidente. El seguimiento prospectivo arranca con emisiones reales guardadas: un contador cero inicial es esperado y no se sustituye por backtest.

La retirada de texto «piloto», «Diseño basado…» y versiones del pie no altera la calificación estadística. Un rango con cobertura baja conserva su advertencia para evitar presentar confianza no demostrada.

## Resultado de la verificación de entrega

El 16/10/2026 se aprobaron **46 pruebas Python y 28 TypeScript/servidor**, sin omisiones. La compilación TypeScript/Vite terminó correctamente. Se reconciliaron **51 auditorías**: seis de Única y cinco de cada una de las otras nueve variedades.

En navegador local se verificaron los horizontes y selección de modelos, diez clásicos filtrados, cambio de origen, CSV real de 15 filas con límites 80/95, sensibilidad ENFEN (incluido efecto nulo), 127 comunicados, fuentes, siembra con una curva completa a 180 días, venta/espera y respuesta local del asistente con cobertura auditada. No hubo errores de consola. Se revisaron anchos 320, 390, 820 y escritorio, sin desbordamiento de página; las tablas extensas se desplazan dentro de su contenedor y admiten foco de teclado.

La prueba independiente detectó y motivó corregir empates de coma flotante en límites de cobertura. La publicación final recalcula estos casos con tolerancia 1e-12 PEN/kg; los precios centrales, MAE, selección y pesos no cambiaron. Los valores finales están en el informe de resultados, generado después de la corrección.
