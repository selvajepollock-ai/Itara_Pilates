# Itara Pilates — Rediseño de Pagos (handoff para implementar)

Referencias visuales (en este directorio):

| Archivo | Vista |
|---|---|
| `pagos-registro-referencia.html` | Registro diario, escritorio |
| `pagos-registro-referencia-celular.html` | Registro diario, celular |
| `pagos-resumen-referencia.html` | Resumen, escritorio |
| `pagos-liquidacion-referencia.html` | Liquidación, escritorio |

Son mockups con sintaxis de plantilla (`{{...}}`, `<sc-for>`, `<sc-if>`): **no copiar el markup**, usarlos solo como guía de estructura, medidas y estilos. Los pagos y la liquidación del mockup son datos reales de octubre (capturas del 2/10); la lista de vencidas es de ejemplo.

Continúa los rediseños anteriores: **reutilizar tokens, layout, menú y componentes** (`StatCard`, `SectionCard`, `StatusChip`, `ProgressBar`, el modal de `QuickPayment`, la ficha de alumno). No duplicar estilos.

## Regla principal

**Solo cambia la presentación.** No modificar consultas a Supabase (salvo agregar columnas a un `select` de lectura), tablas, RLS, server actions, ni los cálculos de cobranza, estados de cuota, recargos, comisiones o liquidación. **No se agrega medio de pago** (efectivo / transferencia): está fuera de alcance.

- Reutilizar las acciones existentes: registrar pago, editar, anular, exportar Excel/PDF, registrar pago a profesor y mostrar/ocultar montos.
- Si un dato o una acción del diseño no existe hoy, **no inventarlo**: ocultar ese elemento, dejar un `TODO` y avisarlo en el resumen final.
- Lógica de presentación permitida: agrupar por fecha, sumar y contar datos ya cargados, filtrar, formatear y leer o escribir parámetros de la URL.

## Estructura: de 4 pestañas a 3

| Antes | Después |
|---|---|
| Resumen | **Resumen** |
| Cuotas | **Registro diario**, con filtro de tipo "Cuotas" |
| Clases sueltas | **Registro diario**, con filtro de tipo "Clases sueltas" |
| Liquidación | **Liquidación** |

- Las rutas actuales de Cuotas y Clases sueltas **siguen funcionando**: redirigen a Registro diario con el filtro correspondiente (`?tipo=cuotas` / `?tipo=sueltas`). Si el proyecto usa otra convención de rutas, proponerla en el plan.
- Las clases sueltas en estado **pendiente** no son pagos: no aparecen en el registro diario. Se muestran en Resumen (ver más abajo).
- Se elimina el control ▲▼ que aparece a la derecha de las pestañas actuales.

## Encabezado común

- Título "Pagos" en Fraunces itálica y pestañas con subrayado de 2 px en el primario.
- Acción primaria "+ Registrar pago": abre el modal de `QuickPayment`.
- Secundarias según la pestaña:
  - Selector de mes ("Octubre 2026 ▾", en es-AR; reemplaza el input "October 2026").
  - "Exportar ▾" con Excel y PDF.
  - Toggle "Ocultar montos".

## Pestaña "Registro diario"

Es la agenda de pagos: todo lo cobrado (cuotas y clases sueltas pagadas), **agrupado por día**. Sirve como cierre de caja diario.

### Barra de herramientas

- **Navegación:** ‹ · Hoy · › por mes, y título del alcance ("Octubre 2026", o "Viernes 2 de octubre" si hay un día seleccionado). Cuando hay un día seleccionado, aparece el chip "Ver todo octubre".
- **Filtros:**
  - Tipo, como control segmentado: Todos · Cuotas · Clases sueltas.
  - "Registró": Todos y cada persona del equipo que registra pagos.
  - Buscador de alumno.
  - Checkbox "Ver anulados" (el filtro actual de anuladas).
