# Resultados V6: análisis por variedad

Ejecutado con protocolo congelado antes de entrenar. No reemplaza V2 automáticamente.

Run: `harvest-v6-1530308447ded0bad63b`. Código: `b643632490f73dfdfd2d58fecb4556bd538e297a317e6b66965c5706d48652ba`.

Entorno: numpy 2.0.0, pandas 2.2.2, scipy 1.14.1, scikit-learn 1.6.1, statsmodels 0.14.2, duckdb 1.5.5.

Diez modelos × diez variedades × hasta 59 orígenes. Selección cronológica con errores maduros; siete plazos y dos objetivos. La historia ya fue explorada: evaluación retrospectiva, no prueba prospectiva nueva.

## Resultado general

Cinco combinaciones variedad/plazo/objetivo cumplen el criterio de mejora robusta; las otras 135 no lo acreditan. Esto no significa que los 140 pronósticos sean fiables por igual. La calibración de intervalos se evalúa por separado.

| Variedad | Plazo | Objetivo | MAE política | MAE Naive | Cambio de error | Orígenes | Mejora robusta |
|---|---:|---|---:|---:|---:|---:|---|
|Amarilla|150|endpoint|0.782|0.984|20.5%|44|No|
|Amarilla|150|harvest_mean|0.800|1.025|22.0%|44|No|
|Amarilla|180|endpoint|0.765|0.915|16.4%|42|No|
|Amarilla|180|harvest_mean|0.801|0.962|16.7%|42|No|
|Blanca|150|endpoint|0.518|0.532|2.6%|44|No|
|Blanca|150|harvest_mean|0.389|0.525|25.9%|44|No|
|Blanca|180|endpoint|0.459|0.521|11.9%|42|No|
|Blanca|180|harvest_mean|0.417|0.529|21.2%|42|No|
|Canchán|150|endpoint|0.412|0.475|13.4%|44|No|
|Canchán|150|harvest_mean|0.395|0.469|15.9%|44|No|
|Canchán|180|endpoint|0.345|0.443|22.3%|42|No|
|Canchán|180|harvest_mean|0.365|0.455|19.7%|42|No|
|Color|150|endpoint|0.364|0.487|25.4%|44|Sí|
|Color|150|harvest_mean|0.336|0.462|27.1%|44|Sí|
|Color|180|endpoint|0.342|0.445|23.2%|42|No|
|Color|180|harvest_mean|0.342|0.466|26.6%|42|No|
|Huamantanga|150|endpoint|0.418|0.529|21.0%|44|No|
|Huamantanga|150|harvest_mean|0.339|0.493|31.3%|44|No|
|Huamantanga|180|endpoint|0.320|0.517|38.1%|42|No|
|Huamantanga|180|harvest_mean|0.312|0.500|37.6%|42|No|
|Huayro|150|endpoint|0.305|0.824|63.0%|44|No|
|Huayro|150|harvest_mean|0.296|0.792|62.6%|44|No|
|Huayro|180|endpoint|0.337|0.811|58.4%|42|Sí|
|Huayro|180|harvest_mean|0.311|0.788|60.6%|42|Sí|
|Negra Andina|150|endpoint|0.463|0.492|5.9%|44|No|
|Negra Andina|150|harvest_mean|0.432|0.479|9.9%|44|No|
|Negra Andina|180|endpoint|0.523|0.483|-8.2%|42|No|
|Negra Andina|180|harvest_mean|0.452|0.496|8.9%|42|No|
|Peruanita|150|endpoint|0.559|0.721|22.5%|44|No|
|Peruanita|150|harvest_mean|0.548|0.723|24.2%|44|No|
|Peruanita|180|endpoint|0.509|0.690|26.2%|42|No|
|Peruanita|180|harvest_mean|0.519|0.712|27.0%|42|No|
|Yungay|150|endpoint|0.505|0.532|5.1%|44|No|
|Yungay|150|harvest_mean|0.402|0.525|23.4%|44|Sí|
|Yungay|180|endpoint|0.458|0.521|12.2%|42|No|
|Yungay|180|harvest_mean|0.414|0.529|21.7%|42|No|
|Única|150|endpoint|0.441|0.568|22.2%|44|No|
|Única|150|harvest_mean|0.404|0.532|24.0%|44|No|
|Única|180|endpoint|0.442|0.550|19.8%|42|No|
|Única|180|harvest_mean|0.410|0.570|28.1%|42|No|

