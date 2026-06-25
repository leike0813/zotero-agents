# Sistema de parámetros

Los workflows pueden definir parámetros configurables que muestran un cuadro de diálogo de configuración para que el usuario los complete antes de ejecutar. El sistema de parámetros soporta múltiples tipos y fuentes de datos dinámicas.

## Definición de parámetros

Los parámetros se definen en el campo `parameters` de `workflow.json`:

```json
{
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
      "description": "Select the language for output content",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    },
    "maxResults": {
      "type": "number",
      "title": "Maximum Results",
      "description": "Upper limit on the number of results returned",
      "default": 10,
      "min": 1,
      "max": 100
    },
    "enableFilter": {
      "type": "boolean",
      "title": "Enable Filtering",
      "description": "Whether to enable result filtering",
      "default": true,
      "visible_if": { "parameter": "language", "equals": false }
    }
  }
}
```

## Tipos de parámetros

| Tipo | Descripción | Control aplicable |
|------|-------------|-------------------|
| `string` | Cadena de texto | Cuadro de texto / desplegable / selector dinámico |
| `number` | Número | Entrada numérica (soporta restricciones min/max) |
| `boolean` | Booleano | Interruptor / casilla de verificación |

## Valores enum y valores personalizados

```json
{
  "language": {
    "type": "string",
    "enum": ["en-US", "zh-CN", "ja-JP"],
    "allowCustom": true,
    "default": "en-US"
  }
}
```

- `enum`: Lista de valores preestablecidos sugeridos. Se muestra como opciones seleccionables en el menú desplegable
- `allowCustom` (solo tipo string): Cuando se establece en `true`, los valores de `enum` son solo recomendaciones; los usuarios pueden ingresar libremente otros valores. Cuando se establece en `false` o se omite, los usuarios solo pueden seleccionar de `enum`

## Visualización condicional

```json
{
  "advancedMode": {
    "type": "boolean",
    "title": "Advanced Mode",
    "default": false
  },
  "customEndpoint": {
    "type": "string",
    "title": "Custom Endpoint",
    "visible_if": { "parameter": "advancedMode", "equals": true }
  }
}
```

`visible_if` controla la visualización/ocultación de parámetros en el cuadro de diálogo de configuración:

- `equals: true` — Mostrar solo cuando el valor del parámetro objetivo sea verdadero
- `equals: false` — Mostrar solo cuando el valor del parámetro objetivo sea falso

**Ejemplo: Mostrar/Ocultar vinculado**

```json
{
  "auto_tag_regulator": {
    "type": "boolean",
    "title": "Auto Tag Regulator",
    "default": true
  },
  "auto_tag_infer_tag": {
    "type": "boolean",
    "title": "Infer tags",
    "default": true,
    "visible_if": { "parameter": "auto_tag_regulator", "equals": true }
  }
}
```

Cuando `auto_tag_regulator` está desmarcado, el parámetro `auto_tag_infer_tag` se oculta automáticamente.

## Fuentes de opciones dinámicas

Las opciones de valores de parámetros pueden provenir de datos en vivo de Zotero:

```json
{
  "targetCollection": {
    "type": "string",
    "title": "Target Collection",
    "default": "",
    "optionsSource": {
      "kind": "zotero.collections",
      "library": "current",
      "includeEmpty": true,
      "valueFormat": "collectionRef",
      "labelFormat": "path"
    }
  },
  "relatedTopic": {
    "type": "string",
    "title": "Related Topic",
    "optionsSource": {
      "kind": "synthesis.topics",
      "filter": "updatable"
    }
  }
}
```

### Fuentes de opciones soportadas

| `kind` | Descripción | Parámetros disponibles |
|--------|-------------|------------------------|
| `zotero.collections` | Lista de colecciones en la biblioteca actual de Zotero | `library` (current/user/number), `includeEmpty`, `valueFormat` (collectionRef), `labelFormat` (path/title) |
| `synthesis.topics` | Lista de temas en el Synthesis Workbench | `filter` (all/updatable), `valueFormat` (topicId), `labelFormat` (title) |

### Parámetros comunes de optionsSource

| Parámetro | Descripción |
|-----------|-------------|
| `library` | Ámbito de biblioteca. `"current"` (biblioteca actual), `"user"` (biblioteca de usuario), número (ID de biblioteca específica) |
| `includeEmpty` | Si incluir una opción vacía (para "sin selección") |
| `valueFormat` | Formato de los valores de opción: `"collectionRef"` / `"topicId"` |
| `labelFormat` | Formato de visualización de las etiquetas de opción: `"path"` / `"title"` |
| `allowStale` | Permitir el uso de datos en caché (evita solicitar nuevamente cada vez que se abre la configuración) |
| `filter` | Condición de filtrado (varía según kind) |

## Restricciones para parámetros numéricos

```json
{
  "confidence": {
    "type": "number",
    "title": "Confidence Threshold",
    "default": 0.8,
    "min": 0,
    "max": 1
  }
}
```

`min` y `max` restringen el rango de valores de entrada.

## Lectura de parámetros en Hooks

En `buildRequest`, `filterInputs`, y `applyResult`, puedes leer los valores de parámetros establecidos por el usuario a través de `executionOptions.workflowParams`:

```js
export function buildRequest({ executionOptions, runtime }) {
  const params = executionOptions?.workflowParams || {};
  const language = params.language || "en-US";
  const maxResults = params.maxResults || 10;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    parameter: { language, max_results: maxResults },
  };
}
```

## Localización de parámetros

El `title` y `description` de los parámetros soportan localización:

```json
{
  "i18n": {
    "messages": {
      "zh-CN": {
        "parameters.language.title": "Language",
        "parameters.language.description": "Select the language for output content"
      }
    }
  }
}
```

Consulta la página de [Localización](localization) para el mecanismo completo de localización.

## Próximos pasos

- [Contexto de selección](selection-context) — Comprende cómo se pasa la selección de elementos del usuario al workflow
- [Tipos de solicitud](request-kinds) — Métodos de paso de parámetros para diferentes tipos de solicitud
