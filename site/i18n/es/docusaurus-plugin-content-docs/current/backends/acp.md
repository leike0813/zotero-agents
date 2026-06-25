# Configuración del backend ACP

## ¿Qué es ACP?

ACP (Agent Client Protocol) es un protocolo para comunicarse con backends de agentes. Zotero Agents se comunica con procesos de agente que se ejecutan localmente (como Codex, Claude Code, OpenCode, etc.) a través del protocolo ACP para permitir conversaciones y la ejecución de skills.

El backend ACP es el método de configuración **recomendado** — siempre que tengas cualquier herramienta de agente compatible con ACP instalada en tu máquina, puedes usarla directamente sin configuración adicional.

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

El complemento proporciona varios preajustes incorporados que puedes seleccionar directamente en el desplegable **Añadir desde preajuste**:

| Preajuste | Comando | Descripción |
|-----------|---------|-------------|
| **Codex** | `npx codex acp` | Agente de codificación oficial de OpenAI |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` | CLI oficial de Anthropic |
| **OpenCode** | `npx opencode-ai@latest acp` | Framework de agente de propósito general con soporte para aislamiento mediante variables de entorno |
| **Gemini CLI** | `npx @google/gemini-cli acp` | Google Gemini |
| **Hermes** | `npx hermes acp` | Hermes Agent |
| **Qwen Code** | `qwen-code acp` | Qwen Code |

Puedes seguir modificando manualmente cualquier campo después de seleccionar un preajuste.

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
