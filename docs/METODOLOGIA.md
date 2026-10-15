# Metodología y límites del piloto

## Objetivo

Estimar la trayectoria del precio promedio mayorista de una variedad de papa en el Gran Mercado Mayorista de Lima. Es un precio de plaza de destino en S/kg. La zona de cultivo introducida en la interfaz no cambia el modelo: el piloto aún no tiene una función validada para precio en chacra ni un modelo de madurez del cultivo por clima.

La ventana de Canchán propuesta es 115–130 días, **supuesto editable** alrededor del periodo vegetativo de 120 días de la [ficha INIA 303](https://www.inia.gob.pe/wp-content/uploads/investigacion/programa/sistProductivo/variedad/papa/INIA_303.pdf). Para otras variedades, 120–160 días es un valor inicial sin validación agronómica. Altitud, semilla, manejo, agua y objetivo comercial modifican ese ciclo. El usuario debe ajustar mínimo y máximo.

## Contrato y preparación

La clave de observación es fecha + variedad + mercado. No se promedian diferentes mercados, calidades o fuentes. Las unidades del formulario se validan; precio debe ser positivo y no superar S/100/kg, un umbral de revisión de esquema, no una ley económica. Un valor fuera del contrato bloquea esa respuesta para inspección.

El calendario de entrada es diario. Se conservan ausencias. Para variables de entrada se admite arrastre desde el pasado, máximo siete días. Nunca interpolación bilateral ni “backfill”. Solo se entrenan y puntúan objetivos observados. Se exigen dos años de entrenamiento, al menos 85% de cobertura general y 80% de objetivos observados en cada bloque de evaluación.

## Candidatos

1. Último precio: baseline de persistencia.
2. Media de los últimos 28 días.
3. Estacional anual: precio de 365 días antes, dentro de la información conocida en el origen.
4. Ridge directo, con estandarización y regularización.
5. HistGradientBoosting directo, semilla fija, complejidad limitada.

Los dos modelos supervisados aprenden varios horizontes con ejemplos anclados en fechas históricas. Incluyen último precio, medias y dispersión pasadas, referencia anual conocida, horizonte y componentes de calendario. No se usan lluvia, volúmenes o macros futuras reales. La predicción es directa, evitando alimentar recursivamente cientos de precios estimados.

SARIMA y XGBoost no están implementados en v4. Añadirlos tendrá sentido si superan a estos candidatos en la misma evaluación, con un costo de operación razonable.

## Selección temporal

Se evalúan por separado 7, 30, 90, 180 y 240 días. Para cada horizonte se toman ocho orígenes con separación igual al horizonte; los bloques no se superponen dentro de esa evaluación. El mínimo para 240 días es 730 + 8×240 = 2.650 días de calendario.

- Tres primeros bloques: ranking por MAE y selección del candidato.
- Tres siguientes: calibración del error absoluto del candidato ya elegido.
- Dos últimos: auditoría fuera de selección y calibración.

Los candidatos fallidos se registran y no se comparan con un conjunto de bloques más fácil. Se exige baseline elegible. La elección usa MAE, no correlación ni el ajuste sobre toda la serie. MAE y RMSE están en S/kg; sMAPE es porcentual. La mejora frente al baseline es `1 - MAE_modelo/MAE_baseline` en auditoría. Un valor negativo señala peor desempeño.

No se promovió otro modelo usando los bloques de auditoría para después anunciar las mismas métricas como si fueran independientes. Se conserva el ganador de selección y se marca experimental si la mejora en auditoría es negativa o la cobertura del rango es inferior a 75%. El objetivo de cobertura sigue siendo 80%; el umbral de 75% es una política explícita del piloto, no una prueba de certificación.

## Rangos y consulta de cosecha

El rango usa el cuantil empírico de error absoluto con corrección finita para objetivo 80%, agregado entre los pasos del horizonte de los tres bloques de calibración. Son residuos temporales dependientes y puede existir cambio de régimen. No se garantiza cobertura futura y no se afirma conformalidad con garantías de intercambio.

Para cada día futuro se utiliza el reporte del menor horizonte evaluado que lo contiene. Esto puede producir cambios al cruzar 7/30/90/180 días; se identifica el horizonte en cada fila. Mejorar la continuidad o calibrar por paso requiere validación adicional.

En una cosecha se promedian los escenarios diarios dentro de la ventana completa. **El promedio de los extremos diarios no es un intervalo calibrado del precio promedio de cosecha**. La interfaz lo declara. Si la ventana excede las fechas disponibles, se rechaza; no se limita silenciosamente el horizonte ni se toma una fecha cercana.

El escenario económico descuenta merma antes de ventas. Comisión y flete/empaque se aplican a los kilos vendibles. Producción = hectáreas × costo por hectárea. Precio de equilibrio = `(costo_producción/kilos_vendibles + flete_kg)/(1-comisión)`. No se asigna probabilidad de ganancia ni se introduce una recomendación automática de endeudamiento o superficie a sembrar.

## Macros, clima y producción

La correlación mensual de cambios reduce parte del riesgo de correlación espuria de niveles, pero no establece causalidad. La prueba actual usa únicamente tipo de cambio. La adopción de exógenas requiere comparación con/sin variable en los mismos cortes, disponibilidad conocida al origen, manejo de revisiones, regularización y comparación estable por horizonte. Es necesario pronosticar o construir escenarios de las exógenas futuras; nunca suministrar sus realizaciones futuras al modelo histórico.

## Operación

El proceso diario refresca ingestión e inferencia. La elección de modelo y los rangos se reevalúan mensualmente. El registro guarda métricas, orígenes, errores, hash de datos, versión del código y artefacto de pronóstico. MLflow es opcional para seguimiento de métricas/reportes; todavía no existe un servicio remoto ni una política automática validada de rollback entre champions.

La frescura se evalúa desde la última observación, no desde la fecha de descarga. A los siete días sin precios la consulta de cosecha se bloquea. Más de 45 días sin evaluación también bloquea nuevos escenarios. Un artefacto anterior puede seguir mostrando historia y métricas con sus fechas.

Antes de pasar de piloto a servicio para agricultores: extender la auditoría a campañas distintas, contrastar el precio por calidad y condición comercial, validar ciclos con agrónomos, medir cobertura por horizonte y campaña, evaluar shocks climáticos/viales, incorporar costos regionales y probar rendimiento/conectividad con usuarios reales.

El monitor diario compara pronósticos previamente emitidos con precios que ya se observaron. Conserva origen y objetivo, y produce alertas heurísticas de degradación con al menos 30 pares recientes. En la primera ejecución todavía no existen esos resultados futuros: no se simula monitoreo en producción.
