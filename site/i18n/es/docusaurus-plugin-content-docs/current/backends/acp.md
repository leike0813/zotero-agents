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

**Usar npx** cambia el comando al formato `npx <package>` y muestra un aviso sobre la necesidad de instalar Node.js y npm. Codex, Claude Code, Factory Droid, Pi ACP y Amp ACP usan npx por defecto; los demás preajustes usan su comando instalado por defecto. Al activar npx, se añade el sufijo `(npm)` al nombre del perfil.

Al desactivar **Usar npx** se inicia el ejecutable nombrado del preajuste, que debe estar ya instalado (por ejemplo `gemini`, `copilot`, `opencode` o `kimi`). Los preajustes sin opción de npx usan siempre el CLI instalado: Hermes, Cursor nativo (`agent`), Mistral Vibe, OpenHands, Goose, Junie, Kiro CLI y Oh My Pi. Pi ACP y Amp ACP son adaptadores, por lo que los CLI subyacentes de Pi y Amp también deben estar instalados y autenticados. Oh My Pi está basado en Bun. Activar npx requiere Node.js y npm.

**Entorno aislado** solo está disponible para agentes que admiten aislamiento. Al activarlo, el complemento inyecta las variables de entorno de aislamiento documentadas o los argumentos de directorio de sesión en la vista previa, y muestra un aviso de que las opciones del agente y la autenticación deben gestionarse manualmente en ese directorio. Al activar el aislamiento, se añade el sufijo `(Isolated)` al nombre del perfil.

![Diálogo de preajustes ACP](/img/docs/backends/backend-manager_ACP-preset.png)

<!-- prettier-ignore -->
| Preajuste | Comando predeterminado | Descripción |
| --- | --- | --- |
| **OpenCode** | `opencode acp` | Backend ACP de OpenCode; inyecta `OPENCODE_CONFIG_CONTENT` para denegar las preguntas de permisos y admite aislamiento del directorio de configuración mediante `OPENCODE_CONFIG_DIR` |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | Adaptador ACP para OpenAI Codex |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | Adaptador ACP para Claude Code |
| **Gemini CLI** | `gemini --acp` | Modo ACP de Gemini CLI |
| **Hermes** | `hermes acp` | Backend ACP de Hermes Agent |
| **Qwen Code** | `qwen --acp` | Modo ACP de Qwen Code; admite aislamiento del directorio de configuración mediante `QWEN_HOME` |
| **GitHub Copilot** | `copilot --acp --stdio` | Modo ACP de GitHub Copilot CLI; admite aislamiento del directorio de configuración mediante `COPILOT_HOME` |
| **Qoder CLI** | `qoder --acp` | Modo ACP de Qoder CLI; admite aislamiento documentado del directorio de configuración mediante `QODER_CONFIG_DIR` |
| **Cursor Agent ACP** | `cursor-agent-acp` | Adaptador ACP de Cursor Agent; admite aislamiento documentado del directorio de sesión mediante `--session-dir` |
| **DeepAgents** | `deepagents-acp` | Adaptador ACP de DeepAgents |
| **Auggie** | `auggie --acp` | Modo ACP de Auggie |
| **Kilo** | `kilo acp` | Modo ACP de Kilo Code; inyecta `KILO_CONFIG_CONTENT` para denegar las preguntas de permisos, y se ha observado el aislamiento de las rutas XDG principales para configuración, datos/sesión/auth/log y caché |
| **Cline** | `cline --acp` | Modo ACP de Cline; admite aislamiento del directorio de configuración mediante `CLINE_DIR` |
| **CodeBuddy** | `codebuddy --acp` | Modo ACP de CodeBuddy; admite aislamiento del directorio de configuración mediante `CODEBUDDY_CONFIG_DIR` |
| **Grok** | `grok agent stdio` | Modo stdio de Grok Agent; admite aislamiento de home/configuración mediante `GROK_HOME` |
| **Cursor** | `agent acp` | Entrada ACP nativa de Cursor, distinta del adaptador Cursor Agent ACP; admite aislamiento del directorio de configuración mediante `CURSOR_CONFIG_DIR` |
| **Kimi Code** | `kimi acp` | Modo ACP de Kimi Code; admite aislamiento del directorio de configuración mediante `KIMI_CODE_HOME` |
| **MiniMax Code** | `mcode acp` | Modo ACP de MiniMax Code; al activar npx se selecciona explícitamente el ejecutable `mcode` de `@minimax-ai/code`, y el aislamiento usa `MINIMAX_DATA_DIR` |
| **Mistral Vibe** | `vibe-acp` | Modo ACP de Mistral Vibe; admite aislamiento de home/configuración mediante `VIBE_HOME` |
| **OpenHands** | `openhands acp` | Modo ACP de OpenHands; el aislamiento separa el almacenamiento de persistencia y de conversaciones mediante `OPENHANDS_PERSISTENCE_DIR` y `OPENHANDS_CONVERSATIONS_DIR` |
| **DeepSeek Harness** | `dsh --profile acp` | Modo ACP de DeepSeek Harness; admite aislamiento de home/configuración mediante `DSH_HOME` |
| **Factory Droid** | `npx -y droid@latest exec --output-format acp-daemon` | Modo demonio ACP de Factory Droid; desactiva la actualización automática de Droid mediante `DROID_DISABLE_AUTO_UPDATE` y `FACTORY_DROID_AUTO_UPDATE_ENABLED` |
| **Goose** | `goose acp` | Modo ACP de Goose; admite aislamiento de la raíz de rutas mediante `GOOSE_PATH_ROOT` |
| **Junie** | `junie --acp=true` | Modo ACP de Junie; admite aislamiento de home/configuración mediante `JUNIE_HOME` |
| **Kiro CLI** | `kiro-cli acp` | Modo ACP de Kiro CLI |
| **Pi ACP** | `npx -y pi-acp@latest` | Adaptador Pi ACP; requiere el CLI del agente de programación Pi y admite aislamiento del directorio de configuración mediante `PI_CODING_AGENT_DIR` |
| **Amp ACP** | `npx -y amp-acp@latest` | Adaptador Amp ACP; requiere el CLI de Amp, y el aislamiento solo traslada el estado de hilos/sesiones del adaptador mediante `AMP_ACP_STATE_DIR` |
| **Oh My Pi** | `omp acp` | Modo ACP de Oh My Pi; requiere Bun y solo se ofrece como comando instalado |

