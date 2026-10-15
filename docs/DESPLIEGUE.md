# Despliegue del frontend y proceso de datos

## Vercel

Importar el repositorio con la carpeta de esta versión como raíz, Node 24, framework Vite, comando `npm run build` y salida `dist`. `vercel.json` ya define esa configuración y encabezados. Las rutas de navegación usan fragmentos URL: no necesitan un servidor Express ni funciones de API.

Los datos de `public/data` se incorporan a cada despliegue. No se requieren claves públicas ni Gemini. Los archivos de precios son públicos; no subir costos personales ni secretos dentro de ellos. Los costos del simulador permanecen en el estado del navegador.

## Actualización diaria

El workflow `.github/workflows/agrodecide.yml` está preparado para las 03:00 de Perú. GitHub puede demorar su ejecución. Primera ejecución sin caché: descarga desde 2019 y entrena. Con caché: ingesta incremental, contexto, seguimiento y refit; primer día del mes vuelve a seleccionar y auditar.

Sin credenciales Vercel, guarda artefactos de datos y aplicación en GitHub Actions. Con secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`, publica solo después de pruebas y build exitosos. **Activarlo requiere subir estos cambios y configurar el proyecto y secrets. No está activo por haber generado el archivo localmente.**

No basta con el autodespliegue de Vercel al hacer push: la actualización nocturna debe publicar los nuevos artefactos. El workflow incluye ese paso. No modifica el repositorio desde Actions.

## Persistencia

Para este piloto, DuckDB en el worker conserva datos y estado; la interfaz consume archivos precalculados. GitHub cache puede expirar: la descarga histórica permite reconstruirlo y los artefactos tienen retención de 30 días. Para producción sostenida, usar almacenamiento durable del worker u objetos con control de versiones y copias de seguridad.

La migración opcional `sql/001_warehouse.sql` y `python -m agrodecide.v4.postgres` permiten sincronizar precios y resultados a PostgreSQL desde un worker de confianza. Requiere instalar `psycopg[binary]>=3,<4` y configurar `DATABASE_URL` solo en el worker. No se ha creado una base remota ni probado una conexión remota en esta entrega. El frontend aún usa publicaciones JSON; no se afirma integración con Supabase.

## Fallos y observabilidad

Se conserva la publicación anterior si el job no termina. La pantalla muestra fechas y bloquea proyecciones con precios mayores a siete días o evaluación mayor a 45 días. Los estados/logs del worker y la auditoría de rangos quedan en artefactos. Las notificaciones de fallo de GitHub dependen de la configuración del propietario; no hay Telegram/email externo configurado.

El seguimiento compara pronósticos emitidos previamente con precios que ya se observaron. Al inicio no hay resultados futuros realizados; el sistema lo informa. El registro JSON conserva ejecuciones. MLflow es opcional vía `requirements-ops.txt` y no se presenta como servicio desplegado.
