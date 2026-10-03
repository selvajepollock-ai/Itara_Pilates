# Itara Pilates — Rediseño de Reportes (handoff para implementar)

Referencia visual: `reportes-referencia.html`. Es un mockup con sintaxis de plantilla (`{{...}}`, `<sc-for>`, `<sc-if>`): **no copiar el markup**, usarlo solo como guía de estructura, medidas y estilos. Los ingresos son reales de octubre; los cupos del mapa de ocupación son de ejemplo.

Continúa los rediseños anteriores: **reutilizar tokens, layout, menú y componentes** (`StatCard`, `SectionCard`, `ProgressBar`, el control segmentado y la grilla de días × horas de Horarios). No duplicar estilos.

## Regla principal

**Solo cambia la presentación.** No modificar tablas, RLS, server actions ni los cálculos actuales de ingresos, ocupación o ausentismo. Se pueden reutilizar las consultas existentes con otros rangos de fechas y agregar columnas a un `select` de lectura.

- Si un dato del diseño no existe hoy o requiere un cálculo nuevo, **no inventarlo**: ocultar ese bloque, dejar un `TODO` y avisarlo en el resumen final.
- Los pendientes de lógica están listados en `pendientes-logica.md`. **No se resuelven en esta rama.**

## Encabezado

Título "Reportes" en Fraunces itálica. A la derecha, un único botón **"Exportar ▾"** que abre un menú (330 px, radio 14 px, sombra `0 12px 32px rgba(43,42,38,0.14)`) con tres opciones. Cada opción lleva título en 14 px semibold y descripción en 12.5 px gris:

1. **Resumen del período (PDF):** "Lo que ves en esta pantalla, listo para imprimir o compartir". Es el export PDF actual.
2. **Detalle del período (Excel):** "Todos los pagos y la ocupación del período, para analizar". Es el "Reporte completo (Excel)" actual.
3. Separador.
4. **Copia de seguridad completa (.xlsx):** "Todos los datos del estudio, sin importar el período". Es la "Descargar copia" actual.

Se eliminan los dos botones del encabezado y la tarjeta "Copia de seguridad" del final de la página.

## Selector de período

- **Control segmentado** (fondo `#F5F1EB`, opción activa en blanco con sombra): Este mes · Mes anterior · Últimos 3 meses · Este año · Personalizado.
- **"Personalizado"** abre dos selectores de fecha en es-AR (dd/mm/aaaa).
- **Se aplica al instante**: se elimina el botón "Aplicar".
- **A la derecha**, el texto: "**1 – 31 oct 2026** · comparado con septiembre".
- Se sincroniza con la URL (`?periodo=mes|anterior|3m|anio` o `?desde=...&hasta=...`).

## Indicadores (4 tarjetas)

1. **Ingresos:** total del período. Debajo, la variación contra el período anterior de igual duración ("▲ 12% vs septiembre" en verde o "▼ 8%" en `#9A3420`). Se calcula corriendo la misma consulta de ingresos con el rango anterior. Si el período anterior no tiene datos: "Sin datos de septiembre para comparar".
2. **Pagos registrados:** cantidad, con "N cuotas · N clases sueltas".
3. **Ocupación promedio:** solo si el dato ya existe (ver "Ocupación" más abajo), con "Sin contar clases canceladas".
4. **Ausencias registradas:** el número actual de ausentismo, con "Avisos tardíos + faltas marcadas".

## Ingresos (2 columnas: 1.7fr / 1fr)

**Ingresos por día:** gráfico de barras con una barra por día del período.

- Altura 170 px. Barras en el primario, radio superior de 4 px.
- Días pasados sin pagos: barra mínima `#E2D9CC`. Días futuros: `#F3EEE6`.
- Tooltip con la fecha y el monto.
- Eje inferior con 5 marcas de fecha.
- Debajo: "Mejor día: jueves 1 de octubre, $ 432.000 (11 pagos)".
- Link "Ver registro diario →" a Pagos › Registro diario con el mismo período.
- Se arma agrupando por fecha los pagos que ya se cargan.
- Para "Últimos 3 meses" y "Este año", agrupar por semana o por mes en lugar de por día.

**Por plan:** una fila por plan con nombre, monto, porcentaje y barra proporcional, más la fila "Clases sueltas". Reemplaza "Cuotas por plan" y el desglose Cuotas / Clases sueltas actual.

## Ocupación (2 columnas: 1.7fr / 1fr)

**Mapa de ocupación por horario:** la misma grilla de Horarios, con días en columnas, horas en filas y la primera columna de 52 px con la hora. Cada celda es un bloque de 30 px de alto, radio 6 px, con el % centrado (11.5 px semibold).

| Ocupación | Fondo | Texto |
|---|---|---|
| Menos de 60% | `#F3F6F3` | `#4A463F` |
| 60–79% | `#CFDDD1` | `#2F4A36` |
| 80–99% | `#8FAE96` | blanco |
| 100% | `#3F5B46` | blanco |
| Sin clase | `#FAF8F5` con borde punteado `#DDD4C6` | — |

- Tooltip: "Lunes 08:00: 7,5 de 8 en promedio".
- Leyenda debajo.

**Ranking de clases:** control segmentado "Más llenas" / "Con más lugar". Muestra las 6 primeras con "Reformer · Lunes 08:00", "8/8 · 100%" y una barra (primario para "Más llenas", `#C9962E` para "Con más lugar"). Debajo: "No incluye clases canceladas." Reemplaza las dos tarjetas actuales de "Clases más demandadas" y "Con más lugares libres".

**Dependencia de datos:** el mapa y el ranking necesitan la ocupación **promedio del período** por horario, excluyendo las clases canceladas.

- Si el cálculo actual ya lo da, usarlo.
- Si solo da una foto de una semana, mostrar esa foto e indicarlo en el subtítulo ("Semana del …").
- Si las clases traen la marca de cancelada, excluirlas al mostrar es presentación y entra en esta rama. Si no la traen, queda como TODO (pendiente de lógica).

## Ausentismo

Tarjeta horizontal: título "Ausentismo" + el estado ("Sin ausencias registradas en el período." o la lista actual). A la derecha, la nota explicativa en 13 px `#6B6459` (no en letra chica gris claro): "Tomar asistencia es opcional para los instructores, así que este número puede no reflejar todas las faltas. También cuenta los avisos de cancelación tardíos."

Si hay ausencias, mantener la lista actual con el formato de filas de Alumnos (nombre clickeable que abre la ficha, cantidad y última fecha).

## Celular (< 1024 px)

- Selector de período como chips deslizables horizontalmente.
- Indicadores en grilla de 2×2.
- Gráficos a ancho completo y apilados.
- El mapa de ocupación pasa a un selector de día, con una fila por horario con su % (igual que Horario fijo en celular).
- "Exportar" como botón en el encabezado que abre una hoja inferior con las tres opciones.

## Accesibilidad

- Barras y celdas del mapa con `title` y `aria-label` (fecha y monto, o día, hora y %).
- El color nunca es el único indicador: el mapa lleva el % escrito.
- El menú de exportar usa `role="menu"` y `role="menuitem"`, con `aria-expanded` en el botón.