## Amarilla

2843 cotizaciones; 99.93% cobertura; 2 fechas ausentes. Último dato 2026-10-15: S/ 3.60/kg.

Rango observado 0.93–6.13; mediana 2.23; CV 0.355. Fuerza STL anual 0.107; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: -8.8%; PSI 0.772. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|AR1 365|0.337|0.276|-21.9%|90.2% (41)|
|7|harvest_mean|AR1 730|0.203|0.194|-4.6%|90.2% (41)|
|15|endpoint|Boosting directo|0.577|0.437|-32.1%|87.5% (40)|
|15|harvest_mean|Naive|0.313|0.258|-21.4%|92.5% (40)|
|30|endpoint|Boosting directo|0.610|0.567|-7.5%|95.0% (40)|
|30|harvest_mean|Boosting directo|0.391|0.345|-13.2%|100.0% (40)|
|90|endpoint|AR1 730|0.814|0.900|9.6%|97.1% (34)|
|90|harvest_mean|Referencia anual|0.819|0.782|-4.8%|94.1% (34)|
|150|endpoint|AR1 730|0.782|0.984|20.5%|92.9% (28)|
|150|harvest_mean|Referencia anual|0.800|1.025|22.0%|100.0% (28)|
|180|endpoint|AR1 730|0.765|0.915|16.4%|96.0% (25)|
|180|harvest_mean|Referencia anual|0.801|0.962|16.7%|96.0% (25)|
|240|endpoint|Naive|0.628|0.542|-15.9%|89.5% (19)|
|240|harvest_mean|AR1 365|0.738|0.626|-17.8%|100.0% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|1.513|1.601|
|2024|12|0.928|1.166|
|2025|12|0.394|0.615|
|2026|10|0.419|0.773|

Fallos explícitos: 0.


## Blanca

2843 cotizaciones; 99.93% cobertura; 2 fechas ausentes. Último dato 2026-10-15: S/ 1.11/kg.

Rango observado 0.40–2.88; mediana 1.03; CV 0.379. Fuerza STL anual 0.000; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: -5.4%; PSI 1.377. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|Tendencia amortiguada|0.108|0.114|5.1%|85.4% (41)|
|7|harvest_mean|Tendencia amortiguada|0.075|0.072|-4.1%|82.9% (41)|
|15|endpoint|Tendencia amortiguada|0.171|0.155|-10.2%|82.5% (40)|
|15|harvest_mean|Tendencia amortiguada|0.108|0.099|-9.3%|85.0% (40)|
|30|endpoint|Tendencia amortiguada|0.230|0.205|-12.6%|77.5% (40)|
|30|harvest_mean|Tendencia amortiguada|0.137|0.131|-5.1%|80.0% (40)|
|90|endpoint|AR1 730|0.404|0.425|5.0%|82.4% (34)|
|90|harvest_mean|AR1 730|0.386|0.382|-1.1%|76.5% (34)|
|150|endpoint|AR1 730|0.518|0.532|2.6%|96.4% (28)|
|150|harvest_mean|AR1 730|0.389|0.525|25.9%|89.3% (28)|
|180|endpoint|AR1 730|0.459|0.521|11.9%|100.0% (25)|
|180|harvest_mean|AR1 730|0.417|0.529|21.2%|88.0% (25)|
|240|endpoint|Naive|0.446|0.406|-9.9%|94.7% (19)|
|240|harvest_mean|AR1 730|0.413|0.431|4.4%|84.2% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.519|0.559|
|2024|12|0.422|0.459|
|2025|12|0.315|0.545|
|2026|10|0.307|0.544|

Fallos explícitos: 0.


## Canchán

2843 cotizaciones; 99.93% cobertura; 2 fechas ausentes. Último dato 2026-10-15: S/ 2.23/kg.

