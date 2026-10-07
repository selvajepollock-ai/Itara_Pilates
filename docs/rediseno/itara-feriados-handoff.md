# Itara Pilates — Rediseño de "Feriados y cierres" (Horarios › Feriados)

Referencias visuales: `feriados-referencia.html` (escritorio) y `feriados-referencia-celular.html` (celular; tablet usa el mismo diseño de una columna). Son mockups con sintaxis de plantilla: **no copiar el markup**. Las fechas y cantidades son de ejemplo.

## Regla principal

**Solo presentación.** La pantalla ya tiene la lógica correcta y no se toca:

- **Feriado:** el calendario aparece cerrado y **no** genera recuperaciones.
- **Cierre del estudio:** cancela todas las clases de la fecha y **cada alumno anotado recibe una recuperación**.

Reutilizar exactamente esas dos acciones, y la de eliminar.

Lógica de presentación permitida:

- Contar clases y alumnos anotados de la fecha elegida, con datos que ya se cargan o la consulta de lectura que usa Horarios.
- Separar la lista en próximos y pasados.
- Formatear fechas.
- Llevar a Comunicados con un modelo preseleccionado por parámetro de URL.

## Cambios

### 1. Encabezado

- "← Horarios" (componente de volver estándar, ver `itara-horarios-clases-tipos-handoff.md`).
- Título **"Feriados y cierres"** (Fraunces itálica).
- Subtítulo: "Días en que el estudio no abre. Elegí el tipo: cambia si las alumnas pueden recuperar."

### 2. Un solo formulario con selector de tipo

Reemplaza los dos formularios actuales.

**Tipo:** dos tarjetas grandes (`role="radio"`), cada una con emoji en un cuadrado de 44 px, título, chip y descripción. Por defecto, Feriado.

| Tipo | Emoji / fondo | Chip | Descripción |
|---|---|---|---|
| Feriado | 🗓️ `#FDF0D5` | "Sin recuperación" (gris `#F1EDE6` / `#5E584F`) | Feriado nacional o día no laborable. El calendario aparece cerrado y las clases de ese día no se recuperan. |
| Cierre del estudio | ⚠️ `#FDE6E1` | "Con recuperación" (verde `#E1EBE2` / `#2F4A36`) | Corte de luz, falta un profesor o fuerza mayor. Se cancelan las clases y cada alumno anotado recibe su recuperación. |

La tarjeta seleccionada va con fondo `#F4F8F4` y borde de 2 px en el primario.

**Campos:**

- Fecha (selector en **es-AR**, dd/mm/aaaa, con el día de la semana: "Lunes 12/10/2026") y Motivo (opcional, con la ayuda "lo ven las alumnas en el calendario").
- En escritorio van en 2 columnas (220 px + resto); en celular, apilados.
- **Labels siempre arriba.** Campos de 46–48 px de alto y fuente de 16 px en celular.
- El placeholder del motivo cambia según el tipo: "Ej: Día de la Independencia" o "Ej: Corte de luz".

**Caja de impacto** (aparece al elegir la fecha):

- **Feriado** (verde `#F4F8F4`, ícono ℹ️): "Ese día hay **N clases con M alumnos anotados**. El calendario va a aparecer cerrado. No se generan recuperaciones."
- **Cierre** (rojo suave `#FBEFEC`, borde `#F1CFC6`, ícono ⚠️): "**Se cancelan N clases · M alumnos reciben recuperación.** Van a poder elegir otra clase con lugar de esa misma semana. El estudio aprueba cada pedido."
- Si la fecha no tiene clases: "Ese día no hay clases programadas."

**"📣 Avisar a las alumnas con un comunicado"** (casilla, marcada por defecto, en caja `#FAF8F5`):

- Al confirmar, redirige a Comunicados con el modelo **"Feriado"** o **"Cierre del estudio"** preseleccionado (por ejemplo `?modelo=feriado&fecha=2026-10-12&motivo=...`) y los datos completados.
- **No publica nada automáticamente:** Vane revisa y publica.

**Botón principal:**

- Feriado: **"Agregar feriado"** (verde primario).
- Cierre: **"Cerrar el estudio ese día"** (rojo `#9A3420`). **Siempre pide confirmación**, con un modal en escritorio y una hoja inferior en celular:
  - Título: "⚠️ ¿Cerrar el estudio el {lunes 12}?"
  - Texto: "Se cancelan **N clases** y **M alumnos** reciben una recuperación para usar esa semana."
  - Botones: "Volver" y "Sí, cerrar y dar recuperaciones" (rojo).

### 3. Lista "Días cargados"

- Título en Fraunces itálica y un control segmentado **Próximos · Pasados**. Por defecto, Próximos, ordenados del más cercano al más lejano. Pasados: del más reciente al más viejo, con opacidad 0.65.
- **Cada fila:**
  - Burbuja de 40 px con el emoji del tipo.
  - Fecha en Fraunces itálica ("Lunes 12 de octubre"; con año solo si no es el actual).
  - Chip "Feriado · sin recuperación" o "Cierre · con recuperación".
  - Debajo: "{Motivo o 'Sin motivo'} · en 6 días" o "· ya pasó".
  - Menú "⋯" con **Eliminar** (acción actual, con confirmación). Se quita el "Eliminar" rojo siempre visible.
- **Confirmación al eliminar:**
  - Feriado: "El calendario vuelve a mostrar las clases de ese día."
  - Cierre: indicar qué pasa con las recuperaciones ya dadas, **según lo que haga hoy la acción**. Confirmarlo en el plan y no cambiar ese comportamiento.
- Estado vacío: "No hay días cargados en esta vista."

### 4. Celular y tablet (< 1024 px)

- Barra superior con "‹" y "Feriados y cierres". Barra de navegación inferior con Horarios activo.
- Tarjetas de tipo apiladas.
- **Botón principal fijo abajo,** encima de la navegación inferior, a ancho completo (50 px). Dejar espacio inferior en el contenido para que no tape la lista.

### 5. Error global: aviso "Instalá Itara"

En esta pantalla, el aviso de instalación de la PWA aparece **duplicado** y **flotando encima del contenido**. Corregirlo en el componente compartido, para el admin y el panel del alumno:

- Mostrarlo **una sola vez**.
- Como tarjeta al final del contenido, o como barra que **no tape** botones ni listas.
- Que se pueda descartar, guardando la decisión en `localStorage`.

## Accesibilidad

- Tarjetas de tipo con `role="radio"` y `aria-checked`.
- Diálogos con `role="dialog"`, foco atrapado y cierre con Escape.
- Menú "⋯" con `aria-label` que nombre la fecha.
- El tipo siempre se indica con texto (chip), no solo con color.
