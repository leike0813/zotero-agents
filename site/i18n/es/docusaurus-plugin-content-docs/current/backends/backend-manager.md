# Backend Manager

El Backend Manager es el diálogo unificado para gestionar todas las configuraciones de backend. A través de él, puedes añadir, editar, eliminar y verificar las conexiones de backend.

## Cómo abrir

- **Menú**: **Herramientas → Backend Manager**

## Disposición de la interfaz

```
┌─────────────────────────────────────────────────┐
│  Backend Manager                        [Cancelar] [Guardar] │
├─────────────────────────────────────────────────┤
│  [ACP] [SkillRunner] [HTTP genérico]              │
├─────────────────────────────────────────────────┤
│  ACP                                   [Añadir ACP] │
│                                                 │
│  ┌─ Nombre a mostrar: [________]  ─┐               │
│  │  Comando:      [________]    │               │
│  │  Argumentos:    Editor de argumentos │             │
│  │  Variables de entorno: Editor de variables de entorno  │  [Eliminar]  │
│  └──────────────────────────────┘               │
│                                                 │
│  ┌─ Nombre a mostrar: [________]  ─┐               │
│  │  ...                       │  [Eliminar]      │
│  └──────────────────────────────┘               │
└─────────────────────────────────────────────────┘
```

## Operaciones generales

### Cambio de pestaña

Hay tres pestañas en la parte superior del diálogo: **ACP**, **SkillRunner** y **HTTP genérico**. Haz clic en una pestaña para cambiar al área de configuración del tipo de backend correspondiente. Cada pestaña lista todos los backends configurados de ese tipo.

### Añadir un backend

Haz clic en el botón **Añadir** debajo de una pestaña para crear una nueva fila de configuración en blanco para ese tipo. Rellena los campos y haz clic en **Guardar** en la esquina inferior derecha para aplicar.

### Editar un backend

Modifica los campos directamente en la fila de configuración. Los cambios no guardados no surtirán efecto.

### Eliminar un backend

Haz clic en el botón **Eliminar** dentro de una fila de configuración para eliminar ese backend. Las eliminaciones surten efecto tras guardar.

### Guardar y cancelar

| Botón | Ubicación | Función |
|--------|----------|----------|
| **Guardar** | Esquina inferior derecha del diálogo | Guarda todos los cambios y cierra el diálogo |
| **Cancelar** | Esquina inferior derecha del diálogo (junto a Guardar) | Descarta todos los cambios no guardados y cierra el diálogo |

Si hay cambios no guardados antes de cerrar el diálogo, aparecerá un aviso de confirmación.

---

## Pestaña ACP

Los backends ACP son subprocesos de agente que se ejecutan localmente. La configuración especifica el comando de inicio, y el complemento gestiona el ciclo de vida del proceso.

![Página de configuración del backend ACP](/img/docs/backends/backend-manager_ACP.png)

### Descripción de los campos

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Nombre a mostrar** | Sí | Nombre visible del backend, utilizado para identificarlo en el Dashboard y la barra lateral |
| **Comando** | Sí | Comando para iniciar el backend ACP (ej., `npx opencode-ai@latest acp`) |
| **Argumentos** | No | Argumentos adicionales para el comando, se añaden uno a uno mediante el editor de argumentos |
| **Variables de entorno** | No | Variables de entorno adicionales, se añaden una a una mediante el editor de variables de entorno (pares clave-valor) |

### Preajustes ACP

En la parte superior de la pestaña ACP hay un botón **Añadir desde preajuste**. Al hacer clic se abre la ventana de configuración del preajuste: a la izquierda seleccionas el agente, a la derecha se muestran las opciones de inicio y una vista previa de configuración de solo lectura. Al hacer clic en **Confirmar**, el complemento añade una fila de configuración ACP normal según la vista previa; al hacer clic en **Cancelar** no se modifica la configuración actual.

- **Usar npx**: al activarlo, el comando cambia al formato `npx <package>` y se muestra un aviso sobre la necesidad de instalar Node.js y npm junto con un enlace al sitio web de Node.js. Codex y Claude Code lo tienen activado por defecto, ya que dependen del adaptador ACP; los demás agentes no.
- **Entorno aislado**: solo disponible para agentes que admiten aislamiento. Al activarlo, se inyectan las variables de entorno correspondientes en la vista previa y se muestra un aviso de que las opciones del agente y la autenticación deben gestionarse manualmente en ese directorio aislado.

![Diálogo de preajustes ACP](/img/docs/backends/backend-manager_ACP-preset.png)

El área de vista previa es de solo lectura e incluye el ID del perfil, el nombre para mostrar, el comando, los argumentos, las variables de entorno y la familia del agente. La fila de configuración añadida puede seguir editándose como un backend ACP normal.

Comandos predeterminados de los preajustes integrados:

