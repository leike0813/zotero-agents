# Literature Analysis

## Propósito

Generar resúmenes de literatura, listas de referencias e informes de análisis de citas a partir de adjuntos en PDF o Markdown.

**Literature Analysis es la piedra angular de la gestión de literatura con agentes** — todo artículo incorporado debe procesarse con este flujo de trabajo. Establece una base de conocimiento estructurada para cada artículo, y todas las funcionalidades avanzadas como los grafos de citas y la síntesis temática dependen de los resultados de este flujo.

Este flujo de trabajo invoca la habilidad `literature-analysis` en el backend Skill-Runner para realizar un análisis estructurado de artículos académicos.

:::tip Mejores prácticas
- **Extraer Markdown primero**: Antes de ejecutar Literature Analysis, se recomienda usar [MinerU](#doc/workflows%2Fmineru) para convertir PDF a Markdown primero. El Markdown original mejora significativamente la comprensión de la estructura del artículo por parte de la IA.
- **Inicializar el vocabulario de etiquetas primero**: Se recomienda ejecutar [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) para inicializar un vocabulario de etiquetas controlado antes del primer Literature Analysis. Esto permite que la regulación automática de etiquetas en el pipeline de análisis alcance su máxima efectividad.
:::

## Casos de uso

- Obtener rápidamente un resumen del contenido clave al leer un nuevo artículo
- Recopilar la lista completa de referencias de un artículo
- Analizar el contexto de citación y la intención de cita de un artículo

## Restricciones de entrada

| Tipo de restricción | Descripción |
|---------------------|-------------|
| Unidad de entrada | Adjunto |
| Tipos aceptados | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Límite por elemento padre | Como máximo 1 adjunto |

### Métodos de activación

- Seleccionar directamente un adjunto PDF o Markdown
- Seleccionar el elemento padre, y el complemento expandirá automáticamente su primer adjunto elegible

## Flujo de ejecución

```
1. Construir solicitud
   └── Subir archivo fuente a Skill-Runner
       └── Invocar skill_id: "literature-analysis"

2. Procesamiento en Skill-Runner
   └── Analizar contenido del documento
       └── Generar tres resultados:
           ├── digest.md          (Resumen de literatura)
           ├── references.json    (Lista de referencias)
           └── citation_analysis.json (Análisis de citas)

3. Devolver resultados
   └── Descargar paquete (zip)
       └── Contiene result.json y artifacts/
```

### Modo de ejecución

Totalmente automático, no requiere intervención del usuario. Basta con enviar y esperar a que se complete.

### Configuración de ejecución

- `execution.mode`: `auto` — Ejecución automática, no requiere intervención del usuario
- `skillrunner_mode`: `auto` — Modo no interactivo

## Duración estimada

| Escenario | Tiempo estimado |
|-----------|-----------------|
| Formato de referencia estándar | 6-10 minutos |
| Formato de referencia no estándar | 12-18 minutos |

La duración depende principalmente de si el formato de referencia es estándar — cuanto más estandarizado sea el formato (por ejemplo, citas de ScienceDirect, IEEE y otras revistas principales), más rápida será el análisis por parte de la IA. La longitud del artículo tiene un impacto relativamente menor.

## Resultados

Una vez completada la ejecución, se crean **3 notas de Zotero** bajo el elemento padre:

### 1. Nota de resumen

- Tipo: `data-zs-note-kind="digest"`
- Contenido: Resumen de literatura renderizado en HTML que cubre contexto de investigación, métodos, resultados y conclusiones
- Estrategia de actualización: Cada ejecución actualiza la nota con el mismo nombre (sobrescribe si ya existe)

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_digest.webp" alt="Nota de resumen de Literature Analysis" title="Nota de resumen de Literature Analysis" loading="lazy" /><figcaption>Nota de resumen de Literature Analysis</figcaption></figure>

:::info Sobre el contenido de las notas
El contenido mostrado en la nota está **renderizado** a partir de datos del backend. Modificar directamente el contenido de la nota en Zotero **no** cambiará los datos reales del backend. Para editar los resultados del análisis, usar la funcionalidad de [Export/Import Notes](#doc/workflows%2Fexport-import-notes) para exportar, modificar y luego reimportar.
:::

### 2. Nota de referencias

- Tipo: `data-zs-note-kind="references"`
- Contenido: Tabla HTML de referencias (#, Año, Título, Autores, Fuente, Localizador)
- Estrategia de actualización: Cada ejecución actualiza la nota con el mismo nombre

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_references.webp" alt="Nota de referencias de Literature Analysis" title="Nota de referencias de Literature Analysis" loading="lazy" /><figcaption>Nota de referencias de Literature Analysis</figcaption></figure>

### 3. Nota de análisis de citas

- Tipo: `data-zs-note-kind="citation-analysis"`
- Contenido: Informe de análisis de citas que incluye contexto de citación y clasificación de intención de cita
- Estrategia de actualización: Cada ejecución actualiza la nota con el mismo nombre

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_citation-analysis.webp" alt="Nota de análisis de citas de Literature Analysis" title="Nota de análisis de citas de Literature Analysis" loading="lazy" /><figcaption>Nota de análisis de citas de Literature Analysis</figcaption></figure>

## Parámetros

| Parámetro | Tipo | Descripción | Valor predeterminado |
|-----------|------|-------------|---------------------|
| `language` | string | Idioma de salida | `zh-CN` |
| `auto_tag_regulator` | boolean | Si se debe ejecutar automáticamente [Tag Regulator](#doc/workflows%2Ftag-regulator) en cascada después del análisis de literatura. **Se recomienda activar** | `true` |
| `auto_tag_infer_tag` | boolean | Al ejecutar la regulación de etiquetas en cascada, si se debe permitir que la IA infiera nuevas etiquetas (solo visible cuando `auto_tag_regulator` está activado) | `true` |

Valores disponibles para `language`: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. También se admite entrada personalizada.

## Recomendación de modelo

🔴 Se recomiendan modelos con **fuerte comprensión textual**. Si el backend admite delegación de subagentes (por ejemplo, Claude Code, Codex), el resumen, las referencias y el análisis de citas se pueden procesar en paralelo, reduciendo significativamente el tiempo total.

## Dependencias

- **Backend**: Servicio Skill-Runner
- **Configuración del backend**: Configurar un backend de tipo Skill-Runner en el gestor de backends
- **Habilidad**: La habilidad `literature-analysis` debe estar desplegada en el Skill-Runner

## Flujos de trabajo relacionados

- [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) — Inicializar un vocabulario de etiquetas controlado antes del primer análisis
- [MinerU](#doc/workflows%2Fmineru) — Convertir PDF a Markdown primero para obtener la mejor calidad de análisis
- [Interactive Literature Explainer](#doc/workflows%2Fliterature-explainer) — Dialogar con la IA para comprender la literatura en profundidad
- [Export/Import Notes](#doc/workflows%2Fexport-import-notes) — Exportar artefactos de análisis para editarlos o migrarlos entre instancias de Zotero
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Ejecutar la regulación de etiquetas de forma independiente (Literature Analysis puede ejecutarla en cascada automáticamente)
