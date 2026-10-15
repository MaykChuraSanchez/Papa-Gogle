# Revisión del repositorio Papa-Gogle

Origen: https://github.com/MaykChuraSanchez/Papa-Gogle · rama main · commit de referencia `dee7a84` (feat: expand variety catalog and ENFEN integration).

La actualización remota `9282e3c` (ampliación de modelos y regiones) se integró antes de publicar. Sus componentes y motores de demostración actualizados se conservan en `archive/demo-v3`; los tipos añadidos se mantienen. No se convierten las métricas escritas de ejemplo en resultados de entrenamiento.

## Diseño que se conserva

Identidad AgroDecide AI; verde oscuro #0B3025, acento #20C77A y lima #B7F36B; tarjetas redondeadas; portada con mensaje de siembra y cosecha; indicadores; navegación por módulos; catálogo de variedades; mapa; Model Lab; separación clara entre planificar una campaña y evaluar una cosecha existente. Las pantallas internas se adaptaron a los contratos de datos verificados.

## Hallazgos y solución

| Hallazgo original | Cambio implementado |
| --- | --- |
| Precio Canchán 1,48 y otros precios escritos en ticker, catálogo e inicio | Una publicación SISAP alimenta selector, ticker, KPIs, gráficos y simulaciones |
| Pronóstico = precio fijo × factor estacional manual × 1,03 × multiplicador ENFEN | Artefactos de modelos Python entrenados y evaluados temporalmente, por variedad y plazo |
| Métricas fijas: supuesto ganador LightGBM, MAPE 7,4% | Cinco candidatos reales, selección por MAE y auditoría independiente; se muestra sMAPE con su nombre correcto |
| POST /api/pipeline/sync devolvía cantidades y éxito sin descargar datos | Worker de ingesta real, logs, validación, persistencia, caché y estado degradado |
| ENFEN y estaciones con valores escritos como actuales sin descarga | Observatorio pendiente, con enlaces oficiales; no interviene en el modelo |
| Producción regional/precios en chacra, superficie y participación de mercado escritos en seedData | Producción del cuadro C.18 verificado y geometría nacional; sin inventar precios regionales |
| Explicación Gemini recibía resultados del navegador y podía atribuir causas no medidas | Explicación local basada en los resultados disponibles; sin causas climáticas o macroeconómicas inventadas |
| Rangos fijos -12%/+14% mostrados como P10/P90 | Rangos de error empírico, cobertura auditada y advertencia explícita para promedios de ventanas |
| Instalación npm bloqueada por esbuild 0.25 frente a Vite 8 | Eliminación de dependencia directa innecesaria y lockfile regenerado con resolución válida |
| Servidor Express con Gemini inicializado sin necesidad del usuario | Frontend estático ejecutable sin claves y desplegable en Vercel |

El código original se conserva en `archive/demo-v3`, excluido de TypeScript, Tailwind y del bundle. La nueva aplicación no importa `seedData`, `forecastingEngine` ni `enfenEngine` demostrativos.

## Pendientes reales

1. Conectar SENAMHI por estaciones y verificar boletines ENFEN con fecha y documento.
2. Extender SISAP a mercados adicionales, manteniendo modelos separados por mercado y variedad.
3. Validar ciclos por variedad, altitud y manejo; el ciclo actual es un parámetro, no una predicción agronómica.
4. Evaluar nuevas variables con disponibilidad histórica y comparaciones fuera de muestra antes de promover modelos.
5. Conectar una base remota si se necesita persistencia compartida, usuarios o acceso privado. El piloto usa DuckDB y publicaciones estáticas.
6. Activar credenciales de despliegue y el workflow en GitHub. La entrega no ejecuta cambios externos ni envía mensajes.
