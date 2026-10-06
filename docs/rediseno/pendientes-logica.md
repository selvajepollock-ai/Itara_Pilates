# Itara Pilates — Pendientes de lógica (fuera de las ramas de rediseño)

Cambios que **no** son de presentación: tocan consultas, cálculos o datos. Van en una rama aparte (por ejemplo `fix-logica`), con revisión propia, y conviene probarlos con datos reales antes de mergear.

## Correcciones (el número que se muestra hoy está mal)

| # | Dónde | Problema | Corrección propuesta |
|---|---|---|---|
| 1 | Inicio · "Alumnos activos" | Cuenta a todos los alumnos, incluidos los dados de baja | Contar solo alumnos con estado activo |
| 2 | Reportes · "Con más lugares libres" | Incluye clases canceladas (el viernes 19:00 aparecía como 0/8) | Excluir las clases canceladas de todas las métricas de ocupación |
| 3 | Reportes · "Clases más demandadas" | Parece mostrar la foto de una semana (8/8) y no el promedio del período elegido | Calcular la ocupación promedio por horario a lo largo de todas las semanas del período |
| 4 | Pagos · gráfico "Cobrado por mes" | El eje incluye un mes futuro (noviembre) | Mostrar los últimos 6 meses terminando en el mes actual |

Los puntos 2 y 4 pueden resolverse en la presentación si los datos ya traen lo necesario (la marca de cancelada, las fechas). Claude Code lo va a confirmar en el plan de cada rama; si no se pudo, quedan acá.

## A confirmar con la clienta

| # | Tema | Detalle |
|---|---|---|
| 5 | Plan "1x clase" | Dice "$ 10.000 / mes" pero parece una clase suelta. Definir si es un plan o un cobro suelto (hoy existe en los dos lugares) |
| 6 | Precio del plan 4x | Sale $ 4.625 por clase, más caro que el 3x ($ 3.833), lo que desincentiva subir de plan. Confirmar si es intencional |
| 7 | Recargo del 10% | Confirmar si es único (no se acumula), si se puede perdonar caso por caso y cómo se aplica si se deben dos meses |
| 15 | Vigencia de clases sueltas | Hoy la escala de precios es por compra. A evaluar: hasta cuándo se pueden tomar las clases ya pagadas (¿vencen?) y qué pasa si se compran en dos veces |
| 16 | Feriados en el panel de la alumna | **Falla:** el panel no lee los feriados. Ese día la clase le sigue apareciendo y, si toca "Avisar que no voy" con tiempo, gana una recuperación aunque sea feriado. Hoy el bloqueo solo existe al elegir una recuperación. Corregir: ocultar la clase / mostrar "Feriado" y rechazar el aviso en `cancelSession`. Definir qué pasa con avisos ya hechos cuando se carga un feriado |

## Funciones nuevas (opcionales, más adelante)

| # | Función | Para qué |
|---|---|---|
| 8 | Medio de pago (efectivo / transferencia) | Cierre de caja separado. **Descartado por ahora** |
| 9 | Altas y bajas del mes | Ver retención y crecimiento en Reportes |
| 10 | Asistencia real vs. inscripta | Saber quién viene de verdad, además de quién está anotado |
| 11 | Acciones masivas en Alumnos | Asignar profesor o cambiar plan a varios alumnos a la vez |
| 12 | Recordatorio de pago | Si no existe, enviar un aviso a quienes tienen la cuota vencida (individual y masivo) |
| 13 | Buscador global (Ctrl + K) | Saltar a cualquier alumno o acción desde cualquier pantalla |
| 14 | Lectura de comunicados | Ver "visto por N de M" en cada comunicado enviado |

## Cómo encararlos

1. Primero las **correcciones (1 a 4)**: son chicas y mejoran la confianza en los números.
2. Después, definir con la clienta los puntos **5 a 7**.
3. Las **funciones nuevas** se priorizan según lo que pida el estudio, una rama por función.
