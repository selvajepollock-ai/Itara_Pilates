# Itara Pilates — Panel de notificaciones (campanita)

Referencia visual: `notificaciones-referencia.html` (mockup con sintaxis de plantilla: **no copiar el markup**, usarlo solo como guía). Los nombres y los avisos son de ejemplo.

## Regla principal

**Solo cambia la presentación** del botón de la campanita y del panel que abre. Usar las mismas notificaciones y acciones que existen hoy.

- No crear tipos de notificación nuevos.
- Los botones de acción (Aprobar / Rechazar, Ver pedido) se muestran **solo si la acción ya existe** y se puede ejecutar desde ahí. Si no, el ítem lleva a la pantalla donde se resuelve.
- Si hoy no existe "marcar como leído", ocultar "Marcar todo como leído", el punto de no leído y el filtro "Sin leer", y dejar TODO.

## Botón de la campanita

- Botón de 42×42 px, radio 14 px, con el emoji 🔔 de 19 px en lugar del ícono de línea gris.
- **Con notificaciones sin leer:**
  - Fondo `#FFF4DB` y borde `#F3D98B`.
  - Badge rojo `#E5484D` arriba a la derecha (mínimo 20 px, texto blanco 11 px bold, borde blanco de 2 px) con la cantidad.
- **Sin notificaciones:** fondo blanco con borde `#E2D9CC` y sin badge.
- Lleva `aria-expanded` y `aria-label` con la cantidad ("Notificaciones, 4 sin leer").

## Panel

Popover anclado a la campanita: 420 px de ancho, radio 20 px, borde `#EEE8DF`, sombra `0 20px 50px rgba(43,42,38,0.18)` y alto máximo de ~80% de la pantalla, con scroll interno. Se cierra con Escape, con click afuera o con la campanita. **En celular, hoja a pantalla completa.**

1. **Encabezado:** "Notificaciones" (Fraunces itálica, 24 px) y "Marcar todo como leído" (13 px semibold, verde).
2. **Filtros como chips:** Todas · Sin leer · Pendientes. El chip activo va en `#2B2A26` con texto blanco.
3. **Grupos** con subtítulo en mayúsculas de 11.5 px gris:
   - **REQUIERE TU RESPUESTA:** los pedidos que esperan acción del estudio. Siempre arriba.
   - **HOY**, **AYER** y después **fecha corta** ("lun 28 sep").
4. **Cada notificación:**
   - **Burbuja con emoji:** 42×42 px, radio 14 px, emoji de 22 px, con el color de fondo del tipo (tabla abajo). La burbuja va con `aria-hidden`.
   - **Texto:** el nombre en semibold y el resto normal, 14 px. Por ejemplo: "**Karina Horianski** pidió recuperar el jueves 8 a las 15:00".
   - **Hora relativa:** "Hace 10 min", "Ayer", en 12 px gris.
   - **Acciones,** si existen, debajo del texto: primaria verde + secundaria con borde, de 34 px de alto.
   - **No leídas:** fondo `#FFFCF6` y punto rojo `#E5484D` de 9 px a la derecha. **Hover:** fondo `#FAF8F5`.
   - Click en la notificación: la marca como leída y lleva a la pantalla correspondiente (la ficha del alumno, el detalle de la clase o Pagos).
5. **Estado vacío:** ✨ grande, "Estás al día" y "No hay notificaciones sin leer."
6. **Pie:** "Ver toda la actividad →", que lleva a la pantalla actual de Avisos o actividad.

### Emoji y color por tipo

Mapear cada tipo de notificación que **ya existe** a uno de estos. Si hay un tipo que no figura, usar 🔔 con fondo `#FDF0D5`.

| Tipo | Emoji | Fondo |
|---|---|---|
| Pedido de recuperación | 🔄 | `#E3EEFB` |
| Avisó que no viene (a tiempo) | 🙋‍♀️ | `#FDF0D5` |
| Aviso tardío | ⏰ | `#FDE6E1` |
| Pago registrado | 💸 | `#E3F4E6` |
| Pedido de cambio de plan | 📝 | `#EFE7FB` |
| Alumno nuevo registrado | 🆕 | `#E3EEFB` |
| Cumpleaños | 🎂 | `#FCE4EF` |
| Clase cancelada por el estudio | 🗓️ | `#FDE6E1` |
| Recuperación aprobada | ✅ | `#E3F4E6` |
| Comunicado publicado | 📣 | `#FDF0D5` |

### Sobre los emojis

Usar **emojis nativos** (texto Unicode). Se ven con el estilo de cada sistema: Apple en iPhone y Mac, Google en Android y Microsoft en Windows. No usar imágenes de los emojis de Apple: tienen licencia restringida. Si más adelante se quiere el mismo dibujo en todos los dispositivos, la opción es un set libre como Fluent Emoji (Microsoft, licencia MIT), cargado como imágenes.
