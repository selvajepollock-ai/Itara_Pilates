# Itara Pilates — Rediseño de Planes y Equipo (handoff para implementar)

Referencias visuales: `planes-referencia.html` y `equipo-referencia.html`. Son mockups con sintaxis de plantilla (`{{...}}`, `<sc-for>`, `<sc-if>`): **no copiar el markup**, usarlos solo como guía de estructura, medidas y estilos.

- **Datos reales:** precios de los planes, nombres, usuarios y teléfonos del equipo, y los alumnos por profesor (de Liquidación).
- **Datos de ejemplo:** la cantidad de alumnos por plan.

Las dos pantallas van en **una sola rama**. Continúan los rediseños anteriores: **reutilizar tokens, layout, menú y componentes** (tablas, menú "⋯" con confirmación, barra segmentada de Pagos › Resumen, modales). No duplicar estilos.

## Regla principal

**Solo cambia la presentación.** No modificar tablas, RLS, server actions, la lógica de alta, edición, desactivación o eliminación de planes y usuarios, ni los permisos de cada rol.

- Reutilizar los formularios y las acciones existentes, cambiando solo dónde y cómo se muestran.
- Si un dato o una acción del diseño no existe hoy, **no inventarlo**: ocultar ese elemento, dejar un `TODO` y avisarlo en el resumen final.
- Lógica de presentación permitida: contar y sumar datos ya cargados, calcular el precio por clase y formatear teléfonos solo para mostrarlos.
- Los temas del plan "1x clase" y del precio del 4x están en `pendientes-logica.md` (puntos 5 y 6) y **no se tocan acá**.

---

## Planes

### Encabezado

Título "Planes" (Fraunces itálica), subtítulo "Las mensualidades que ofrece el estudio." y botón primario **"+ Nuevo plan"**, que abre el modal. Se elimina el formulario inline del final de la página.

### Tabla de planes activos

Reemplaza la grilla de tarjetas. Una tarjeta-tabla con encabezado `#FAF8F5`:

| Columna | Contenido |
|---|---|
| Plan | Nombre en Fraunces itálica, 18 px |
| Clases / semana | El campo actual (opcional); "—" si está vacío |
| Precio mensual | "$ 38.000 / mes", semibold |
| Por clase | Precio ÷ (clases por semana × 4), formato es-AR; "—" si no hay clases por semana. Solo se muestra, no se guarda |
| Alumnos | Barra proporcional + cantidad de alumnos activos con ese plan. La cantidad es un link a `/admin/alumnos?plan=<id>` |
| Ingreso estimado | Precio × alumnos activos en el plan, sin bonificados; "—" si es 0 |
| (acciones) | Menú "⋯" con **Editar** (abre el mismo modal con los datos cargados) y **Desactivar** (con confirmación: "Los alumnos que ya tienen este plan lo conservan. No se va a poder asignar a nuevos alumnos." Ajustar el texto a lo que haga realmente la acción actual) |

- Altura de fila: 60 px.
- **Fila de total** al pie (fondo `#FAF8F5`, semibold) con el total de alumnos y el ingreso estimado.
- Debajo de la tabla, en 13 px gris: "'Por clase' toma 4 semanas por mes. 'Ingreso estimado' es precio × alumnos activos en el plan, sin bonificados ni recargos."
- **Categoría:** hoy todos los planes son "Pilates". Mostrar la columna o el chip de categoría **solo si hay más de una categoría** entre los planes activos.
- **Orden:** por clases por semana, ascendente; los planes sin clases por semana van primero.
- Si contar alumnos por plan requiere una consulta nueva (y no solo contar datos ya cargados), ocultar las columnas Alumnos e Ingreso estimado y dejar TODO.

### Planes desactivados

Sección plegable debajo de la tabla: "**Desactivados** · no se pueden asignar a alumnos nuevos", con chevron y `aria-expanded`.

- Al desplegar, la misma tabla, atenuada, con el menú "⋯" ofreciendo **Reactivar** (solo si la acción existe).
- Si no hay planes desactivados: "No hay planes desactivados."
- Si hoy la app no muestra los desactivados en ningún lado, dejar esta sección como TODO.

### Modal "Nuevo plan" / "Editar plan"

480 px de ancho, radio 18 px, fondo de pantalla `rgba(43,42,38,0.32)`. **Labels siempre arriba**, en 14 px semibold.

- **Nombre:** placeholder "Ej: 3x por semana".
- **Clases por semana y Precio mensual**, en dos columnas. El precio lleva el prefijo "$".
- **Categoría:** select. Hoy solo "Pilates".
- **Caja de ayuda** (fondo `#F4F8F4`, texto `#2F4A36`), que se actualiza al escribir: "Equivale a $ 3.833 por clase (4 semanas por mes)."
- **Botones:** "Cancelar" (secundario) y "Crear plan" / "Guardar cambios" (primario).
- Se cierra con Escape o ✕. Al guardar, aviso "Plan creado" / "Cambios guardados".

