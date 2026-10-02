# Itara Pilates — Rediseño de Horarios (handoff para implementar)

Referencias visuales (en este directorio):

| Archivo | Vista |
|---|---|
| `semana-referencia.html` | Esta semana, escritorio |
| `semana-referencia-celular.html` | Esta semana, celular |
| `horario-fijo-referencia.html` | Horario fijo, escritorio |
| `horario-fijo-referencia-celular.html` | Horario fijo, celular |

Son mockups con sintaxis de plantilla (`{{...}}`, `<sc-for>`, `<sc-if>`): **no copiar el markup**, usarlos solo como guía de estructura, medidas y estilos. Todos los nombres y cupos son de ejemplo.

Este rediseño continúa los de Inicio y Alumnos: **reutilizar los tokens, el layout, el menú y los componentes ya creados**, en especial el panel de ficha del alumno (`AlumnoPanel` o como se haya llamado) y `StatusChip`.

## Regla principal

**Solo cambia la presentación.** No modificar consultas a Supabase (salvo agregar columnas a un `select` de lectura), tablas, RLS, server actions, la lógica de cancelaciones, recuperaciones, lugares fijos, feriados ni cupos, rutas ni permisos.

- Reutilizar las acciones existentes: nueva clase, pasar lista, cancelar clase, anotar recuperación, feriados, tipos de clase.
- Si un dato o una acción del diseño no existe hoy, **no inventarlo**: ocultar ese elemento, dejar un `TODO` y avisarlo en el resumen final.
- Lógica de presentación permitida: agrupar, contar y ordenar datos ya cargados; formatear fechas; leer y escribir parámetros de la URL.

## Concepto: dos pestañas, una sola estructura

Horarios pasa a tener dos pestañas, sincronizadas con la URL (`?vista=semana|fijo`; por defecto `semana`):

1. **Esta semana**: lo que pasa realmente en cada fecha (asistencia con cancelaciones, lugares liberados, recuperaciones, clases canceladas).
2. **Horario fijo**: la estructura base del estudio, es decir, quién tiene lugar fijo en cada horario de lunes a viernes, **sin** cancelaciones ni recuperaciones y sin fechas. Es de **solo consulta** y la ve **solo el rol administrador**.

Las dos comparten la misma grilla: días en columnas, horas en filas, primera columna de 64 px con la hora ("08 h"). Además:

- **Fin de semana oculto** si no hay clases (hoy está cerrado).
- **Franjas sin ninguna clase en toda la semana colapsadas** en una sola fila gris: "Sin clases de 11 a 14 h". Calcularlo a partir de los datos, no fijarlo a mano.
- Las horas que no tienen clase un día puntual se muestran como celda vacía con fondo `#FCFBF9`.

## Código de colores (igual en todas las pantallas)

| Significado | Fondo | Texto | Dónde |
|---|---|---|---|
| Lugar fijo libre (se puede anotar a alguien permanente) | `#E1EBE2` | `#2F4A36` | "1 libre", "2 libres" |
| Lugar liberado por cancelación (solo para recuperar esa fecha) | `#FBEFC9` | `#7A5A0E` | "+1 recuperar" |
| Alumno que viene a recuperar | `#E2ECF5` | `#255377` | "↻ 1" |
| Completa | `#F1EDE6` | `#5E584F` | "Completa" |
| Cancelada | `#F5E1DC` | `#9A3420` | "Cancelada" + fondo rayado |

Las etiquetas son chips de 11 px semibold, radio 999 px. Barra de ocupación de 4 px con fondo `#EFE9DF`, relleno en el primario, y `#2F4A36` cuando está completa.

Fondo rayado de clase cancelada: `repeating-linear-gradient(135deg, #FFFFFF 0 6px, #FAF3F1 6px 12px)`.

## Encabezado común

