# AgroDecide AI · Papa v4.1

**Aplicación publicada:** https://papa-gogle.vercel.app · [Repositorio](https://github.com/MaykChuraSanchez/Papa-Gogle).

Despliegue inicial verificado el 15/10/2026, desde el commit `3c8b867`. Vercel está conectado a `main`: los siguientes cambios publicados en esa rama generan un despliegue. La actualización nocturna de datos requiere configurar los secrets de Vercel descritos abajo; desplegar la interfaz por primera vez no activa esa publicación nocturna.

La interfaz de **Papa-Gogle** se conecta ahora a datos históricos SISAP y a pronósticos calculados en Python. Se conserva la identidad verde, la navegación de nueve módulos y los caminos **Quiero sembrar / Ya coseché** del repositorio original.

## Abrir la aplicación

Requiere Node.js 24. En Windows, ejecuta `ABRIR_AGRODECIDE.cmd`. En una terminal:

```sh
npm ci
npm run dev
```

Abre la URL que indica Vite. La publicación incluida permite usar las pantallas sin Python, sin claves de Gemini y sin una base de datos remota. `npm run build` genera `dist`; `npm run preview` permite revisar la compilación.

## Qué funciona

- Inicio con último precio real, variación calculada y gráfico diario.
- Diez variedades SISAP, seleccionadas globalmente sin mezclar datos.
- Siembra: fecha y ciclo editables, ventana completa de cosecha, precios por fecha, escenarios, merma, flete, comisión y precio de equilibrio.
- Cosecha: comparación del último precio publicado con espera de 7 y 14 días; merma compuesta y almacenamiento editable.
- Mapa nacional con geometría geoBoundaries y producción preliminar MIDAGRI de enero–junio 2026. No se presenta como precio regional.
- Model Lab: resultados temporales reales por variedad y horizonte, MAE, RMSE, sMAPE, cobertura y comparación con persistencia.
- Fuentes: estado real de cada integración, CSV y metadatos descargables.
- Asistente local que explica resultados publicados mediante reglas. No es un LLM. Los antiguos endpoints Gemini y su sincronización simulada quedan archivados fuera de producción.
- Descarga de publicaciones por variedad, caché local opcional y bloqueo de simulaciones si el último precio supera 7 días o la evaluación supera 45 días.

La publicación inicial contiene **28.752 observaciones** de 11 variedades históricas, con **10 variedades actuales** pronosticadas, desde enero de 2019 hasta el **15/10/2026**. Una variedad histórica discontinuada se conserva en el CSV pero no se fuerza a producir un pronóstico.

## Ejecutar el pipeline

Requiere Python 3.12. Se recomienda un entorno virtual propio:

```sh
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements-v4.txt
python -m agrodecide.v4.pipeline
```

La entrega local incluye estado de trabajo en `data/v4` (ignorado por Git). En un clon nuevo, la primera carga completa se realiza con:

```sh
python -m agrodecide.v4.pipeline --bootstrap --retrain
```

El worker conserva originales por hash, valida esquema/unidades/fechas, carga DuckDB, actualiza contexto BCRP y produce archivos JSON con nombres derivados del contenido en `public/data`. El índice se publica al final. Ante fallos de extracción conserva la última información válida y registra el estado degradado; no simula una sincronización exitosa.

Cada día se reajustan los modelos seleccionados y se generan 240 días de pronósticos. El primer día de cada mes se repiten selección, calibración y auditoría. También puedes ejecutar `python -m agrodecide.v4.pipeline --retrain`.

## Modelos y límites

Se comparan último precio, media de 28 días, estacional anual, Ridge directo y HistGradientBoosting directo. La selección usa tres bloques temporales, la calibración otros tres y la auditoría los dos posteriores. No se usa interpolación bidireccional ni se rellenan objetivos de evaluación.

**No existe un ganador universal.** Un modelo simple puede superar a machine learning. El sistema marca como experimental el resultado que pierde frente a persistencia o cuya cobertura observada queda por debajo de 75% (el objetivo es 80%). Los rangos son empíricos; no garantizan cobertura futura. El promedio de sus límites en una ventana no es un intervalo calibrado para el precio promedio.

El modelo predice **precio mayorista en GMML Lima, por variedad**. La ubicación de la parcela no crea una cotización local. El ciclo de Canchán parte de una referencia INIA de 120 días; las ventanas editables y todos los costos/rendimientos iniciales son supuestos. El modelo no predice rendimiento agronómico.

No se utilizan clima, volumen ni macros como predictores todavía. BCRP PN01210PM sí se descarga y se analizan correlaciones rezagadas; falta probar mejora predictiva con fechas reales de disponibilidad. EMMSA directo, SENAMHI y ENFEN aparecen pendientes. No se muestran boletines ni alertas actuales fabricados.

## Verificación

```sh
npm test
npm run build
python -m unittest discover -s tests -p 'test_*.py'
```

Diez pruebas TypeScript verifican cálculos económicos, fechas, frescura, ventanas completas, huecos, publicación de las diez variedades y reconciliación regional. Trece pruebas Python verifican contratos SISAP, caché, fallos de red, causalidad, separación de mercados y auditoría temporal. El caso de regresión de Canchán se congela en `tests/fixtures`, para no bloquear actualizaciones diarias por cambios normales de precios.

## Publicar

Consulta [DESPLIEGUE.md](docs/DESPLIEGUE.md). La configuración Vercel está activa y la aplicación está publicada. El frontend usa artefactos precalculados; el entrenamiento no corre dentro de Vercel ni en el celular.

Detalles: [auditoría del repositorio](docs/AUDITORIA_REPOSITORIO.md), [fuentes](docs/FUENTES.md), [metodología](docs/METODOLOGIA.md), [resultados](docs/RESULTADOS.md). La implementación demostrativa original está en `archive/demo-v3` para consulta y queda excluida del build.
