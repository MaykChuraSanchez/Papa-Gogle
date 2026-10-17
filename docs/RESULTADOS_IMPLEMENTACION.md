# Implementación AgroDecide V5 · 16/10/2026

## Resultado y alcance real

Se conserva el frontend React/Vite verde y el motor operativo anterior. Se incorporan investigación reproducible de10 variedades×6 plazos, calidad de datos, evidencia climática regional, fotos adultas autorizadas y una publicación sellada. La investigación no sustituye automáticamente los modelos que alimentan los simuladores.

Run científico: `research-v5-d8d020466b89b190691f`. Código: `08791f8d02eea62053ea784863ecc7aef3a107919b674a0bd1404e1d55c0e367`.299 candidatos completos de300 posibles; AR1 de Color7d se excluyó por inestabilidad en un corte de calibración.60 comparaciones corregidas por Holm; **0 promociones**. Datos hasta2026-10-15; la evaluación prospectiva realmente nueva aún no existe. No se publican los porcentajes17/29/28 del encargo como resultados verificados.

| Requisito | Estado | Archivos | Prueba / evidencia | Límite o riesgo |
|---|---|---|---|---|
| Linaje de repositorio y precio | Hecho | auditoria/ESTADO_INICIAL.md | Base6092700 y trazado fuente→DuckDB→export→React | Revisión SISAP original desconocida |
| Contrato y EDA10 variedades | Hecho | agrodecide/research_v5/eda.py, eda/ | ADF/KPSS/ACF/PACF, drift, huecos, volumen,10figuras | Descriptivo; no prueba causalidad |
| AR1 con ventanas internas | Hecho | research_v5/models.py, modelos/MODEL_CARD_AR1_V5.md | Ventanas365/540/730/1095/expansiva; cortes anteriores al origen | Cambios de régimen y poca potencia a largo plazo |
| Separación temporal y compuerta | Hecho | research_v5/evaluation.py |6selección/6calibración/12auditoría; bootstrap4999 y Holm60 | Últimos240d reservados sólo para este protocolo, ya vistos por V2 |
| Familias avanzadas en todas las variedades | Parcial | forecasting/ y research_v5/ | V2 preservado en Única;5 referentes nuevos sobre10variedades | No se afirma entrenar16familias avanzadas×10 |
| Mejora robusta frente a Naive | No obtenida | modelos/EXPERIMENTOS_V5.csv, RESULTADOS_V5.md |0 candidatos pasan todas las condiciones | No forzar curva ni elegir tras ver auditoría |
| Trayectorias80/95 y endpoint | Hecho | Charts.tsx, ResearchEvidence.tsx, ForecastWorkbench.tsx | Curvas completas porh; MAE t+h separado;95anidado | Bandas diarias no son intervalo calibrado del promedio de cosecha |
| Fuentes climáticas actuales/fechadas | Hecho con límites | climate_v5/, docs/clima/ |11evidencias,5indicadores, fuentes oficiales y hash | ENFEN actualización pendiente; decadal vencido explícito |
| Tarma/Junín y escenarios | Hecho con límites | RegionalClimate.tsx |4hipótesis con acciones y fuentes; capas distinguen escala | Sin lluvia diaria de parcela ni efecto monetario climático validado |
| Macro/volumen con disponibilidad real | Parcial | forecasting/sources.py, features.py, docs/FUENTES_V2.md | Mantiene exclusiones de vintages revisados; ablaciones V2 existentes | No se atribuye mejora causal ni se retrofechan revisiones |
| Transacción de publicación | Hecho | publish_research_v5.py, publish_release_v5.py, verify_release.mjs |130assets con SHA, índice final atómico, codehash y datahash; aborta inconsistencia | Worker local debe respaldarse; deploy del bundle es la unidad pública |
| HTTP gzip verificable | Hecho | utils/evidence.ts, useResearch.ts | Hash comprimido y de contenido; test de auto-decodificación HTTP | Navegador antiguo sin descompresión recibe explicación/descarga |
| Navegación diferida y resiliencia | Hecho | App.tsx, v5-evidence.css | Skeleton por ruta, boundary de carga, cache por contenido | Primer gráfico sigue necesitando Recharts |
| Inicio y fotos consentidas | Hecho | Dashboard/FarmScene/FieldStories, public/images |2fotos adultas,4WebP; pausa/reducedmotion/offscreen | Profundidad CSS ilustrativa; no retratos sintéticos ni geografía inventada |
| Simuladores y asistente sin API | Conservado y comprobado | ConnectedViews, forecast.ts, api/assistant.ts | Cálculos de merma/flete/comisión y grounding publicados | Sin clave no se activa GPT; ubicación no genera precio en chacra |
| Automatización nocturna | Código preparado, operación pendiente | .github/workflows/agrodecide.yml, v4/pipeline.py |03:00Perú, actualización→evaluación→sellado→tests→deploy | Secrets/persistencia remota aún no acreditados; no afirmar operación activa |
| Preview y producción | En revisión final | Ver recibo de QA de la entrega | Build pasa; preview y commit se registran al publicarse | Producción requiere confirmación final del brief13.9 |

