# Empaquetado y despliegue

Los workflows soportan dos formas: **workflow individual** y **paquete de múltiples workflows**. Los workflows individuales se adaptan a escenarios simples, mientras que los paquetes de múltiples workflows se adaptan a colecciones de workflows con código compartido.

## Workflow individual

La forma más simple: un directorio que contiene un `workflow.json` y sus scripts Hook:

```
my-workflow/
├── workflow.json
└── hooks/
    ├── buildRequest.mjs
    └── applyResult.mjs
```

Un workflow individual no tiene `packageId`, y los scripts Hook no pueden compartir código mediante importaciones relativas.

## Paquete de múltiples workflows

Cuando múltiples workflows comparten lógica, pueden organizarse como un paquete:

```
my-package/
├── workflow-package.json       # Manifiesto del paquete
├── lib/                        # Código compartido
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── buildRequest.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # Archivos de localización a nivel de paquete
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### Código compartido dentro de un paquete

Los scripts Hook en un paquete pueden importar módulos compartidos desde `lib/` mediante rutas relativas:

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // Lógica de procesamiento compartida
}
```

Nota: Los scripts Hook se ejecutan como ES Modules, soportando sentencias `import`, pero las rutas de importación deben ser relativas al archivo Hook mismo.

## Métodos de despliegue

### Directorio de workflows del usuario

Coloque el directorio del workflow bajo el **Directorio de workflows** configurado en las preferencias de Zotero. El Workflow Manager escanea automáticamente este directorio (incluyendo subdirectorios) y descubre todos los archivos `workflow.json`.

Ubicación de configuración: Zotero → Settings → Zotero Agents → Workflow Directory.

### Reglas de escaneo de directorios

- El Workflow Manager **escanea recursivamente** el directorio de workflows y sus subdirectorios
- Al encontrar un `workflow.json` lo registra como un workflow
- Si se encuentra `workflow-package.json` dentro de un directorio de paquete, los sub-workflows se cargan en modo paquete
- Si el directorio de workflows no existe o no contiene workflows válidos, el Workflow Manager reporta una advertencia pero no afecta el funcionamiento del plugin

### Compatibilidad con otros formatos

| Ubicación de almacenamiento | Visibilidad | Descripción |
|----------------------------|-------------|-------------|
| Paquete oficial de workflows `content/official/workflows/` | Todos los usuarios | Instalado independientemente mediante Content Feed; no modificable directamente por el usuario |
| Directorio de workflows del usuario | Usuario actual | Puede agregarse/modificarse/eliminarse libremente |
| Directorios oficial + usuario | Visualización combinada | Los workflows de ambas ubicaciones se muestran conjuntamente en el Dashboard |

## Validación

Después de desplegar un workflow en el directorio de usuario:

1. **Vuelva a abrir el Dashboard**; el nuevo workflow debería aparecer en la lista de workflows de la página principal
2. Después de seleccionar ítems coincidentes, haga clic derecho → Zotero Agents; el nuevo workflow debería aparecer
3. Antes de ejecutar el workflow, verifique que los parámetros en el diálogo de configuración sean correctos

## Próximos pasos

- [Localización](#doc/workflows%2Fcustom%2Flocalization) — Agregar soporte multiidioma a los workflows
- [Tipos de solicitudes](#doc/workflows%2Fcustom%2Frequest-kinds) — Elegir el backend de ejecución y tipo de solicitud apropiados
- [Depuración y pruebas](#doc/workflows%2Fcustom%2Fdebugging) — Verificar la correcta ejecución del workflow
