# Panel Home

Home es la primera página que ves al abrir Synthesis Workbench. Proporciona una visión general completa de tu biblioteca, el estado de sincronización y acceso rápido a los temas populares.

![Panel Home de Synthesis](/img/docs/synthesis/home.png)

## Tarjetas de estadísticas de la biblioteca

La parte superior de la página muestra un conjunto de tarjetas de estadísticas que indican el estado actual del sistema Synthesis:

| Métrica | Descripción |
|---------|-------------|
| **Registered Papers** | Número total de artículos incluidos en el Índice de Referencias Canónicas |
| **Topic Count** | Número de síntesis de temas creadas |
| **Graph Nodes** | Número total de nodos en el grafo de citas (artículos de la biblioteca + referencias externas) |
| **Graph Edges** | Número total de relaciones de citación en el grafo de citas |
| **Sync Status** | Estado de ejecución de la sincronización WebDAV/Git |

Estas métricas te permiten comprender rápidamente el nivel de estructuración y el progreso de síntesis de tu biblioteca.

## Panel de sincronización

Si se ha configurado [WebDAV Sync](webdav-sync) (recomendado) o [Git Sync](git-sync) (obsoleto), la página Home muestra un panel de estado de sincronización:

### WebDAV Sync

- **Sync Status**: idle / queued / syncing / blocked_conflict / failed
- **Last Sync Time**
- **Remote HEAD Identifier**
- **Botones de acción**: Sincronización manual, pausar/reanudar, reintentar

Cuando ocurren conflictos, el panel muestra los detalles del conflicto y las opciones de acción (`keep_local`, `clear_after_manual_edit`).

Para la configuración y uso detallado de la sincronización WebDAV, consulta [WebDAV Sync](webdav-sync).

:::warning Aviso sobre sincronización automática
La función de sincronización automática de WebDAV sync no ha sido probada exhaustivamente. Se recomienda **usar solo sincronización manual** en esta etapa, y habilitar la sincronización automática una vez que se mejore en una futura versión.
:::

### Git Sync (obsoleto)

Consulta [Git Sync](git-sync) como referencia histórica.

## Panel de elementos a revisar

La página Home puede mostrar una vista previa rápida de los elementos pendientes de revisión:

| Categoría de revisión | Descripción |
|-----------------------|-------------|
| **Citation Matches** | Propuestas de vinculación cita-elemento pendientes |
| **Concepts** | Sugerencias de conceptos, acepciones y alias pendientes |
| **Topic Graph Relationships** | Relaciones entre temas pendientes |
| **Tag Suggestions** | Etiquetas sugeridas por la IA en espera de aprobación |

Cada categoría muestra una insignia con el número de elementos pendientes. Haz clic para navegar a la sub-pestaña correspondiente en el [Centro de revisión](review).

## Temas populares

La parte inferior de la página muestra una lista de tarjetas de temas populares, ordenados por número de artículos asociados. Cada tarjeta contiene:

- **Nombre del tema** — Haz clic para entrar en la página de detalle del tema
- **Cantidad de artículos** — Número de artículos cubiertos por el tema
- **Vista previa del resumen** — Extracto de la descripción del tema
- **Botones de acción** — Abrir tema, actualizar tema

Cuando hay múltiples temas activos, usa el enlace "View All" para explorar la lista completa en la página de Temas.

## Siguientes pasos

- [WebDAV Sync](webdav-sync) — Configurar sincronización entre dispositivos para datos de Synthesis
- [Centro de revisión](review) — Gestionar elementos de revisión de coincidencias de citas, conceptos y grafo de temas
- [Índice y Grafo de Citas](index-and-citation) — Gestionar el Índice de Referencias Canónicas
