> Documento histórico de la versión anterior. Para el estado actual de Única consultar [motor V2](MOTOR_PRONOSTICOS_V2.md), [resultados V2](RESULTADOS_V2.md) y [fuentes V2](FUENTES_V2.md).

# Investigación de las fuentes

Fecha de revisión: 15 de octubre de 2026. Se distingue acceso comprobado de propuestas de integración.

## SISAP: conexión comprobada

Entrada: http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/

El HTML del formulario y su JavaScript público revelan la consulta `POST /sisap/portal2/mayorista/resumenes/filtrar`. El conector abre una sesión y toma el `postID` actual del formulario. No fija tokens en el código ni los publica en metadatos. Envía `periodicidad=intervalo`, fechas `desde` y `hasta`, `mercado=15011501`, `productos[]=0104` y `variables[]=precio_prom&variables[]=volumen`.

Se verificó la tabla devuelta y se descargaron los 94 meses de enero de 2019 a octubre de 2026. Cada observación conserva variedad, producto original, mercado, nivel, unidad, URL y archivo de origen. La fuente que figura al pie del reporte es Gran Mercado Mayorista de Lima; elaboración MIDAGRI-DGESEP-DEIA, Área de Comercio.

El formulario ofrece años desde 1997. Esto **no verifica** que cada variedad tenga observaciones desde 1997. El piloto descargado empieza en 2019. Ampliar el historial exige comprobar cambios de mercado, definiciones y variedades.

El endpoint observado usa HTTP. Los hashes detectan alteraciones de la copia local, no garantizan autenticidad del transporte. Contrastar precios con publicaciones oficiales/EMMSA antes de una publicación comercial. No se evita el control de certificados para obtener datos de EMMSA.

Las procedencias ofrecidas por SISAP corresponden al volumen. No transformarlas en un “precio en Tarma”: origen del camión y plaza donde se transa el precio son dimensiones distintas. La versión entregada consulta volúmenes agregados por variedad; la extracción de procedencias queda pendiente.

## Los tres Power BI

El [catálogo actual de estadísticas agropecuarias de SIEA](https://siea.midagri.gob.pe/index.php/herramientas/estadistica-agropecuarias) permite identificar los reportes compartidos:

| Identificador del reporte público | Nombre identificado | Evidencia disponible |
|---|---|---|
| a3aa4584-dc80-42f7-832d-21888956a828 | Comparativa de Precios Mercados Lima | Se abrió y leyó la visualización. Declara SISAP; mayorista diario y minorista lunes, miércoles y viernes. |
| 03f1c95b-ef21-44f1-866f-a4a3c09eb8e8 | Comportamiento de Precios Semanales | Nombre y enlace confirmados en el catálogo SIEA. La navegación del reporte no se completó; fuente interna no comprobada. |
| 79fb6c60-0816-4384-9d3d-21f97ac0ed3 | Abastecimiento Mercados y Precios | Nombre y enlace confirmados en el catálogo SIEA. Base interna y consultas no inspeccionadas. |

Un enlace “publicar en web” no entrega automáticamente el PBIX, las consultas Power Query, credenciales o una API estable de datos. No se implementaron llamadas a interfaces internas de Power BI como si fueran un contrato oficial. Se optó por el origen SISAP que sí se verificó. Para completar la genealogía de los otros reportes, solicitar al área de estadística el diccionario, archivos fuente, frecuencia, nivel geográfico, definiciones y condiciones de reutilización.

## EMMSA

La [página actual de precios diarios](https://www.emmsa.com.pe/index.php/precios-diarios/) enlaza a `https://old.emmsa.com.pe/emmsa_spv/rpEstadistica/rpt_precios-diarios-web.php`. También existe el formulario histórico `rpt02_out.php`.

Las solicitudes directas de esta revisión fallaron al validar la cadena TLS del servidor legado. Se conserva ese estado y no se anuncia un conector operativo. La plataforma permite seguir consultando SISAP. Resolver con una cadena de confianza válida o una exportación oficial alternativa, manteniendo verificaciones de seguridad.

## Datero Agrario

El [catálogo Datero](https://www.datosabiertos.gob.pe/dataset/midagri-02-datero-agrario-ministerio-de-desarrollo-agrario-y-riego) describe el servicio de consulta de precios; los recursos locales descargados en v3 son estadísticas de **uso del servicio**. Los 38 CSV existentes contienen año, mes, consultas o transacciones y operador, con algunas columnas adicionales de usuarios/módulos. No contienen precio, fecha diaria, variedad ni mercado por cotización.

Se excluyeron como variable objetivo. No debe inventarse una columna “Precio” ni inferir precios a partir del número de llamadas. Los originales de v3 se conservaron.

## SIEA y El Agro en Cifras

[Publicación oficial 2026](https://www.gob.pe/institucion/midagri/informes-publicaciones/7910469-boletin-estadistico-mensual-el-agro-en-cifras-2026).

Se analizó el libro agrícola de junio de 2026 ya descargado por v3. Cuadro C.18: producción por cultivo y región, enero–junio 2025 y 2026, en toneladas. La extracción de papa usa la cabecera verificada, conserva referencias de celdas y comprueba que la suma regional concilie con el total nacional. El snapshot JSON incorpora el hash del libro. No se afirmó que fuera la publicación más reciente del portal al 15 de octubre.

Los cuadros de siembras, cosechas y rendimientos son candidatos para una ingesta histórica mensual. Hace falta normalizar meses y campañas, diferenciar acumulados de flujos y conservar fecha de publicación. Un acumulado semestral no se debe repetir como seis observaciones mensuales.

Los límites cartográficos son de [geoBoundaries PER ADM1](https://www.geoboundaries.org/api/current/gbOpen/PER/ADM1/), geometría de referencia 2008, dominio público según sus metadatos. Son independientes de las cifras MIDAGRI y no se utilizan para delimitar parcelas.

## BCRPData

[Documentación oficial de la API](https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api). Permite JSON por código y periodo; las series agrupadas deben tener la misma frecuencia. No requiere iniciar sesión.

Serie descargada: `PN01210PM`, tipo de cambio promedio del periodo, bancario promedio, S/ por US$, mensual. Se guarda la respuesta original y su descripción. La correlación usa cambios logarítmicos mensuales, rezagos de 1 a 3 meses y meses completos, sin rellenar meses ausentes.

No se tienen versiones históricas de publicación (“vintages”). Por ello las correlaciones son exploratorias sobre datos revisados y no validan el uso de esta variable en un backtest operativo. Inflación, combustibles, fertilizantes y actividad económica son hipótesis posteriores; no se añadieron códigos de series sin verificarlos.

## Clima

[SENAMHI](https://www.senamhi.gob.pe/) queda pendiente de integración efectiva. Antes de entrenar: seleccionar estaciones por altitud y zona, revisar cobertura, unidades, acumulados y calidad, almacenar fecha de disponibilidad y distinguir observación de pronóstico. No usar lluvia o temperatura futura observada al evaluar una siembra histórica. A cuatro–seis meses se necesitan escenarios climáticos con su propia incertidumbre.