- Título "Horarios" en Fraunces itálica, y debajo las pestañas (subrayado de 2 px en el primario para la activa).
- Acciones a la derecha: botón "⋯" con Feriados y Tipos de clase (los flujos actuales) y "+ Nueva clase" (primario, el flujo actual).
- "Pasar lista" sale de la barra de herramientas: queda dentro del detalle de cada clase y en Inicio.

## Pestaña "Esta semana"

### Barra de navegación

‹ · Hoy · › + rango de fechas en es-AR ("28 sep – 2 oct 2026"). Se reemplaza el date picker en formato mm/dd/yyyy.

A la derecha, cuatro chips de resumen de la semana con los colores de la tabla:

- `N lugares fijos libres`
- `+N para recuperar`
- `↻ N recuperaciones`
- `N clases canceladas`

Usar los mismos números que hoy calcula la app ("lugares fijos libres", "liberados por cancelaciones", "recuperaciones").

### Encabezado de días

"Lun 28", "Mar 29", etc. El día de hoy con fondo `#F4F8F4` y un chip "Hoy" en el primario.

### Celda de clase

Es un `<button>` que ocupa toda la celda (altura mínima 84 px, padding 10–12 px). En hover: `box-shadow: inset 0 0 0 2px #CFDDD1`. La seleccionada: fondo `#F4F8F4` + borde interno de 2 px en el primario.

Contenido:

1. **Fila superior:** los que vienen esa fecha sobre el cupo ("7/8"), en 15 px semibold. Si hubo cancelaciones, a la derecha en gris: "fijos 8".
2. **Barra de ocupación.**
3. **Etiquetas**, en este orden y solo las que apliquen: libres, +recuperar, ↻ recuperan. "Completa" solo si no hay libres ni lugares para recuperar. Una clase cancelada muestra solo "Cancelada", "—" como número y sin barra.

`aria-label` de la celda: "Martes 16:00, 7 de 8" o "Viernes 19:00, cancelada".

### Detalle de la clase (panel lateral)

Click en una celda abre un panel a la derecha (420 px), con el mismo estilo que la ficha del alumno. Se sincroniza con la URL (`?clase=<id>&fecha=<yyyy-mm-dd>`). Se cierra con ✕ o con Escape.

1. **Cabecera:** tipo de clase en gris ("Reformer"), título "Martes 29 sep · 16:00" en Fraunces itálica e instructor, si el dato existe.
2. **Tres indicadores:** vienen · avisaron · recuperan.
3. **Si hay lugares liberados por cancelación**, bloque destacado (fondo `#FDF6E1`, borde `#F0DFA8`):
   - Título: "1 lugar para recuperar".
   - Texto: "Se liberó por una cancelación. Sirve para que alguien recupere en esta fecha; no es un lugar fijo."
   - Botón "Anotar recuperación", que usa el flujo actual. Si no existe, ocultar el botón y dejar TODO.
4. **"Vienen (N)":** nombres en 2 columnas. Cada nombre abre la ficha del alumno (ver "Interacción con nombres").
5. **"Avisaron que no vienen":** una fila por alumno, con el nombre tachado en gris y el chip amarillo "Puede recuperar". Solo si la app ya registra ese derecho; si no, sin chip.
6. **"Vienen a recuperar":** nombres con chip azul, o "Nadie anotado para recuperar en esta clase."
7. **Pie:**
   - "Pasar lista" (primario) si la clase es de hoy, usando la acción actual.
   - "Ver asistencia" si ya pasó y hay asistencia registrada.
   - "⋯" con Cancelar clase (acción actual, siempre con confirmación) y Editar, si existe.

**Clase cancelada:** en lugar de los tres indicadores, un aviso rojo "Clase cancelada · N alumnos con lugar fijo no tienen clase esta fecha". Debajo, la lista de esos alumnos.

### Celular ("Esta semana")

