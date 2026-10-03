# Itara Pilates — Rediseño del panel del alumno (handoff para implementar)

Referencias visuales (en este directorio):

| Archivo | Pantalla |
|---|---|
| `alumno-panel-referencia.html` | `/alumno`, escritorio |
| `alumno-panel-referencia-celular.html` | `/alumno`, celular |
| `alumno-recuperar-referencia.html` | `/alumno/recuperar/[id]`, escritorio |
| `alumno-recuperar-referencia-celular.html` | `/alumno/recuperar/[id]`, celular |

Son mockups con sintaxis de plantilla (`{{...}}`, `<sc-for>`, `<sc-if>`): **no copiar el markup**, usarlos solo como guía de estructura, medidas y estilos.

- El ejemplo transcurre el **lunes 5 de octubre**, para mostrar todos los estados a la vez.
- Los profesores (`[profesor]`) y los cupos son de ejemplo.
- La alumna es la cuenta de prueba de Victoria.

Continúa los rediseños del panel admin: **mismos tokens** (fondo blanco, verde primario, Fraunces itálica para títulos, Work Sans con `tabular-nums` para el resto, bordes `#EEE8DF`, radios de 14 a 24 px). Reutilizar componentes compartidos cuando existan.

## Regla principal

**Solo cambia la presentación**, con las excepciones listadas abajo. No modificar tablas, RLS ni la lógica de avisos, créditos, pedidos, aprobaciones o cuota. El flujo de recuperación ya existe; este rediseño cambia cómo se muestra y qué se explica en cada paso.

**Fuera de esta rama** (van a `pendientes-logica.md`):

- **Deshacer un aviso** ("Al final voy"): es una función nueva. Mostrar el botón **solo si la acción ya existe**; si no, ocultarlo y dejar TODO.
- **Plazo de 2 h** (hoy 12 h): si el plazo es un ajuste configurable del estudio, se cambia desde la configuración, no en esta rama. **Todos los textos leen el plazo de esa configuración, nunca un número fijo.**
- **Aviso por mail** de aprobación o rechazo: más adelante.

## Reglas de negocio que la UI tiene que reflejar

1. **Avisar a tiempo** (antes del plazo): el lugar se libera y se gana **1 crédito de recuperación**.
2. **Avisar tarde:** el lugar se libera igual, pero **no hay crédito**.
3. El crédito sirve para **el mismo tipo de clase y el mismo profesor**, y **vence el domingo de la semana** de la clase que no fue. En la práctica, hasta el viernes, porque el fin de semana no hay clases. No se acumula.
4. **Estados del crédito:** disponible · solicitado (esperando aprobación) · usado · vencido. Solo un horario solicitado por crédito.
5. **El estudio siempre aprueba** el horario elegido. Si rechaza, el crédito vuelve a "disponible".
6. **Clase cancelada por el estudio:** cada alumno anotado recibe su crédito automáticamente.

## Vocabulario (usar siempre estas palabras)

| Concepto | Texto en la UI | Reemplaza a |
|---|---|---|
| La alumna no va a una fecha | **"Avisar que no voy"** / estado **"Avisaste"** | "Reprogramar", "Cancelar clase" |
| El crédito | **"Recuperación"** | — |
| Elegir horario para usarlo | **"Elegir clase"** | — |
| Pedido enviado | **"Esperando aprobación"** | — |
| La suspende el estudio | **"Cancelada por el estudio"** | "Cancelada" |
| Deshacer el aviso (si existe) | **"Al final voy"** | — |

**Tipo de clase:** mostrar el mismo nombre que ve el estudio (por ejemplo "Reformer"), no "Pilates". Confirmar en el plan de qué campo sale cada uno.

---

## `/alumno` — Panel

### Encabezado

- Izquierda: logo + "Itara Pilates" (Fraunces itálica).
- Derecha: ícono de Instagram (círculo de 40 px con borde) y botón **"Mi perfil"** con el avatar (inicial). Ese botón lleva a `/alumno/perfil` y tiene Cerrar sesión dentro.
- Se eliminan los botones con borde "Inicio", "Mi perfil" y "Cerrar sesión". **No hay barra inferior en celular.**

### Orden de los bloques

1. Comunicados del estudio, como avisos, y aviso de cuota si está por vencer o vencida (los dos solo si existen).
2. Saludo y frase del día.
3. Próxima clase.
4. Tus recuperaciones (solo si hay alguna en curso).
5. Tus clases.
6. Link "Ver calendario del estudio".
7. Racha (teaser "Muy pronto").
8. Tu cuota.
9. Actividad reciente.
10. Instalar la app (descartable).

**En escritorio** (máximo 1120 px de ancho):

- Fila 1: saludo (1.55fr) + próxima clase (1fr).
- Fila 2: Tus clases (1.55fr) + columna derecha con recuperaciones, link al calendario, racha y cuota (1fr).
- Debajo, a ancho completo: actividad reciente.

**En celular,** una sola columna en el orden de la lista.

### 1. Avisos

