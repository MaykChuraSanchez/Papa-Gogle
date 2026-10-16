# AgroDecide · Sistema visual existente

## Alcance

Refinamiento de una plataforma operativa para agricultores peruanos. Se conserva la navegación, el contenido, la lógica, la ilustración agrícola y la identidad de la versión 4.2. La referencia Apple aporta jerarquía, espacio y contención; no se imitan sus activos ni se convierte el panel en una página de venta.

## Identidad

- Bosque `#0B3025`, menta `#20C77A`, lima `#B7F36B` y fondo `#F8FAF8`.
- Plus Jakarta Sans; números tabulares en tablas y resultados comparables.
- Texto secundario en superficies claras `#526B5E`. En bosque, `#B4CFC0` o `#C2D6CA`.
- Una sola familia de iconos: Lucide. Los valores históricos y modelos son contenido, no decoración.
- Paneles de trabajo con borde fino y radio 14–16 px. El bloque principal conserva la silueta existente, radio 28 px/20 px móvil. No combinar borde y sombra decorativa.

## Interacción y movimiento

Tokens en `src/premium.css`: presión 160 ms, estado 220 ms, ease-out `cubic-bezier(0.23,1,0.32,1)` y movimiento explicativo `cubic-bezier(0.77,0,0.175,1)`.

La presentación del inicio entra una vez por sesión de la aplicación; las tres rutas de decisión aparecen al entrar en pantalla con un desfase breve. `IntersectionObserver` + Web Animations API, sin dependencias. El contenido permanece visible por defecto; el foco, cambio de preferencia y ocultación del documento cancelan la animación. Los gráficos y formularios no reciben apariciones ni parallax. El cambio de cultivo representa una etapa ilustrativa editable y dura 500 ms. No hay bucles decorativos permanentes.

`prefers-reduced-motion` elimina desplazamientos y profundidad animada; conserva cambios breves de color para indicar estados. Hover con desplazamiento solo con puntero preciso; presión táctil 0.97, sin desplazamiento en movimiento reducido.

## Responsive y accesibilidad

- Navegación horizontal nativa y selección siempre visible. Todos los destinos se conservan.
- Teclado: foco visible; al navegar, el foco pasa al contenido sin desplazarlo. El enlace de salto sigue disponible.
- Campos de 48 px y fuente de 16 px en móvil. Controles principales de 44–48 px.
- Gráficos con tooltip, rangos, descarga y soporte de teclado existentes. Los datos no se alteran para mejorar la apariencia.
- La matriz de estacionalidad utiliza texto oscuro y una escala verde suficientemente clara; sus valores, muestras y acciones se conservan.

## Límites de esta entrega

No modifica fuentes, pronósticos, costos, ciclos, validación, API, publicación de datos ni permisos. No introduce afirmaciones comerciales ni garantías de precisión. La base de datos y la conexión con clima tienen su propio alcance.
