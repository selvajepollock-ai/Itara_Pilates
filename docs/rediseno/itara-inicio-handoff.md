# Itara Pilates — Rediseño de Inicio (handoff para implementar)

Referencia visual: `inicio-referencia.html` (mismo directorio). Es un mockup: el markup usa una sintaxis de plantilla (`{{...}}`, `<sc-for>`, `<sc-if>`) que **no hay que copiar**; tomalo solo como guía de estructura, medidas y estilos.

## Regla principal

**Solo cambia la presentación.** No modificar:

- Consultas a Supabase, tablas, RLS, server actions ni API routes.
- Cálculos de negocio (estados de cuota, cobranza, ocupación, recargos).
- Rutas ni permisos por rol.

Reutilizar los hooks, funciones y datos que ya usa la pantalla actual de Inicio (y los de Pagos/Horarios si el dato ya existe ahí). Si un dato del diseño no existe hoy, **no inventarlo ni crear queries nuevas**: dejar el bloque oculto o con un `TODO` y avisarlo en el resumen final.

Lo único "nuevo" permitido es lógica de presentación pura: formatear fechas/montos, derivar el estado visual de una clase según la hora actual, ordenar o filtrar listas ya cargadas.

## Tokens de diseño

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#FBF8F4` | Fondo de página |
| `surface` | `#FFFFFF` | Tarjetas |
| `sidebar` | `#F5F0E8` | Fondo del menú lateral |
| `border` | `#ECE5DA` | Borde de tarjetas |
| `border-strong` | `#E2D9CC` | Borde de botones secundarios e inputs |
| `divider` | `#F0EAE1` | Separadores dentro de tarjetas |
| `ink` | `#2B2A26` | Texto principal |
| `muted` | `#6B6459` | Texto secundario (cumple contraste AA) |
| `primary` | `#4F6B55` | Botón primario, ítem activo, barras |
| `primary-dark` | `#2F4A36` | Barras de clase completa, hover |
| `primary-soft` | `#F4F8F4` | Fondo de fila/día destacado |
| `danger` | `#A1432C` | Número de vencidas |
| `danger-soft` | `#F3DCD3` / texto `#8E3A24` | Badges de alerta |
| `warning-soft` | `#F6EDDA` / texto `#8A5A12` | Sin plan |
| `info-soft` | `#E2ECF5` / texto `#255377` | Recuperaciones, próxima clase |

**Tipografía**

- Títulos de página y de sección: `Fraunces`, itálica, peso 400–500 (38 px título de página, 22 px secciones).
- Todo lo demás: `Work Sans` 400/500/600.
- **Todos los números** en Work Sans con `font-variant-numeric: tabular-nums`. Nada de serif en montos ni conteos.
- Labels en oración normal ("Cobrado en octubre"), no en mayúsculas espaciadas.

**Forma**

- Radio: tarjetas 16 px, botones 10–12 px, chips 999 px.
- Botones: alto 44 px (34 px los secundarios dentro de tarjetas). Área táctil mínima 44 px en celular.
- Espaciado entre bloques: 20–24 px. Padding de tarjeta: 18–20 px.
- Sin sombras; separación por borde.

**Formato regional (es-AR)**: usar `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })` y `Intl.DateTimeFormat('es-AR', ...)`. Ninguna fecha en formato mm/dd.

## Estructura de la pantalla

### 1. Menú lateral (≥ 1024 px)

Ancho 248 px. Orden y grupos:

- **Operación:** Inicio · Horarios · Alumnos
- **Finanzas:** Pagos (con badge de cantidad de vencidas) · Reportes
- **Comunicación:** Comunicados (la sección actual "Notificaciones")
- **Configuración:** Planes · Equipo

"Avisos" se mantiene accesible desde la campana del encabezado. "Ver como alumno/instructor", Instagram y Cerrar sesión pasan a un menú "⋯" junto al usuario, abajo. Botón de búsqueda arriba del menú (puede abrir el buscador de alumnos existente).