- Los comunicados del estudio se ven como una tarjeta con borde izquierdo dorado y la etiqueta "Aviso del estudio" (mismo estilo que la vista previa de Comunicados en el admin).
- El aviso de cuota por vencer o vencida se ve como una tarjeta con su estado.
- La tarjeta "Tu cuota" baja al bloque 8: la agenda va primero.

### 2. Saludo

- Fondo `linear-gradient(150deg, #F7EFE5 0%, #EEF3EE 100%)`, radio 24 px (22 px en celular).
- Fecha del día en es-AR ("Lunes 5 de octubre") y "Hola, {nombre}" en Fraunces itálica (46 px en escritorio, 34 px en celular).
- **Frase del día:** línea vertical dorada `#C9A27A` de 3 px, la etiqueta "FRASE DEL DÍA" (11 px, `#8A5A3C`) y la frase en Fraunces itálica (24 px en escritorio, 19 px en celular).
- **Animación de respiración:** dos círculos decorativos en la esquina superior derecha, verdes, con opacidad 0.10 y 0.16.

```css
@keyframes itaraBreath{0%,100%{transform:scale(0.82);opacity:0.55}50%{transform:scale(1);opacity:1}}
@keyframes itaraBreath2{0%,100%{transform:scale(0.7);opacity:0.35}50%{transform:scale(0.92);opacity:0.8}}
/* círculo interior: itaraBreath 6s ease-in-out infinite; exterior: itaraBreath2 6s ease-in-out infinite */
@media (prefers-reduced-motion: reduce){ /* sin animación */ }
```

Los círculos llevan `aria-hidden="true"`.

### 3. Próxima clase

- Tarjeta verde oscuro `#2F4A36` con texto blanco, radio 24 px y sombra `0 8px 24px rgba(47,74,54,0.22)`.
- Contenido: etiqueta "TU PRÓXIMA CLASE", chip con cuánto falta ("Hoy", "En 3 días"), día y hora en Fraunces itálica grande, y "Reformer · con {profesor}" (omitir el profesor si no hay; nunca mostrar "Sin instructor").
- En escritorio, una línea de ayuda: "Si no podés ir, avisá hasta {plazo} antes y recuperás esa semana."
- Es la próxima clase **confirmada**: excluye las avisadas e incluye las recuperaciones aprobadas.
- No lleva botones: las acciones están en "Tus clases".

### 4. Tus recuperaciones

Título "Tus recuperaciones" (Fraunces itálica, 22 px). Una tarjeta por crédito que no esté usado ni vencido:

| Estado | Fondo / borde | Chip | Contenido |
|---|---|---|---|
| Solicitado | `#FDF8EE` / `#F0E3C4` | "Esperando aprobación" (`#FBEFC9` / `#7A5A0E`) | Arriba a la derecha: "Te avisamos acá". Título: horario pedido ("Jueves 8 · 15:00"). Debajo: "Por tu clase del miércoles 7" |
| Disponible | `#F4F8F4` / `#DCE7DE` | "Disponible" (`#E1EBE2` / `#2F4A36`) | Arriba a la derecha: **"Hasta el viernes 9"**. Título: "Elegí una clase esta semana". Debajo, el origen ("Por tu clase de hoy, lunes 5", o "Por la clase del lunes 12, cancelada por el estudio"). Botón **"Elegir clase"** (primario oscuro `#2B2A26`) → `/alumno/recuperar/[id]` |
| Rechazado (vuelve a disponible) | Igual que disponible | "Disponible" | Debajo del título: "El estudio no pudo aprobar el {horario}. Elegí otro." |

- Ordenar los solicitados primero y después por vencimiento más cercano.
- **Usados:** no se muestran acá; la clase aparece en "Tus clases" como recuperación. **Vencidos:** solo en actividad reciente.

### 5. Tus clases

Título "Tus clases". Dos grupos con subtítulo en mayúsculas (12 px, `#6B6459`): "ESTA SEMANA · 5 AL 9 DE OCTUBRE" y "SEMANA QUE VIENE · 12 AL 16 DE OCTUBRE".

Cada clase es una fila con:

- Bloque de fecha de 58 px: día abreviado arriba ("Lun", o **"Hoy"** en verde semibold) y número grande (22 px).
- Título: "Reformer · 18:00".
- Chip de estado, si corresponde.
- Nota de 13 px.
- Acciones a la derecha. **En celular, debajo y a ancho completo**, con alto de 42 px.

