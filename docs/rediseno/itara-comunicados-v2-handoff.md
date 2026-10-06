# Itara Pilates — Comunicados v2 (cambios sobre la versión implementada)

Referencia visual: `comunicados-v2-referencia.html` (mockup con sintaxis de plantilla: **no copiar el markup**, usarlo solo como guía).

Parte de la pantalla de Comunicados **ya implementada**: este documento describe solo lo que cambia. Todo lo demás se mantiene, incluida la casilla "Es importante".

## Regla principal

**Solo presentación y textos.** No modificar tablas, server actions ni cómo se guardan, se envían o se muestran los comunicados.

- Los modelos son **fijos, definidos en el código** (una constante fácil de editar). No se crean ni se guardan modelos desde la pantalla.
- Completar el nombre, el día y la hora en el texto es lógica de presentación: reemplazar texto en el campo antes de publicar.

## 1. Nuevo orden: tres pasos numerados

El formulario se divide en tres tarjetas, cada una con un número en un círculo oscuro (26 px, `#2B2A26`) y un título de 17 px semibold:

1. **¿A quién le escribís?**
2. **¿Qué querés decir?**
3. **¿Cuánto tiempo se muestra?**

El destinatario va **primero**, porque define el mensaje.

### Paso 1 — Destinatario

- Se reemplaza el control segmentado chico por **tres tarjetas grandes** seleccionables (`role="radio"`), con emoji de 26 px, título de 15 px semibold y una línea de ayuda:
  - 👥 **Todos** · "N alumnos y M instructores" (el alcance real que ya se calcula)
  - 🙋‍♀️ **Personas puntuales** · "Una o varias personas"
  - 🧘‍♀️ **Una clase** · "Los anotados en un horario"
- **Tarjeta seleccionada:** fondo `#F4F8F4` con borde de 2 px en el primario. **Sin seleccionar:** borde `#E2D9CC`.
- Debajo aparece el selector actual de personas o de clase, según la opción.
- Si el modelo elegido es **Cumpleaños**, debajo del buscador se muestra "🎂 Cumplen pronto: {nombre} ({día})…", con los mismos próximos cumpleaños que muestra Inicio. Tocar un nombre lo agrega como destinatario.

### Paso 2 — Mensaje y modelos

- Título del paso y, a la derecha, "Elegí un modelo o escribí desde cero" (13 px gris).
- **Grilla de 4 columnas con 8 tarjetas** (alto mínimo 116 px, radio 14 px). Cada una lleva un emoji en un cuadrado de 36 px con su color de fondo, el nombre (14 px semibold) y una pista (12 px gris). La seleccionada va con fondo `#F4F8F4` y borde de 2 px en el primario. Hover: sombra suave.
- **"✏️ Mensaje libre"** es la última tarjeta, con borde punteado `#D9CFC0`: vacía el campo para escribir desde cero. **No guarda modelos.**
- **Al elegir un modelo:**
  1. Se carga su texto en el campo (si ya había texto escrito, pedir confirmación antes de reemplazarlo).
  2. Se cambia el destinatario al sugerido del modelo. Si cambió, se muestra en verde (`#F4F8F4`): 'Cambiamos el destinatario a "{opción}", que es lo habitual para este modelo. Podés cambiarlo en el paso 1.'
  3. Se completan los datos conocidos (ver la tabla de modelos).
- **Debajo del campo:** a la izquierda, "Reemplazá lo que está entre [corchetes]." (solo si quedan); a la derecha, el contador "N / 280".

### Paso 3 — Duración e importancia

- Los chips de duración actuales, sin cambios.
- **"Es importante"** pasa a una caja `#FAF8F5` con radio 14 px, con el título "⭐ Es importante" y la descripción actual.

## 2. Modelos (textos finales)

**{llaves}** = se completa solo · **[corchetes]** = lo completa Vane.

| Modelo | Emoji / fondo | Pista | Destinatario sugerido | Texto |
|---|---|---|---|---|
| Cumpleaños | 🎂 `#FCE4EF` | Para una persona | Personas puntuales | ¡Feliz cumpleaños, {nombre}! 🎉 Todo el equipo de Itara te desea un año lleno de movimiento y bienestar. |
| Clase cancelada | 🚫 `#FDE6E1` | Una clase · con recuperación | Una clase | La clase del {día} a las {hora} se suspende. Ya tenés tu recuperación disponible en la app para usar esta semana. |
| Cierre del estudio | ⚠️ `#FDE6E1` | Fuerza mayor · con recuperación | Todos | Por [motivo], el estudio permanece cerrado el [día]. Si tenías clase ese día, tu recuperación ya está disponible en la app. |
| Feriado | 🗓️ `#FDF0D5` | Para todos · sin recuperación | Todos | El [día] es feriado y el estudio permanece cerrado. Las clases de ese día no se recuperan. ¡Nos vemos a la vuelta! |
| Recordatorio de cuota | 💳 `#E3F4E6` | Para todos | Todos | Recordá que la cuota vence el día 1 y desde el día 11 tiene un recargo del 10%. Podés abonar en el estudio. |
| Bienvenida | 👋 `#EFE7FB` | Para alumnos nuevos | Personas puntuales | ¡Te damos la bienvenida a Itara, {nombre}! Desde la app ves tus clases y podés avisar si un día no venís. |
| Novedades | ✨ `#FDF0D5` | Para todos | Todos | ¡Tenemos novedades en Itara! [Contá la novedad acá]. Cualquier consulta, escribinos. |
| Mensaje libre | ✏️ `#F5F1EB` | Escribí lo que quieras | (no cambia) | (campo vacío) |

