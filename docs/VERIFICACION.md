> Documento histórico de la versión anterior. Para el estado actual de Única consultar [motor V2](MOTOR_PRONOSTICOS_V2.md), [resultados V2](RESULTADOS_V2.md) y [fuentes V2](FUENTES_V2.md).

# Verificación de la entrega v4.1

Fecha de trabajo: 15/10/2026. Entorno: Windows, Node 24.21 y Python 3.12.

## Ejecutado

- Instalación npm corregida, lockfile reproducible: sin vulnerabilidades reportadas por npm al instalar.
- Diez pruebas TypeScript: fechas, datos congelados de referencia, costos, frescura, ventanas incompletas, consistencia de las diez publicaciones y producción regional.
- Trece pruebas Python: contratos SISAP, unidades, nulos, duplicados, fechas, integridad de caché, causalidad, mercados separados y auditoría.
- Build de producción con chequeo TypeScript.
- Pipeline completo incremental: ingesta, BCRP, contexto regional, seguimiento, refit y exportación a `public/data`. Resultado: 28.752 observaciones, 10 series pronosticadas, ingesta OK. La selección mensual se conserva del entrenamiento anterior; no se confunde refit con una auditoría nueva.
- Navegación comprobada en la compilación de producción mediante navegador: inicio, catálogo/selección, siembra, cosecha, modelos, fuentes, clima, mapa y asistente.
- Cambio Canchán → Amarilla: cambian ciclo supuesto, modelo y precios; se muestra carga mientras llega la nueva serie.
- Fecha fuera del horizonte: la interfaz bloquea el cálculo, sin reemplazar la fecha por otra disponible.
- Edición del área de 1 a 2 ha: se duplican los kilos y los importes; el precio de equilibrio permanece coherente.
- Cambio de horizonte de auditoría de 180 a 30 días: cambian métricas y estado del modelo.
- Mapa: selección de Puno muestra 1.089.346,6 toneladas del período, sin convertirlo en pronóstico regional.
- Responsive: 1440×1000 y 390×844. En móvil, ancho de documento 375 y viewport 390: sin desbordamiento horizontal del documento; los menús y tablas tienen desplazamiento propio.

## Caso visible de referencia

Canchán, siembra 15/10/2026, ciclo supuesto 115–130 días: cosecha 07–22/02/2027. Precio central de ventana S/ 2,23/kg; límites diarios promediados S/ 1,77–2,69/kg. Ganador a ese plazo: último precio. MAE de auditoría a 180 días S/ 0,408/kg; cobertura 66,9%, por eso se marca experimental.

Con 1 ha, 22 t/ha, 10% de merma, S/ 15.000/ha de cultivo, flete S/ 0,25/kg y comisión 5%: 19.800 kg comercializables, ingreso bruto central S/ 44.154, costo total S/ 22.157,70 y margen estimado S/ 21.996,30. Los costos iniciales son ilustrativos y editables; no representan una cotización de servicios.

## No ejecutado

Conexión PostgreSQL remota, integración de estaciones SENAMHI/boletines ENFEN, servicio MLflow y secrets para publicar actualizaciones nocturnas.

## Publicación posterior verificada

La versión se subió a `main` en GitHub y se desplegó en https://papa-gogle.vercel.app el 15/10/2026, desde `3c8b867`. Se verificaron portada e índice HTTP 200, diez series completas, CSV de 28.752 filas, CSP y el simulador público sin errores de consola. No se creó PR: la actualización se publicó directamente en la rama solicitada.

Las capturas están en `docs/screenshots`. El servidor local usado para verificar se detiene al terminar; `ABRIR_AGRODECIDE.cmd` vuelve a iniciarlo.