| Estado | Título | Chip | Nota | Acciones |
|---|---|---|---|---|
| Futura, a tiempo | normal | — | "Podés avisar hasta las 16:00" (hora límite calculada con el plazo) | "Avisar que no voy" (secundario) |
| Hoy | normal, fila con fondo `#F4F8F4` | — | igual | igual |
| Futura, fuera de plazo | normal | — | "Ya no se puede avisar con recuperación" | "Avisar que no voy" (abre la confirmación de aviso tardío) |
| Avisaste, con crédito disponible | tachado `#8A8378` | "Avisaste" (amarillo) | "Tenés recuperación hasta el viernes 9" en verde `#2F6B3E` | "Al final voy" (texto verde, solo si existe la acción) + "Elegir clase" (primario oscuro) |
| Avisaste, con pedido | tachado | "Avisaste" | "Pediste recuperar el jueves 8 a las 15:00" | — |
| Avisaste tarde | tachado | "Avisaste tarde" (gris) | "Sin recuperación: avisaste con menos de {plazo}" | — |
| Cancelada por el estudio | tachado | "Cancelada por el estudio" (`#F5E1DC` / `#9A3420`) | "{Motivo, si existe} · tenés recuperación disponible" | "Elegir clase" si el crédito está disponible |
| Recuperación aprobada | normal | "Recuperación" (`#E2ECF5` / `#255377`) | "Por tu clase del {fecha}" | "Avisar que no voy" (con las mismas reglas que una clase normal) |
| Ya pasó | gris, opacidad 0.75 | — | "Ya pasó" | — |

Se elimina la nota suelta "Podés reprogramar hasta 12 hs antes de tu clase": el plazo ya aparece en cada clase.

### Confirmación "Avisar que no voy"

Modal en escritorio (460 px) y hoja inferior en celular.

- **Título:** "¿No vas {hoy / el miércoles 14} a las 18:00?"
- **Si está a tiempo,** una caja verde (`#F4F8F4`, texto `#2F4A36`): "Estás a tiempo: tu lugar se libera y ganás **una recuperación hasta el {viernes 9}**, en otra clase de {tipo} con tu profesor." Debajo, en gris: "Si avisás con menos de {plazo} de anticipación, el lugar se libera igual pero no hay recuperación."
- **Si está fuera de plazo,** una caja amarilla (`#FDF6E1`): "Faltan menos de {plazo}: tu lugar se libera pero **no vas a poder recuperar** esta clase."
- **Botones:** "Volver" y "Sí, aviso que no voy" (primario oscuro `#2B2A26`).

### 6 a 10. Bloques secundarios

- **Ver calendario del estudio:** fila clickeable con ícono de calendario, texto y flecha → `/alumno/calendario` (pantalla sin cambios en esta rama).
- **Racha:** tarjeta con borde, título "Tu racha de asistencia", chip "MUY PRONTO" (fondo `#2B2A26`), una barra de 8 segmentos dorados atenuados (decorativa, `aria-hidden`) y el texto "La constancia también se entrena." **No calcula nada.**
- **Tu cuota:** "Tu plan" + nombre del plan en Fraunces itálica + "Solicitar cambio de plan" a la izquierda; a la derecha, el chip de estado y "Hasta el {fecha}".
- **Actividad reciente:** los últimos 4 movimientos, cada uno con punto de color (amarillo para avisos y pedidos, verde para aprobaciones y créditos ganados, rojo para rechazos o vencimientos), texto y fecha corta a la derecha.
- **Instalar la app:** tarjeta verde suave al final, descartable con ✕, **nunca flotante sobre el contenido**. Recordar la decisión en `localStorage`.

---

## `/alumno/recuperar/[id]` — Elegir clase

- **Encabezado:** en escritorio, el mismo del panel más "← Volver a Inicio"; en celular, una barra con "‹" y "Recuperar clase".
- **Título** "Elegí una clase para recuperar" y debajo el origen ("Por la clase del lunes 12, cancelada por el estudio").
- **Tres datos** en cajas `#FAF8F5`: **Tenés hasta** (viernes 16) · **Clase** (tipo) · **Profesor**. En celular van juntos en una sola caja.
- **Explicación,** en 13.5 px gris: "Solo se muestran clases con lugar, del mismo tipo y con tu mismo profesor. El estudio tiene que aprobar el horario que elijas."
- **Opciones agrupadas por día** (como hoy): título del día (15 px semibold) y botones de horario (120×68 px en escritorio, en grilla de 3 en celular) con la hora en grande y "N lugares" en verde.
  - Mostrar solo días con opciones.
  - Usar la misma regla de lugar que hoy: fijos − avisaron + recuperan < cupo.
  - Si no hay ninguna opción: "No quedan clases con lugar esta semana. Si se libera un lugar, va a aparecer acá."
- **Al elegir:** el botón se rellena con el primario y aparece una **barra fija abajo** con "Vas a pedir {el jueves 15 a las 15:00}" y el botón **"Pedir esta clase"**.
- **Al enviar:** se reemplaza el contenido por una tarjeta amarilla con el chip "Esperando aprobación", "Pediste {el jueves 15 a las 15:00}", la explicación "El estudio lo tiene que aprobar. Vas a ver la respuesta en tu panel…" y el botón "Volver a Inicio".
- **Si el crédito ya tiene un pedido pendiente,** mostrar ese estado en lugar de las opciones.

---

## Accesibilidad

- Todo lo accionable es `<button>` o `<a>`, con áreas táctiles de 44 px o más en celular.
- Los diálogos llevan `role="dialog"` y `aria-modal`, foco atrapado y cierre con Escape.
- Los botones de horario usan `aria-pressed`.
- El color nunca es el único indicador: cada estado tiene chip de texto.
- La animación respeta `prefers-reduced-motion`.
