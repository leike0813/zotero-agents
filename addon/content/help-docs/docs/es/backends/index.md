# Descripción general de la configuración de backends

Zotero Agents admite tres tipos de backend, cada uno adecuado para distintos casos de uso.

## Cómo elegir

### 🥇 Primera opción: Backend ACP

Si ya tienes instalada en tu máquina alguna herramienta de agente compatible con ACP (Codex, Claude Code, OpenCode, Hermes Agent, OpenClaw, Qwen Code, etc.), puedes utilizar el backend ACP directamente. **Cero carga de configuración adicional** — simplemente selecciona el agente correspondiente en la lista de preajustes del Backend Manager, y el complemento gestiona automáticamente el ciclo de vida del proceso.

Algunos agentes (como OpenCode y Codex) también permiten aislar los directorios de configuración y de persistencia de sesiones mediante variables de entorno, lo que facilita la gestión de múltiples contextos de trabajo.

→ [Configuración del backend ACP](#doc/backends%2Facp)

### 🥈 Segunda opción: Skill-Runner desplegado con Docker

Si necesitas **ejecución persistente en segundo plano** (las tareas continúan ejecutándose después de cerrar Zotero, y puedes reanudarlas u obtener los resultados en el siguiente inicio), o tienes la capacidad de configurar un servidor en tu red local, se recomienda desplegar Skill-Runner con Docker como servicio persistente.

Un Skill Runner desplegado con Docker funciona independientemente de Zotero y admite compartición multiusuario, interfaz web de gestión, gestión de motores y más.

→ [Despliegue y configuración de Skill-Runner](#doc/backends%2Fskill-runner)

### 🥉 Solo en emergencias: Despliegue local de Skill-Runner con un clic

Esto solo es adecuado para usuarios que **no saben cómo instalar y configurar herramientas de agente y no pueden usar Docker**. El despliegue con un clic se inicia y se detiene junto con el complemento — al cerrar Zotero se terminan todas las tareas, y no hay ejecución en segundo plano. Si tienes capacidad para instalar agentes o usar Docker, por favor prefiere las dos opciones anteriores.

→ [Despliegue y configuración de Skill-Runner](#doc/backends%2Fskill-runner)

### HTTP genérico

Se utiliza para llamar a APIs HTTP específicas (como el servicio de análisis de documentos MinerU) que no implican la ejecución de modelos de IA. Configurar según necesidad.

→ [Configuración del backend HTTP genérico](#doc/backends%2Fgeneric-http)

## Comparación de tipos de backend

| Tipo | Protocolo | Modo de ejecución | Recomendación | Caso de uso |
|------|-----------|-------------------|---------------|-------------|
| **Backend ACP** | Agent Client Protocol | Subproceso local | 🥇 Primera opción | Tienes una herramienta de agente ACP, cero carga de configuración |
| **Skill-Runner (Docker)** | HTTP API | Servicio persistente | 🥈 Recomendado | Necesitas ejecución persistente en segundo plano, compartición en red local |
| **Skill-Runner (Un clic)** | HTTP API | Se inicia/detiene con el complemento | 🥉 Emergencia | No puedes instalar agentes / Docker en absoluto |
| **HTTP genérico** | HTTP | Servicio remoto | Según necesidad | Llamada a APIs HTTP específicas (ej., MinerU) |

Todos los backends se configuran a través de **[Herramientas → Backend Manager](#doc/backends%2Fbackend-manager)**.

## Próximos pasos

- [Configuración del backend ACP](#doc/backends%2Facp)
- [Despliegue y configuración de Skill-Runner](#doc/backends%2Fskill-runner)
- [Configuración del backend HTTP genérico](#doc/backends%2Fgeneric-http)
- [Guía de uso del Backend Manager](#doc/backends%2Fbackend-manager)
