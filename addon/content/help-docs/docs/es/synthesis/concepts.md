# Base de conocimiento de conceptos

La Base de Conocimiento de Conceptos (Concept KB) es una capa de conocimiento opcional en el sistema Synthesis que proporciona gestión estructurada de los conceptos fundamentales referenciados en la literatura. Los conceptos se pueden superponer sobre el grafo de temas y el lector, enriqueciendo el contexto para la síntesis de temas.

## ¿Qué es un concepto?

En el sistema Synthesis, un **concepto** es un término o entidad con significado independiente dentro de un dominio de investigación. A diferencia de la clasificación plana de las etiquetas, los conceptos pueden tener una estructura multicapa, incluyendo acepciones, alias y relaciones.

### Estructura de cuatro capas de los conceptos

```
Concept                 — por ejemplo, "Transformer"
  └── Sense             — por ejemplo, "Transformer (arquitectura de aprendizaje automático)"
       ├── Alias        — por ejemplo, "Modelo Transformer", "Red Transformer"
       └── Relation     — broader_than "Mecanismo de atención"
```

### Tipos de conceptos

| Tipo | Descripción | Ejemplos |
|------|-------------|----------|
| `method` | Métodos de investigación | Aprendizaje profundo, aprendizaje por refuerzo |
| `model` | Modelos o arquitecturas | Transformer, ResNet |
| `dataset` | Conjuntos de datos | ImageNet, COCO |
| `metric` | Métricas de evaluación | BLEU, F1-score |
| `field` | Campos de investigación | Visión por computadora, procesamiento del lenguaje natural |
| `task` | Tareas | Clasificación de imágenes, traducción automática |
| `tool` | Herramientas | PyTorch, TensorFlow |

## Funciones de la superficie Concepts

### Lista de conceptos

En la página Synthesis Workbench → Concepts, puedes explorar todos los conceptos indexados:

- **Filtro**: Por tipo (method / model / dataset, etc.), estado o temas asociados
- **Búsqueda**: Buscar conceptos por nombre
- **Alternancia de vista**: Densidad compacta / cómoda

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/concepts.webp" alt="Página de conceptos de Synthesis" title="Página de conceptos de Synthesis" loading="lazy" /><figcaption>Página de conceptos de Synthesis</figcaption></figure>

### Detalles del concepto

Después de seleccionar un concepto, puedes ver y editar:

| Información | Descripción |
|-------------|-------------|
| **Identity** | ID del concepto, nombre, tipo |
| **Status** | active / deprecated / pending |
| **Definition** | Definición descriptiva del concepto |
| **Senses** | Significados específicos del concepto en diferentes contextos |
| **Aliases** | Nombres alternativos para el mismo concepto |
| **Relations** | Asociaciones con otros conceptos (broader / narrower / related) |
| **Related Topics** | Temas que referencian este concepto |

### Gestión de acepciones

El mismo concepto puede tener diferentes significados entre disciplinas. El mecanismo de acepciones permite:

- Añadir múltiples acepciones a un concepto, cada una con su propia definición
- Anotar el contexto de uso o dominio para cada acepción
- Asociar acepciones específicas con artículos o temas

### Gestión de alias

- Registrar diferentes convenciones de nomenclatura para el mismo concepto (por ejemplo, nombre completo, abreviatura, términos alternativos)
- Los alias se utilizan para la coincidencia de citas y la identificación de conceptos

### Funciones de superposición

La información de conceptos se puede superponer sobre otras superficies:

- **Superposición sobre el grafo de temas**: Mostrar conceptos relacionados con un tema en el grafo de temas
- **Superposición sobre el lector**: Mostrar tarjetas de conceptos en la página de detalle del tema

## Revisión

Las propuestas de cambio a la base de conocimiento de conceptos (nuevos conceptos, nuevas acepciones, nuevas relaciones) aparecen en la pestaña de revisión Concepts del [Centro de revisión](#doc/synthesis%2Freview). Puedes revisar y decidir si aceptar estas propuestas.

## Relación con las etiquetas

Los conceptos y las etiquetas son dos enfoques complementarios para la organización del conocimiento:

| Dimensión | Etiquetas | Conceptos |
|-----------|-----------|-----------|
| Estructura | Plana, faceta:valor | Multicapa (acepciones + alias + relaciones) |
| Propósito | Clasificación y filtrado de literatura | Gestión de conocimiento y análisis de asociaciones |
| Origen | Vocabulario controlado + inferencia de IA | Extraídos automáticamente de la literatura + gestionados por el usuario |
| Alcance | Cubre toda la literatura | Cobertura profunda de términos fundamentales seleccionados |

## Siguientes pasos

- [Centro de revisión](#doc/synthesis%2Freview) — Revisar sugerencias de conceptos
- [Gestión de etiquetas](#doc/synthesis%2Ftags) — Gestionar el vocabulario controlado de etiquetas
- [Síntesis de temas](#doc/synthesis%2Ftopic-synthesis) — Aprovechar el conocimiento de conceptos al crear síntesis de temas