Rango observado 0.40–2.70; mediana 1.20; CV 0.323. Fuerza STL anual 0.000; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: +22.1%; PSI 0.644. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|Naive|0.101|0.097|-4.7%|80.5% (41)|
|7|harvest_mean|AR1 730|0.071|0.072|0.8%|80.5% (41)|
|15|endpoint|Tendencia amortiguada|0.213|0.173|-23.1%|72.5% (40)|
|15|harvest_mean|Tendencia amortiguada|0.119|0.099|-19.8%|75.0% (40)|
|30|endpoint|Boosting directo|0.240|0.216|-11.5%|80.0% (40)|
|30|harvest_mean|Boosting directo|0.167|0.134|-24.8%|75.0% (40)|
|90|endpoint|AR1 365|0.424|0.453|6.6%|85.3% (34)|
|90|harvest_mean|AR1 365|0.426|0.391|-8.9%|82.4% (34)|
|150|endpoint|AR1 730|0.412|0.475|13.4%|82.1% (28)|
|150|harvest_mean|AR1 730|0.395|0.469|15.9%|78.6% (28)|
|180|endpoint|Naive|0.345|0.443|22.3%|84.0% (25)|
|180|harvest_mean|AR1 730|0.365|0.455|19.7%|84.0% (25)|
|240|endpoint|Fourier 1460|0.345|0.300|-15.1%|78.9% (19)|
|240|harvest_mean|Boosting directo|0.337|0.337|0.0%|84.2% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.420|0.493|
|2024|12|0.423|0.451|
|2025|12|0.321|0.444|
|2026|10|0.424|0.498|

Fallos explícitos: 0.


## Color

2843 cotizaciones; 99.93% cobertura; 2 fechas ausentes. Último dato 2026-10-15: S/ 2.02/kg.

Rango observado 0.39–2.51; mediana 1.24; CV 0.332. Fuerza STL anual 0.032; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: +34.1%; PSI 2.194. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|Naive|0.088|0.077|-13.5%|87.8% (41)|
|7|harvest_mean|AR1 730|0.061|0.053|-15.9%|78.0% (41)|
|15|endpoint|Tendencia amortiguada|0.164|0.131|-25.0%|72.5% (40)|
|15|harvest_mean|Naive|0.088|0.076|-15.9%|75.0% (40)|
|30|endpoint|Boosting directo|0.240|0.198|-21.3%|70.0% (40)|
|30|harvest_mean|Tendencia amortiguada|0.110|0.105|-5.1%|72.5% (40)|
|90|endpoint|Fourier 1460|0.389|0.414|6.1%|82.4% (34)|
|90|harvest_mean|Fourier 730|0.364|0.345|-5.6%|73.5% (34)|
|150|endpoint|Fourier 1460|0.364|0.487|25.4%|78.6% (28)|
|150|harvest_mean|Fourier 1460|0.336|0.462|27.1%|78.6% (28)|
|180|endpoint|AR1 365|0.342|0.445|23.2%|80.0% (25)|
|180|harvest_mean|Fourier 1460|0.342|0.466|26.6%|80.0% (25)|
|240|endpoint|Fourier 1460|0.328|0.354|7.4%|73.7% (19)|
|240|harvest_mean|Fourier 1460|0.365|0.389|6.1%|73.7% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.344|0.400|
|2024|12|0.258|0.350|
|2025|12|0.340|0.523|
|2026|10|0.419|0.583|

Fallos explícitos: 0.


## Huamantanga

2841 cotizaciones; 99.86% cobertura; 4 fechas ausentes. Último dato 2026-10-15: S/ 2.00/kg.

