# Preferencias

La configuración de Zotero Agents se encuentra en **Zotero → Settings → Zotero Agents** (Windows/Linux) o **Zotero → Preferences → Zotero Agents** (macOS).

## Configuración de flujos de trabajo

### Directorio de flujos de trabajo

- **Ruta**: directorio personalizado para almacenar flujos de trabajo
- **Ubicación predeterminada**: `<Zotero Data>/zotero-agents/data/workflows`
- **Scan Workflows**: haz clic en el botón para reescanear el directorio y cargar todos los flujos de trabajo

### Directorio de skills

- **Ruta**: directorio personalizado para almacenar paquetes de skills
- **Scan**: haz clic en el botón para escanear el directorio y cargar los skills

### Paquetes de flujo de trabajo oficiales

Los flujos de trabajo oficiales se distribuyen a través de paquetes de contenido separados, desacoplados del complemento en sí.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_workflow.webp" alt="Página de configuración de flujos de trabajo" title="Página de configuración de flujos de trabajo" loading="lazy" /><figcaption>Página de configuración de flujos de trabajo</figcaption></figure>

| Configuración | Tipo | Descripción |
|---------------|------|-------------|
| **Install Official Workflow Packages** | botón | Descarga e instala el paquete oficial más reciente desde GitHub / Gitee |
| **Check for Updates** | botón | Verifica si hay una nueva versión disponible remotamente |
| **Status** | texto | Muestra la versión del paquete instalado actualmente y la información del canal |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_official-workflow-contents.webp" alt="Contenido del paquete de flujo de trabajo oficial" title="Contenido del paquete de flujo de trabajo oficial" loading="lazy" /><figcaption>Contenido del paquete de flujo de trabajo oficial</figcaption></figure>

#### Canales de actualización

Puedes elegir entre tres canales de actualización:

| Canal | Descripción |
|-------|-------------|
| **stable** | Versión estable (recomendada) |
| **beta** | Versión beta, incluye próximas funcionalidades |
| **dev** | Versión de desarrollo, incluye los últimos cambios experimentales |

Después de cambiar de canal, haz clic en **Check for Updates** para obtener el paquete más reciente de ese canal.

### Configuración de ejecución

- **Enable Skill Run Feedback**: cuando está habilitado, las ejecuciones de skills pueden escribir archivos laterales de feedback en Markdown, que son recopilados por el panel Skill Feedback del Dashboard

## Host Bridge