No renombrar rutas: solo cambian etiquetas y agrupación visual.

### 2. Encabezado

Izquierda: fecha de hoy ("Viernes 2 de octubre") + "Hola, {nombre}". Derecha: campana (con punto si hay avisos nuevos), botón secundario "Nueva clase", botón primario "Registrar pago" (abre el flujo de registro que ya existe).

### 3. Resumen del mes (4 tarjetas, clickeables)

Encabezado de bloque con el toggle existente de mostrar/ocultar montos (enmascarar valores con `$ ••••••`, **sin cambiar el layout**).

1. Alumnos activos · subtexto "X al día · Y sin plan" → link a Alumnos.
2. Cobrado en el mes · barra de progreso con el % de cobranza · "N% de $esperado · N pagos" → link a Pagos.
3. Cuotas vencidas (número en `danger`) · subtexto con la regla vigente ("Vencieron el 1/10 · recargo desde el 11/10") → link a Pagos filtrado.
4. Ocupación de la semana en % · "ocupados de total · N libres" → link a Horarios.

### 4. Grilla principal (2 columnas: 1.65fr / 1fr)

**Izquierda — "Hoy"**: lista de las clases del día. Cada fila: hora · nombre · chip de estado · barra de ocupación con "x/8" · acción.

Estado visual (derivado en el cliente con la hora actual y la duración de la clase):

| Estado | Chip | Fila | Acción |
|---|---|---|---|
| Finalizada | gris | opacidad 0.6 | Ver alumnos |
| En curso | verde | fondo `primary-soft` | **Pasar lista** (primario) |
| Próxima (la siguiente) | azul, "En 40 min" | normal | Ver alumnos |
| Programada | neutro | normal | Ver alumnos |
| Completa | terracota suave | barra `primary-dark` | Ver alumnos |
| Cancelada | rojo suave | hora tachada, sin barra | sin acción |

**Derecha, arriba — "Requiere tu atención"** (con contador): una fila por ítem con ícono, título, subtítulo y botón.

- N cuotas sin pagar → Pagos.
- N alumnos sin plan → Alumnos filtrado.
- N lugares liberados por cancelaciones esta semana → Horarios.
  Si un ítem da 0, no se muestra. Si todos dan 0: estado vacío "Todo al día".

**Derecha, abajo — "Cumpleaños"**: próximos del mes, con fecha relativa ("Domingo 4 · en 2 días") y botón "Saludar" que abre `https://wa.me/<teléfono>` si el alumno tiene teléfono (si no tiene, ocultar el botón).

### 5. Ocupación por día

Grilla de 5 columnas (lunes a viernes): día · % grande · barra con fondo de referencia · "ocupados/total lugares". El día de hoy con fondo `primary-soft` y chip "Hoy".

## Celular (< 768 px)

Ver el artboard móvil del mockup.

- Sin menú lateral: **barra inferior fija** con Inicio · Horarios · Alumnos · Pagos · Más (en "Más" va el resto del menú).
- Buscador visible arriba.
- Dos botones rápidos: "Registrar pago" y "Pasar lista [hora de la clase en curso]" (si no hay clase en curso, "Ver horarios").
- KPIs en grilla 2×2.
- Hoy, Atención y Cumpleaños apilados, en ese orden.
- Respetar `env(safe-area-inset-bottom)` en la barra inferior.

## Accesibilidad

- Botones reales (`<button>`, `<a>`), nunca `div` con `onClick`.
- `aria-label` en botones de solo ícono (campana, WhatsApp, menú "⋯").
- El color nunca es el único indicador: los estados siempre llevan texto.

## Componentes a crear (reutilizables para las próximas pantallas)

`PageHeader`, `StatCard`, `SectionCard`, `StatusChip`, `ProgressBar`, `AttentionItem`, `SidebarNav` (con grupos), `BottomNav`. Ubicarlos donde el proyecto ya guarda sus componentes compartidos y seguir sus convenciones (Tailwind o el sistema de estilos que ya use).
