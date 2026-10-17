# Contrato del catálogo climático

Ruta pública: `/climate-v5/index.json`. Esquema: `/climate-v5/schema.json` (v1.0.0). Validador de publicación: `agrodecide/climate_v5/contracts.py`.

| Campo | Significado |
|---|---|
| `as_of`, `generated_at` | Día del corte explícito y hora UTC real de generación del snapshot |
| `context` | Tarma/Junín como zona productora y GMML Lima como mercado de precio, sin equipararlos |
| `evidence[]` | Evidencia con tipo, emisión, disponibilidad, vigencia, geografía, fuente y estado derivado |
| `indicators[]` | Dos anomalías recientes NOAA y tres índices trimestrales revisados; fuente por `evidence_id` |
| `event_comparisons[]` | Ventanas julio–junio por ICEN y RONI separadas; nulo no equivale a cero |
| `regional_scenarios[]` | Hipótesis condicionales cualitativas; sin ajuste numérico del precio |
| `map_layers[]` | Capas independientes de lluvia, riesgo papa, observación, procedencia y fiabilidad |
| `missing_indicators[]` | Variables no verificadas y motivo concreto de ausencia |
| `source_checks[]` | Última consulta efectiva, hash y ruta oficial de los catálogos |
| `limitations[]` | Límites que deben mantenerse accesibles en la UI |

`kind` distingue `observation`, `institutional_forecast`, `agricultural_hypothesis` y `economic_simulation`. Las dos últimas nunca deben confundirse con observaciones institucionales. El catálogo actual no publica una simulación de precio climática.

Cada evidencia usa `issue_date=null` cuando no se verificó el día. `available_at` no puede preceder a una emisión conocida. Una observación no puede extenderse al futuro. `model_eligible` es siempre falso en este catálogo contextual: los regresores que entren en el motor requieren su propio archivo de disponibilidad temporal y evaluación.

Los estados se calculan con el corte: `not_yet_available`, `expired`, `historical`, `update_due` o `current_context`. `current_context` no significa que la condición se haya observado hoy. Las observaciones de estación se muestran con su fecha y las perspectivas con su vigencia. Una actualización anunciada y no verificada se señala `update_due`.

Para dibujar un mapa, `tarma_value=null` y `parcel_risk=null` significan falta de clasificación validada, no riesgo bajo. Se puede mostrar la estación CO-Tarma como punto histórico; no colorear toda la provincia con su condición. Los polígonos administrativos visuales no convierten un resumen regional en una alerta geoespacial de parcela.