Solo se han probado OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code y Hermes Agent. La disponibilidad de otros backends ACP depende de sus implementaciones y este complemento no la garantiza. Si encuentras problemas, puedes ajustar manualmente los argumentos del comando y las variables de entorno; consulta el protocolo ACP y la documentación oficial del backend como referencia.

Tras seleccionar un preajuste, puedes seguir modificando manualmente cualquier campo.

## Recomendaciones de configuración de variables de entorno

Algunos agentes permiten el aislamiento de configuración y la persistencia de sesiones mediante variables de entorno o argumentos de comando. Los preajustes con **Entorno aislado** activado inyectan los valores documentados automáticamente; para perfiles manuales, añade los valores correspondientes tú mismo:

El aislamiento solo traslada las raíces de sistema de archivos declaradas. El aislamiento de Amp ACP solo afecta al estado de hilos/sesiones del adaptador, mientras que la configuración y las credenciales de Amp se configuran de forma independiente. El aislamiento nativo de Cursor afecta al directorio de configuración de Cursor, distinto del directorio de sesiones del adaptador `cursor-agent-acp`. La caché propia de Copilot y el llavero de Goose permanecen fuera de las rutas inyectadas.

Los preajustes OpenCode y Kilo también inyectan siempre una configuración de permisos en línea: `OPENCODE_CONFIG_CONTENT` y `KILO_CONFIG_CONTENT` respectivamente, ambos con el valor `{"permission":{"question":"deny"}}`. Puedes editar o eliminar estos valores después de añadir el preajuste.

