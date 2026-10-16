# AgroDecide AI · Papa 4.3 · motor de pronósticos 2.0

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
pip install -r requirements-v4.txt
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
python -m unittest discover -s tests -p 'test_*.py'
npm test
npm run build
```

Los sintéticos están limitados a pruebas controladas. Los resultados de producción se contrastan con precios SISAP y las métricas se recalculan desde predicciones fechadas.

Vercel está conectado a `main`. El workflow de datos conserva programación diaria a las 03:00 de Perú, pero publicar cada actualización nocturna requiere los secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`; no se presupone que estén configurados. DuckDB/caché del worker debe respaldarse para operación duradera. No se ha creado base de datos remota ni servicio MLflow. Ver [despliegue](docs/DESPLIEGUE.md).