- Pestañas como control segmentado (fondo `#F5F1EB`, la activa en blanco con sombra).
- ‹ rango ›, y debajo un selector de día de 5 botones (día y número). Hoy marcado con una línea inferior en el primario cuando no está seleccionado.
- Una tarjeta por clase: hora, "Reformer", número sobre el cupo, barra, etiquetas y una flecha.
- Al tocar la tarjeta, el detalle se abre a pantalla completa (o como hoja inferior alta) con el mismo contenido.

## Pestaña "Horario fijo"

### Barra superior

- **Texto explicativo:** "Quién tiene lugar fijo en cada clase. No incluye cancelaciones ni recuperaciones."
- **Totales:** "**N** lugares fijos ocupados de **M** · **K libres**".
- **Buscador "Buscar alumno en la grilla":**
  - Resalta con fondo `#FCE7A6` y negrita los nombres que coinciden.
  - Atenúa el resto a `#B5AEA2`.
  - Muestra al lado "Está en N horarios" o "Sin coincidencias".
  - Es un filtro puramente visual, no hace consultas nuevas.

### Encabezado de días

Nombre completo del día y, a la derecha en gris, "ocupados/cupo" del día ("39/48").

### Celda

1. **Fila superior:** "6/8" (12 px semibold) y chip verde "2 libres", o gris "Completa".
2. **Lista de alumnos con lugar fijo** en 2 columnas, como nombre + inicial del apellido ("Karina H."), 12.5 px. El nombre completo va en el atributo `title`.
3. **Lugares libres** representados como "Libre" con borde punteado `#DDD4C6`, hasta completar el cupo.

No hay acciones de edición en esta vista.

### Interacción con nombres (también aplica al detalle de clase)

- Cada nombre es un `<button>`. En hover: fondo `#E1EBE2`, texto `#2F4A36`, subrayado. Al pasar el mouse sobre un nombre, se resalta **ese mismo alumno en todos sus horarios** de la grilla.
- Click: abre a la derecha la **misma ficha de alumno de la pantalla Alumnos**, reutilizando el componente, sin salir de Horarios. El alumno queda marcado en el primario, con texto blanco, en todas sus celdas.
- En este contexto, la ficha suma arriba una sección **"Sus horarios fijos"**: una fila por horario ("Lunes · 07:00", "6/8 en la clase") y el subtítulo "N clases fijas por semana". Debajo va el resumen habitual (plan, estado de cuota, profesor, último pago) y el botón "Ver ficha completa", que lleva a `/admin/alumnos?alumno=<id>`.
- La ficha se sincroniza con la URL (`?alumno=<id>`).

### Celular ("Horario fijo")

- Selector de día (Lun a Vie) con los lugares libres de ese día debajo de cada uno.
- Debajo, "Lunes: N lugares fijos ocupados · K libres".
- Una tarjeta por horario: hora, "6/8", chip de libres o "Completa", y los nombres completos en 2 columnas.
- Tocar un nombre abre la ficha del alumno a pantalla completa.

## Datos a confirmar antes de implementar

1. **El lugar fijo es un dato propio:** la app guarda la asignación permanente alumno ↔ horario separada de la asistencia por fecha (la leyenda actual dice "se puede anotar a alguien de forma permanente"). El horario fijo lee **solo** esa asignación vigente.
2. **Distinción de lugares:** cómo distingue hoy la app entre "lugar fijo libre" y "lugar liberado por cancelación" en una fecha.
3. **Acciones existentes:** si existen como acciones "anotar recuperación", "pasar lista", "cancelar clase" y el registro de quién avisó que no viene.
4. **Instructor por clase:** si el dato existe. Si no, se omite en el detalle.

## Accesibilidad

- Celdas y nombres como `<button>` reales, con `aria-label` descriptivo.
- Pestañas con `role="tab"` y `aria-selected`.
- Los paneles se cierran con Escape. En celular, el foco queda atrapado mientras están abiertos.
- El color nunca es el único indicador: todas las etiquetas llevan texto.
