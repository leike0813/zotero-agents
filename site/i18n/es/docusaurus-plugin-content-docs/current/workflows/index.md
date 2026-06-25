# Descripción general de los flujos de trabajo

## ¿Qué es un flujo de trabajo?

Los flujos de trabajo son la funcionalidad principal de Zotero Agents, que permiten combinar múltiples pasos de habilidades en pipelines de procesamiento automatizado. Un flujo de trabajo define una tarea completa: desde la recepción de datos de entrada, el procesamiento de información, hasta la generación de resultados.

## Estructura del flujo de trabajo

```
workflow.json (archivo de manifiesto)
├── manifest: declara metadatos, versión, nombre
├── parameters: define parámetros configurables
├── inputs: define tipos de entrada (adjuntos, elementos, notas, etc.)
├── hooks: scripts de hooks en JavaScript (filtrar entradas, construir solicitudes, aplicar resultados)
└── provider: especifica el tipo de backend requerido
```

### Tipos de unidades de entrada

| Tipo | Descripción |
|------|------|
| `attachment` | Archivos adjuntos de un elemento |
| `parent` | Elemento padre del elemento seleccionado |
| `note` | Elemento de nota |
| `workflow` | Ámbito de procesamiento por lotes |

### Sistema de hooks

Los flujos de trabajo pueden ejecutar scripts personalizados de JavaScript en varias etapas de la ejecución:

- **filterInputs**: Filtrar y seleccionar entradas
- **buildRequest**: Construir el contenido de la solicitud enviada al backend
- **normalizeSettings**: Normalizar la configuración del usuario
- **applyResult**: Aplicar los resultados devueltos por el backend a Zotero

## Tres backends de ejecución

Los flujos de trabajo se pueden ejecutar a través de tres tipos de backend:

| Backend | Tipo de solicitud | Caso de uso |
|---------|-------------------|-------------|
| **Skill-Runner** | `skill.run.v1` | Ejecución general de habilidades, admite modo interactivo |
| **ACP** | `acp.skill.run.v1` | Ejecución de habilidades a través del backend ACP |
| **Generic HTTP** | `generic-http.request.v1` | Llamadas a API HTTP |

## Paquete oficial de flujos de trabajo

Los flujos de trabajo oficiales se publican e instalan como **paquetes independientes**, desacoplados del propio complemento. Métodos de instalación:

- Menú contextual → **Zotero Agents** → **📦 Instalar paquete oficial de flujos de trabajo**
- Hacer clic en **Instalar paquete oficial de flujos de trabajo** en Preferencias

Los paquetes oficiales admiten tres canales de actualización: estable / beta / dev. El complemento busca actualizaciones automáticamente al iniciarse.

## Flujos de trabajo oficiales

El complemento incluye una serie de flujos de trabajo oficiales, agrupados por función:

### 📚 Kit de herramientas de análisis de literatura

| Flujo de trabajo | Propósito | Entrada | Backend | Docs |
|------------------|-----------|---------|---------|------|
| **Literature Analysis** ⭐ | Generar resumen, referencias y análisis de citas a partir de PDF/MD. Puede desencadenar la regulación de etiquetas | Adjunto | Skill-Runner | [Detalles](literature-analysis) |
| **Interactive Literature Explainer** | Diálogo multifase con IA para comprender la literatura en profundidad, con respuestas verificadas para evitar alucinaciones | Adjunto | Skill-Runner | [Detalles](literature-explainer) |
| **Deep Reading** | Generar una vista HTML estructurada de lectura profunda con soporte de traducción | Adjunto | ACP | [Detalles](literature-deep-reading) |
| **Literature Search & Ingest** | Permitir que el agente busque literatura académica y la incorpore directamente en Zotero | workflow | ACP | [Detalles](literature-search-ingest) |
| **Tag Bootstrapper** | Crear interactivamente un vocabulario de etiquetas controlado para un dominio de investigación | workflow | Skill-Runner | [Detalles](tag-bootstrapper) |
| **Tag Regulator** | Normalizar etiquetas según un vocabulario controlado e inferir nuevas etiquetas | Elemento padre | Skill-Runner | [Detalles](tag-regulator) |
| **Export/Import Notes** | Exportar o importar notas de análisis con soporte para edición y reimportación | Elemento padre | No requiere backend | [Detalles](export-import-notes) |

### 🛠️ Utilidades

| Flujo de trabajo | Propósito | Entrada | Backend | Docs |
|------------------|-----------|---------|---------|------|
| **MinerU PDF Parsing** | Llamar al servicio MinerU para analizar PDF en Markdown | Adjunto | Generic HTTP | [Detalles](mineru) |
| **Topic Synthesis** | Pipeline de tres pasos para crear análisis e informes de síntesis temática | workflow | ACP | [Detalles](topic-synthesis) |
| **Manuscript Literature Framing** | Generar borradores LaTeX de Introducción / Trabajos relacionados | workflow | ACP | [Detalles](manuscript-literature-framing) |

### 🔧 Herramientas de depuración

| Flujo de trabajo | Propósito | Backend | Docs |
|------------------|-----------|---------|------|
| **Debug Probe** | Pruebas y diagnóstico del sistema de flujos de trabajo | Skill-Runner | [Detalles](debug-probe) |

## Próximos pasos

- [Invocación y configuración de flujos de trabajo](invocation)
- [Configuración de backends](../backends/) — Instrucciones detalladas para configurar backends
