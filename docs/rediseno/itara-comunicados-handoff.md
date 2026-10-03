# Itara Pilates — Rediseño de Comunicados (handoff para implementar)

Referencia visual: `comunicados-referencia.html`. Es un mockup con sintaxis de plantilla (`{{...}}`, `<sc-for>`, `<sc-if>`): **no copiar el markup**, usarlo solo como guía de estructura, medidas y estilos. En el historial, solo el aviso de prueba del 24 de agosto es real; los otros dos son de ejemplo.

Es la pantalla que antes se llamaba "Notificaciones masivas" (ya renombrada "Comunicados" en el menú). Continúa los rediseños anteriores: **reutilizar tokens, layout, menú y componentes** (control segmentado, chips, `SectionCard`, menú "⋯" con confirmación). No duplicar estilos.

## Regla principal

**Solo cambia la presentación.** No modificar tablas, RLS, server actions, la forma en que se guardan o se muestran los comunicados a alumnos e instructores, ni la lógica de destinatarios.

- Reutilizar las acciones existentes: publicar, eliminar, elegir destinatarios (todos, personas puntuales, una clase) y la fecha de ocultamiento.
- **No se agrega** "visto por N de M", envío por WhatsApp o email, ni programación del envío: están fuera de alcance (ver `pendientes-logica.md`).
- Lógica de presentación permitida: cargar texto de un modelo en el campo, contar caracteres, calcular una fecha a partir de una opción rápida, contar destinatarios con datos ya cargados, y filtrar el historial por fecha de ocultamiento.

## Encabezado

Título "Comunicados" en Fraunces itálica y, debajo, el subtítulo: "Avisos que aparecen en el panel de alumnos e instructores al entrar a la app."

## Layout

Dos columnas (1.5fr / 1fr): a la izquierda el formulario "Nuevo comunicado", a la derecha la vista previa (sticky). Debajo, a ancho completo, el historial "Publicados".

## Formulario "Nuevo comunicado"

Tarjeta con padding de 22 px y título "Nuevo comunicado" (Fraunces itálica, 22 px). **Todos los labels van arriba del campo**, en 14 px semibold. Se terminan los labels en mayúsculas y los labels al costado.

### 1. Modelos

Texto gris "Empezar desde un modelo" y chips (alto 34 px, borde `#E2D9CC`) que **reemplazan** el contenido del mensaje con un texto base:

| Modelo | Texto |
|---|---|
| Feriado | El estudio permanece cerrado el [día] por feriado. ¡Nos vemos el [día siguiente]! |
| Clase cancelada | La clase del [día] a las [hora] se suspende. Podés recuperarla en otro horario desde la app. |
| Cambio de horario | A partir del [fecha], la clase de las [hora] pasa a las [nueva hora]. |
| Recordatorio de cuota | Recordá que la cuota vence el día 1 y desde el 11 tiene un recargo del 10%. |

Los textos van en una constante fácil de editar: la clienta puede querer ajustarlos. Si el campo ya tiene texto escrito, pedir confirmación antes de reemplazarlo ("¿Reemplazar el mensaje actual?").

### 2. Mensaje

- Textarea de al menos 110 px de alto, redimensionable en vertical, 15 px, line-height 1.5.
- Placeholder: "Ej: El estudio permanece cerrado el lunes 12 de octubre por feriado."
- **Contador de caracteres** abajo a la derecha ("87 / 280"). Si el campo actual no tiene límite, el contador es solo informativo y se pone en `#9A3420` al pasar los 280. No bloquear la escritura.

### 3. Para quién

Control segmentado de 3 opciones: **Todos · Personas puntuales · Una clase**.

