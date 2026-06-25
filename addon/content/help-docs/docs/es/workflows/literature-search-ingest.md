# Literature Search & Ingest

## Propósito

Buscar literatura académica a través de IA e incorporar los resultados directamente en Zotero. Admite múltiples modos de búsqueda con confirmación interactiva antes de ejecutar la operación de incorporación.

## Casos de uso

- Buscar e incorporar en lote literatura relevante al investigar un nuevo tema
- Introducir el título, DOI, arXiv ID o PMID de un artículo conocido para importación rápida
- Expandir la búsqueda de literatura relacionada a partir de un artículo semilla

## Restricciones de entrada

| Tipo de restricción | Descripción |
|---------------------|-------------|
| Unidad de entrada | workflow (no es necesario seleccionar elementos) |
| Método de activación | Ejecutar desde el menú contextual o el Panel de control, no es necesario preseleccionar elementos |

## Modos de búsqueda

| Modo | Descripción |
|------|-------------|
| `auto` | Determinar automáticamente el modo de búsqueda más adecuado (predeterminado) |
| `topic_expansion` | Buscar por dirección de investigación o tema para encontrar literatura relacionada |
| `paper_seed_expansion` | Expandir búsqueda a partir de un artículo semilla |
| `targeted_ingest` | Localizar e incorporar con precisión un único artículo |

## Flujo de ejecución

```
1. Fase de confirmación del plan
   └── Leer biblioteca de Zotero y contexto de Synthesis
       └── Determinar automáticamente el modo de búsqueda (modo auto)
       └── Presentar el plan de búsqueda al usuario
       └── Esperar confirmación del usuario

2. Fase de búsqueda (sin incorporación)
   └── Buscar literatura candidata según el plan confirmado
       └── Mostrar lista de resultados de búsqueda
       └── El usuario selecciona la literatura a incorporar

3. Fase de incorporación
   └── Incorporar artículos uno por uno a través de zotero-bridge
       └── Incluye importación de metadatos e importación de adjuntos PDF
       └── Mostrar progreso de incorporación

4. Finalización
   └── Generar resumen de resultados de incorporación
       └── Incluye información de elementos exitosos/fallidos
```

### Detalles de interacción

- Este flujo de trabajo se ejecuta en modo **interactivo**, requiriendo confirmación del usuario en puntos clave
- Confirmación del plan: Después de que la IA presenta el plan de búsqueda, el usuario lo confirma o ajusta
- Confirmación de lista: Después de mostrar los resultados de búsqueda, el usuario marca los elementos a incorporar
- El progreso de ejecución se puede monitorear en el Panel de control

## Recomendación de modelo

🔴 **Debe** tener capacidad de búsqueda web. El núcleo de este flujo de trabajo es buscar literatura académica en línea — los modelos sin capacidad de búsqueda web no pueden realizar esta tarea.
🟢 La capacidad de razonamiento del modelo no necesita ser potente — buscar e incorporar son esencialmente tareas de recuperación y llamada a herramientas, que los modelos ligeros pueden manejar.

## Resultados

- Los resultados de búsqueda se incorporan directamente como elementos de Zotero
- Se intenta automáticamente descargar adjuntos PDF (mejor esfuerzo)
- Se puede especificar una colección destino para categorización

## Parámetros

| Parámetro | Tipo | Descripción | Valor predeterminado |
|-----------|------|-------------|---------------------|
| `query` | string | Tema de búsqueda, dirección de investigación, título de artículo, DOI, arXiv ID, PMID, etc. | — |
| `searchMode` | string | Modo de búsqueda | `auto` |
| `targetCollection` | string | Colección destino (opcional) | Vacío |

### Valores disponibles para searchMode

- `auto`: Determinar automáticamente
- `topic_expansion`: Expansión por tema
- `paper_seed_expansion`: Expansión por artículo semilla
- `targeted_ingest`: Incorporación dirigida

## Dependencias

- **Backend**: Backend ACP (requiere soporte del protocolo ACP)
- **Habilidad**: La habilidad `literature-search-ingest` debe estar desplegada en el backend

## Flujos de trabajo relacionados

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Generar resúmenes para la literatura incorporada
