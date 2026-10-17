# Auditoría de partida · V5

Fecha de inspección: 16/10/2026, Perú. Repositorio real `MaykChuraSanchez/Papa-Gogle`, checkout `Papa-Gogle`, base `609270079a51a4d47e3c59fc09b12a70aab5f919`. La aplicación de Vercel usa React19/Vite8/TypeScript; los directorios Streamlit y las exportaciones de AI Studio son antecedentes, no el frontend que sirve esa URL. Rama de trabajo V5: `codex/agrodecide-v5`.

## Recorrido de un número

`SISAP HTML oficial → agrodecide/v4/sisap.py (contrato y caché) → ingest.py → data/v4/warehouse.duckdb → train/refresh → forecasts.json → export.py → public/data/index.json → serie por variedad → DataProvider → tarjeta/simulador`. El motor avanzado añade `forecasting/sources → engine → enrich → public/forecasting/index.json → useForecasting → ForecastWorkbench`. Vercel sirve artefactos precalculados; no entrena en una petición móvil. La fecha de cotización no demuestra la fecha original de publicación ni que los datos revisados fueran conocidos entonces.

## Afirmaciones contrastadas

| Afirmación | Estado inicial comprobado | Evidencia / implicación |
|---|---|---|
| AR(1) log con reversión ya implementado | Ausente | No estaba en el catálogo ni en los artefactos V2; se implementa y evalúa ahora en paquete separado. |
| Mejoras medianas17/29/28% y significancia | No acreditadas | No se recuperaron ejecuciones que sostengan esos porcentajes; no se publican. |
| 16 familias avanzadas para las10 variedades | Parcial | Motor V2 avanzado sólo para Única; nueve variedades mantienen evaluación anterior de5 modelos. No se atribuyen resultados de Única a todas. |
| Seis horizontes7/15/30/90/180/240 | Parcial | V2 Única seis; variantes anteriores no incluyen15d. El nuevo experimento sí evalúa los seis para las diez. |
| Pronósticos inventados / curvatura manual | No observada en V2 auditado | Naive dibuja una línea constante por definición; se conservan referencias cuando no hay mejora defendible. Los resultados se contrastan con filas fechadas. |
| ENFEN, ICEN y Pacífico central | Integrados con restricciones | Alertas con disponibilidad aproximada; ICEN/ONI/RONI revisados no elegibles como vintages históricos. |
| Clima local de Tarma | Insuficiente | Catálogo de estaciones no equivalía a series diarias de parcela. V5 añade documentos SENAMHI recuperados y distingue sus alcances. |
| BCRP y volumen ya mejoran el pronóstico | No demostrado | Correlaciones/experimentos exploratorios; faltan publicaciones históricas originales. V2 volumen sólo investigación. |
| Gráfico80/95 completo | Parcial |95 existía en datos/CSV, pero sólo80 se dibujaba. Se corrige sin alterar límites. |
| Lazy loading por ruta | Ausente | Rutas importadas de forma anticipada; entrada JS126.52KB (38.39KB gzip), charts430.09KB. |
| `180d` siempre disponible | Suposición insegura | Dashboard usaba aserción no nula. V5 muestra ausencia en lugar de romper la pantalla. |
| IA externa activa | No | Sin API privada configurada. Asistente local operativo; no se inventa activación de GPT. |
| Operación nocturna publicada automáticamente | No verificada | Workflow03:00 Perú existente; secrets de Vercel y persistencia remota no acreditados. |

## Diagnóstico de datos y modelo existente

28.752 registros históricos de11 variedades; catálogo operativo10, excluye Perricholi desactualizada. Historias2019-01-01 a2026-10-15; unidad PEN/kg mayorista, GMML Lima. Única:2.834 observaciones de2.845 días, último precio1.81. No son cotizaciones en chacra de Tarma. Las cifras iniciales se guardaron antes de modificar UI o investigación.

V2 Única conserva su fingerprint `b11aa4231021f0031bd7571ad3036b116cd0b9f1955089ca7b2152dce1c5e30f`, con `models.py/features.py/engine.py/data.py` sin cambios. Usa selección, calibración y auditoría purgadas; seis orígenes por fase, subdivisión para pesos/ranking. Auditoría V2 h180: Holt-Winters amortiguado MAE≈0.6140 vs Naive≈0.7011; cobertura80≈71.6%,95≈84.4%, insuficiente. Los otros cinco horizontes publican referencia Naive. No se mezcla ese score con la nueva auditoría V5 de fechas distintas.

## Verificación y límites del entorno

Baseline TypeScript:28/28 y build correctos. El primer intento Python con temporales predeterminados quedó bloqueado por permisos de Windows; no se contabilizó como prueba aprobada. Repetición con temporales en workspace (`scripts/run_tests_v5.py`):106/106, incluyendo46 heredadas y60 nuevas de investigación/clima/publicación. `OMP_NUM_THREADS=2` y `OPENBLAS_NUM_THREADS=2` limitan concurrencia numérica; no alteran el protocolo. Las capturas anteriores quedaron en la entrega local `design-review/v5/antes-escritorio.png` y `antes-movil.png`.

## Decisiones de alcance

Se conserva el motor multivariable V2 y la lógica económica. La investigación V5 incorpora cinco referentes de precio sobre las10 series; no afirma reentrenar16 familias sobre todas sin datos exógenos verificables. Se preservan intervalos y modelos inválidos quedan explícitos. Se usa el brief como requisitos a contrastar, no como evidencia científica de los resultados que afirmaba. Sólo se publican las dos fotografías de adultos autorizadas expresamente por el propietario; las imágenes con menores no se incorporan.