<!-- prettier-ignore -->
| Ajuste | Agente | Propósito |
| --- | --- | --- |
| `OPENCODE_CONFIG_DIR` | OpenCode | Especificar un directorio de configuración independiente |
| `CODEX_HOME` | Codex | Especificar un directorio home/configuración independiente |
| `CLAUDE_CONFIG_DIR` | Claude Code | Especificar un directorio de configuración independiente |
| `GEMINI_CLI_HOME` | Gemini CLI | Especificar un directorio de configuración independiente |
| `HERMES_HOME` | Hermes Agent | Especificar un directorio home/configuración independiente |
| `QODER_CONFIG_DIR` | Qoder CLI | Especificar un directorio de configuración independiente |
| `QWEN_HOME` | Qwen Code | Especificar un directorio home/configuración independiente |
| `COPILOT_HOME` | GitHub Copilot | Especificar un directorio de configuración independiente; la caché propia de Copilot permanece fuera de esta ruta |
| `CLINE_DIR` | Cline | Especificar un directorio de configuración independiente |
| `CODEBUDDY_CONFIG_DIR` | CodeBuddy | Especificar un directorio de configuración independiente |
| `GROK_HOME` | Grok | Especificar un directorio home/configuración independiente |
| `CURSOR_CONFIG_DIR` | Cursor (ACP nativo) | Especificar un directorio de configuración independiente |
| `KIMI_CODE_HOME` | Kimi Code | Especificar un directorio home/configuración independiente |
| `MINIMAX_DATA_DIR` | MiniMax Code | Especificar un directorio de datos independiente |
| `VIBE_HOME` | Mistral Vibe | Especificar un directorio home/configuración independiente |
| `OPENHANDS_PERSISTENCE_DIR`, `OPENHANDS_CONVERSATIONS_DIR` | OpenHands | Especificar una raíz de persistencia independiente y su almacenamiento de conversaciones (`<root>/conversations`) |
| `DSH_HOME` | DeepSeek Harness | Especificar un directorio home/configuración independiente |
| `GOOSE_PATH_ROOT` | Goose | Especificar una raíz de rutas independiente; el llavero de Goose permanece fuera de esta ruta |
| `JUNIE_HOME` | Junie | Especificar un directorio home/configuración independiente |
| `PI_CODING_AGENT_DIR` | Pi ACP | Especificar un directorio de configuración independiente del agente de programación Pi |
| `AMP_ACP_STATE_DIR` | Amp ACP | Trasladar solo el estado de hilos/sesiones del adaptador; la configuración y las credenciales de Amp se configuran de forma independiente |
| `--session-dir <path>` | Cursor Agent ACP | Especificar un directorio de persistencia de sesiones independiente |
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | Kilo | Especificar raíces XDG independientes para configuración, datos/sesión/auth/log y estado de caché. Esto cubre las rutas principales observadas, pero no demuestra que cada subcomando o complemento de Kilo evite los directorios globales. |

## Opciones de modelos gratuitos

Varios motores ofrecen **acceso gratuito a modelos** — ideal para empezar sin pagar:

| Motor                     | Opción gratuita                 | Cómo funciona                                                                                                                                                                        |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kilo Code**             | Modo Auto Free                  | El modo Auto Free integrado de Kilo Code enruta automáticamente cada solicitud a un modelo gratuito adecuado. Actívelo en la configuración de Kilo Code — no se requiere clave API   |
| **OpenCode Zen**          | Modelos gratuitos integrados    | La edición [OpenCode Zen](https://opencode.ai/zen) incluye acceso gratuito a modelos sin necesidad de suscripción API                                                                |
| **OpenCode + OpenRouter** | Modelos gratuitos de OpenRouter | Configure OpenCode para usar [OpenRouter](https://openrouter.ai/) y seleccione modelos gratuitos (p. ej., Gemini 2.5 Flash, DeepSeek V3). Requiere una cuenta gratuita de OpenRouter |

### Limitaciones de la versión gratuita

Los modelos gratuitos son suficientes para un uso ocasional, pero tenga en cuenta las siguientes restricciones:

| Limitación                    | Qué esperar                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Límite de velocidad**       | Las solicitudes pueden ser limitadas — típicamente 5–20 solicitudes por minuto según la carga del proveedor. El procesamiento por lotes se ralentiza considerablemente |
| **Concurrencia**              | Generalmente limitado a una sola solicitud simultánea. Ejecutar varios flujos de trabajo a la vez puede ponerlos en cola o fallar                                      |
| **Disponibilidad del modelo** | Los grupos de modelos gratuitos pueden agotarse en horas pico. Pueden aparecer errores de «modelo no disponible» o «capacidad excedida»                                |
| **Rotación de modelos**       | Los proveedores pueden cambiar silenciosamente los modelos gratuitos (mejora o degradación) sin previo aviso. La calidad de salida puede variar entre ejecuciones      |
| **Sin SLA / Fiabilidad**      | Los niveles gratuitos no ofrecen garantía de disponibilidad. Los servicios pueden estar temporalmente no disponibles o ser descontinuados                              |

> Si necesita procesamiento por lotes fiable o uso en producción, considere un plan de pago como [OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW) ($10/mes) o un Coding Plan (Bailian, Zhipu, etc.). El costo por artículo es insignificante comparado con el tiempo ahorrado.

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
