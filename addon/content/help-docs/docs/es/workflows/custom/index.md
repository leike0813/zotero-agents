# Visión general de la arquitectura de Workflow personalizado

El sistema de workflow de Zotero Agents utiliza una **arquitectura extensible** — cada workflow es un directorio independiente y autónomo que requiere únicamente un archivo de manifiesto `workflow.json` y los scripts Hook correspondientes. El Workflow Manager del plugin lo descubre y carga automáticamente.

## Estructura de directorios

Los workflows pueden almacenarse en dos ubicaciones:

| Ubicación | Tipo | Descripción |
|-----------|------|-------------|
| Paquete oficial de workflows | Oficial | Instalado independientemente mediante Content Feed. Ubicado en `<Zotero Data>/zotero-agents/content/official/workflows/` |
| Directorio de workflows del usuario | Personalizado | Configurado en las preferencias; el Workflow Manager lo escanea automáticamente |

El **Workflow Manager** del plugin escanea recursivamente el directorio del paquete oficial y el directorio de workflows del usuario, descubre archivos `workflow.json` y los registra como workflows disponibles.

## Un ejemplo mínimo de Workflow

Crear un workflow personalizado requiere solo **2 archivos**:

```
my-workflow/
├── workflow.json
└── hooks/
    └── applyResult.mjs
```

### workflow.json

```json
{
  "id": "hello-world",
  "label": "Hello World",
  "provider": "pass-through",
  "inputs": {
    "unit": "parent"
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

### hooks/applyResult.mjs

```js
export function applyResult({ parent, runtime }) {
  const title = runtime.helpers.resolveItemRef(parent).getField("title");
  runtime.hostApi.notifications.toast({
    text: `Hello, ${title}!`,
    type: "success",
  });
  return { greeted: true };
}
```

Después de colocar `my-workflow/` en el directorio de workflows del usuario, vuelva a abrir el Dashboard para ver el workflow.

## Capas de la arquitectura de Workflow

El ciclo de vida de un workflow involucra las siguientes capas:

```
Acción del usuario (Clic derecho / Dashboard)
    │
    ▼
Workflow Manager — Descubrir, cargar, validar
    │
    ├── Entradas — ¿Qué ítems seleccionó el usuario?
    ├── Parámetros — ¿Qué parámetros configuró el usuario?
    ├── Hooks — Preprocesamiento, construcción de solicitudes, manejo de resultados
    └── Ejecución — Enviado a un backend por el Provider
         │
         ▼
      Provider (SkillRunner / ACP / Generic HTTP / Pass-through)
         │
         ▼
      Backend — Motor de ejecución remoto o local
```

## Clasificación de patrones de Workflow

Según el método de ejecución y el tipo de backend, los workflows pueden clasificarse de la siguiente manera:

| Patrón | Caso de uso típico | Tipo de backend |
|--------|-------------------|-----------------|
| **pass-through** | Operaciones puramente locales (exportación, procesamiento de archivos), no requiere backend remoto | Ninguno |
| **skillrunner.job.v1** | Ejecución de skill de un solo paso enviada a SkillRunner | skillrunner / acp |
| **skillrunner.sequence.v1** | Ejecución encadenada de skills en múltiples pasos, con retransmisión entre pasos | acp |
| **generic-http.request.v1** | Llamada única a API HTTP | generic-http |
| **generic-http.steps.v1** | Llamadas a API HTTP en múltiples pasos | generic-http |

## Conceptos clave de workflow.json

```json
{
  "id": "identificador único",
  "label": "nombre para mostrar",
  "provider": "tipo de backend",
  "inputs": { "unit": "tipo de unidad de entrada" },
  "parameters": { /* parámetros configurables */ },
  "execution": { /* control de ejecución */ },
  "request": { "kind": "tipo de solicitud" },
  "hooks": { "applyResult": "ruta del script para manejo de resultados" }
}
```

La siguiente página explica el significado y uso de cada campo en detalle.

## Próximos pasos

- [Escribir el manifiesto de Workflow](#doc/workflows%2Fcustom%2Fmanifest) — Explicación detallada de cada campo en workflow.json
- [Sistema de Hooks](#doc/workflows%2Fcustom%2Fhooks) — Cómo escribir hooks para cada etapa
- [Sistema de parámetros](#doc/workflows%2Fcustom%2Fparameters) — Definir parámetros configurables
