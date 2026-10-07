# Itara Pilates — Horarios: pestaña "Clases", Tipos de clase y botón "Volver" estándar

Referencias visuales: `clases-referencia.html` (pestaña Clases) y `tipos-clase-referencia.html`. Son mockups con sintaxis de plantilla: **no copiar el markup**. Los horarios y profesores salen de la lista actual; los lugares fijos son de ejemplo.

Aplica sobre la rama `rediseno-horarios`. **Solo presentación:** reutilizar las acciones existentes (crear, editar y eliminar clase; ver alumnos; crear, editar, desactivar y reactivar tipo; exportar a Excel y PDF). No cambiar datos ni lógica.

## 1. Estándar global: botón "Volver"

Hoy conviven "← Volver al calendario", "← Ver calendario" (un botón con borde entre las acciones) y pantallas sin volver. Se crea **un único componente** y se usa en todas las subpantallas de la app (admin y alumno):

| | Escritorio y tablet | Celular |
|---|---|---|
| Forma | Link de texto **"← {Nombre de la pantalla de destino}"** (por ejemplo "← Horarios", "← Alumnos", "← Inicio") | Botón **"‹"** de 44×44 px con borde `#E2D9CC`, en la barra superior, a la izquierda del título |
| Estilo | 14 px, peso 500, color primario `#3F5B46`, sin subrayado (subrayado en hover) | `aria-label="Volver a {pantalla}"` |
| Ubicación | **Arriba del título**, alineado a la izquierda, con 18–22 px de separación | Siempre en el mismo lugar |
| Destino | La pantalla padre, no "atrás" del navegador: en Horarios, la pestaña desde la que se vino (por defecto "Esta semana") | Igual |

- **Nunca** como botón con borde dentro de la barra de acciones.
- Las pantallas principales del menú (Inicio, Horarios, Alumnos, Pagos, etc.) **no** llevan volver.
- Se aplica en: Feriados y cierres, Tipos de clase, Recuperar clase (alumno), Calendario del estudio (alumno), y toda otra subpantalla. **Listar en el plan todas las pantallas donde se reemplaza.**

## 2. La vista "Lista" pasa a ser la pestaña "Clases"

Hoy `/admin/horarios/lista` muestra las ~48 clases de los 5 días una debajo de otra, con "Ver calendario" como forma de volver. Se convierte en la **tercera pestaña de Horarios: Esta semana · Horario fijo · Clases**. La ruta actual redirige a la pestaña (por ejemplo `/admin/horarios?vista=clases`).

### Encabezado

El mismo de Horarios: título, botones "🗓️ Feriados y cierres", "🏷️ Tipos de clase" y "+ Nueva clase", más las 3 pestañas.

Debajo de las pestañas, la explicación: "Las clases que se repiten cada semana. Desde acá se crean, editan o eliminan."

### Barra de herramientas

- **Control segmentado de días:** Lun · Mar · Mié · Jue · Vie · Todos, cada uno con su cantidad de clases (por ejemplo "Lun 11"). **Por defecto, el día de hoy** (o Lun si es fin de semana). Así no se muestra la lista eterna.
- Filtro **Profesor** (Todos o cada instructor).
- **"Exportar ▾"** con Excel y PDF (los exports actuales). Se quitan los botones sueltos "Excel" y "PDF" y el botón "← Ver calendario".
- Sincronizar día y profesor con la URL.

### Tabla por día

Una tarjeta por día visible: un solo día, o los 5 si se elige "Todos".

- **Cabecera** (`#FAF8F5`): el nombre del día en Fraunces itálica (21 px) y, a la derecha, "N clases · X de Y lugares fijos ocupados".
- **Encabezado de columnas:** Horario · Clase · Sala · Profesor · Lugares fijos · Acciones.
- **Filas de 56 px**, con hover `#FAF8F5`:
  - **Horario:** "07:00–08:00", semibold.
  - **Clase:** el tipo en Fraunces itálica.
  - **Sala:** texto gris. **Si una clase tiene una sala distinta a la del resto, se resalta con un chip amarillo** (`#FDF0D5` / `#8A5A12`). Por ejemplo, el viernes 07:00 dice "Sala principal" y todas las demás "Sala Reformer": puede ser un error de carga y así se detecta.
  - **Profesor:** avatar con inicial (color por profesor) + nombre.
  - **Lugares fijos:** barra + "6/8". Usar el mismo dato que Horario fijo; si no está disponible acá, mostrar solo el cupo "8 cupos".
  - **Acciones:** link "Ver alumnos" (lleva a Horario fijo con esa clase o día, o a la acción actual "Alumnos") + menú "⋯" con **Editar** y **Eliminar** (con confirmación). **Se quitan los links "Editar" y "Eliminar" en rojo siempre visibles.**
- **Se elimina la línea punteada** que unía el nombre con el horario.

### Celular y tablet

- **Tablet:** la misma tabla, sin la columna Sala (se muestra debajo del horario solo si es distinta) y con la barra de lugares más angosta.
- **Celular:** selector de día como en "Esta semana" y **una tarjeta por clase** (horario, profesor, lugares fijos y "⋯"); "Ver alumnos" se abre desde la tarjeta.

## 3. Tipos de clase

- **Volver estándar** ("← Horarios") y título "Tipos de clase".
- Subtítulo: "Las disciplinas que ofrece el estudio. Se eligen al crear una clase."
- **"+ Nuevo tipo"** (primario) en el encabezado. Abre un **modal** con Nombre y Descripción (textarea, con la ayuda "Opcional · la ven las alumnas"), y los botones Cancelar / Crear tipo. **Se elimina el formulario inline** con labels en mayúscula.
- **Tarjeta por tipo activo** (padding 20 px, radio 18 px):
  - Monograma de 52 px con la inicial en Fraunces itálica (fondo verde suave).
  - Nombre (22 px) y chip "Activo".
  - Descripción.
  - Línea gris con uso: "48 clases por semana · 3 profesores", **contando datos ya cargados**. Si requiere una consulta nueva, omitirla.
  - A la derecha: "Editar" (secundario) + "⋯" con **Desactivar** (con confirmación que explique que no aparecerá al crear clases nuevas y qué pasa con las clases existentes, según el comportamiento actual).
- **Sección plegable "Inactivos (N) · no aparecen al crear clases"** con los tipos desactivados atenuados, chip "Inactivo" y el botón **"Reactivar"**.
- **Celular:** tarjetas a ancho completo, botón "+" en el encabezado y el modal como hoja inferior.

## 4. Feriados y cierres

Se aplica **`itara-feriados-handoff.md`** tal como está, con el volver estándar: el link dice **"← Horarios"**.