- Todo se sincroniza con la URL: `?mes=2026-10&dia=2026-10-02&tipo=cuotas&registro=<id>&q=...&anulados=1`.
- **Exportar** respeta los filtros activos, reutilizando los exports actuales. Si hoy no existe un export combinado de cuotas y sueltas, ofrecer los dos por separado y dejar TODO.

### Columna principal: grupos por día

Una tarjeta por día con pagos, del más reciente al más viejo.

- **Encabezado** (fondo `#FAF8F5`): "Viernes 2 de octubre" + chip "Hoy" si corresponde + "8 pagos" en gris, y a la derecha el total del día (16 px semibold).
- **Filas** (altura 54 px), con columnas:

| Columna | Contenido |
|---|---|
| Alumno | Avatar con iniciales + nombre (abre la ficha del alumno) |
| Concepto | Chip de tipo ("Cuota" en verde `#E1EBE2/#2F4A36`, "Suelta" en azul `#E2ECF5/#255377`) + "Octubre · 2x por semana", o el concepto de la suelta. Si hay nota, mostrarla debajo en 12 px gris |
| Registró | Nombre de quien registró el pago |
| Monto | Alineado a la derecha, semibold |
| Acciones | Menú "⋯" con Editar y Anular (las acciones actuales; anular siempre con confirmación) |

- Los pagos **anulados** (si se activa el filtro) se muestran con el monto tachado, chip "Anulado" gris, y no suman a los totales.
- **Sin resultados:** "No hay pagos de este tipo en el período."

### Columna lateral (320 px, sticky)

**Calendario del mes:**

- Grilla de lunes a domingo.
- Los días con cobros se pintan con fondo `#E1EBE2` y muestran el total abreviado debajo del número ("$432k").
- Hoy lleva borde interno de 2 px en el primario. Los días futuros van atenuados y deshabilitados.
- Click en un día lo selecciona: relleno en el primario, texto blanco, y la lista se filtra a ese día. Otro click lo deselecciona.

**Tarjeta de totales** del alcance actual (mes o día seleccionado), respetando los filtros:

- Título ("Total de octubre hasta hoy" o "Total del viernes 2 de octubre").
- Total grande (28 px) + cantidad de pagos.
- Desglose: Cuotas / Clases sueltas.
- Desglose "Registró": por persona, con cantidad y total.

### Celular (< 1024 px)

- Pestañas como control segmentado: Resumen · Registro · Liquidación.
- **Tira horizontal de días** deslizable (56×72 px cada uno): día de la semana, número y total abreviado. Los días con cobros en verde y el seleccionado en el primario. Por defecto, hoy.
- **Tarjeta del día:** fondo `#F4F8F4`, total grande, cantidad de pagos y una línea "Vanesa $ X · Rodrigo $ Y".
- **Lista de pagos del día:** nombre, "Cuota · 2x por semana · Vanesa" y monto. Tocar una fila abre editar o anular en una hoja inferior.
- Botón flotante "+ Registrar pago" por encima de la barra inferior.

## Pestaña "Resumen"

### Cuatro indicadores

1. **Cobrado en el mes:** barra de progreso con el % de cobranza y "13% de $ esperado · N pagos".
2. **Falta cobrar:** "Estimado según planes activos". La nota al pie actual sobre los estimados pasa a un tooltip ⓘ en esta tarjeta.
3. **Cobrado hoy:** total y cantidad del día, con el link "Ver registro →" al registro diario filtrado en hoy.
4. **Recargo del 10%:**
   - Del 1 al 10: "11/10" y "Faltan N días · N vencidas".
   - Desde el 11: "Con recargo" y la cantidad.
   - Es solo texto derivado de la fecha: no calcula montos.

Con montos ocultos, los importes se enmascaran (`$ ••••••`) **sin cambiar el layout**.

### Estado de las cuotas

Reemplaza las 5 tarjetas de conteo:

- Barra horizontal segmentada (14 px de alto, segmentos proporcionales a la cantidad, separados por 2 px), con los colores de estado definidos en el rediseño de Alumnos.
- Debajo, la leyenda con punto, nombre y cantidad: Al día · Por vencer · Vencidos · Sin plan · Bonificados.
- Cada segmento y cada ítem de la leyenda llevan a `/admin/alumnos?estado=...`.
- Se mantiene el término **"Vencido"** (vence el día 1).

### Columna izquierda: "Vencidas (N)"

- Subtítulo: "Vencieron el 1/10 · sin recargo hasta el 10/10" (o "con recargo del 10%" desde el 11).
- Filas: nombre, plan y "último pago {fecha}" (si el dato existe), monto, botón WhatsApp y botón "Cobrar". "Cobrar" abre `QuickPayment` con el alumno preseleccionado si el componente lo permite.
- Se muestran los primeros 6, con el link "Ver los N en Alumnos →".
- "Recordar a todos" (secundario) **solo si existe** una acción de recordatorio. Si no, ocultarlo.
- **Clases sueltas pendientes:** si hay, agregar debajo un bloque "Clases sueltas por cobrar (N)" con el mismo formato de fila.

### Columna derecha

- **Cobrado por mes:** el gráfico actual, limitado a los últimos 6 meses **terminando en el mes actual** (hoy incluye un mes futuro). Si no hay datos de meses anteriores, estado vacío: "Todavía no hay meses anteriores" + "El gráfico se arma a medida que se registran pagos. Octubre va $ X."
- **Ingresos por plan:** una fila por plan, con nombre, monto y porcentaje del total, más una barra proporcional. Reemplaza el layout actual de dos columnas.

## Pestaña "Liquidación"

Mismos datos y cálculos que hoy; solo cambia la presentación.

- **Aviso de alumnos sin profesor:** fondo `#FDF6E1`, borde `#F0DFA8`, con el texto actual y un botón "Asignar profesor →" que lleva a `/admin/alumnos` filtrado por "Sin asignar".
- **Tres indicadores** (pueden ser cuatro si se prefiere conservar "Estudio s/asignado" aparte):
  - Cobrado en el mes, con "de $ asignado · %".
  - A pagar a profesores, en `#8E3A24`, con "60% de lo cobrado de …".
  - Queda para el estudio, con "$ X si pagaran todos".
- **Sección "Por profesor"** con el link "¿Cómo se calcula?": despliega la nota explicativa actual en una caja `#FAF8F5`. Reemplaza la nota al pie.
- **Una tarjeta desplegable por profesor**, que reemplaza la tabla de resumen y las secciones separadas:
  - Cabecera (botón con `aria-expanded`):
    - Nombre + "N alumnos".
    - Barra "Cobrado $ X de $ asignado".
    - Comisión sobre lo cobrado, "(60%)".
    - Chip de estado: "A pagar $ X" en rojo suave `#F5E1DC/#8E3A24`; "Al día" en verde; "Dueño · sin comisión" o "Sin comisión" en gris, sin chip.
  - Al desplegar:
    - Tabla con Alumno · Plan · Asignado · Estado (Pagó / Vencido, con punto de color) · Comisión.
    - Pie con "Pagos a {nombre} este mes: …" (los pagos registrados al profesor, o "todavía ninguno") y el botón "Registrar pago a {nombre}" (la acción actual) cuando corresponde.
  - Por defecto se abren los profesores con monto a pagar; el resto queda cerrado.
  - Los grupos con muchos alumnos (Rodrigo, 121) paginan de a 25 dentro de la tarjeta.

## Accesibilidad

- Días del calendario como `<button>` con `aria-label` ("1 de octubre, $ 432.000").
- Tarjetas desplegables con `aria-expanded`.
- Menús "⋯" con `aria-label` descriptivo.
- Confirmación antes de anular un pago.
- Los montos ocultos se anuncian como "monto oculto" para lectores de pantalla.
