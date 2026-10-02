# Itara Pilates — Rediseño de Alumnos (handoff para implementar)

Referencia visual: `alumnos-referencia.html` (escritorio) y `alumnos-referencia-celular.html` (celular). Son mockups con sintaxis de plantilla (`{{...}}`, `<sc-for>`, `<sc-if>`): **no copiar el markup**, usarlos solo como guía de estructura, medidas y estilos. Los datos de las filas (plan, profesor, último pago) son de ejemplo.

Este rediseño continúa el de Inicio: **reutilizar los tokens, el layout del admin, el menú y los componentes ya creados** (`PageHeader`, `SectionCard`, `StatusChip`, etc.). No duplicar estilos.

## Regla principal

**Solo cambia la presentación.** No modificar consultas a Supabase (más allá de agregar columnas a un `select` de lectura), tablas, RLS, server actions, cálculos de estado de cuota, rutas ni permisos.

- Reutilizar los datos, el formulario de alta/edición y las acciones que ya existen en la pantalla actual.
- Si un dato o una acción del diseño no existe hoy, **no inventarlo**: ocultar ese elemento, dejar un `TODO` y avisarlo en el resumen final.
- Lógica de presentación permitida: filtrar, ordenar y paginar datos ya cargados; formatear fechas, montos y teléfonos; leer y escribir parámetros de la URL.

## Base visual

Igual que Inicio, con fondo blanco:

- Página y menú: `#FFFFFF`. Tarjetas y la tabla: borde `1px #EEE8DF`, radio 16 px, sombra `0 1px 2px rgba(43,42,38,0.04), 0 2px 8px rgba(43,42,38,0.05)`.
- Encabezado de tabla: fondo `#FAF8F5`, texto 12 px semibold `#6B6459`.
- Fila seleccionada o con la ficha abierta: fondo `#F4F8F4`. Separador entre filas: `#F3EEE6`.
- Números con `tabular-nums`. Fechas en es-AR, formato corto: "4 sep", "1 oct".

## Estructura (escritorio, ≥ 1024 px)

### 1. Encabezado

Título "Alumnos" + "N activos" en gris al lado (usar el mismo número que ya calcula la app).

Acciones a la derecha:

- "Copiar link de registro" (secundario). Copia el link que hoy se muestra en la pantalla y muestra un aviso "Link copiado".
- Botón "⋯" con: Importar (el flujo actual) y, si ya existe, Exportar.
- "Nuevo alumno" (primario), que abre el alta actual.

### 2. Filtros por estado (chips)

Reemplazan las 5 tarjetas de conteo actuales. Orden: Todos · Vencidos · Al día · Sin plan · Bonificados · Por vencer, cada uno con su conteo.

- Chip activo: fondo `#2B2A26`, texto blanco. Inactivo: borde `#E2D9CC`. Un chip con conteo 0 se ve atenuado, pero sigue siendo clickeable.
- Cada chip lleva un punto del color de su estado (ver tabla de estados).
- **Se sincronizan con la URL**: `?estado=vencido|aldia|sinplan|bonificado|porvencer`. Inicio ya enlaza a `/admin/alumnos?estado=vencido`, así que ese link tiene que abrir la pantalla con el filtro aplicado.

### 3. Barra de búsqueda y filtros

- Buscador por nombre, email o teléfono (reutilizar la búsqueda actual).
- Selector "Profesor": Todos, cada instructor y "Sin asignar". Mantener el filtro que ya existe.
- Selector "Plan": Todos y los planes activos.

Todos los filtros se combinan entre sí y se reflejan en la URL.

### 4. Tabla

| Columna | Contenido |
|---|---|
| (checkbox) | Solo si se implementa la barra masiva (ver punto 6) |
| Alumno | Avatar con iniciales, color derivado del nombre (5 combinaciones fijas del mockup). Nombre (botón que abre la ficha) y debajo, en 12 px gris, el estado de acceso a la app ("Sin acceso a la app" / email) |
| Plan | Nombre del plan, o "—" |
| Profesor | Nombre, o "Sin asignar" en `#8A5A12` semibold |
| Estado | Punto de 8 px + texto, **sin pastilla rellena** (ver tabla de estados) |
| Último pago | Fecha corta, o "—". Si este dato no se puede leer con las consultas actuales, ocultar la columna y dejar TODO |
| Acciones | Ícono WhatsApp (solo si tiene teléfono) + menú "⋯" con Editar (el formulario actual) y Dar de baja / Eliminar (la acción actual, siempre con confirmación) |

Otros comportamientos:

- **Ningún botón rojo visible en la fila**: las acciones destructivas van dentro del "⋯".
- Encabezado de tabla `sticky`. Orden por nombre (A–Z) por defecto; columnas ordenables si es simple hacerlo en el cliente.
- **Paginación de a 25**, con "Mostrando 1–25 de N" y controles de página. Si los datos ya se cargan completos, paginar en el cliente.
- Altura de fila: 60 px.
- Estado vacío (sin resultados para el filtro o la búsqueda): mensaje "No hay alumnos que coincidan" + botón "Limpiar filtros".

**Estados** (usar el estado que ya calcula la app; esto solo define cómo se ve):

| Estado | Punto | Texto |
|---|---|---|
| Al día | `#3E8A52` | `#2F6B3E` |
| Por vencer | `#2F6F9F` | `#255377` |
| Vencido | `#C8692E` | `#9A4A1E` |
| Vencido con recargo (solo si la app ya lo distingue) | `#B5523B` | `#8E3A24` |
| Sin plan | `#C9962E` | `#8A5A12` |
| Bonificado | `#A39C90` | `#5E584F` |

### 5. Ficha lateral del alumno

Al hacer click en el nombre se abre un panel a la derecha (ancho 420 px, borde izquierdo + sombra `-12px 0 32px rgba(43,42,38,0.08)`), **sin oscurecer la lista**. Se sincroniza con la URL (`?alumno=<id>`) para que el botón Atrás lo cierre y el link se pueda compartir. Se cierra con ✕ o con Escape.

Contenido:

1. **Cabecera:** avatar grande (52 px), nombre en Fraunces itálica 24 px y estado debajo.
2. **Acciones:** "Registrar pago" (primario; abre el `QuickPayment` en modal, con el alumno ya elegido si el componente lo permite), "WhatsApp" (secundario) y "⋯" (Editar, Dar de baja).
3. **Pestañas:** Resumen · Pagos · Clases · Notas. En esta rama solo se implementa **Resumen**. Las otras se muestran deshabilitadas o se ocultan, con TODO, salvo que los datos ya existan en la pantalla actual.
4. **Resumen:**
   - Si el estado es vencido, un bloque destacado (fondo `#FBF1EA`, borde `#F1DCCD`) con el monto de la cuota del mes y "Venció el 1/10". Si la app ya calcula el recargo, mostrar el monto con recargo; si no, solo el texto "Recargo del 10% desde el 11".
   - Grilla 2×2 con Plan, Cuota mensual, Profesor y Último pago.
   - Acceso a la app: estado actual + la acción que exista hoy (por ejemplo, reenviar invitación). Si no existe ninguna, solo el estado.
   - Contacto: teléfono y email.

### 6. Selección múltiple y barra de acciones

**Implementar solo si ya existe una acción para enviar recordatorios.** En ese caso:

- Checkbox por fila y "seleccionar todos (de esta página)" en el encabezado.
- Barra flotante oscura (`#2B2A26`, radio 14 px) abajo, con "N seleccionados", "Enviar recordatorio" y ✕ para quitar la selección.

"Asignar profesor" y "Cambiar plan" masivos **no van en esta rama**: requieren lógica nueva. Si no existe la acción de recordatorio, no incluir los checkboxes.

## Celular (< 1024 px)

Ver el artboard móvil del mockup.

- Barra inferior con "Alumnos" activo.
- Título con el conteo, buscador y chips de estado en una fila deslizable horizontal.
- Los selectores Profesor y Plan van en un botón "Filtros" que abre una hoja inferior.
- Lista en tarjeta única. Cada fila: avatar 38 px, nombre, línea "● Estado · Plan" y botón de WhatsApp de 44×44.
- Tocar la fila abre la ficha a **pantalla completa**, con el mismo contenido de Resumen.
- Botón flotante "+" (56 px, radio 18) para Nuevo alumno, por encima de la barra inferior.
- Paginación: botón "Cargar más" al final, en lugar de números de página.

## WhatsApp

Link `https://wa.me/<número>`. Normalización solo para el link, sin modificar lo guardado:

1. Quitar todo lo que no sea dígito.
2. Si no empieza con `54`, anteponer `549`.

Si el teléfono no existe o queda con menos de 10 dígitos, ocultar el botón.

## Accesibilidad

- Nombre del alumno como `<button>` real. Checkboxes con `aria-label="Seleccionar <nombre>"`.
- Chips con `role="tab"` y `aria-selected`.
- Botones de solo ícono con `aria-label` (WhatsApp, "⋯", cerrar ficha).
- Foco atrapado dentro de la ficha mientras está abierta en celular. Escape la cierra.