Rango observado 0.66–4.28; mediana 1.68; CV 0.295. Fuerza STL anual 0.189; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: -10.0%; PSI 1.194. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|AR1 365|0.164|0.149|-10.0%|92.7% (41)|
|7|harvest_mean|AR1 365|0.110|0.109|-1.6%|90.2% (41)|
|15|endpoint|AR1 730|0.265|0.223|-19.1%|92.5% (40)|
|15|harvest_mean|AR1 365|0.146|0.136|-7.0%|92.5% (40)|
|30|endpoint|Ridge directo 100|0.366|0.338|-8.3%|90.0% (40)|
|30|harvest_mean|AR1 730|0.196|0.184|-6.4%|92.5% (40)|
|90|endpoint|AR1 365|0.436|0.433|-0.7%|94.1% (34)|
|90|harvest_mean|AR1 365|0.359|0.374|4.0%|100.0% (34)|
|150|endpoint|AR1 730|0.418|0.529|21.0%|96.4% (28)|
|150|harvest_mean|AR1 365|0.339|0.493|31.3%|100.0% (28)|
|180|endpoint|AR1 730|0.320|0.517|38.1%|96.0% (25)|
|180|harvest_mean|AR1 365|0.312|0.500|37.6%|92.0% (25)|
|240|endpoint|AR1 365|0.319|0.383|16.6%|78.9% (19)|
|240|harvest_mean|AR1 365|0.203|0.370|45.2%|78.9% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.801|0.890|
|2024|12|0.238|0.560|
|2025|12|0.237|0.219|
|2026|10|0.118|0.343|

Fallos explícitos: 1. 2022-10-26 Tendencia amortiguada: Predicción inválida o fuera del contrato (0,100] PEN/kg


## Huayro

2843 cotizaciones; 99.93% cobertura; 2 fechas ausentes. Último dato 2026-10-15: S/ 2.08/kg.

Rango observado 0.66–5.45; mediana 1.66; CV 0.395. Fuerza STL anual 0.382; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: -12.2%; PSI 0.891. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|Boosting directo|0.166|0.172|3.7%|82.9% (41)|
|7|harvest_mean|AR1 730|0.120|0.109|-9.6%|90.2% (41)|
|15|endpoint|Fourier 730|0.262|0.230|-14.2%|92.5% (40)|
|15|harvest_mean|Fourier 730|0.163|0.143|-14.0%|92.5% (40)|
|30|endpoint|Ridge directo 100|0.348|0.360|3.2%|95.0% (40)|
|30|harvest_mean|Boosting directo|0.226|0.197|-14.6%|95.0% (40)|
|90|endpoint|Ridge directo 100|0.488|0.704|30.6%|91.2% (34)|
|90|harvest_mean|Ridge directo 100|0.529|0.631|16.1%|100.0% (34)|
|150|endpoint|AR1 730|0.305|0.824|63.0%|78.6% (28)|
|150|harvest_mean|AR1 730|0.296|0.792|62.6%|82.1% (28)|
|180|endpoint|AR1 365|0.337|0.811|58.4%|92.0% (25)|
|180|harvest_mean|AR1 365|0.311|0.788|60.6%|92.0% (25)|
|240|endpoint|Fourier 1460|0.344|0.668|48.6%|73.7% (19)|
|240|harvest_mean|AR1 365|0.315|0.675|53.3%|73.7% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.341|1.411|
|2024|12|0.269|0.927|
|2025|12|0.325|0.311|
|2026|10|0.249|0.588|

Fallos explícitos: 0.


## Negra Andina

2843 cotizaciones; 99.93% cobertura; 2 fechas ausentes. Último dato 2026-10-15: S/ 1.48/kg.

Rango observado 0.54–3.10; mediana 1.20; CV 0.325. Fuerza STL anual 0.097; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: +0.7%; PSI 0.838. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|AR1 730|0.114|0.104|-9.3%|87.8% (41)|
|7|harvest_mean|AR1 730|0.064|0.063|-2.0%|82.9% (41)|
|15|endpoint|AR1 730|0.142|0.142|0.4%|75.0% (40)|
|15|harvest_mean|AR1 730|0.093|0.086|-7.7%|90.0% (40)|
|30|endpoint|Boosting directo|0.177|0.191|7.5%|80.0% (40)|
|30|harvest_mean|Boosting directo|0.121|0.125|3.3%|80.0% (40)|
|90|endpoint|AR1 730|0.441|0.398|-10.7%|79.4% (34)|
|90|harvest_mean|AR1 730|0.415|0.357|-16.3%|85.3% (34)|
|150|endpoint|AR1 730|0.463|0.492|5.9%|85.7% (28)|
|150|harvest_mean|AR1 730|0.432|0.479|9.9%|92.9% (28)|
|180|endpoint|AR1 730|0.523|0.483|-8.2%|96.0% (25)|
|180|harvest_mean|AR1 730|0.452|0.496|8.9%|96.0% (25)|
|240|endpoint|AR1 730|0.477|0.410|-16.4%|94.7% (19)|
|240|harvest_mean|AR1 730|0.436|0.422|-3.5%|94.7% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.622|0.545|
|2024|12|0.347|0.517|
|2025|12|0.440|0.453|
|2026|10|0.332|0.400|

