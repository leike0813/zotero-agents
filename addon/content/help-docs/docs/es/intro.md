# Zotero Agents

Un complemento de Zotero para ejecutar skills de agentes.

<figure class="zs-doc-figure zs-doc-figure--poster"><img src="chrome://zotero-skills/content/help-docs/assets/img/poster.webp" alt="Póster del banco de trabajo de investigación Zotero Agents" title="Póster del banco de trabajo de investigación Zotero Agents" loading="lazy" /><figcaption>Póster del banco de trabajo de investigación Zotero Agents</figcaption></figure>

## ¿Qué es Zotero Agents?

Zotero Agents convierte Zotero en un banco de trabajo personal de investigación para la era de los agentes inteligentes. Conecta tu biblioteca de literatura, backends de agentes, flujos de trabajo, grafos de conocimiento y herramientas externas, transformando el análisis de literatura de preguntas y respuestas puntuales en un proceso de investigación sostenible, auditable y extensible.

La primera capa de capacidad son los **flujos de trabajo conectables**. Los investigadores pueden descomponer tareas complejas de literatura en procesos reutilizables: análisis de artículos, lectura profunda, análisis de citas, normalización de etiquetas, búsqueda de literatura, síntesis temática, generación de material de revisión y más. Los flujos de trabajo pueden conectarse a diferentes backends de agentes o servicios, aprovechando la comprensión de contexto extenso de los agentes, la invocación de herramientas y el razonamiento multi-paso para automatizar flujos de trabajo de gestión y análisis de literatura que, de otro modo, requerirían operaciones manuales repetitivas, y para expandirse a medida que evolucionan las necesidades de investigación.

La segunda capa es la **Barra lateral de asistencia**. Proporciona una experiencia de interacción conversacional al estilo de los agentes de codificación, soportando conexiones a diversos backends de agentes mediante el protocolo ACP, así como la ejecución de flujos de trabajo específicos a través del backend Skill-Runner. Puedes pedir a los agentes que respondan preguntas, analicen artículos, busquen trabajos relacionados, añadan referencias a tu biblioteca basándose en el elemento actual, la literatura seleccionada o toda la biblioteca, y continuar conversaciones, confirmaciones, correcciones y seguimiento del progreso durante tareas de larga duración.

La tercera capa es el **Synthesis Workbench**. Está orientado a la construcción de conocimiento a nivel de biblioteca y a largo plazo, consolidando resúmenes, referencias, semántica de citas, etiquetas, conceptos y relaciones temáticas generadas a partir de análisis de artículos individuales en una plataforma de conocimiento unificada. Los investigadores pueden gestionar redes de referencias aquí, revisar coincidencias de citas, explorar grafos de citación, organizar literatura en torno a temas y usar Topic Synthesis para elaborar la literatura fundacional, el trabajo de vanguardia, los argumentos clave, los desacuerdos metodológicos, las lagunas de cobertura y las direcciones futuras de un área de investigación. Su objetivo es transformar la lectura extensiva en material estructurado adecuado para revisiones, propuestas de tesis, introducciones de artículos y diseño de hojas de ruta de investigación.

La cuarta capa es el **Host Bridge**. A través del CLI y servicio MCP `zotero-bridge`, los agentes externos pueden interactuar directamente con la biblioteca Zotero: leer contexto de literatura, buscar elementos, añadir nuevas referencias, invocar tareas de análisis y escribir resultados estructurados. Con flujos de trabajo de agentes como OpenClaw y Hermes, puedes delegar la búsqueda, filtrado, análisis, resumen y redacción de revisiones de literatura, permitiendo que las tareas de investigación de larga duración avancen continuamente en segundo plano.

El valor central de Zotero Agents es convertir la biblioteca Zotero en un entorno de investigación donde los agentes pueden trabajar de forma genuina. Cada lectura, análisis, revisión y paso de preparación de escritura puede acumularse como conocimiento para la siguiente fase de investigación.

> **Versiones de Zotero soportadas**: Este complemento soporta Zotero 7 y Zotero 9. El desarrollo y las pruebas principales se realizan en Zotero 9. Zotero 8 está teóricamente soportado en su totalidad (el marco de complementos no ha cambiado entre 8/9). Zotero 7 también debería funcionar en teoría, pero no ha sido probado exhaustivamente; el mantenimiento futuro se centrará en Zotero 9. Los usuarios de Zotero 7 que encuentren problemas deben reportarlos en [Issues](https://github.com/leike0813/zotero-agents/issues).

:::tip Consejo
El complemento se distribuye **sin lógica de negocio integrada**. Todos los flujos de trabajo se proporcionan a través de **paquetes de flujo de trabajo oficiales** separados que los usuarios deben descargar e instalar después de instalar el complemento. Consulta la [Guía de instalación](#doc/installation) para más detalles.
:::

## Características

- **⚙️ Gestión de backends** — Soporta tipos de backend ACP, Skill-Runner y Generic HTTP
- **🔧 Sistema de flujos de trabajo** — Define pipelines de procesamiento automatizado multi-paso
- **📊 Dashboard** — Supervisa el estado de tareas, navega el historial e inspecciona registros
- **🖥️ Panel lateral** — Interactúa con los backends sin salir de tu contexto de trabajo actual
- **📖 Lector de Markdown integrado** — Haz doble clic en archivos adjuntos `.md` para abrirlos en Zotero, con esquema, búsqueda, renderizado matemático y resaltado de código
- **💬 ACP Chat** — Conversación con IA usando literatura como contexto
- **🔬 Synthesis Workbench** — Plataforma de análisis profundo de literatura
- **🏷️ Gestión de etiquetas** — Vocabulario controlado de etiquetas y etiquetado automático
- **📈 Grafo de citaciones** — Visualización y análisis de relaciones de citación
- **📝 Topic Synthesis** — Análisis temático automatizado y generación de informes

## Enlaces rápidos

- [Guía de instalación](#doc/installation) — Instala el complemento y sus dependencias
- [Primeros pasos](#doc/getting-started) — Configura tu primer backend y ejecuta un skill
- [Configuración de backends](#doc/backends%2Findex) — Conoce los tres tipos de backend soportados

## Documentación

| Sección | Descripción |
|---------|-------------|
| [Guía de instalación](#doc/installation) | Instalación del complemento, instalación de paquetes de flujo de trabajo oficiales, despliegue del backend Skill-Runner |
| [Lector de Markdown integrado](#doc/markdown-reader) | Haz doble clic en archivos `.md` para abrirlos en Zotero, con esquema, búsqueda y renderizado matemático |
| [Configuración de backends](#doc/backends%2Findex) | Guía de configuración para backends ACP, Skill-Runner y Generic HTTP |
| [Workflow](#doc/workflows%2Findex) | Introducción a flujos de trabajo y guía de invocación |
| [Dashboard](#doc/dashboard) | Guía de uso del panel de monitoreo central |
| [Barra lateral y ACP Chat](#doc/sidebar%2Findex) | Panel lateral y funciones de conversación |
| [Synthesis Workbench](#doc/synthesis%2Findex) | Guía de uso del banco de trabajo de síntesis |
| [Preferencias](#doc/preferences) | Referencia de configuración del complemento |

## Recursos del proyecto

- [Repositorio en GitHub](https://github.com/leike0813/zotero-agents)
- [Seguimiento de incidencias](https://github.com/leike0813/zotero-agents/issues)
- [Espejo en Gitee](https://gitee.com/leike0813/zotero-agents)
