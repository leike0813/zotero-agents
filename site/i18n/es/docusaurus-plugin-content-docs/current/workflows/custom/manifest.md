# Redacción del manifiesto del Workflow

`workflow.json` es el archivo de manifiesto de un workflow, que define todos sus metadatos y comportamiento. El Workflow Manager descubre y carga los workflows a través de este archivo.

## Estructura básica

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "inputs": { "unit": "parent" },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Referencia de campos

### Identificación básica

| Campo | Requerido | Tipo | Descripción |
|-------|-----------|------|-------------|
| `id` | ✅ | string | Identificador único; no debe duplicarse. Se recomienda kebab-case |
| `label` | ✅ | string | Nombre visible para el usuario |
| `version` | | string | Número de versión semántica, p. ej., `"1.0.0"` |
| `provider` | ✅ | string | Tipo de backend. Ver abajo los valores disponibles |

### Valores de Provider

| Valor | Descripción |
|-------|-------------|
| `"pass-through"` | Ejecución puramente local, sin necesidad de backend. Adecuado para operaciones de archivo, exportaciones, etc. |
| `"skillrunner"` | Ejecuta skills a través del backend Skill-Runner |
| `"acp"` | Ejecuta skills a través del backend ACP |
| `"generic-http"` | Llama APIs a través del backend Generic HTTP |

`provider` determina con qué tipos de backend es compatible el workflow, y también determina qué backends se muestran como ejecutables en el Dashboard.

### Control de visualización

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  },
  "taskNameTemplate": "Processing: {query}",
  "debug_only": false
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `display.core` | boolean | Si marcar como workflow principal (visualización prioritaria en el Dashboard, con insignia de principal) |
| `display.emoji` | string | Icono prefijo del nombre visible, p. ej., `"📖"` |
| `taskNameTemplate` | string | Plantilla de nombre de tarea usando marcadores `{nombre de parámetro}`, reemplazados con valores reales en tiempo de ejecución |
| `debug_only` | boolean | Cuando es `true`, solo visible en modo de depuración |

### Definición de entrada

```json
{
  "inputs": {
    "unit": "attachment",
    "accepts": {
      "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
    },
    "per_parent": {
      "min": 1,
      "max": 1
    }
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `unit` | **Tipo de unidad de entrada**. `"attachment"` (adjunto), `"parent"` (elemento padre), `"note"` (nota), `"workflow"` (no se necesita selección de elementos, se activa directamente desde el Dashboard) |
| `accepts.mime` | Tipos MIME aceptados (solo aplicable cuando `unit: "attachment"`). Si no se especifica, se aceptan todos los tipos |
| `per_parent.min` | Número mínimo de adjuntos por elemento padre |
| `per_parent.max` | Número máximo de adjuntos por elemento padre |

Cuando `unit: "workflow"`, no se requieren elementos seleccionados por el usuario para activar (p. ej., "Crear síntesis de tema").

### validateSelection — Validación de selección {#selection-validation}

`validateSelection` es validación de selección declarativa. Cubre escenarios comunes como "omitir elementos que ya tienen resultados" o "aceptar solo selecciones de tipos específicos" — sin escribir JavaScript.

```json
{
  "validateSelection": {
    "select": {
      "policy": "literature-source"
    },
    "require": {
      "counts": {
        "parents": 1
      },
      "allowMixed": false
    },
    "exclude": [
      {
        "kind": "generated-notes-all",
        "noteKinds": ["digest", "references", "citation-analysis"]
      }
    ]
  }
}
```

### `select` — Política de selección

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `select.policy` | string | Política de selección. Valores soportados abajo |
| `select.unit` | string | Anula la unidad de entrada para la validación de selección. `"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**Valores soportados de `select.policy`:**

| Política | Descripción |
|----------|-------------|
| `input-unit` | Aceptar elementos que coincidan con la unidad de entrada |
| `literature-source` | Aceptar fuentes literarias (adjuntos o elementos padre con adjuntos expandibles) |
| `pdf-attachment` | Aceptar solo adjuntos PDF |
| `selected-parent` | Aceptar elementos padre de la selección |
| `generated-note-candidates` | Aceptar elementos candidatos para notas generadas |
| `digest-representative-image` | Elementos objetivo para extracción de imagen representativa |

### `require` — Requisitos de selección

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `require.counts.parents` | number | Mínimo de elementos padre requeridos |
| `require.counts.attachments` | number | Mínimo de elementos adjunto requeridos |
| `require.counts.notes` | number | Mínimo de elementos nota requeridos |
| `require.counts.children` | number | Mínimo de elementos hijo requeridos |
| `require.counts.total` | number | Mínimo total de elementos requeridos |
| `require.allowMixed` | boolean | Si se permite mezclar diferentes tipos de elementos en la selección |

### `exclude` — Reglas de exclusión

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `exclude[]` | array | Lista de reglas de exclusión. Si alguna regla coincide, el elemento actual se omite |

**Valores soportados de `exclude.kind`:**

