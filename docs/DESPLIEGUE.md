# Despliegue del frontend y proceso de datos

## Estado verificado · 15/10/2026

- Producción: https://papa-gogle.vercel.app
- Proyecto: https://vercel.com/maykchurasanchez/papa-gogle
- Repositorio: https://github.com/MaykChuraSanchez/Papa-Gogle · rama `main`.
- Primer despliegue: commit `3c8b867`, identificador `dpl_5yQeSwHvgKtP4vzRyyLYgXVeqFPt`.
- Preset Vite, raíz `./`, Node 24, build `npm run build`, salida `dist`.
- Verificado por HTTP: portada e índice 200, las diez series con 240 días, CSV con 28.752 filas y encabezados de seguridad. Simulador de Canchán comprobado en navegador público, sin errores de consola.
- Pendiente para publicar las actualizaciones nocturnas: secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` en GitHub Actions. No se crearon credenciales nuevas en este despliegue.

## Vercel

Importar el repositorio con la carpeta de esta versión como raíz, Node 24, framework Vite, comando `npm run build` y salida `dist`. `vercel.json` ya define esa configuración y encabezados. Las rutas de navegación usan fragmentos URL: no necesitan un servidor Express ni funciones de API.

Los datos de `public/data` se incorporan a cada despliegue. No se requieren claves públicas ni Gemini. Los archivos de precios son públicos; no subir costos personales ni secretos dentro de ellos. Los costos del simulador permanecen en el estado del navegador.

## Actualización diaria

El workflow `.github/workflows/agrodecide.yml` está preparado para las 03:00 de Perú. GitHub puede demorar su ejecución. Primera ejecución sin caché: descarga desde 2019 y entrena. Con caché: ingesta incremental, contexto, seguimiento y refit; primer día del mes vuelve a seleccionar y auditar.

Sin credenciales Vercel, guarda artefactos de datos y aplicación en GitHub Actions. Con secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`, publica solo después de pruebas y build exitosos. **El proyecto ya está desplegado y conectado al repositorio; la publicación nocturna sigue pendiente de configurar los secrets.**

No basta con el autodespliegue de Vercel al hacer push: la actualización nocturna debe publicar los nuevos artefactos. El workflow incluye ese paso. No modifica el repositorio desde Actions.

## Persistencia

Para este piloto, DuckDB en el worker conserva datos y estado; la interfaz consume archivos precalculados. GitHub cache puede expirar: la descarga histórica permite reconstruirlo y los artefactos tienen retención de 30 días. Para producción sostenida, usar almacenamiento durable del worker u objetos con control de versiones y copias de seguridad.

La migración opcional `sql/001_warehouse.sql` y `python -m agrodecide.v4.postgres` permiten sincronizar precios y resultados a PostgreSQL desde un worker de confianza. Requiere instalar `psycopg[binary]>=3,<4` y configurar `DATABASE_URL` solo en el worker. No se ha creado una base remota ni probado una conexión remota en esta entrega. El frontend aún usa publicaciones JSON; no se afirma integración con Supabase.

## Fallos y observabilidad

Se conserva la publicación anterior si el job no termina. La pantalla muestra fechas y bloquea proyecciones con precios mayores a siete días o evaluación mayor a 45 días. Los estados/logs del worker y la auditoría de rangos quedan en artefactos. Las notificaciones de fallo de GitHub dependen de la configuración del propietario; no hay Telegram/email externo configurado.

El seguimiento compara pronósticos emitidos previamente con precios que ya se observaron. Al inicio no hay resultados futuros realizados; el sistema lo informa. El registro JSON conserva ejecuciones. MLflow es opcional vía `requirements-ops.txt` y no se presenta como servicio desplegado.
