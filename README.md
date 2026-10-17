# AgroDecide AI · Papa V5

Aplicación: [papa-gogle.vercel.app](https://papa-gogle.vercel.app) · [Repositorio](https://github.com/MaykChuraSanchez/Papa-Gogle).

La aplicación React/Vite conserva su diseño y módulos. El nuevo motor Python se aplica inicialmente a **papa Única en el GMML Lima**: diez modelos clásicos de precio, seis multivariables, evaluación temporal, alertas ENFEN como entradas candidatas, ensembles y rangos 80/95 con cobertura auditada. Los otros nueve productos conservan sus resultados anteriores; no se les atribuye la evaluación nueva.

No se promete mayor precisión por añadir complejidad. Si el candidato no mejora el error del último precio en auditoría, se publica esa referencia y se mantiene visible la comparación. Macros, clima e índices revisados sin publicaciones históricas verificables no se retrofechan ni reciben métricas ficticias.

## Ejecutar en Windows

Requiere Node.js 24:

```powershell
npm ci
npm run dev
```

También puedes abrir `ABRIR_AGRODECIDE.cmd`. La publicación incluida funciona sin entrenar y sin claves privadas. `npm run build` genera `dist`; `npm run preview` revisa la compilación.

Para actualizar fuentes y entrenar, Python 3.12:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-v5.txt
python -m agrodecide.v4.pipeline --bootstrap --retrain
```

Con el warehouse local existente, usar `python -m agrodecide.v4.pipeline`. Datos y modelos se calculan en el worker; Vercel y el celular consultan resultados precalculados.

## Funciones conservadas y nuevas

- Histórico SISAP desde 2019, diez variedades actuales, filtros, gráficos, oferta y CSV.
- Quiero sembrar / Ya coseché, ventanas completas, costos, flete, merma, comisión, precio de equilibrio y cuaderno de campañas.
- Mapa regional de producción MIDAGRI; no se etiqueta como precio de chacra ni pronóstico regional.
- Laboratorio de Única con horizontes 7/15/30/90/180/240, selector de modelos, tabla diaria 80/95, auditoría por origen, ablación y sensibilidad ENFEN.
- Observatorio con ICEN costero, ONI/RONI central y comunicados fechados, sin mezclar regiones oceánicas o versiones.
- Fuentes con trazabilidad, caché oficial, descargas de base maestra y metadatos.
- Asistente local que consulta los resultados publicados; GPT es opcional y requiere una clave privada del servidor. No está activado sin credenciales.
- Caché por contenido, detección de publicaciones incompatibles y bloqueo de nuevos escenarios cuando los precios o evaluación caducan.

## Resultados y metodología

La base incluye 28.752 registros de once variedades históricas, con diez actuales, hasta el 15/10/2026. El precio objetivo es mayorista en Lima, en PEN/kg. La ubicación de una parcela no crea un precio local. Ciclos agronómicos, costos y rendimiento siguen siendo supuestos editables.

- [Manual técnico del motor V2](docs/MOTOR_PRONOSTICOS_V2.md).
- [Resultados comprobados](docs/RESULTADOS_V2.md).
- [Fuentes, mecanismos y disponibilidad](docs/FUENTES_V2.md).
- [Aceptación, pruebas y pendientes](docs/ACEPTACION_V2.md).
- [Despliegue y operación](docs/DESPLIEGUE.md).

Los documentos de 4.2 y resultados anteriores conservan contexto histórico; el alcance actual de Única es el documentado en V2. Se retiraron los avisos de diseño/prototipo del pie. Las limitaciones de precisión permanecen visibles porque forman parte de la interpretación del resultado.

## Verificar

```powershell
python scripts/run_tests_v5.py
npm test
npm run build
```

Los sintéticos están limitados a pruebas controladas. Los resultados de producción se contrastan con precios SISAP y las métricas se recalculan desde predicciones fechadas.

Vercel está conectado a `main`. El workflow de datos conserva programación diaria a las 03:00 de Perú, pero publicar cada actualización nocturna requiere los secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`; no se presupone que estén configurados. DuckDB/caché del worker debe respaldarse para operación duradera. No se ha creado base de datos remota ni servicio MLflow. Ver [despliegue](docs/DESPLIEGUE.md).


## V5: evidencia complementaria y contexto regional

El motor publicado de Única y los simuladores se conservan. El laboratorio añade una evaluación separada de **10 variedades × 6 horizontes**, con AR(1) log y cuatro referencias sencillas. Ventanas elegidas dentro del entrenamiento, fases purgadas, bootstrap por bloques y corrección Holm. Resultado de esta ejecución: **0 promociones robustas**,299 evaluaciones completas de candidatos; no se fuerza una mejora. Color7d excluye AR1 por inestabilidad real. La auditoría final usa12 orígenes; largos horizontes ofrecen pocos bloques efectivos.

Los últimos240 días no se puntuaron en el nuevo protocolo; esa historia ya había sido vista por V2. Los ajustes actuales sí usan los datos recientes. El test realmente nuevo debe ser prospectivo. MAE de trayectoria diaria y MAE del día t+h se publican por separado; ninguno se presenta como error del precio promedio de una ventana de cosecha.

Inteligencia climática incorpora11 evidencias oficiales,5 indicadores y4 hipótesis regionales para Tarma/Junín, con fecha y alcance. Los escenarios no aplican multiplicadores de precio. El boletín decadal recuperado está vencido y su catálogo es discordante; la perspectiva regional de papa octubre–diciembre se muestra a su escala. ICEN y RONI permanecen separados, con comparaciones históricas revisadas.

Las fotografías adultas autorizadas se sirven como WebP con tamaños adaptativos. No se incorporan fotos de menores. Navegación por rutas diferidas, esqueletos de carga, contraste y `prefers-reduced-motion`. El proyecto usa los componentes existentes, sin librería3D adicional.

### Regenerar investigación y publicación

Con warehouse local validado o después de `--bootstrap`:

```powershell
npm run data:research
npm run data:publish-research
python -m agrodecide.climate_v5.build --refresh
npm run release:seal
npm test
npm run build
```

`release:seal` se repite después de cualquier cambio de código o assets publicados. `build` rechaza código/datos inconsistentes y verifica130assets de investigación; no necesita Python ni claves en Vercel. Los JSON de detalle son inmutables y las auditorías gzip se cargan sólo al abrirlas. Navegadores antiguos sin DecompressionStream pueden descargar el archivo comprimido desde la ficha. El sellado emite `public/release.json`; el build genera `deployment.json` con commit real cuando Vercel lo proporciona.

El pipeline V4 ahora ejecuta investigación/publicación V5 y refresco climático antes del sellado. Una caída o cambio de fuente impide desplegar la nueva publicación; la versión anterior de producción continúa. GitHub Actions permanece a03:00Perú; configurar sus credenciales y respaldo del warehouse sigue siendo necesario para operación desatendida real. No se crearon automaciones de mensajes ni se envían correos/Telegram.

### Entrega y despliegue

`python scripts/package.py --list` inspecciona; `python scripts/package.py` crea `AgroDecide_Papa_V5.zip` con fuentes, datos públicos, documentación y build coincidente; excluye warehouse, cachés, originales y secretos. Para regenerar datos se reconstruye el warehouse mediante bootstrap; el ZIP permite usar la publicación incluida inmediatamente.

Antes de producción: rama `codex/agrodecide-v5` → preview de Vercel → QA y confirmación final indicada en el brief V5. `main` conserva producción hasta esa confirmación. No confundir build correcto con despliegue ya realizado.

- [Auditoría inicial](docs/auditoria/ESTADO_INICIAL.md)
- [Diagnóstico de las10 variedades](docs/eda/DIAGNOSTICO_POR_VARIEDAD.md)
- [Resultados V5](docs/modelos/RESULTADOS_V5.md)
- [Modelo AR1](docs/modelos/MODEL_CARD_AR1_V5.md)
- [Contrato de investigación](docs/modelos/CONTRATO_RESEARCH_V5.md)
- [Fuentes y escenarios climáticos](docs/clima/FUENTES_Y_ESCENARIOS.md)
- [Resultado de implementación y pendientes](docs/RESULTADOS_IMPLEMENTACION.md)

V5 publicada y verificada el16/10/2026 tras autorización del propietario:117 tests Python,32 TS/servidor, build `agro-v5-cfbfec47d3bb4846be5c`. [Recibo de producción](reference/qa/V5_VERIFICACION.json). El laboratorio complementario conserva referencias cuando la evidencia no justifica un cambio.
