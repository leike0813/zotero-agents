# Literature Search & Ingest

## Propósito

Buscar literatura académica con IA e incorporar los resultados aprobados directamente en Zotero. Una consulta en blanco puede iniciar una conversación guiada que convierte una necesidad de investigación en un brief de búsqueda confirmado.

## Modos de búsqueda

| Modo | Descripción |
|------|------|
| `auto` | Detecta un modo adecuado para una consulta no vacía; una consulta vacía inicia la planificación guiada. |
| `guided` | Aclara la necesidad de investigación, inspecciona la cobertura local de Zotero/Synthesis y ejecuta directamente el brief confirmado. |
| `topic_expansion` | Búsqueda por dirección de investigación o tema. |
| `paper_seed_expansion` | Expansión desde un artículo semilla. |
| `targeted_ingest` | Localizar e incorporar con precisión un solo artículo. |

## Flujo de ejecución

```
1. Planificación guiada (consulta auto en blanco o modo guided)
    └── Aclarar el objetivo de investigación en rondas breves
    └── Solo leer cobertura local de Zotero/Synthesis
    └── Presentar un brief de búsqueda estructurado
    └── Esperar confirmación; sin búsqueda web ni escrituras antes de la confirmación

2. Búsqueda y selección de candidatos
    └── Buscar según el brief confirmado o el modo explícito
    └── Verificar identificadores, metadatos autorizados, páginas de destino y evidencia legal de PDF público
    └── El usuario selecciona los artículos a incorporar

3. Incorporación y finalización
    └── Incorporar cada artículo aprobado a través de zotero-bridge
    └── Generar JSON de incorporación conciso, incluyendo enlaces de PDF faltantes
```

## Parámetros

| Parámetro | Tipo | Descripción | Predeterminado |
|------|------|------|------|
| `query` | string | Tema de búsqueda, identificador de artículo, semilla o valor vacío para planificación guiada. | Vacío |
| `searchMode` | string | `auto`, `guided`, `topic_expansion`, `paper_seed_expansion` o `targeted_ingest`. | `auto` |
| `searchBreadth` | string | Elija descubrimiento amplio por varias vías, cobertura equilibrada o una primera pasada rápida. | `broad` |
| `languageHints` | string[] | Sugerencias opcionales de idioma BCP 47, como `en`, `zh-CN`, `ja` o `de`; amplían las consultas y fuentes, pero no filtran otros idiomas. | `[]` |
| `targetCollection` | string | Colección destino opcional. | Vacío |

## Salidas

- La evidencia del candidato se verifica antes de que el usuario pueda aprobar la incorporación.
- Cada incorporación exitosa se crea o reutiliza en Zotero; los enlaces legales de páginas de destino permanecen disponibles cuando no se adjunta ningún PDF.
- Las ejecuciones guiadas reportan `search_mode: "guided"`; otras ejecuciones conservan su modo de búsqueda concreto.

## Dependencias

- **Backend**: Backend ACP con ejecución interactiva
- **Skill**: `literature-search-ingest`
