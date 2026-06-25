# Tipos de solicitud

Los workflows determinan qué Provider (ejecutor) maneja la solicitud declarando `request.kind`. El sistema tiene múltiples tipos de solicitud integrados, correspondientes a diferentes backends y modos de ejecución.

## Resumen de tipos de solicitud

| `kind` | Provider aplicable | Descripción |
|--------|--------------------| -------------|
| `pass-through.run.v1` | pass-through | Ejecución puramente local, sin backend remoto involucrado |
| `skillrunner.job.v1` | skillrunner / acp | Ejecución de skill SkillRunner de un solo paso |
| `skillrunner.sequence.v1` | acp | Ejecución de skills encadenados de múltiples pasos |
| `acp.prompt.v1` | acp | Envía un prompt directamente al backend ACP |
| `acp.skill.run.v1` | acp | Envía una ejecución de skill directamente al backend ACP |
| `generic-http.request.v1` | generic-http | Llamada API HTTP de un solo paso |
| `generic-http.steps.v1` | generic-http | Llamadas API HTTP de múltiples pasos |

## pass-through.run.v1 — Ejecución puramente local

No se requiere backend remoto; se ejecuta directamente dentro del plugin. Adecuado para escenarios puramente locales como operaciones de archivo y exportación de datos.

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

Al construir la solicitud en el hook `buildRequest`, normalmente se pasan `selectionContext` y `parameter`:

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — Ejecución de skill de un solo paso

Envía una solicitud de ejecución de skill única al backend Skill-Runner. Realiza sondeos para obtener resultados después del envío.

```json
{
  "provider": "skillrunner",
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "literature-analysis",
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

| Campo | Descripción |
|-------|-------------|
| `create.skill_id` | Identificador del skill a ejecutar |
| `create.skill_source` | Fuente del skill. `"local-package"` (incluido en el paquete), `"installed"` (ya instalado) |
| `input.upload.files` | Lista de archivos a subir. `from` puede ser `"selected.markdown"`, `"selected.pdf"`, `"selected.source"` |
| `poll.interval_ms` | Intervalo de sondeo (milisegundos) |
| `poll.timeout_ms` | Tiempo de espera total (milisegundos) |

Cuando el workflow selecciona el backend ACP, `skillrunner.job.v1` se adapta automáticamente a `acp.skill.run.v1`, por lo que los workflows declarados como `skillrunner.job.v1` también son compatibles con el backend ACP.

## skillrunner.sequence.v1 — Encadenamiento de skills de múltiples pasos

Cuando múltiples skills necesitan encadenarse en secuencia (donde la salida de un paso se convierte en la entrada del siguiente), utiliza la ejecución en secuencia. Los escenarios típicos incluyen pipelines de múltiples etapas (p. ej., el flujo de tres pasos de Topic Synthesis: prepare → core enrichment → finalize), donde cada paso es manejado por un skill diferente, pasando resultados intermedios mediante el mecanismo de handoff.

Encadena múltiples skills en secuencia, donde la salida de un paso puede servir como entrada del siguiente (handoff).

```json
{
  "provider": "acp",
  "request": {
    "kind": "skillrunner.sequence.v1",
    "sequence": {
      "steps": [
        {
          "id": "prepare",
          "skill_id": "create-topic-synthesis-prepare",
          "workspace": "new",
          "parameter": { "language": "en-US" }
        },
        {
          "id": "core",
          "skill_id": "topic-synthesis-core-enrichment",
          "workspace": "reuse-workflow",
          "handoff": {
            "from_step": "prepare",
            "pass_through": true
          }
        },
        {
          "id": "finalize",
          "skill_id": "topic-synthesis-finalize",
          "workspace": "reuse-workflow"
        }
      ]
    }
  }
}
```

### Configuración de pasos

| Campo | Descripción |
|-------|-------------|
| `id` | Identificador único del paso, referenciado por el handoff |
| `skill_id` | Identificador del skill a ejecutar |
| `mode` | **Requerido.** Modo de ejecución: `"auto"` (no interactivo) o `"interactive"` (requiere entrada del usuario) |
| `workspace` | Política de workspace. `"new"` (crear un nuevo workspace), `"reuse-workflow"` (reutilizar el workspace padre) |
| `parameter` | Parámetros pasados al skill |
| `input` | Datos de entrada pasados al skill |
| `short_circuit` | Reglas de terminación anticipada. Ver abajo |
| `fetch_type` | Especificar el tipo de fetch por paso. `"bundle"` (descargar bundle zip de artefactos); si no se especifica, usa el `result.fetch.type` a nivel de workflow |
| `apply_result` | Aplicación de resultado a nivel de paso: `workflow_id` especifica qué `applyResult` del sub-workflow invocar; `on_failure` controla el comportamiento en caso de fallo (`"continue"` o `"fail_sequence"`) |
| `include_if` | Ejecución condicional de pasos. Ya sea `{ kind: "parameter", parameter: "...", equals: ... }` para verificar un parámetro de workflow, o `{ kind: "runtime", condition: "..." }` para condiciones de ejecución |

### Terminación anticipada (short_circuit)

Cuando el valor de retorno de un paso satisface condiciones, se omiten los pasos posteriores y se utiliza la salida del paso actual como resultado final.

```json
{
  "id": "prepare",
  "skill_id": "create-topic-synthesis-prepare",
  "workspace": "new",
  "short_circuit": {
    "when": {
      "path": "status",
      "equals": "canceled"
    },
    "result": "step_output"
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `when.path` | Qué campo del JSON de salida del paso verificar |
| `when.equals` | Activar la terminación cuando el valor del campo sea igual a este valor |
| `result` | Resultado después de la terminación: `"step_output"` (salida completa del paso actual) |

### Configuración de Handoff

Handoff pasa datos de un paso a pasos posteriores mediante un array `bindings`. Cada binding describe una sola transferencia de valor o archivo.

**Paso completo (todos los campos de salida de un paso precedente):**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "target": "/input/handoff"
      }
    ]
  }
}
```

**Mapeo selectivo de campos:**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "step": "step1",
        "source": "output_field_name",
        "target": "/input/field_name",
        "required": false
      },
      {
        "kind": "value",
        "step": "step1",
        "source": "status",
        "target": "/input/step1_status",
        "required": false
      }
    ]
  }
}
```

