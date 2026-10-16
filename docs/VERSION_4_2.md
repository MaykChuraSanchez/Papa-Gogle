> Documento histórico de la versión anterior. Para el estado actual de Única consultar [motor V2](MOTOR_PRONOSTICOS_V2.md), [resultados V2](RESULTADOS_V2.md) y [fuentes V2](FUENTES_V2.md).

# AgroDecide 4.2 · Recuperación de la experiencia de AI Studio

Se revisó la carpeta `agrodecide-ai---pronóstico-de-precios-&-decisión-agrícola`, sus componentes activos y la implementación completa conservada en `archive/demo-v3`. La raíz del ZIP contiene la integración 4.1; los módulos originales más amplios están en el archivo. Se recupera la experiencia de exploración con cifras calculadas a partir de las publicaciones oficiales.

| Función de referencia | Implementación 4.2 |
| --- | --- |
| Gráficos históricos SVG sin interacción | Gráficos Recharts con consulta de valores, selección de período, fechas exactas, frecuencia diaria/mensual y barra de ampliación |
| Comparación de variables | Comparación de dos variedades en fechas comunes, precios S/kg o índice base 100, correlación calculada y descarga de la selección |
| Exploración anual | Matriz de precio mensual por año desde 2019; cada celda permite abrir ese mes, con número de observaciones en su descripción |
| Estacionalidad | Promedios por mes calendario; se excluye el mes actual incompleto y no se presentan como pronóstico |
| Oferta y BCRP | Volumen observado por variedad, ausencias como nulos, gráfico de dispersión y correlación por fecha; correlaciones BCRP de cambios mensuales rezagados |
| Arena de modelos con métricas escritas | Ganadores y métricas realmente evaluados por variedad y horizonte, con selección y auditoría diferenciadas |
| Real vs. predicho construido artificialmente | Reconstrucción de las dos ventanas de auditoría desde sus orígenes; 50 auditorías reconciliadas con los MAE y tamaños publicados |
| Gráfico de errores | Residuales reales, histograma, rango empírico y descarga de observaciones por fecha/origen |
| Importancia de variables fija | Explicación de las entradas verdaderas de Ridge/HistGradientBoosting. No se publican porcentajes de importancia sin estimarlos |
| Sensibilidad con elasticidades climáticas no verificadas | Escenarios económicos explícitos: cambios de precio, rendimiento y costo, con matriz de márgenes y cálculo del equilibrio |
| Asistente Gemini dependiente de claves | Chat local usable sin API para precios, siembra, cosecha y errores. Endpoint OpenAI preparado, pero GPT no está activado sin credenciales |
| Animaciones | Transiciones, estados táctiles, escena de cultivo isométrica con capas CSS 3D y etapas interactivas; modo de movimiento reducido |
| Mapa nacional | Selección regional, cifras del cuadro C.18, ranking y vista inclinada. La inclinación es visual, no un modelo de relieve geográfico |
| Escenarios de siembra | Cuaderno de hasta seis escenarios persistidos en el dispositivo, comparación y descarga CSV; conserva fecha y parámetros usados |

## Flujos para el agricultor

1. **Entender:** inicio → explorador → elegir variedad, fechas y frecuencia → comparar o descargar.
2. **Planificar:** preguntar una fecha en el asistente → llevarla al simulador → ajustar ciclo/costos → probar sensibilidad → guardar campañas para comparar.
3. **Vender:** abrir «Ya coseché» → ingresar lote, merma, almacén, flete y comisión → comparar precio actual y espera.
4. **Verificar:** laboratorio → seleccionar horizonte → revisar precio real vs. predicho, errores y cobertura → descargar auditoría.

## Datos y reconstrucción de auditorías

`python -m agrodecide.v4.diagnostics` genera `public/analytics/*.json`. Usa las fechas de origen almacenadas en las evaluaciones y vuelve a pronosticar con la información anterior a cada origen. Compara MAE y tamaño de muestra contra el reporte publicado. Si no coinciden, la interfaz no muestra la reconstrucción como auditoría verificada. El pipeline de exportación genera estos archivos antes de publicar el índice.

Las diez variedades y sus cinco horizontes reconciliaron correctamente en esta entrega. No se introdujeron curvas aleatorias, errores sintéticos ni MAPE o importancia de variables prefijados.

## Asistente sin API y preparación de GPT

El usuario indicó que todavía no tiene una API. Por ello el comportamiento disponible es **modo local**: reglas explícitas y cálculos sobre datos publicados, con identificación del modo en cada respuesta. No se presenta como un LLM ni como GPT gratuito. Las demás herramientas de la plataforma funcionan sin proveedor de IA.

Para activar conversación GPT en Vercel, configurar `OPENAI_API_KEY`, `OPENAI_MODEL` (un identificador disponible en el proyecto de OpenAI) y, si cambia el dominio, `APP_ORIGIN`. Nunca usar prefijos `VITE_` para la clave. El endpoint de servidor lee la publicación, resuelve la variedad, calcula las fechas/rangos con el motor y envía ese contexto a la [Responses API oficial](https://developers.openai.com/api/docs/guides/text). La respuesta distingue proveedor OpenAI y modo local. La clave no se envía al navegador y `store` se configura en `false`.

El límite de ocho consultas por minuto/IP es una protección local por instancia, no una cuota global durable. Antes de activar una API pagada en un sitio público, configurar una cuota de gasto del proveedor y límites durables en Vercel o un almacén compartido. No se creó ninguna clave ni se realizó una llamada pagada durante esta entrega; la integración con OpenAI se verifica mediante un proveedor simulado en pruebas.

## Verificación

- 20 pruebas TypeScript/servidor: fechas, datos, economía, alineación, correlación, huecos mensuales, reconciliación de las 50 auditorías, validación de preguntas, modo local, origen y contrato OpenAI simulado.
- 13 pruebas Python del pipeline y modelos.
- Build TypeScript/Vite. Bundle separado en aplicación, React y gráficos; escena 3D sin motor WebGL ni librería pesada.
- Pruebas de navegador en escritorio y móvil: filtros, comparación, matriz mensual, oferta, laboratorio, guardado y chat. La pregunta «Quiero sembrar Amarilla mañana en Tarma» cambia la variedad, obtiene su escenario y lleva la fecha al simulador.

## Límites que continúan

Clima de parcela y ENFEN no están conectados como predictores. El volumen y BCRP se exploran sin asumir causalidad. El precio continúa siendo mayorista en GMML Lima, y el ciclo agrícola es un supuesto editable. La actualización nocturna del sitio sigue dependiendo de configurar la publicación de los artefactos desde el workflow; no se declara activa por actualizar el frontend.
