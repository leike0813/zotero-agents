# Uso de ACP Chat

## Funcionalidad

ACP Chat te permite conversar con un backend ACP configurado, utilizando como contexto el elemento de Zotero que estás viendo actualmente o el artículo en el lector.

## Casos de uso

- **Preguntas sobre literatura**: Haz preguntas sobre el artículo que estás leyendo, obtén explicaciones y resúmenes
- **Asistencia en escritura**: Obtén sugerencias durante el proceso de escritura
- **Consulta rápida**: Recupera rápidamente información clave sobre un artículo específico
- **Procesamiento por lotes**: Realiza análisis por lotes en múltiples elementos de una lista de literatura

## Disposición de la interfaz

El panel de ACP Chat contiene las siguientes áreas:

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/acp-chat.webp" alt="Panel de ACP Chat" title="Panel de ACP Chat" loading="lazy" /><figcaption>Panel de ACP Chat</figcaption></figure>

```
┌──────────────────────────────────────────┐
│  Banner                                  │
│  Backend ▼  |  Session ▼  | [Connect] [＋] │
│  Status:   ● Connection | ● MCP | ● HostBridge  │
├──────────────────────────────────────────┤
│  ← Session Drawer  │  Transcript View  │  Details →  │
│                    │  [Toggle Plain/Bubble]    │
│  Backend A         │  Conversation messages... │
│  ├─ Session 1      │  Plan Component           │
│  └─ Session 2      │  Prompt Component         │
│  Backend B         │  Reply Area               │
│  └─ Session 3      │  Text input + Send/Cancel │
│                    │  Mode ▼ | Model ▼ | Reasoning ▼│
│                    │  ⭘ Usage 12.3k/200k   │
└──────────────────────────────────────────┘
```

## Banner

El Banner se encuentra en la parte superior del panel y proporciona las funciones de control principales:

### Selección de backend

Un menú desplegable lista todos los backends configurados, cada uno mostrando un sufijo de estado (Connecting/Connected/Disconnected). Al cambiar de backend se cambia automáticamente a la sesión de ese backend.

### Selección de sesión

Un menú desplegable muestra las 8 sesiones más recientes (ordenadas por tiempo); al seleccionar una se cambia a esa sesión. Cuando hay más de 8, aparece "Show more..." en la parte inferior; al hacer clic se abre el cajón de sesiones para ver la lista completa.

### Controles de conexión

- **Botón Connect/Disconnect**: Gestiona manualmente el estado de conexión del backend actual
- **Botón de autenticación**: Se muestra cuando el backend requiere autenticación
- **Nueva sesión (＋)**: Crea una nueva sesión en el backend actual

### Indicadores de estado

El lado derecho del Banner muestra tres indicadores luminosos de estado:

| Indicador | Descripción |
|-----------|-------------|
| ● Connection | Estado de conexión con el backend ACP (verde=Conectado/gris=Desconectado/amarillo=Conectando) |
| ● MCP | Disponibilidad del servicio MCP |
| ● Host Bridge | Estado de conexión del Host Bridge de Zotero (ver abajo) |

### Estado del Host Bridge

Host Bridge es un canal de puente interno entre el plugin de Zotero y el backend. Se encarga de transmitir el contexto actual de Zotero (elementos seleccionados, artículo en el lector, datos de la biblioteca, etc.) al backend, permitiendo que la IA opere basándose en tus datos reales de Zotero.

Host Bridge se comunica a través de la herramienta CLI `zotero-bridge`; el plugin gestiona su ciclo de vida automáticamente en segundo plano.

| Estado | Significado |
|--------|-------------|
| Verde ● | Host Bridge está conectado; el backend puede acceder al contexto de Zotero |
| Amarillo ● | Conectando o reconectando |
| Gris ● | Host Bridge no está disponible (no instalado o no iniciado); el backend no puede obtener el contexto de Zotero |
| Oculto | Host Bridge no es necesario actualmente (por ejemplo, el backend no lo soporta o las funciones de contexto no están habilitadas) |

Cuando Host Bridge no está disponible, ACP Chat puede seguir funcionando normalmente, pero la IA no puede acceder a la información del artículo que estás viendo como contexto.

## Cajón de sesiones (izquierdo)

El cajón izquierdo muestra todas las sesiones históricas agrupadas por backend. Cada entrada de sesión muestra un título y la hora de última actividad.

- **Cambiar de sesión**: Haz clic en una sesión de la lista para cargarla
- **Nueva sesión**: Opera desde la parte superior del cajón o desde el Banner

## Vista de transcripción

### Mensajes de conversación

Los mensajes de conversación admiten renderizado Markdown, incluyendo:

- **Bloques de código**: Con resaltado de sintaxis y botón de copia
- **Fórmulas matemáticas**: Fórmulas LaTeX renderizadas con KaTeX
- **Listas, tablas, enlaces** y otros elementos estándar de Markdown

### Llamadas a herramientas

Cuando la IA invoca una herramienta, se muestra una entrada de llamada a herramienta en la transcripción:

- Insignia con el nombre de la herramienta
- Resumen de parámetros de entrada
- LED de estado de ejecución (esperando/en progreso/completada/fallida)
- En modo Bubble, las llamadas a herramientas consecutivas se colapsan automáticamente en un "grupo de actividad de herramientas"

### Proceso de pensamiento

El proceso de razonamiento de la IA se muestra como un bloque separado de "Thinking", distinto de la respuesta formal.

### Alternancia del modo de visualización

El botón de alternancia en la esquina superior derecha permite cambiar entre dos modos:

| Modo | Descripción |
|------|-------------|
| **Plain** | Los mensajes se colorean por rol en el borde izquierdo, adecuado para revisar conversaciones largas |
| **Bubble** | Los mensajes se muestran en estilo de burbuja, las llamadas a herramientas consecutivas se agrupan automáticamente, adecuado para lectura |

### Componente de plan

Cuando una conversación incluye un plan de múltiples pasos, se muestra una barra de progreso del plan sobre la transcripción, marcando los pasos completados, en progreso y pendientes.

### Componente de prompt

El componente de prompt se muestra cuando se requiere la interacción del usuario:

- **Solicitudes de permisos**: Cuando el backend necesita permisos de acceso a Zotero, muestra los detalles de la solicitud y botones de aprobación
- **Mensaje de conexión**: Cuando está desconectado, muestra una sugerencia de reconexión
- **Mensaje de error**: Muestra información del error y acciones de recuperación

## Área de respuesta

### Entrada de texto

- **Cuadro de texto multilínea**: Admite entrada de texto largo
- **Enter para enviar**: Pulsa Enter para enviar un mensaje
- **Shift+Enter para nueva línea**: Inserta un salto de línea
- **Historial de respuestas**: Pulsa las teclas de flecha arriba/abajo para navegar por los mensajes enviados

### Modo de ejecución

Sobre el área de respuesta puedes seleccionar:

| Opción | Descripción | Valores disponibles |
|--------|-------------|---------------------|
| **Mode** | Modo de ejecución | Definido por el backend |
| **Model** | Modelo de IA | Lista de modelos admitidos por el backend |
| **Reasoning Effort** | Nivel de esfuerzo de razonamiento | Low/Medium/High (si el backend lo soporta) |

### Medidor de uso

Un medidor de uso circular se muestra en la esquina inferior derecha del área de respuesta:

- **Anillo exterior**: Porcentaje de uso de tokens de la sesión actual respecto al límite
- **Texto**: `Used k / Limit k`
- El color cambia según el nivel de uso (Normal → Warning → Critical)

### Sugerencias de atajos de teclado

Las sugerencias de atajos de teclado se muestran dentro del cuadro de entrada.

## Cajón de detalles (derecho)

El cajón derecho muestra información detallada sobre la sesión actual:

| Área | Contenido |
|------|-----------|
| **Session Info** | ID de sesión, hora de creación, hora de última actividad |
| **Backend Info** | Tipo de backend, dirección, modelo |
| **Workspace Path** | Ruta del archivo del espacio de trabajo de la sesión |
| **Diagnostics** | Datos de depuración y diagnóstico |

## Contexto de biblioteca vs contexto de lector

ACP Chat admite dos modos de contexto; el plugin detecta automáticamente el tipo de contexto actual y lo transmite al backend:

| Modo | Descripción | Casos de uso |
|------|-------------|--------------|
| **Contexto de biblioteca** | Basado en los elementos seleccionados actualmente en la lista de elementos de Zotero | Consulta rápida mientras se navega por la biblioteca |
| **Contexto de lector** | Basado en el texto completo del artículo abierto actualmente en el lector de Zotero | Comprensión contextual necesaria durante la lectura profunda |

## Gestión de sesiones

- El historial de conversaciones se persiste automáticamente
- Múltiples sesiones por backend se gestionan de forma independiente
- Las sesiones históricas se pueden ver en el Dashboard o la barra lateral
- Se admite una lista de sesiones agrupadas por backend

## Notas

- Primero se debe configurar un [backend ACP](#doc/backends%2Facp)
- Las conversaciones en diferentes backends ACP no interfieren entre sí
- Las conversaciones se asocian con elementos de Zotero para facilitar su consulta posterior
