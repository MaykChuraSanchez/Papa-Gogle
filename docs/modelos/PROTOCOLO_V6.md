# Evaluación V6: objetivo de cosecha

Protocolo escrito antes de ejecutar los candidatos V6 (16 octubre 2026).
Esta es investigación retrospectiva sobre un vintage ya explorado en V2/V5;
no es un test prospectivo virgen ni evidencia de rentabilidad en chacra.

## Objetivos y datos

Diez series mayoristas GMML, PEN/kg nominal, por variedad, sin mezclarlas.
Rejilla diaria; sólo entrenamiento permite arrastre causal hasta siete días.
Nunca se imputan objetivos. Orígenes cada 30 días desde 1095 días de historia.
Horizontes 7,15,30,90,150,180,240; comparar exactamente los mismos orígenes.
Dos objetivos independientes: precio del día t+h y promedio de los últimos
30 días hasta t+h (para h<30 se utiliza t+1…t+h). Esta ventana es una
aproximación comercial; no estima el día biológico de cosecha.

## Candidatos congelados

Persistencia; referencia anual; AR1 log con ventanas 365/730; tendencia
local amortiguada (pendiente 28 días, amortiguación 30 días); regresión anual
Fourier con 2 armónicos, ventanas 730/1460, Ridge 10, nivel reciente
de 28 días y amortiguación del ajuste de nivel a 180 días; regresión directa
Ridge 10/100 sobre cambios logarítmicos, calendarios y rezagos causales;
HistGradientBoosting directo (100 iteraciones, 15 hojas, regularización 10,
learning rate .05). Los modelos directos usan anclas semanales,
leads 7/15/30/60/90/120/150/180/210/240, máximo 1460 días de anclas,
semilla 20261016. No se añade clima, macro ni volumen sin vintage.

## Selección y auditoría cronológica

En cada origen y para cada objetivo/horizonte, seleccionar únicamente con
errores de orígenes anteriores cuyos objetivos completos YA terminaron.
Exigir al menos seis errores maduros comunes por candidato y comparador.
Ventana de selección: últimos 12 orígenes maduros. Elegir el menor MAE;
desempatar por orden del catálogo, con Naive primero. Si un modelo falla,
registrar el fallo, no ocultarlo ni sustituir sus predicciones por Naive.
La política seleccionada se puntúa en objetivos posteriores al origen.
Los modelos individuales se muestran como diagnósticos; su mínimo retrospectivo
no es una recomendación validada. El precio puntual logarítmico es una
estimación de mediana, coherente con MAE, sin afirmar que sea media aritmética.

Rangos para cada objetivo agregado: cuantiles de errores absolutos MADUROS
de la política, mínimo 12; hasta 36 errores anteriores; corrección de rango
finito. Sin muestra suficiente, intervalo nulo explícito. Medir cobertura
precuencial 80/95% y anchura. No interpolar bandas de trayectoria desde bandas
de un promedio; no garantizar cobertura bajo dependencia o cambio de régimen.

## Inferencia y decisión

Comparar la política definida arriba con Naive en los mismos orígenes con
selección disponible. MAE/RMSE/sesgo, aciertos por origen, períodos y predicciones
fechadas exportables. Bootstrap circular pareado de 4999 réplicas; bloques
ceil(h/30), sensibilidad al doble; semilla fija. Reportar número aproximado
de bloques independientes. Holm sobre 10×7×2 contrastes. Para declarar mejora
robusta: reducción MAE >=3%, p ajustado <=.05, IC95% positivo en ambos tamaños,
>=6 bloques efectivos y sin pérdidas de disponibilidad de candidatos.
No cambiar estos criterios después de ver resultados. Resultado insuficiente
significa investigación, no promoción automática. La política V2 permanece
vigente hasta una decisión de publicación revisable. Guardar hash de datos,
protocolo y código; errores y límites visibles.

La validación de series respeta el orden temporal y evalúa el objetivo concreto:
[Forecasting: Principles and Practice — time series cross-validation](https://otexts.com/fpp3/tscv.html).