**Cómo se completan las llaves:**

- **{nombre}:** el **nombre de pila** de la persona, solo si hay **exactamente una** persona seleccionada. Con varias, se reemplaza `, {nombre}` por nada, y queda "¡Feliz cumpleaños! 🎉…" o "¡Te damos la bienvenida a Itara!…".
- **{día}** y **{hora}:** salen de la clase elegida en el paso 1, con el día en minúscula y la fecha ("martes 6") y la hora en formato 24 h ("18:00").
- **Si el dato se elige después del modelo,** actualizar el texto **solo si Vane no lo editó a mano**. Si lo editó, no tocarlo.
- **Si todavía no hay dato,** mostrar el texto con [nombre], [día] o [hora] para que se complete.

Los textos van en un solo archivo de constantes, para editarlos o agregar modelos fácilmente.

## 3. Columna derecha: vista previa y resumen

La columna es sticky e incluye:

- **Vista previa:** el teléfono actual, con el saludo usando el nombre de pila si hay una sola persona elegida. Si "Es importante" está marcado, la tarjeta del aviso lleva la etiqueta "⭐ AVISO IMPORTANTE" y un borde izquierdo rojo `#E5484D` (si no, "AVISO DEL ESTUDIO" con borde dorado).
- **Tarjeta "Resumen"** debajo, con tres filas:
  - "Para": "Todos · N personas", los nombres, o "Martes 6 · 18:00 (7 alumnos)".
  - "Se ve": "Hasta que lo elimines" o "Hasta el 13 de octubre".
  - "Ventana emergente": Sí / No.
- **Los botones "Publicar comunicado" y "Descartar" se mueven a esta tarjeta.** "Publicar" va a ancho completo (46 px) y queda deshabilitado si el mensaje está vacío **o tiene partes entre [corchetes]**. En ese caso, debajo se muestra: "Completá los datos entre [corchetes] antes de publicar." (12.5 px, `#9A4A1E`).

## 4. Historial "Publicados"

- **"Para:"** muestra el **nombre y apellido** de la persona, nunca el usuario (hoy aparece "vic"). Si son varias: "Karina H. y 2 más". Si es una clase: "Clase · Martes 18:00".
- Cada fila lleva a la izquierda una burbuja de 40 px con el emoji del modelo usado, o 💬 si fue mensaje libre o si no se guardó el modelo. **Si hoy no se guarda qué modelo se usó, mostrar siempre 💬** (no agregar columnas por esto).
- **Menú "⋯":** suma "Usar como modelo", que carga el texto de ese comunicado en el paso 2 (presentación pura). Se mantiene "Eliminar" con confirmación.

## 5. A confirmar en el plan (no resolver en esta rama)

**Feriados y recuperaciones.** Cuando el estudio cancela una clase, cada alumno recibe una recuperación automática. **Un feriado no debe dar recuperación.** Confirmar:

- cómo funciona hoy la sección "Feriados" de Horarios: si **no** genera recuperaciones, está correcto;
- si para marcar un feriado se usa "Cancelar clase", que **sí** las genera.

Si los feriados hoy generan recuperaciones, va a `pendientes-logica.md` como corrección. No cambiarlo en esta rama.

## 6. Responsive: tablet y celular

Referencias: `comunicados-v2-referencia-tablet.html` (834 px) y `comunicados-v2-referencia-celular.html` (390 px). Mismo contenido y misma lógica que escritorio; cambia la distribución.

| | Escritorio (≥ 1024 px) | Tablet (768–1023 px) | Celular (< 768 px) |
|---|---|---|---|
| Navegación | Menú lateral | Barra inferior (Comunicados dentro de "Más") | Barra inferior |
| Columnas | Formulario + columna derecha (vista previa y resumen) | **Una columna** | Una columna |
| Paso 1: destinatarios | 3 tarjetas en fila | 3 tarjetas en fila | **Apiladas**: tarjetas horizontales (emoji a la izquierda, texto a la derecha), alto mínimo de 60 px |
| Selector de clase | 2 columnas | 2 columnas | Apilados |
| Paso 2: modelos | Grilla de 4 (tarjeta vertical) | Grilla de 4 | **Grilla de 2**, tarjetas horizontales compactas (emoji de 34 px + nombre + pista), alto mínimo de 58 px |
| Vista previa | Teléfono sticky a la derecha | Botón "👀 Ver cómo queda" debajo del mensaje: abre una **hoja inferior** con la vista previa y el resumen | Igual que tablet |
| Paso 3: duración | Chips en fila | Chips en fila | Chips en una fila **deslizable horizontalmente** |
| Publicar | Botón en la tarjeta Resumen | **Barra fija abajo**, encima de la barra de navegación: a la izquierda "Para: {resumen}", a la derecha "Publicar" (48 px) | Igual que tablet |
| Publicados | Lista con chips | Lista compacta: emoji, texto, "Para {nombre} · {fecha}" y "⋯" | Igual que tablet |

Detalles comunes a tablet y celular:

- **Campo de mensaje con fuente de 16 px,** para que el iPhone no haga zoom al tocarlo.
- **Áreas táctiles de 44 px o más,** incluidos el ✕ de los chips de personas y el "⋯".
- **Espacio inferior en el contenido** igual a la barra de publicar más la barra de navegación (~190 px), para que nada quede tapado. Respetar `env(safe-area-inset-bottom)`.
- **La hoja de vista previa** se cierra con "Cerrar", deslizando hacia abajo o tocando afuera, y tiene un ancho máximo de 520 px en tablet.
