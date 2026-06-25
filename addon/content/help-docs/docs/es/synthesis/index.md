# Descripción general de Synthesis Workbench

Synthesis Workbench es una plataforma de análisis profundo de literatura proporcionada por Zotero Agents. Transforma tu biblioteca en una red de conocimiento estructurada, soportando síntesis de temas, análisis de citas, gestión de conceptos y gestión de vocabulario controlado.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/home.webp" alt="Inicio de Synthesis Workbench" title="Inicio de Synthesis Workbench" loading="lazy" /><figcaption>Inicio de Synthesis Workbench</figcaption></figure>

## Cómo abrirlo

1. Abre Dashboard / Synthesis Workspace mediante el **botón de la barra de herramientas** o el **menú**
2. Cambia a la vista **Synthesis** en la pestaña Workspace Tab

## Todas las superficies (páginas)

Synthesis Workbench se compone de 8 superficies, cada una proporcionando una vista funcional diferente:

| Superficie | Función | Documentación |
|------------|---------|---------------|
| **Home** | Panel de visión general de la biblioteca: estadísticas de la biblioteca (artículos registrados / cantidad de temas / nodos del grafo), panel de estado de sincronización Git, lista de tarjetas de temas populares | [Detalles](#doc/synthesis%2Fhome) |
| **Topics** | Lista y gestión de temas: 3 modos de vista (grafo / cuadrícula / lista), crear y actualizar temas, búsqueda y ordenación de temas | [Detalles](#doc/synthesis%2Ftopic-synthesis) |
| **Index** | Índice de referencias canónicas: vista de registro de artículos (lista de artículos + filas de citas + estado de vinculación), vista de referencia canónica (búsqueda / fusión / redirección / deduplicación) | [Detalles](#doc/synthesis%2Findex-and-citation) |
| **Review** | Centro de revisión: 3 sub-pestañas — revisión de coincidencias de citas (aceptar/rechazar propuestas de vinculación), revisión de conceptos, revisión de relaciones del grafo de temas | [Detalles](#doc/synthesis%2Freview) |
| **Graph** | Visualización del grafo de citas (force-directed / radial / componentes — 3 disposiciones), con filtrado por tema e interacción con nodos/aristas | [Detalles](#doc/synthesis%2Findex-and-citation) |
| **Tags** | Gestión de vocabulario controlado de etiquetas + aprobación automática de sugerencias de etiquetado | [Detalles](#doc/synthesis%2Ftags) |
| **Concepts** | Gestión de la base de conocimiento de conceptos: estructura de cuatro capas de conceptos / acepciones / alias / relaciones, superponible sobre el grafo de temas y el lector | [Detalles](#doc/synthesis%2Fconcepts) |
| **Reader** | Lector de temas: página completa de detalle de tema con 8 sub-páginas (Overview, Taxonomy, Claims, Compare, Future Directions, Coverage, References, Report) | [Detalles](#doc/synthesis%2Ftopic-synthesis) |

## Conceptos fundamentales

### Canonical Store

El Canonical Store es el almacenamiento subyacente del grafo de conocimiento del sistema Synthesis. Almacena archivos JSON con direccionamiento por contenido en el directorio de datos de Zotero.

**Ubicación de almacenamiento:** `<directorio de datos de Zotero>/zotero-agents/data/synthesis/`

**Estructura de directorios:**

```
synthesis/
├── topics/             # Artefactos estructurados para síntesis de temas
├── concepts/           # Base de conocimiento de conceptos
├── topic-graph/        # Nodos y aristas del grafo de temas
├── citation-graph/     # Instantáneas del grafo de citas
├── tags/               # Vocabulario controlado de etiquetas
├── sync/               # Árbol de trabajo de sincronización Git
└── state/              # Estado de ejecución (transacciones, recibos, cachés, etc.)
```

Cada archivo utiliza un formato de sobre JSON (CanonicalEnvelope) que incluye un ID de esquema, número de versión, marca de tiempo y cuerpo de datos validado por el esquema. Las operaciones de escritura utilizan semántica transaccional: los datos se almacenan primero en el directorio de transacciones, se promueven a la ubicación canónica tras la validación exitosa, y se revierten automáticamente en caso de fallo.

### Reference Sidecar

Un Reference Sidecar es un índice de los artefactos adjuntos de cada artículo. Cuando un workflow procesa un elemento de literatura y genera un resumen, lista de referencias y análisis de citas, estos artefactos se adjuntan al elemento como notas estructuradas (Zotero Notes). El sistema de Sidecar escanea estas notas y registra el estado de los artefactos (completo / parcial / ausente) en el índice.

**Ciclo de escaneo del Sidecar:** El sidecar se activa para escanear en los siguientes momentos:

- Después de que una ejecución de workflow complete y escriba artefactos
- Cuando se activa una operación explícita de actualización del sidecar
- Cuando el sistema detecta datos de sidecar obsoletos al inicio

**Tipos de artefactos:**

| Artefacto | Descripción |
|-----------|-------------|
| `digest` | Resumen del artículo (Markdown) |
| `references` | Lista de referencias (JSON) |
| `citation_analysis` | Informe de análisis de citas (JSON) |

Los datos del Sidecar sirven como entrada principal para el Índice de Referencias Canónicas — el sistema extrae registros de citas del artefacto de referencias, establece referencias canónicas y luego intenta hacerlas coincidir y vincularlas con elementos de la biblioteca.

### Flujo de datos

```
Biblioteca de Zotero
    │
    ├──→ Ejecución de Workflow (Literature Analysis / Deep Reading)
    │         │
    │         ↓
    │   Notas de artefactos (Digest / References / Citation Analysis)
    │         │
    │         ↓
    │   Reference Sidecar ← Escanear estado de artefactos
    │         │
    │         ├──→ Índice de Referencias Canónicas
    │         │         │
    │         │         ├──→ Vinculación de citas (Vincular a elementos de Zotero)
    │         │         └──→ Grafo de citas
    │         │
    │         └──→ Síntesis de temas
    │                   │
    │                   ├──→ Grafo de temas (Relaciones entre temas)
    │                   └──→ Asociaciones de conceptos (Base de conocimiento de conceptos)
    │
    └──→ Git Sync ←→ Repositorio remoto (Control de versiones y respaldo)
```

## Requisitos previos

El uso de Synthesis Workbench requiere:

- Un backend [Skill-Runner](#doc/backends%2Fskill-runner) configurado (para ejecutar workflows de síntesis)
- Elementos de artículos ya presentes en la biblioteca

## Siguientes pasos

- [Panel Home](#doc/synthesis%2Fhome) — Ver visión general de la biblioteca y estado de sincronización
- [Gestión de etiquetas](#doc/synthesis%2Ftags) — Gestionar el vocabulario controlado de etiquetas
- [Índice y Grafo de Citas](#doc/synthesis%2Findex-and-citation) — Conocer la indexación de referencias y las redes de citas
- [Crear síntesis de temas](#doc/synthesis%2Ftopic-synthesis) — Crear análisis temáticos
- [Centro de revisión](#doc/synthesis%2Freview) — Revisar coincidencias de citas, conceptos y propuestas del grafo de temas
- [Base de conocimiento de conceptos](#doc/synthesis%2Fconcepts) — Gestionar los conceptos fundamentales
- [Git Sync](#doc/synthesis%2Fgit-sync) — Configurar sincronización y respaldo de datos
