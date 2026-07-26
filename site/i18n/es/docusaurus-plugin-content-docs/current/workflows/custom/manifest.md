# Redacción del manifiesto del Workflow

`workflow.json` es el archivo de manifiesto de un workflow, que define todos sus metadatos y comportamiento. El Workflow Manager descubre y carga los workflows a través de este archivo.

## Estructura básica

```json
{
  "schemaVersion": 2,
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": { "kind": "parent" },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": []
  },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "preflight": "hooks/preflight.mjs",
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

### Input Planning Contracts

`inputs` and `validateSelection` have separate, non-interchangeable roles.
`inputs` is the consumer contract for prepared execution members and grouping;
`validateSelection` is the producer contract for raw-selection validation,
candidate selection, ordered filtering, and candidate cardinality.

#### `inputs` — Execution Input Contract

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": {
        "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
      }
    },
    "grouping": { "mode": "parent" }
  }
}
```

- `member.kind`: `selection`, `parent`, `child`, `attachment`,
  `note`, `generated-note`, or `digest-image-target`.
- `member.accepts.mime` applies only to attachment execution members.
- `grouping.mode: "each"` creates one unit per candidate.
- `grouping.mode: "all"` creates one unit containing all candidates.
- `grouping.mode: "parent"` creates stable parent groups. Candidates without
  parent identity are skipped as `missing-parent`.

#### `validateSelection` — Candidate Production Contract {#selection-validation}

```json
{
  "validateSelection": {
    "require": {
      "selection": {
        "counts": {
          "parents": { "min": 1 },
          "total": { "min": 1 }
        },
        "allowMixed": false
      },
      "candidates": { "min": 1 }
    },
    "select": {
      "policy": "input-member",
      "source": "related"
    },
    "filters": [
      {
        "kind": "source-file-exists",
        "phase": "availability"
      }
    ]
  }
}
```

`require.selection` checks the raw SelectionContext exactly once.
`select` then produces ordered atomic candidates. MIME compatibility and
`filters` run before `require.candidates`. Count rules use either
`{ "exact": n }` or non-negative `min`/`max` values.

Supported selectors are `input-member` (`source: selected|related`),
`selection`, `literature-source`, `generated-note-candidates`, and
`digest-representative-image`. Supported filters are
`source-file-exists`, `candidates-per-parent`,
`generated-note-kinds-absent`, and `artifact-absent`. Parameter-dependent
artifact checks require `phase: "execute"`; availability filters run during
preview and are reapplied during confirmed planning.

#### `trigger` — Empty-selection Gate

```json
{
  "trigger": {
    "requiresSelection": true
  }
}
```

`trigger.requiresSelection` is required in schema v2. It controls only whether
an empty selection may enter planning; it does not replace
`require.selection`.
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
    "preflight": "hooks/preflight.mjs",
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `applyResult` | ✅ | **Requerido**. Ruta del script para el manejo de resultados post-ejecución |
| `preflight` | | Opcional. Se ejecuta después de la resolución de selección y antes de la construcción de la solicitud. Puede continuar, omitir, cortocircuitar hacia `applyResult`, o reemplazar una unidad de entrada con unidades de solicitud virtuales |
| `buildRequest` | | Opcional. Construir la solicitud a enviar al backend. Mutuamente excluyente con el campo `request` |
| `normalizeSettings` | | Opcional. Normalizar parámetros establecidos por el usuario |

> El **filtrado de entrada** ha sido reemplazado por el mecanismo declarativo `validateSelection` — consulta [Validación de selección](#selection-validation) abajo.

`preflight` no participa en la habilitación del menú, la clasificación de selección de depuración ni las verificaciones de disponibilidad de Host Bridge. Mantén las restricciones de selección en `validateSelection`, la construcción de solicitudes del proveedor en `buildRequest` o `request`, y las escrituras de Zotero en `applyResult`.

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
  "schemaVersion": 2,
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [
      { "kind": "source-file-exists", "phase": "availability" }
    ]
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