- **Personas puntuales:** campo con chips. Cada persona elegida es un chip verde (`#E1EBE2`/`#2F4A36`) con ✕ para quitarla, y un buscador inline "Agregar alumno o instructor…" con autocompletado. Reutilizar el selector actual de personas, cambiando solo su apariencia.
- **Una clase:** dos selectores, Día y Horario. Las opciones de horario muestran "18:00 · Reformer (7 alumnos)". Reutilizar el selector actual.
- **Debajo, siempre, la línea de alcance** en verde (13 px, peso 500), calculada con datos ya cargados:
  - Todos: "Lo van a ver N alumnos y M instructores".
  - Personas puntuales: "Lo van a ver N personas".
  - Una clase: "Lo van a ver los N alumnos de esa clase y su instructor".

### 4. Cuánto tiempo se muestra

Chips de selección única: **Hasta que lo elimine · 1 semana · 1 mes · Hasta una fecha**. La opción activa va con fondo `#2B2A26` y texto blanco.

- Todas completan el mismo campo actual de "se oculta a partir de":
  - "Hasta que lo elimine" lo deja vacío.
  - "1 semana" y "1 mes" calculan la fecha desde hoy.
  - "Hasta una fecha" muestra un selector de fecha en es-AR (dd/mm/aaaa). Se reemplaza el input mm/dd/yyyy.
- Debajo, en gris, el día exacto: "Se oculta solo el viernes 9 de octubre." o "Queda visible hasta que lo elimines."

### 5. Acciones

Separador superior y, a la derecha:

- "Descartar" (secundario): limpia el formulario, con confirmación si hay texto.
- "Publicar comunicado" (primario): **deshabilitado** mientras el mensaje esté vacío o no haya destinatarios. Al publicar, mostrar un aviso "Comunicado publicado", limpiar el formulario y sumar el comunicado arriba del historial.

## Vista previa

- Arriba: "Así lo van a ver" (13 px semibold).
- Un marco de celular (300 px de ancho, borde de 10 px `#2B2A26`, radio 36 px) con una versión simplificada del panel del alumno: saludo y, arriba de todo, **la tarjeta del aviso tal como se ve hoy en la app del alumno**, con el texto del mensaje actualizándose mientras se escribe.
- Si el mensaje está vacío: "Escribí el mensaje para ver cómo queda." en gris itálica.
- Debajo: "Vista aproximada del panel del alumno".
- Reutilizar el componente real del aviso del panel del alumno, si existe, para que la vista previa sea fiel. Si no se puede aislar, replicar su estilo.

## Historial "Publicados"

- Título "Publicados" y, a la derecha, un control segmentado: **Visibles · Ocultos · Todos**. Por defecto, Visibles.
  - Visible: sin fecha de ocultamiento, o con fecha futura.
  - Oculto: con fecha de ocultamiento ya pasada.
- Una tarjeta-lista. Cada fila (padding 16×20 px) muestra:
  - El texto completo del mensaje (15 px).
  - Una línea de metadatos: chip de estado ("Visible" en verde, "Oculto" en gris), chip de destinatario ("Todos", "Clase · Lunes 20:00", o **el nombre de la persona**, nunca el usuario tipo "@vic"; si son varias, "Karina H. y 2 más"), "Publicado {fecha}" ("hoy", "28 sep") y "· se oculta el {fecha}" o "· sin vencimiento".
  - A la derecha, menú "⋯" con **Eliminar**, siempre con confirmación. Ningún "Eliminar" en rojo visible.
- Estado vacío: "No hay comunicados en esta vista."

## Celular (< 1024 px)

- Una sola columna: formulario, luego historial.
- La vista previa pasa a un botón "Ver cómo queda" que abre una hoja inferior con el marco del celular.
- Los modelos y las opciones de duración van en chips deslizables horizontalmente.
- "Publicar comunicado" queda fijo abajo, por encima de la barra de navegación, cuando el formulario tiene texto.

## Accesibilidad

- Labels asociados a cada campo.
- Controles segmentados con `role="tab"` y `aria-selected`; chips de duración con `aria-pressed`.
- Chips de personas con un botón ✕ que lleva `aria-label="Quitar a {nombre}"`.
- La vista previa es decorativa para lectores de pantalla (`aria-hidden`), porque repite el texto del mensaje.
