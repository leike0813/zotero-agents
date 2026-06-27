# Configuración del backend ACP

## ¿Qué es ACP?

ACP (Agent Client Protocol) es un protocolo para comunicarse con backends de agentes. Zotero Agents se comunica con procesos de agente que se ejecutan localmente (como Codex, Claude Code, OpenCode, etc.) a través del protocolo ACP para permitir conversaciones y la ejecución de skills.

El backend ACP es el método de configuración **recomendado** — siempre que tengas cualquier herramienta de agente compatible con ACP instalada en tu máquina, puedes usarla directamente sin configuración adicional.

## ¿Nuevo en Agent?

Si eres nuevo en herramientas de agente y no estás seguro de cuál elegir o cómo instalar, consulta esta guía:

**[Guía de inicio de Agent](https://agent.ps5.online)**

## ¿Por qué ACP primero?

- **Cero carga de configuración**: No es necesario desplegar servicios adicionales; utiliza las herramientas de agente que ya tienes en tu máquina
- **Gestión automática de procesos**: El complemento especifica el comando de inicio en la configuración y gestiona automáticamente el ciclo de vida del proceso del agente
- **Soporte multi-agente**: Configura múltiples backends de agente diferentes simultáneamente y cambia entre ellos según sea necesario
- **Aislamiento de configuración**: Algunos agentes (como OpenCode y Codex) permiten aislar los directorios de configuración y de persistencia de sesiones mediante variables de entorno

## Pasos de configuración

1. Asegúrate de tener al menos una herramienta CLI de agente compatible con ACP instalada en tu máquina
2. Abre **Herramientas → [Backend Manager](backend-manager)**
3. Cambia a la pestaña **ACP**
4. Selecciona tu herramienta de agente en el desplegable **Añadir desde preajuste**, o haz clic en **Añadir ACP** para configurar manualmente
5. Rellena los siguientes campos:
   - **Nombre a mostrar**: Un nombre descriptivo (ej., "Mi OpenCode")
   - **Comando**: Comando para iniciar el backend ACP (los preajustes se rellenan automáticamente, pero también puedes modificarlo manualmente)
   - **Argumentos**: Argumentos adicionales para el comando (opcional)
   - **Variables de entorno**: Variables de entorno adicionales (opcional, utilizadas para aislamiento de configuración, etc.)
6. Haz clic en **Guardar** en la esquina inferior derecha

### Verificación de la conexión

Tras guardar, el complemento detecta automáticamente las capacidades del backend:
- Verifica si el comando existe
- Conecta e inicializa
- Obtiene los modelos y modos disponibles
- Calcula una huella de configuración para detectar cambios posteriores

Si la detección falla, verifica que el CLI del agente esté instalado correctamente y que el formato del comando sea correcto.

## Preajustes de agente admitidos

El complemento proporciona varios preajustes integrados. Tras hacer clic en **Añadir desde preajuste**, selecciona un agente a la izquierda; a la derecha se muestran las opciones de inicio y una vista previa de configuración de solo lectura.

**Usar npx** cambia el comando al formato `npx <package>` y muestra un aviso sobre la necesidad de instalar Node.js y npm. Codex y Claude Code usan npx por defecto, ya que dependen del adaptador ACP; los demás agentes usan el comando directo por defecto. Al activar npx, se añade el sufijo `(npm)` al nombre del perfil.

**Entorno aislado** solo está disponible para agentes que admiten aislamiento. Al activarlo, el complemento inyecta las variables de entorno de aislamiento documentadas o los argumentos de directorio de sesión en la vista previa, y muestra un aviso de que las opciones del agente y la autenticación deben gestionarse manualmente en ese directorio. Al activar el aislamiento, se añade el sufijo `(Isolated)` al nombre del perfil.

![Diálogo de preajustes ACP](/img/docs/backends/backend-manager_ACP-preset.png)

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

Solo se han probado OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code y Hermes Agent. La disponibilidad de otros backends ACP depende de sus implementaciones y este complemento no la garantiza. Si encuentras problemas, puedes ajustar manualmente los argumentos del comando y las variables de entorno; consulta el protocolo ACP y la documentación oficial del backend como referencia.

Tras seleccionar un preajuste, puedes seguir modificando manualmente cualquier campo.

## Recomendaciones de configuración de variables de entorno

Algunos agentes permiten el aislamiento de configuración y la persistencia de sesiones mediante variables de entorno; simplemente añádelas en el editor de variables de entorno:

| Variable de entorno | Agente | Propósito |
|---------------------|--------|-----------|
| `OPENCODE_CONFIG` | OpenCode | Especificar un directorio de configuración independiente |
| `OPENCODE_SESSION_DIR` | OpenCode | Especificar un directorio de persistencia de sesiones |
| `CODEX_CONFIG_DIR` | Codex | Especificar un directorio de configuración independiente |

## Tipos de solicitud

El backend ACP admite dos tipos de solicitud:
- `acp.prompt.v1` — Interacción conversacional (ACP Chat)
- `acp.skill.run.v1` — Ejecución de skills (ACP Skills)

El mismo backend ACP puede utilizarse tanto para conversaciones como para ejecuciones de skills simultáneamente.

## Gestión de sesiones

- Cada backend puede tener múltiples sesiones (conversaciones), que se almacenan de forma persistente en la base de datos del complemento
- Diferentes backends ACP pueden ejecutarse simultáneamente sin interferir entre sí
- Las sesiones pueden gestionarse en [ACP Chat](../sidebar/acp-chat)

## Próximos pasos

Una vez completada la configuración, puedes:
- Chatear con el backend en [ACP Chat en la barra lateral](../sidebar/acp-chat)
- Ver las ejecuciones de skills ACP en el [Dashboard](../dashboard)
- Usar el backend ACP para ejecutar tareas en la [Lista de Workflows](../workflows/)