Un servicio HTTP integrado para que herramientas de IA externas y el CLI accedan a la biblioteca Zotero. Consulta [Host Bridge](#doc/backends%2Fhost-bridge) para más detalles.

| Configuración | Tipo | Descripción |
|---------------|------|-------------|
| **Enable MCP Server** | booleano | Expone también la interfaz del protocolo MCP |
| **Disable Write Approval** | booleano | Peligroso: omite todas las aprobaciones de escritura |
| **Enable LAN Access** | booleano | Permite acceso desde red local |
| **Fixed Port** | booleano | Usa un puerto fijo en lugar de uno aleatorio |
| **Port Number** | número | Valor del puerto fijo (predeterminado: 26570) |
| **LAN IP** | cadena | Especifica manualmente la IP anunciada (dejar vacío para detección automática) |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_host-bridge.webp" alt="Página de configuración de Host Bridge" title="Página de configuración de Host Bridge" loading="lazy" /><figcaption>Página de configuración de Host Bridge</figcaption></figure>

Botones de acción:

- **Start/Show Endpoint**: inicia el servicio y muestra la URL del endpoint
- **Rotate Token**: rota el token de sesión
- **Create/Rotate Master Token**: genera un token persistente
- **Copy Master Token**: copia al portapapeles
- **Copy Remote CLI Profile**: obtiene la configuración de conexión remota
- **Install CLI**: instala `zotero-bridge` con un solo clic

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_host-bridge_expand.webp" alt="Área de acciones peligrosas de Host Bridge expandida" title="Área de acciones peligrosas de Host Bridge expandida" loading="lazy" /><figcaption>Área de acciones peligrosas de Host Bridge expandida</figcaption></figure>

## Backend local SkillRunner

> ⚠️ Este modo solo es adecuado para usuarios que no están familiarizados con la instalación de herramientas de agente y no pueden usar Docker. Si ya tienes un agente ACP o puedes usar Docker, por favor prefiere el [backend ACP](#doc/backends%2Facp) o el [Skill-Runner desplegado con Docker](#doc/backends%2Fskill-runner#recommended-docker-persistent-deployment).

El Skill-Runner local se inicia y detiene con el complemento — cerrar Zotero termina todas las tareas. Funciones de gestión de ejecución:

| Función | Descripción |
|---------|-------------|
| **One-click Deploy** | Descarga e instala la última versión del runtime de Skill-Runner |
| **Start** | Inicia el proceso local de Skill-Runner |
| **Stop** | Detiene el Skill-Runner local en ejecución |
| **Uninstall** | Elimina los archivos de runtime instalados |
| **Open Management UI** | Abre la interfaz de gestión de backends en el complemento |
| **Open Skills Folder** | Abre el directorio donde se almacenan los archivos de skills |
| **Refresh Model Cache** | Actualiza la caché de lista de modelos del backend |
| **Open Debug Console** | Muestra la salida de registros del backend |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_skillrunner-local-backend.webp" alt="Página de configuración del backend local SkillRunner" title="Página de configuración del backend local SkillRunner" loading="lazy" /><figcaption>Página de configuración del backend local SkillRunner</figcaption></figure>

## Backend Manager

Gestiona todos los perfiles de backend:

- Agrupados por proveedor (SkillRunner, ACP, Generic HTTP)
- Añadir/editar/eliminar backends
- Cada backend se puede configurar con: ID, Base URL, Bearer Token, Timeout

## WebDAV Sync

Solución de sincronización multi-dispositivo para el Synthesis Workbench, que reemplaza al obsoleto Git Sync. Consulta [WebDAV Sync](#doc/synthesis%2Fwebdav-sync) para más detalles.

| Configuración | Tipo | Predeterminado | Descripción |
|---------------|------|----------------|-------------|
| **Enable WebDAV Sync** | booleano | `false` | Interruptor principal |
| **Base URL** | cadena | `""` | Dirección del servidor WebDAV |
| **Remote Path** | cadena | `"zotero-agents"` | Ruta del directorio remoto |
| **Username** | cadena | `""` | Nombre de usuario de WebDAV |
| **Password/Token** | cifrado | `""` | Contraseña o token de aplicación (cifrado con AES-256-GCM) |
| **Auto Sync** | booleano | `false` | Dispara la sincronización automáticamente después de cada cambio |
| **Auto Retry** | booleano | `false` | Reintenta automáticamente en caso de fallo |

Botones de acción: Save Settings, Save Credential, Test Connection.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_WebDAV-sync.webp" alt="Página de configuración de WebDAV Sync" title="Página de configuración de WebDAV Sync" loading="lazy" /><figcaption>Página de configuración de WebDAV Sync</figcaption></figure>

## Datos de ejecución

Muestra el directorio raíz de persistencia, el uso de ejecución y diagnósticos de integridad:

- **Persistence Root**: `<Zotero Data>/zotero-agents/data/`
- **Synthesis Canonical Store**: SQLite local + paquetes persistentes
- **Tamaños de directorios**: data/, cache/, logs/, tmp/, etc.
- **Panel de diagnósticos**: detecta problemas del sistema de archivos (por ejemplo, archivos WAL no limpiados)

Nota: El Synthesis Canonical Store y las bases de datos de estado son solo para diagnóstico y no se pueden limpiar desde aquí.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_storage-and-persistence.webp" alt="Página de datos de ejecución y gestión de persistencia" title="Página de datos de ejecución y gestión de persistencia" loading="lazy" /><figcaption>Página de datos de ejecución y gestión de persistencia</figcaption></figure>

## Opciones generales

- **Default Backend**: selecciona la instancia de backend predeterminada a usar
- **Auto-start Local Backend**: inicia automáticamente Skill-Runner cuando se inicia Zotero
- **Log Level**: establece el nivel de registro
- **Enable Built-in Markdown Reader**: cuando está marcado, hacer doble clic en archivos adjuntos `.md` los abre en el lector integrado; cuando está desmarcado, se restaura el abridor predeterminado del sistema (habilitado de forma predeterminada)

## Ruta de navegación de configuración

```
Zotero → Settings → Zotero Agents
├── Workflow Settings
│   ├── Workflow Directory
│   ├── Skill Directory
│   ├── Official Workflow Packages
│   └── Runtime Settings
├── Host Bridge
│   ├── Service Start/Stop
│   ├── Network & Port
│   └── Token Management
├── SkillRunner Local Backend
├── Backend Manager
├── WebDAV Sync
├── Runtime Data
└── General Options
```
