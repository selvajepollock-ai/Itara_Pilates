# Itara Pilates — Horarios: menú de opciones y responsive (ajustes sobre `rediseno-horarios`)

Referencias visuales:

| Archivo | Vista |
|---|---|
| `semana-referencia.html` | Escritorio, actualizada con los botones nuevos |
| `semana-referencia-tablet.html` | Tablet (834 px) |
| `semana-referencia-celular.html` | Celular (390 px) |

Son mockups con sintaxis de plantilla: **no copiar el markup**. Los datos son los de la semana del 5 al 9 de octubre.

Aplica **sobre la rama `rediseno-horarios` (todavía no mergeada)**. Mismas reglas que el handoff original de Horarios: solo presentación y reutilizar las acciones existentes.

## 1. El menú "⋯" junto a "Nueva clase" se reemplaza

Hoy, el botón "⋯" a la izquierda de "+ Nueva clase" esconde solo dos opciones. Se reemplaza por **botones visibles con nombre**:

| Ancho | Qué se muestra |
|---|---|
| **Escritorio (≥ 1024 px)** | Dos botones secundarios (44 px de alto, borde `#E2D9CC`, 14 px) a la izquierda de "+ Nueva clase": **"🗓️ Feriados y cierres"** → pantalla de Feriados; **"🏷️ Tipos de clase"** → pantalla actual de tipos |
| **Tablet (768–1023 px)** | Los mismos botones con texto corto: **"🗓️ Feriados"** y **"🏷️ Tipos"**, más "+ Nueva clase" |
| **Celular (< 768 px)** | Se mantiene un botón "⋯" (44×44, con `aria-label="Más opciones: feriados y tipos de clase"`) y "+ Clase". El "⋯" abre una **hoja inferior** con una fila por opción: emoji en un cuadrado de 44 px con color (🗓️ `#FDF0D5`, 🏷️ `#EFE7FB`), título (15 px semibold), descripción (13 px gris: "Días en que el estudio no abre" / "Reformer, cupos y duración") y "›". Al final, un botón "Cerrar" |

Si en el menú actual hay alguna otra opción además de Feriados y Tipos, sumarla con el mismo formato y avisarlo en el plan.

## 2. Tablet (768–1023 px)

- **Barra de navegación inferior** con Horarios activo; sin menú lateral.
- Encabezado: "Horarios" (Fraunces itálica, 34 px) + los botones de la sección 1.
- Pestañas Esta semana / Horario fijo, y la navegación ‹ Hoy › con el rango de fechas.
- **Chips de resumen en una fila que pasa a la línea siguiente si no entra.**
- **Grilla semanal compacta** (se mantiene la vista de semana):
  - Columna de hora de 52 px y 5 columnas de días. Fin de semana oculto y franja 11–14 h colapsada, como en escritorio.
  - Celdas de 76 px de alto como mínimo y padding de 8 px, con el número en 14.5 px, la barra y los chips en 10.5 px.
  - **Textos de chips abreviados:** "2 libres", "+1 recup.", "↻ 1", "Completa". Pueden pasar a dos líneas.
  - Sin el texto "fijos 8" en la celda.
- **Detalle de la clase como hoja inferior** (ancho máximo 640 px, alto máximo 80%), con el mismo contenido que el panel lateral de escritorio: indicadores, listas, recuperar, "Pasar lista" y el "⋯" de cancelar. Los nombres van en 3 columnas.
- Leyenda abreviada debajo de la grilla.

## 3. Celular (< 768 px)

- Encabezado: "Horarios" (30 px), "⋯" (sección 1) y "+ Clase".
- **Pestañas como control segmentado** (fondo `#F5F1EB`).
- Navegación de semana: ‹ "5 – 9 oct" ›, con botones de 44 px.
- **Chips de resumen en una fila deslizable horizontalmente**, con textos cortos: "57 libres", "+1 para recuperar", "↻ 3 recuperan", "0 canceladas".
- **Selector de día:** 5 botones (Lun a Vie, con número). Por defecto, el día de hoy; si no está seleccionado, se marca con una línea inferior en el primario.
- **Una tarjeta por clase del día** (botón a ancho completo): hora (16 px semibold), "Reformer", número sobre el cupo, barra, chips con texto completo ("2 libres", "+1 para recuperar", "↻ 1 recupera", "Completa", "Cancelada") y "›".
- **Al tocar una tarjeta, el detalle se abre como hoja inferior** (alto máximo 88%):
  - Indicadores en 3 columnas y nombres en 2 columnas.
  - "Pasar lista" a ancho completo (50 px).
  - "Más opciones (cancelar clase…)" como botón secundario.
- El contenido deja espacio para la barra inferior (`padding-bottom` ≥ 110 px, más `env(safe-area-inset-bottom)`).

## 4. Detalles comunes

- Áreas táctiles de 44 px o más en tablet y celular.
- Las hojas inferiores se cierran con ✕, deslizando hacia abajo, tocando afuera o con Escape. Llevan `role="dialog"`, `aria-modal` y foco atrapado.
- Mismo código de colores que en escritorio: verde libre, amarillo para recuperar, azul recuperan, gris completa, rojo cancelada.