| Preajuste | Comando predeterminado | Descripción |
|------|------|------|
| **OpenCode** | `opencode acp` | Backend ACP de OpenCode; admite aislamiento del directorio de configuración mediante `OPENCODE_CONFIG_DIR` |
| **Codex** | `npx @zed-industries/codex-acp@latest` | Adaptador ACP para OpenAI Codex |
| **Claude Code** | `npx @agentclientprotocol/claude-agent-acp@latest` | Adaptador ACP para Claude Code |
| **Gemini CLI** | `gemini --experimental-acp` | Modo ACP de Gemini CLI |
| **Hermes** | `hermes acp` | Backend ACP de Hermes Agent |
| **Qwen Code** | `qwen --acp --experimental-skills` | Modo ACP de Qwen Code |
| **GitHub Copilot** | `copilot --acp --stdio` | Modo ACP de GitHub Copilot CLI |
| **Qoder CLI** | `qodercli --acp` | Modo ACP de Qoder CLI; admite aislamiento del directorio de configuración mediante `QODER_CONFIG_DIR` |
| **Cursor Agent ACP** | `cursor-agent-acp` | Adaptador ACP de Cursor Agent; admite aislamiento del directorio de sesión mediante `--session-dir` |
| **DeepAgents** | `deepagents-acp` | Adaptador ACP de DeepAgents |
| **Auggie** | `auggie --acp` | Modo ACP de Auggie |
| **Kilo** | `kilo acp` | Modo ACP de Kilo Code |
| **Cline** | `cline --acp` | Modo ACP de Cline |
| **CodeBuddy** | `codebuddy --acp` | Modo ACP de CodeBuddy |
| **Grok** | `grok agent stdio` | Modo stdio de Grok Agent |

Solo se han probado OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code y Hermes Agent. La disponibilidad de otros backends ACP depende de sus implementaciones; este complemento no ofrece garantía al respecto.

### Botones de acción

| Botón | Función |
|--------|----------|
| **Actualizar opciones de ejecución** | Vuelve a detectar la lista de modelos, la lista de modos y otras capacidades de ejecución del backend |

### Editor de argumentos

**Añadir argumento**: Haz clic en el botón de añadir e introduce el contenido del argumento.
**Eliminar argumento**: Haz clic en el botón de eliminar junto al argumento.

### Editor de variables de entorno

**Añadir variable de entorno**: Haz clic en el botón de añadir y rellena la clave (Key) y el valor (Value).
**Eliminar variable de entorno**: Haz clic en el botón de eliminar junto a la variable.

---

## Pestaña SkillRunner

Los backends SkillRunner se comunican con los servicios de Skill-Runner mediante API HTTP, admitiendo tanto modos de despliegue local como remoto.

![Página de configuración del backend SkillRunner](/img/docs/backends/backend-manager_skillrunner.png)

### Descripción de los campos

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Nombre a mostrar** | Sí | Nombre visible del backend |
| **URL base** | Sí | Dirección del servicio Skill-Runner (ej., `http://127.0.0.1:29813`) |
| **Autenticación** | No | Selecciona `none` (sin autenticación) o `bearer` (autenticación Bearer Token) |
| **Token de autenticación** | No | Bearer Token (solo se rellena cuando la autenticación está configurada como bearer) |
| **Tiempo de espera** | No | Tiempo de espera de la solicitud (milisegundos) |

### Botones de acción

| Botón | Función |
|--------|----------|
| **Abrir interfaz de gestión** | Abre la interfaz web de gestión integrada de Skill-Runner |
| **Actualizar caché de modelos** | Actualiza la caché de la lista de modelos para este backend |

---

## Pestaña HTTP genérico

Los backends HTTP genéricos se utilizan para enviar solicitudes a cualquier servicio HTTP, principalmente para llamar a APIs externas (como el servicio de análisis de documentos MinerU).

![Página de configuración del backend HTTP genérico](/img/docs/backends/backend-manager_generic-HTTP.png)

### Descripción de los campos

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Nombre a mostrar** | Sí | Nombre visible del backend |
| **URL base** | Sí | Dirección base del servicio HTTP |
| **Autenticación** | No | Selecciona `none` o `bearer` |
| **Token de autenticación** | No | Bearer Token (solo se rellena cuando la autenticación está configurada como bearer) |
| **Tiempo de espera** | No | Tiempo de espera de la solicitud (milisegundos) |

## Detección de capacidades del backend

Tras guardar un backend, el complemento detecta automáticamente las capacidades del backend en segundo plano:

- **ACP**: Verifica la disponibilidad del comando, la inicialización de la conexión, la lista de modelos, la lista de modos, y calcula una huella de configuración para detectar cambios posteriores
- **SkillRunner**: Verifica la disponibilidad de la API, la lista de motores, la lista de modelos
- **HTTP genérico**: Verifica la accesibilidad del endpoint HTTP

Los resultados de la detección se muestran como indicadores de estado del backend en el Dashboard y la barra lateral.

## Próximos pasos

Una vez completada la configuración, puedes:

- Usar el backend ACP en [ACP Chat](../sidebar/acp-chat) o [ACP Skills](../sidebar/acp-skills)
- Gestionar las ejecuciones de SkillRunner a través de la [Pestaña SkillRunner](../sidebar/skillrunner-tab)
- Usar los backends configurados para ejecutar tareas en la [Lista de Workflows](../workflows/) y el [Dashboard](../dashboard)
