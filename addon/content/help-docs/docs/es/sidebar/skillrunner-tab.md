# Pestaña SkillRunner

La pestaña SkillRunner se utiliza para ver e interactuar con las ejecuciones realizadas a través del backend Skill-Runner. A diferencia de ACP Skills, que se centra en la ejecución puntual de skills, la pestaña SkillRunner hace énfasis en la gestión de sesiones interactivas.

## Descripción general de la interfaz

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/skillrunner-tab.webp" alt="Panel de SkillRunner" title="Panel de SkillRunner" loading="lazy" /><figcaption>Panel de SkillRunner</figcaption></figure>

```
┌─────────────────────────────────────┐
│  Banner: Título / requestId / Status    │
├─────────────────────────────────────┤
│  ← Task Drawer  │  Main Content Area   │  Details → │
│               │  Transcript View            │
│  Running      │  Plan Component             │
│  └─ backend1  │  Prompt Component           │
│     └─ task A │  Reply Area                 │
│  Completed    │                             │
│  └─ backend1  │                             │
│     └─ task B │                             │
└─────────────────────────────────────┘
```

## Banner

El Banner muestra información sobre la tarea seleccionada actualmente:

- **Título**: Nombre de la tarea o identificador del skill
- **Request ID**: Identificador único de solicitud de la tarea
- **Estado**: Estado de ejecución (running / waiting_user / waiting_auth / completed / failed)
- **Backend**: Información del backend
- **Engine**: El motor en uso (por ejemplo, gemini, claude, etc.)
- **Model**: El modelo en uso
- **Updated**: Hora de última actualización
- **Botón de cancelar tarea**

## Cajón de tareas (izquierdo)

El cajón izquierdo muestra todas las tareas de SkillRunner, divididas en los grupos Running y Completed. Cada entrada de tarea muestra información resumida, un indicador de estado y una acción de archivar. Haz clic en una entrada para cambiar a la vista de detalle de esa tarea.

## Área de contenido principal

### Vista de transcripción

La vista de transcripción de SkillRunner utiliza un **modelo de chat de pensamiento** que gestiona inteligentemente el razonamiento continuo:

- **Bloques de pensamiento**: El proceso de razonamiento de la IA se muestra como bloques de pensamiento independientes
- **Llamadas a herramientas**: Muestra el nombre de la herramienta, resumen de entrada y estado de ejecución
- **Mensajes**: Mensajes de conversación del asistente y del usuario
- **Revisión**: Registros de cambios de versión de salida

También admite los modos de visualización **Plain / Bubble**.

### Flujo de autenticación

La pestaña SkillRunner admite flujos de autenticación, permitiendo completar la autenticación del backend sin salir del panel:

**Activadores de autenticación:**

- Se activa automáticamente al ejecutar un skill que requiere autenticación
- El componente de prompt muestra una solicitud de autenticación

**Métodos de autenticación admitidos:**

| Método | Descripción | Casos de uso |
|--------|-------------|--------------|
| **OAuth Proxy** | Completa el flujo OAuth mediante el navegador | Método recomendado, para motores que admiten OAuth |
| **Auth Code Input** | Introduce manualmente un código o URL de autenticación | Cuando el motor ha generado un enlace de autenticación |
| **File Import** | Importa un archivo de credenciales | Cuando ya se dispone de un archivo de credenciales |
| **Inline TUI** | Lanza una terminal directamente en el panel | Cuando se requiere inicio de sesión interactivo |

**Ejemplo de flujo de autenticación (OAuth):**

1. La ejecución detecta que se requiere autenticación
2. El componente de prompt muestra "Authentication required" y los métodos de autenticación disponibles
3. El usuario selecciona OAuth proxy
4. El navegador abre la página de OAuth
5. El usuario completa la autenticación
6. La ejecución se reanuda automáticamente

### Componente de prompt

| Estado | Contenido mostrado |
|--------|-------------------|
| `waiting_user` | En espera de entrada del usuario; muestra descripción del contexto y opciones rápidas (si están disponibles) |
| `waiting_auth` | En espera de autenticación; muestra selección de método de autenticación y campo de entrada |
| `running` | Indicador de progreso |
| `completed` | Confirmación de estado de finalización |
| `error` | Información de error y sugerencias de resolución |

### Área de respuesta

- **Cuadro de entrada de texto**: Introduce el contenido de la respuesta
- **Botón Send/Cancel**

A diferencia de ACP Skills, el área de respuesta de la pestaña SkillRunner no tiene selectores de modo/modelo/razonamiento (estos se configuran en los ajustes del backend).

## Cajón de detalles (derecho)

| Área | Contenido |
|------|-----------|
| **Run Metadata** | Título, requestId, taskKey, estado, indicadores terminal/waiting |
| **Backend Info** | backend, engine, model |
| **Updated Time** | Hora de última actividad |
| **Interaction Info** | Información de interacción pendiente actual (si existe) |
| **Session Summary** | Resumen de sesión histórica |
| **Revision Summary** | Registros de cambios de versión de salida |

## Configuración relacionada

Antes de usar la pestaña SkillRunner, se debe configurar un [backend Skill-Runner](#doc/backends%2Fskill-runner).