Fallos explícitos: 0.


## Peruanita

2843 cotizaciones; 99.93% cobertura; 2 fechas ausentes. Último dato 2026-10-15: S/ 2.38/kg.

Rango observado 0.79–4.85; mediana 1.88; CV 0.347. Fuerza STL anual 0.220; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: -10.3%; PSI 0.748. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|Fourier 730|0.218|0.188|-16.1%|92.7% (41)|
|7|harvest_mean|AR1 730|0.124|0.115|-7.8%|90.2% (41)|
|15|endpoint|Boosting directo|0.318|0.284|-12.0%|87.5% (40)|
|15|harvest_mean|Naive|0.190|0.151|-25.9%|90.0% (40)|
|30|endpoint|AR1 730|0.384|0.330|-16.4%|87.5% (40)|
|30|harvest_mean|Fourier 730|0.244|0.218|-11.9%|92.5% (40)|
|90|endpoint|Referencia anual|0.631|0.568|-11.0%|91.2% (34)|
|90|harvest_mean|AR1 730|0.536|0.543|1.2%|91.2% (34)|
|150|endpoint|AR1 730|0.559|0.721|22.5%|96.4% (28)|
|150|harvest_mean|AR1 730|0.548|0.723|24.2%|96.4% (28)|
|180|endpoint|AR1 730|0.509|0.690|26.2%|92.0% (25)|
|180|harvest_mean|AR1 730|0.519|0.712|27.0%|92.0% (25)|
|240|endpoint|AR1 365|0.330|0.467|29.2%|78.9% (19)|
|240|harvest_mean|AR1 365|0.447|0.511|12.4%|89.5% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.850|1.233|
|2024|12|0.568|0.908|
|2025|12|0.507|0.256|
|2026|10|0.271|0.551|

Fallos explícitos: 0.


## Yungay

2843 cotizaciones; 99.93% cobertura; 2 fechas ausentes. Último dato 2026-10-15: S/ 1.11/kg.

Rango observado 0.40–2.88; mediana 1.03; CV 0.379. Fuerza STL anual 0.000; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: -5.4%; PSI 1.377. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|Tendencia amortiguada|0.110|0.114|3.3%|82.9% (41)|
|7|harvest_mean|Tendencia amortiguada|0.076|0.073|-3.3%|82.9% (41)|
|15|endpoint|Tendencia amortiguada|0.161|0.158|-2.2%|82.5% (40)|
|15|harvest_mean|Tendencia amortiguada|0.108|0.099|-9.2%|85.0% (40)|
|30|endpoint|Tendencia amortiguada|0.232|0.205|-13.2%|77.5% (40)|
|30|harvest_mean|Tendencia amortiguada|0.140|0.131|-7.1%|82.5% (40)|
|90|endpoint|AR1 730|0.436|0.425|-2.7%|82.4% (34)|
|90|harvest_mean|AR1 730|0.377|0.382|1.4%|76.5% (34)|
|150|endpoint|AR1 730|0.505|0.532|5.1%|89.3% (28)|
|150|harvest_mean|AR1 730|0.402|0.525|23.4%|85.7% (28)|
|180|endpoint|AR1 730|0.458|0.521|12.2%|100.0% (25)|
|180|harvest_mean|AR1 730|0.414|0.529|21.7%|92.0% (25)|
|240|endpoint|Naive|0.477|0.406|-17.6%|100.0% (19)|
|240|harvest_mean|AR1 730|0.446|0.432|-3.4%|94.7% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.521|0.558|
|2024|12|0.423|0.459|
|2025|12|0.361|0.546|
|2026|10|0.307|0.544|