| Campo de Binding | Descripción |
|------------------|-------------|
| `kind` | `"value"` para valores de datos, `"file"` para referencias de archivos |
| `step` | ID del paso fuente (de qué paso leer la salida). Si se omite, lee del paso precedente inmediato |
| `source` | Nombre del campo en el JSON de salida del paso fuente |
| `target` | Ruta JSON donde el valor debe escribirse en la entrada del paso actual (p. ej., `"/input/field_name"`) |
| `required` | Si es `true`, el paso fallará cuando falte el valor fuente. Por defecto es `false` |
| `value` | Para `kind: "value"`, un valor literal a pasar (usado cuando se omiten `step`/`source`) |

## generic-http.request.v1 — Llamada API HTTP

Envía una sola solicitud HTTP al backend Generic HTTP.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

Comúnmente usado para llamar APIs REST externas (p. ej., servicio de análisis de PDF MinerU).

## generic-http.steps.v1 — Llamadas HTTP de múltiples pasos

Ejecuta múltiples pasos de solicitud HTTP en secuencia.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## Cómo elegir el Provider adecuado

| Tu workflow necesita... | Elegir provider | Tipo de solicitud |
|-------------------------|-----------------|-------------------|
| Realizar operaciones puramente locales, sin llamadas remotas | `pass-through` | `pass-through.run.v1` |
| Enviar un solo skill a Skill-Runner | `skillrunner` | `skillrunner.job.v1` |
| Encadenar múltiples skills en secuencia | `acp` | `skillrunner.sequence.v1` |
| Llamar una API HTTP | `generic-http` | `generic-http.request.v1` |

Nota: `provider` es el único campo que determina con qué backends es compatible un workflow. `request.kind` solo se usa para enrutar al ejecutor correcto y no participa en la inferencia de compatibilidad de backend.

## Próximos pasos

- [Depuración y pruebas](#doc/workflows%2Fcustom%2Fdebugging) — Verificar solicitudes y respuestas del workflow
- [Empaquetado y despliegue](#doc/workflows%2Fcustom%2Fpackaging) — Publicar workflows para usuarios