## Lo que enseñan los errores

Para Única, la mejora descriptiva de AR1 frente a Naive es3,2%/4,9%/−1,6%/−4,1%/12,5%/26,6% para7/15/30/90/180/240d, en la auditoría específica V5. **No supera la compuerta**; a240d tampoco ganó selección. No es correcto elegirlo por ese último score ni comparar estos errores directamente con V2 de cortes distintos. La tabla completa conserva también los resultados peores.

En V2, el modelo operativo h180 de Única tenía MAE≈0,614 vs≈0,701 de Naive, con cobertura insuficiente. Ese resultado se preserva, se etiqueta como referencia y se muestra con su propia ejecución. Las pantallas de investigación están separadas del simulador para que no se interprete una exploración como cambio operativo ya aprobado.

## Verificación técnica

Python:116 pruebas correctas con temporales dentro del workspace; TypeScript/servidor:32. Las pruebas incluyen fallos de fuentes, snapshots corruptos, publicación atómica, objetivos faltantes, días futuros, fuga de información, índices climáticos separados, merma, bandas anidadas y reconciliación de los errores desde SISAP. Los primeros temporales de Windows no eran escribibles en el sandbox: ese intento no cuenta como aprobado; `scripts/run_tests_v5.py` resuelve la ubicación de fixtures sin modificar datos reales.

`npm run build` valida130assets, código de investigación exacto y coherencia del release antes de compilar. `.gitattributes` preserva bytes de evidencias y fingerprints; índices heredados se hashean con normalización LF explícita. Este detalle evita que Windows pase localmente y Linux rechace la misma publicación.

Entrada JS del build:21,11KB (8,12KB gzip) frente a126,52KB (38,39KB gzip) del baseline. Es el chunk de entrada, no la descarga total: React≈218,76KB y charts≈432,98KB siguen siendo compartidos. CSS pasó69,18→86,83KB por el nuevo contenido visual. No se midieron Core Web Vitals de campo ni se afirma un puntaje Lighthouse.

Capturas y comprobaciones DOM se realizan con el navegador real de Codex, mediante su superficie Playwright. Se entregan fuera del repositorio en `design-review/v5/`; el recibo registra resoluciones, recorridos y resultados reales. La prueba inicial detectó auto-decodificación gzip del servidor: se corrigió con dos checksums, sin desactivar integridad.

## Operación y siguientes pasos

1. Revisar preview y confirmar producción de esta entrega concreta; no equivale a garantizar precios futuros.
2. Configurar credenciales privadas del workflow y respaldo/persistencia del worker para actualización desatendida real.
3. Guardar emisiones diarias inmutables y evaluar prospectivamente cuando existan objetivos observados.
4. Obtener series meteorológicas locales y vintages de macro/volumen antes de atribuirles mejora predictiva.
5. Ampliar los modelos avanzados a otras variedades según evidencia y costo, manteniendo los casos sin ganancia.