Fallos explícitos: 0.


## Única

2834 cotizaciones; 99.61% cobertura; 11 fechas ausentes. Último dato 2026-10-15: S/ 1.81/kg.

Rango observado 0.33–2.58; mediana 1.28; CV 0.375. Fuerza STL anual 0.294; semanal 0.000.

Nivel medio reciente180d frente a referencia previa730d: +46.3%; PSI 2.209. Magnitudes descriptivas, sin interpretación causal ni p-valor independiente de la dependencia temporal.

| Plazo | Objetivo | Selección actual | MAE | Naive | Mejora | Cobertura80 (n) |
|---|---|---|---:|---:|---:|---|
|7|endpoint|Naive|0.108|0.101|-6.5%|85.4% (41)|
|7|harvest_mean|AR1 730|0.073|0.070|-2.9%|82.9% (41)|
|15|endpoint|Naive|0.198|0.158|-25.9%|90.0% (40)|
|15|harvest_mean|Naive|0.096|0.092|-4.7%|85.0% (40)|
|30|endpoint|Naive|0.282|0.234|-20.5%|75.0% (40)|
|30|harvest_mean|Naive|0.148|0.131|-13.7%|82.5% (40)|
|90|endpoint|Fourier 730|0.410|0.455|9.8%|76.5% (34)|
|90|harvest_mean|Fourier 730|0.354|0.369|4.1%|79.4% (34)|
|150|endpoint|Boosting directo|0.441|0.568|22.2%|71.4% (28)|
|150|harvest_mean|Fourier 730|0.404|0.532|24.0%|64.3% (28)|
|180|endpoint|Boosting directo|0.442|0.550|19.8%|80.0% (25)|
|180|harvest_mean|Boosting directo|0.410|0.570|28.1%|76.0% (25)|
|240|endpoint|Fourier 1460|0.309|0.498|38.1%|63.2% (19)|
|240|harvest_mean|Fourier 1460|0.361|0.537|32.7%|47.4% (19)|

### Estabilidad por año: promedio final a 150 días

| Año del objetivo | Orígenes | MAE selección | MAE Naive |
|---|---:|---:|---:|
|2023|10|0.334|0.338|
|2024|12|0.364|0.356|
|2025|12|0.349|0.663|
|2026|10|0.590|0.780|

Fallos explícitos: 1. 2026-07-07 Tendencia amortiguada: Predicción inválida o fuera del contrato (0,100] PEN/kg

## Interpretación de Única

A 150 días, objetivo promedio de la ventana final: MAE 0.404 frente a 0.532 de Naive, mejora retrospectiva de 24.0%. Sin embargo, cobertura80 observada sólo64.3% (28 orígenes). No se acredita mejora robusta global. A 7–30 días la política no supera Naive; cambiar la curva por estética empeoraría la evidencia. A 240 días, el error puntual baja38.1%, pero los pocos bloques independientes y un fallo del candidato de tendencia impiden promoción bajo el protocolo.

El menor error de un candidato observado después de evaluar todos los objetivos no convierte a ese candidato en un ganador validado. Las recomendaciones actuales se basan sólo en errores anteriores maduros. No se han añadido variables macro/clima con historial de publicación desconocido.

El rango de un promedio no se dibuja como banda diaria. El escenario de cosecha no es precio en chacra, rentabilidad neta ni recomendación de siembra garantizada.


## Precisiones sobre la implementación

AR1 conserva la transformación de V5: media condicional lognormal con
corrección de varianza, documentada en sus metadatos. Las regresiones directas
y Fourier transforman sin esa corrección (estimación de mediana). La frase
general del protocolo sobre mediana se refiere a estas regresiones; no debe
extenderse a AR1. Todos los candidatos se comparan por su error observado,
sin modificar parámetros ni seleccionar después de ver esta auditoría.

Los dos fallos registrados corresponden a tendencia amortiguada: Huamantanga
el26/10/2022 y Única el07/07/2026. Una pendiente negativa prolongada produjo
valores fuera del contrato. Se rechazan, sin recortar precios ni sustituirlos
por predicciones de otro candidato bajo el mismo nombre.
