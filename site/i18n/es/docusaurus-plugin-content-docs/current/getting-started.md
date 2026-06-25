# Primeros pasos

## 1. Instalar paquetes de flujo de trabajo oficiales

El complemento en sí no contiene lógica de negocio. Después de instalar el complemento, primero necesitas instalar los paquetes de flujo de trabajo oficiales:

1. Haz clic derecho en cualquier elemento de Zotero → **Zotero Agents** → **📦 Install Official Workflow Packages**
2. Espera a que se complete la descarga e instalación
3. Después de una instalación exitosa, todos los flujos de trabajo oficiales serán visibles en el Dashboard

También puedes instalar o actualizar los paquetes oficiales en cualquier momento desde **Zotero → Settings → Zotero Agents**.

## 2. Configurar un backend

### Backend ACP (recomendado)

Este es el enfoque más recomendado — siempre que tengas cualquier herramienta de agente compatible con ACP instalada en tu máquina, no requiere configuración adicional.

1. Abre **Tools → [Backend Manager](backends/backend-manager)**
2. Cambia a la pestaña **ACP**
3. Selecciona tu herramienta de agente en el menú desplegable **Add from Preset** (Codex / OpenCode / Claude Code, etc.)
4. El preset autocompleta el comando; haz clic en **Save** en la esquina inferior derecha

**¿Es la primera vez que usas una herramienta de agente?** Consulta la documentación oficial de la herramienta correspondiente para la instalación:

| Agente | Guía de instalación |
|--------|---------------------|
| **OpenCode** | [Documentación de opencode.ai](https://opencode.ai/docs) |
| **Codex** | [Documentación de OpenAI Codex](https://platform.openai.com/docs) |
| **Claude Code** | [Documentación de Anthropic](https://docs.anthropic.com/en/docs/claude-code) |
| **Gemini CLI** | [Documentación de Google](https://github.com/google-gemini/gemini-cli) |
| **Qwen Code** | [Documentación de Alibaba Cloud](https://help.aliyun.com/zh/model-studio/qwen-code) |

→ Consulta [Configuración del backend ACP](backends/acp) para más detalles

### Backend MineRU (para análisis de PDF)

El flujo de trabajo MineRU puede convertir PDFs a Markdown, convirtiéndolo en el paso de preprocesamiento ideal para todo análisis de literatura posterior. La configuración es sencilla:

1. Visita [mineru.net](https://mineru.net) para registrar una cuenta y obtener un API Token desde **API → API Management**
2. Abre **Tools → [Backend Manager](backends/backend-manager)**
3. Cambia a la pestaña **Generic HTTP**, haz clic en **Add Generic HTTP**
4. Completa: Display Name `MinerU Official` · Base URL `https://mineru.net` · Authentication `bearer` · Auth Token: pega tu API Token · Timeout `60000`
5. Haz clic en **Save** en la esquina inferior derecha

→ Consulta la [Guía de uso de MineRU](workflows/mineru) para más detalles

### Alternativa: Skill-Runner desplegado con Docker

Si necesitas ejecución persistente en segundo plano o compartición en red local, puedes [desplegar Skill-Runner con Docker](backends/skill-runner#recommended-docker-persistent-deployment). Después del despliegue, añade una instancia de backend en la pestaña SkillRunner.

> Para instrucciones de operación detalladas, consulta [Backend Manager](backends/backend-manager).

## 3. Flujo de trabajo completo

A continuación se presenta un flujo de trabajo completo de principio a fin. Se recomienda probar cada paso en orden. Primero, selecciona un artículo con un archivo adjunto PDF de tu biblioteca.

### Paso 1: PDF → Markdown (MineRU)

Haz clic derecho en este artículo (o directamente en su archivo adjunto PDF) y selecciona **Zotero Agents → MinerU**. Después de una breve espera, se generará un archivo `.md` con el contenido del artículo en el mismo directorio que el PDF.

### Paso 2: Probar el lector de Markdown integrado

Busca el archivo `.md` recién generado en la lista de adjuntos de Zotero y **haz doble clic para abrirlo en el lector integrado** — con navegación por esquema, búsqueda, renderizado de fórmulas matemáticas y resaltado de sintaxis de código. Si prefieres no usar el lector integrado, puedes desactivarlo en Preferencias y volver al abridor predeterminado del sistema.

→ Consulta [Lector de Markdown integrado](markdown-reader) para más detalles

### Paso 3: Ejecutar análisis de literatura

Haz clic derecho en este artículo (o directamente en el archivo adjunto `.md`) y selecciona **Zotero Agents → Literature Analysis**. El agente generará automáticamente tres artefactos; al completar, aparecerán tres adjuntos de nota bajo el elemento:

| Nota | Contenido |
|------|-----------|
| **Digest** | Resumen del artículo — contexto de investigación, métodos, resultados y conclusiones |
| **References** | Referencias estructuradas — lista de citas en formato tabular |
| **Citation Analysis** | Informe de análisis de citas — contexto de citación y clasificación de intenciones de cita |

→ Consulta [Literature Analysis](workflows/literature-analysis) para más detalles

### Paso 4: Literature Explainer interactivo

Si tienes alguna pregunta sobre este artículo, haz clic derecho y selecciona **Zotero Agents → Literature Explainer**. La barra lateral abrirá automáticamente el panel de chat, donde puedes conversar libremente con el agente sobre el contenido del artículo. Las respuestas del agente pasan por una puerta de verificación, así que no necesitas preocuparte por la fabricación. Después de la conversación, el registro de preguntas y respuestas se generará como notas de estudio.

→ Consulta [Literature Explainer](workflows/literature-explainer) para más detalles

### Paso 5: Lectura profunda

Cuando necesites leer de manera exhaustiva y sistemática un artículo importante, haz clic derecho y selecciona **Zotero Agents → Deep Reading**. El agente producirá un documento HTML independiente y pulido — incluyendo análisis de secciones, conceptos clave, referencias y traducciones bilingües. Enriquecido con la información de tu biblioteca (si está disponible), este documento también llevará el contexto de investigación más amplio, conceptos relacionados y preguntas clave.

→ Consulta [Deep Reading](workflows/literature-deep-reading) para más detalles

### Paso 6: Topic Synthesis — De artículos individuales a la visión global

Una vez que tu biblioteca haya alcanzado un tamaño considerable y los artículos relevantes hayan pasado por análisis de literatura y normalización de etiquetas, puedes crear una Topic Synthesis.

Ejecuta **Create Topic Synthesis** desde el Dashboard, introduce una descripción de tu dirección de investigación, y el agente identificará automáticamente los artículos relevantes en tu biblioteca y generará un informe de síntesis extremadamente riguroso, preciso y completo. Este informe está escrito enteramente basándose en el contenido de tu biblioteca, mucho más preciso y fiable que las respuestas genéricas de IA.

→ Consulta [Topic Synthesis](workflows/topic-synthesis) para más detalles

## Siguientes pasos

- **Procesamiento por lotes**: Ejecuta [Literature Analysis](workflows/literature-analysis) en artículos de tu biblioteca de forma masiva para construir la base de Synthesis
- **Sistema de etiquetas**: Usa [Tag Bootstrapper](workflows/tag-bootstrapper) para crear un vocabulario controlado y estandarizar tus metadatos
- **Exploración de grafos**: Visualiza tu red de citaciones en el [Synthesis Workbench](synthesis)
- **Desarrollo personalizado**: Consulta [Custom Workflows](workflows/custom/) para crear tus propios flujos de trabajo
- **Reportar problemas**: Reporta problemas en [GitHub](https://github.com/leike0813/zotero-agents/issues) o [Gitee](https://gitee.com/leike0813/zotero-agents/issues)
