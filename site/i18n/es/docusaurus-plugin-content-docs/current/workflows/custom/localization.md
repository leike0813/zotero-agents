# Localización

El sistema de workflows soporta localización multiidioma, permitiendo que el mismo workflow muestre nombres y descripciones correspondientes en diferentes interfaces de Zotero según el idioma.

## Jerarquía de localización

La localización de workflows sigue el siguiente orden de prioridad:

```
Mensajes en línea (manifest.i18n.messages)  ← Mayor prioridad
        ↓
Archivos de locale a nivel de paquete (workflow-package's locales/)
        ↓
Campos raw del manifiesto (label / description etc. valores por defecto en inglés)
        ↓
Fallback de clave (ej., "workflows.my-id.label")
```

## Localización en línea (workflow individual)

Definida directamente en `workflow.json`:

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的 Workflow",
        "taskNameTemplate": "处理中: {query}",
        "parameters.language.title": "语言",
        "parameters.language.description": "选择输出内容的语言"
      },
      "ja-JP": {
        "label": "マイワークフロー",
        "taskNameTemplate": "処理中: {query}"
      }
    }
  }
}
```

Campos como `label` y `taskNameTemplate` en el manifiesto raw sirven como valores por defecto (generalmente en inglés), y las traducciones en `i18n.messages` sobrescriben el texto mostrado para el idioma correspondiente.

### Convenciones de nombres de clave

```
label                                    — Nombre del workflow
taskNameTemplate                         — Plantilla de nombre de tarea
parameters.<paramKey>.title              — Título del parámetro
parameters.<paramKey>.description         — Descripción del parámetro
skills.<skillId>.name                    — Nombre mostrado del skill en el workflow actual
```

`skills.<skillId>.name` solo afecta al nombre mostrado en la interfaz. El `runner.json.name` del paquete de Skill sigue siendo el nombre predeterminado del skill; si el workflow no declara una traducción correspondiente, la interfaz muestra `runner.json.name` como respaldo.

## Localización a nivel de paquete (paquete de múltiples workflows)

Declare archivos de locale en `workflow-package.json`:

```json
{
  "id": "my-package",
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

Contenido de `locales/zh-CN.json`:

```json
{
  "workflows.my-workflow.label": "我的工作流",
  "workflows.my-workflow.taskNameTemplate": "处理中: {query}",
  "workflows.my-workflow.skills.my-skill.name": "我的技能",
  "workflows.my-workflow.parameters.language.title": "语言",
  "workflows.another-workflow.label": "另一个工作流"
}
```

Las claves en archivos de locale a nivel de paquete usan el formato completamente calificado: `workflows.<workflowId>.<field>`.

### Uso mixto

Los mensajes a nivel de paquete y los mensajes en línea de workflow pueden coexistir, con los mensajes en línea teniendo mayor prioridad. Mejores prácticas:

- Mantener el idioma por defecto (ej., inglés) en los campos de workflow.json
- Colocar las traducciones en archivos de locale a nivel de paquete para gestión unificada
- Si una traducción es muy específica de un workflow en particular, también puede colocarse en los mensajes en línea del workflow

## Lógica de coincidencia de idioma

El sistema intenta coincidir con la configuración de idioma del usuario en el siguiente orden:

1. **Coincidencia exacta**: El locale del usuario es `"zh-CN"`, buscar mensajes `"zh-CN"`
2. **Coincidencia por subetiqueta de idioma**: El locale del usuario es `"zh-Hans-CN"`, si no se encuentra coincidencia exacta, intentar coincidir `"zh"`
3. **Fallback a defaultLocale**: Usar el idioma especificado por `i18n.defaultLocale`
4. **Fallback a valor de campo raw**: Usar los valores de campo raw en `workflow.json` (ej., `label`)
5. **Fallback a clave**: Mostrar el nombre de clave en sí

## Localización de valores enum de parámetros

Si un parámetro tiene valores enum, el texto mostrado para los valores enum actualmente usa los campos `title` y `description` del parámetro. Para escenarios complejos que requieran localizar los valores enum en sí, se recomienda explicar esto en el `label` o descripción del workflow.

## Agregar un nuevo idioma a un workflow

1. Cree un nuevo archivo `<locale>.json` en el directorio `locales/` del paquete
2. Consulte archivos de locale existentes (ej., `zh-CN.json`) y traduzca todas las claves
3. Agrege la nueva entrada de idioma en `i18n.locales` de `workflow-package.json`
4. Recargue el plugin para que surta efecto

## Referencia

- Ejemplo de archivo de locale oficial: `content/official/workflows/literature-workbench-package/locales/zh-CN.json`
- Ejemplo de declaración i18n a nivel de paquete: `content/official/workflows/literature-workbench-package/workflow-package.json`

## Próximos pasos

- [Tipos de solicitudes](request-kinds) — Elegir backend de ejecución y tipo de solicitud
- [Empaquetado y despliegue](packaging) — Publicar paquetes de workflows con localización
