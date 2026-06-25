# ACP Skills

La pestaña ACP Skills se utiliza para monitorizar y gestionar las ejecuciones de skills realizadas a través del backend ACP. A diferencia del diálogo continuo de ACP Chat, ACP Skills está diseñado para tareas de skill puntuales o ejecutadas periódicamente.

## Descripción general de la interfaz

El panel de ACP Skills se divide en las siguientes áreas principales:

![Panel de ACP Skills](/img/docs/sidebar/acp-skills.png)

```
┌─────────────────────────────────────┐
│  Banner: Título de tarea / Estado / Backend   │
├─────────────────────────────────────┤
│  ← Run Drawer  │  Main Content Area  │  Details → │
│               │  Transcript View            │
│  Running      │  Plan Component             │
│  └─ backend1  │  Prompt Component           │
│     ├─ run A  │  Reply Area                 │
│     └─ run B  │                             │
│  Completed    │                             │
│  └─ backend1  │                             │
│     └─ run C  │                             │
└─────────────────────────────────────┘
```

## Banner

El área del Banner muestra metainformación y botones de acción para la ejecución seleccionada actualmente:

- **Título de tarea**: Nombre del skill de la ejecución
- **Estado**: Indicador de estado de ejecución (en ejecución / completada / fallida / cancelada, etc.)
- **Backend**: El backend ACP que ejecuta la tarea
- **Botones de acción**: Connect/Disconnect, Cancelar tarea

## Cajón de ejecuciones (izquierdo)

El cajón izquierdo organiza todas las ejecuciones de ACP Skill en una estructura de árbol:

### Agrupación

| Grupo | Descripción |
|-------|-------------|
| **Running** | Tareas en ejecución actualmente, agrupadas por backend |
| **Completed** | Tareas finalizadas, agrupadas por backend |

Cada entrada de tarea muestra información resumida (ID del skill, estado, hora) y tiene un indicador de atención (LED) para marcar cambios de estado. Haz clic en cualquier entrada de tarea para cambiar a la vista de detalle de esa ejecución.

### Archivado

Las tareas completadas se pueden eliminar de la lista mediante el botón de archivar (archivar solo las oculta en la sesión actual y no afecta a los registros de ejecución).

## Área de contenido principal

### Vista de transcripción

Después de seleccionar una ejecución, el área de contenido principal muestra la transcripción completa de esa ejecución, incluyendo:

- **Mensajes**: Contenido del diálogo del asistente y del usuario
- **Llamadas a herramientas**: Herramientas invocadas por la IA y sus resultados, mostrando nombre de la herramienta, resumen de entrada y LED de estado
- **Proceso de pensamiento**: Proceso de razonamiento de la IA (si está disponible)
- **Eventos de estado**: Cambios de estado durante la ejecución

La transcripción admite el **modo Plain** (mensajes coloreados por rol en el borde izquierdo) y el **modo Bubble** (mensajes en estilo de burbuja, llamadas a herramientas consecutivas colapsadas automáticamente en grupos), alternables mediante el botón en la esquina superior derecha.

### Componente de plan

Cuando una ejecución incluye un plan de múltiples pasos, el componente de plan muestra el progreso actual, los pasos completados y los pasos pendientes, con cada paso teniendo un icono de estado (en progreso/completado/fallido).

### Componente de prompt

El componente de prompt muestra diferentes indicaciones interactivas según el estado de la ejecución:

| Estado | Contenido mostrado |
|--------|-------------------|
| `waiting_user` | Prompt en espera de respuesta del usuario, con descripción del contexto y opciones de respuesta rápida |
| `permission` | Prompt de solicitud de permisos, con vista previa del comando y botones de aprobar/rechazar |
| `disconnected` | Prompt de reconexión; haz clic para conectar |
| `running` | Indicador de progreso |
| `completed` | Confirmación de estado de finalización |
| `error` | Información de error y sugerencias de resolución |

### Área de respuesta

El área de respuesta en la parte inferior contiene:

- **Cuadro de entrada de texto**: Introduce el contenido de la respuesta
- **Selección de modo** (opcional): Alternancia del modo de ejecución
- **Selección de modelo** (opcional): Alternancia del modelo de IA
- **Esfuerzo de razonamiento** (opcional): Nivel de esfuerzo de razonamiento
- **Botón Send/Cancel**
- **Medidor de uso**: Gráfico circular que muestra el uso de tokens (usado/límite)
- **Sugerencia de atajo de teclado**: Atajo de teclado para enviar respuestas

Los borradores de respuesta se guardan por solicitud — cambiar de ejecución y volver conserva el contenido no enviado.

## Cajón de detalles (derecho)

El cajón derecho muestra información detallada sobre la ejecución seleccionada, con las siguientes áreas desplegables:

| Área | Contenido |
|------|-----------|
| **Run Path** | Directorio del espacio de trabajo, rutas de archivos de resultados |
| **Runner Info** | backends, agent, mode, model, reasoning, skill, session |
| **Validation Info** | Estado de validación, cantidad de correcciones, detalles de errores |
| **Runtime Dependencies** | Lista de dependencias del entorno de ejecución |
| **Output Revision** | Historial de revisiones de salida |
| **Runtime Log** | Entradas de registro durante la ejecución |
| **Result JSON** | Salida estructurada final (expandible) |

## Gestión de permisos

Cuando una ejecución requiere permisos de escritura de Zotero o permisos de llamada a herramientas ACP, el componente de prompt muestra una solicitud de permisos:

- **Vista previa del comando**: Muestra la operación solicitada
- **Info de origen**: Quién inició la solicitud
- **Botones de acción**: Aprobar / Rechazar
- Expandible para ver los detalles completos de la solicitud

## Configuración relacionada

El panel de ACP Skills requiere que se configure un [backend ACP](../backends/acp) antes de su uso.