---

## Equipo

### Encabezado

Título "Equipo" (Fraunces itálica), subtítulo "Quiénes trabajan en el estudio y qué puede ver cada uno.", y a la derecha "+ Nuevo administrador" (secundario) y "+ Nuevo instructor" (primario). Se mantienen los dos flujos actuales.

### Alumnos por profesor

Tarjeta con título "Alumnos por profesor" (Fraunces itálica, 22 px):

- **Barra segmentada** (14 px de alto, segmentos proporcionales separados por 2 px), con una porción por profesor (primario, `#8DB0CE`, `#C9962E`, etc.) y una porción gris `#D9D3C8` para "Sin profesor".
- **Leyenda debajo:** punto de color, nombre y cantidad.
- **Arriba a la derecha:** "N sin profesor · Asignar →", que lleva a `/admin/alumnos?profesor=sin-asignar`. Se oculta si N = 0.
- Usar los mismos números que muestra Liquidación.

### Secciones por rol

Dos secciones: **Administradores** e **Instructores**. Cada una lleva un título (16 px semibold) y la descripción actual del rol debajo, en 13 px gris. Se reemplazan los íconos y el texto largo actual.

Cada persona es una fila de 68 px dentro de una tarjeta-tabla:

| Columna | Contenido |
|---|---|
| Persona | Avatar con inicial (color fijo derivado del nombre) + nombre (15 px) + chips de rol ("Admin" en `#EFE6DA/#6E4A30`, "Instructor" en `#E1EBE2/#2F4A36`; un administrador que da clases lleva los dos). Debajo: "Usuario: {usuario}" en 12.5 px gris |
| Teléfono | Teléfono formateado para mostrar + botón de WhatsApp. Si no tiene: link "+ Agregar teléfono", que abre la edición |
| Alumnos | "121 alumnos" para quien da clases (mismo dato que Liquidación); "—" para quien no |
| Extra | Texto gris corto: "Dueño · sin comisión", "Comisión 60%", "Registra pagos". Solo con datos que ya existen; si no hay, vacío |
| (acciones) | Menú "⋯" con **Editar** (el formulario actual) y **Eliminar** (con confirmación que nombre a la persona y aclare qué pasa con sus alumnos asignados, según lo que haga hoy la acción). Ningún "Eliminar" rojo visible |

**Teléfonos**, solo para mostrar (no modificar lo guardado):

1. Quitar `+54` y el `9` inicial si están.
2. Formatear como característica + número, por ejemplo "3751 52-5946" o "379 467-8267".
3. Si no se puede inferir la característica, mostrar los dígitos agrupados de a 4.

El link de WhatsApp usa la misma normalización que en Alumnos.

### ¿Qué puede hacer cada rol?

Sección plegable al final, abierta por defecto la primera vez, con una tabla de tres columnas: Acceso · Administrador · Instructor. Usa "✓ Sí" en verde `#2F6B3E` o "—" en gris.

| Acceso | Admin | Instructor |
|---|---|---|
| Su agenda y marcar asistencia | ✓ | ✓ |
| Todos los horarios y alumnos | ✓ | — |
| Pagos y liquidación | ✓ | — |
| Reportes | ✓ | — |
| Comunicados | ✓ | — |
| Planes y equipo | ✓ | — |

**Importante:** la tabla tiene que reflejar los **permisos reales** del código. Confirmar cada fila contra la configuración de roles actual y corregir el texto si difiere. No cambiar los permisos para que coincidan con la tabla.

Al pie: "Un administrador que también da clases lleva la etiqueta 'Instructor' y aparece en la agenda."

---

## Celular (< 1024 px), ambas pantallas

- **Planes:** una tarjeta por plan con nombre, precio mensual, "$ X por clase" y "N alumnos", más el menú "⋯". El total va en una tarjeta al final. El modal pasa a hoja inferior a pantalla completa.
- **Equipo:** una tarjeta por persona con avatar, nombre, chips de rol, teléfono con botón de WhatsApp de 44×44 y menú "⋯". La barra de alumnos por profesor se mantiene a ancho completo. La tabla de permisos pasa a una lista por rol.
- Los botones de alta van en el encabezado como "+" con un menú (Nuevo administrador / Nuevo instructor) en Equipo, y como botón flotante "+" en Planes.

## Accesibilidad

- Modales con `role="dialog"`, `aria-modal`, foco atrapado y cierre con Escape.
- Secciones plegables con `aria-expanded`.
- Menús "⋯" y botones de WhatsApp con `aria-label` que nombre al plan o a la persona.
- Confirmación antes de desactivar o eliminar.