| kind | Descripción | Parámetros adicionales |
|------|-------------|------------------------|
| `generated-notes-all` | El elemento ya tiene notas generadas del tipo especificado | `noteKinds`: lista de tipos de nota, p. ej., `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | El elemento ya tiene el artefacto especificado (para evitar ejecución redundante) | `target`: `"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"`; `parameter`: parámetro de idioma opcional para coincidencia de artefactos |

### `derive` — Selecciones derivadas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `derive[]` | array | Operaciones de selección derivada. `"exportCandidates"` — derivar candidatos para exportación de notas; `"digestRepresentativeImageTarget"` — derivar objetivos de imagen representativa de notas digest |

**Ejemplo:**

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "artifact-exists", "target": "deep-reading-html" }
    ]
  }
}
```

> En este ejemplo, los elementos que ya tienen el artefacto HTML de lectura profunda se omiten automáticamente, sin requerir filtrado manual por parte del usuario.

### Control de activación

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `requiresSelection` | Si se requieren elementos seleccionados por el usuario para activar. Por defecto es `true`. Cuando se establece en `false`, el workflow puede ejecutarse desde el Dashboard sin seleccionar ningún elemento. Normalmente se establece en `false` cuando `inputs.unit: "workflow"` |

### Control de ejecución

```json
{
  "execution": {
    "timeout_ms": 600000,
    "poll_interval_ms": 2000,
    "mcp": {
      "requiredTools": ["search_items", "get_item_detail"]
    },
    "zoteroHostAccess": {
      "required": false,
      "allowWriteApprovalBypass": false
    },
    "feedback": {
      "showNotifications": true
    }
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `timeout_ms` | Tiempo de espera en milisegundos (solo efectivo para backends Generic HTTP) |
| `poll_interval_ms` | Intervalo de sondeo en milisegundos, controla la frecuencia de verificación de progreso |
| `mcp.requiredTools` | Herramientas MCP requeridas por este workflow (array de cadenas de nombres de herramientas) |
| `zoteroHostAccess.required` | Si se requiere acceso al host de Zotero (para leer/escribir datos de la biblioteca) |
| `zoteroHostAccess.allowWriteApprovalBypass` | Si se permite la omisión de aprobación de operaciones de escritura |
| `feedback.showNotifications` | Si mostrar notificaciones de ejecución. Por defecto es `true`; establecer en `false` para ejecución silenciosa |

> El **modo de ejecución** (`auto` / `interactive`) se ha movido a `request.create.mode` — consulta [Tipos de solicitud](request-kinds).

### Obtención de resultados

```json
{
  "result": {
    "fetch": { "type": "bundle" },
    "final_step_id": "finalize",
    "expects": {
      "result_json": "result/result.json",
      "artifacts": [
        "result/artifact1",
        "result/artifact2"
      ]
    }
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `fetch.type` | Método de obtención. `"bundle"` (descargar bundle zip), `"result"` (solo obtener JSON de resultado) |
| `final_step_id` | Para workflows de secuencia, especifica el id del paso final, usado para determinar el resultado final |
| `expects.result_json` | Ruta esperada del archivo JSON de resultado (relativa al workspace de ejecución) |
| `expects.artifacts` | Lista de rutas esperadas de archivos de artefactos |

### Definición de solicitud

Definición de solicitud declarativa, **mutuamente excluyente** con `hooks.buildRequest` (si ambos existen, `hooks.buildRequest` tiene prioridad).

```json
{
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "my-skill",
      "skill_source": "local-package"
    },
    "input": {
      "upload": {
        "files": [
          { "key": "source", "from": "selected.markdown" }
        ]
      }
    },
    "poll": {
      "interval_ms": 2000,
      "timeout_ms": 600000
    }
  }
}
```

Para información detallada sobre cada `kind`, consulta [Tipos de solicitud](request-kinds).

### Declaración de Hooks

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `applyResult` | ✅ | **Requerido**. Ruta del script para el manejo de resultados post-ejecución |
| `buildRequest` | | Opcional. Construir la solicitud a enviar al backend. Mutuamente excluyente con el campo `request` |
| `normalizeSettings` | | Opcional. Normalizar parámetros establecidos por el usuario |

> El **filtrado de entrada** ha sido reemplazado por el mecanismo declarativo `validateSelection` — consulta [Validación de selección](#selection-validation) abajo.

Las rutas son relativas al directorio que contiene `workflow.json`.

### Localización

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "My Workflow",
        "parameters.language.title": "Language"
      }
    }
  }
}
```

Consulta la página de [Localización](localization) para información detallada.

### Ejemplo completo: Un workflow de análisis de literatura con parámetros

```json
{
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "inputs": {
    "unit": "attachment",
    "accepts": { "mime": ["application/pdf"] },
    "per_parent": { "min": 1, "max": 1 }
  },
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    }
  },
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "timeout_ms": 600000
  },
  "request": {
    "kind": "skillrunner.job.v1",
    "create": { "skill_id": "literature-analysis" }
  },
  "result": {
    "fetch": { "type": "bundle" },
    "expects": {
      "result_json": "result/result.json"
    }
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Próximos pasos

- [Sistema de Hooks](hooks) — Conoce las firmas de API y métodos de escritura de cada Hook
- [Sistema de parámetros](parameters) — Tipos de parámetros, valores enum, fuentes de opciones dinámicas
- [Selección y contexto](selection-context) — Cómo obtener información sobre los elementos seleccionados por el usuario
