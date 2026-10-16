# Refinamiento visual 4.2.1

Entrega de interfaz sobre la versión 4.2: misma paleta, rutas, contenido y cálculos.

## Auditoría y cambios

| Hallazgo verificado | Corrección |
| --- | --- |
| Cabecera sin límite de contenido compartido y tres tratamientos visuales que competían | Alineación común, navegación estable, selección mediante subrayado, controles de IA consistentes |
| Etiquetas de 8–10 px y textos secundarios muy tenues | Escala tipográfica más clara, mejor contraste, campos móviles de 16 px |
| Sombras repetidas y tarjetas de estadísticas que competían con el precio | Tratamiento común de métricas, bordes discretos en paneles, espacios coherentes |
| Cultivo y etiquetas flotando indefinidamente | Presentación breve y transición de etapa al tocar; sin bucles permanentes |
| Cambio de pantalla sin transferencia explícita de foco | Foco del contenido al navegar, indicador de teclado visible |
| Texto blanco sobre parte de la escala clara del calendario | Texto oscuro en escala verde clara, conservando todos los números |
| Segunda fuente descargada sin uso | Se retira JetBrains Mono; Plus Jakarta Sans permanece |

## Movimiento

Se aplicaron las guías [Animate de Emil Kowalski](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md) y [Impeccable](https://github.com/pbakaus/impeccable), leyendo sus fuentes oficiales de animación, auditoría y pulido. El cargador y detector de Impeccable no estaban instalados: la revisión fue manual de código e interfaz, sin atribuirle una puntuación automática. No se proporcionó un archivo de Figma.

El movimiento se limita a la presentación inicial, apariciones de las rutas de decisión, feedback y etapas ilustrativas. Ningún valor financiero, gráfico o formulario se mueve por scroll. CSS y APIs del navegador; cero nuevas dependencias.

## Comprobaciones

- Build TypeScript/Vite y las 20 pruebas TypeScript/servidor.
- Playwright a través del navegador conectado: capturas antes/después y dos pasadas visuales, escritorio 1440×1000, tablet 820×1180 y móvil 390×844.
- Comprobación adicional de inicio y siembra en 320×740: sin desbordamiento horizontal del documento. Las tablas, el calendario y la navegación conservan desplazamiento interno cuando corresponde.
- Las nueve rutas continúan accesibles en móvil. Teclado Enter/Tab y foco visible comprobados en laboratorio.
- Siembra: aumentar cultivo de S/15.000 a S/16.000 reduce el margen central de S/21.996,30 a S/20.996,30. Sin cambios del motor.
- Chat móvil: consulta por Amarilla responde S/3,60/kg, fecha de publicación, y cambia la variedad correctamente.
- Consola del navegador sin errores en el recorrido local.
- `prefers-reduced-motion` revisado en código, con cancelación de Web Animations y reglas CSS. El navegador conectado no expone emulación de esa preferencia; no se afirma una prueba de sistema operativo ni de dispositivo físico.

Las capturas en resoluciones emuladas comprueban composición y navegación; no sustituyen una evaluación con lector de pantalla, gestos físicos ni mediciones de rendimiento en un teléfono de gama baja. No se declara conformidad WCAG completa o una puntuación Lighthouse no medida.

## Mantenimiento

`src/premium.css` contiene los ajustes sobre el diseño anterior; `src/hooks/usePresentationMotion.ts` gestiona la presentación. Las reglas del sistema están documentadas en `DESIGN.md`. Los diagnósticos, datos publicados y pruebas del pronóstico no se modifican.
