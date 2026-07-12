# Export/Import Literature Bundle

## Propósito

Exportar e importar paquetes ZIP portables de elementos principales de Zotero con sus metadatos, etiquetas, notas secundarias, adjuntos, imágenes incrustadas y relaciones entre elementos, facilitando la migración entre instancias de Zotero o la colaboración con otros investigadores.

## Export Literature Bundle

### Casos de uso

- Hacer copia de seguridad de elementos Zotero seleccionados como un ZIP autónomo
- Compartir literatura con colaboradores que usan una biblioteca Zotero diferente
- Transferir elementos a otra instancia de Zotero para importar posteriormente

### Restricciones de entrada

| Tipo de restricción | Descripción |
|---------|------|
| Unidad de entrada | Elemento principal |
| Selección | Uno o más elementos principales; no se pueden mezclar adjuntos, notas y elementos secundarios |
| Salida | El usuario selecciona la ubicación de guardado del ZIP; la extensión `.zip` se añade automáticamente si falta |

### Comportamiento

1. Validar que todos los elementos seleccionados son elementos principales (no se permiten adjuntos, notas ni elementos secundarios).
2. Recopilar metadatos bibliográficos, etiquetas, notas secundarias con imágenes incrustadas, adjuntos locales legibles y adjuntos de URL de enlace para cada elemento principal.
3. Para adjuntos Markdown, reescribir referencias de imágenes locales a rutas relativas al bundle e incluir las imágenes referenciadas.
4. Registrar relaciones entre elementos solo entre elementos principales exportados en el mismo lote.
5. Escribir `manifest.json` con versión de formato, inventario de archivos, datos de integridad y cualquier advertencia de exportación.
6. Empaquetar todo en un archivo ZIP en la ubicación elegida por el usuario.

Los archivos locales faltantes se omiten con una advertencia; las imágenes remotas en Markdown se mantienen tal cual (no se descargan). Cancelar el diálogo de guardado cancela la exportación.

### Salidas

| Artefacto | Descripción |
|----------|-------------|
| `manifest.json` | Versión de formato, inventario de archivos, información de integridad, advertencias de exportación, relaciones entre elementos |
| Metadatos del elemento principal | Información bibliográfica portable y etiquetas por elemento principal |
| Notas secundarias | Notas con imágenes incrustadas |
| Adjuntos | Adjuntos locales legibles; adjuntos Markdown con imágenes locales acompañantes |
| Adjuntos de URL de enlace | Información de enlace |

## Import Literature Bundle

### Casos de uso

- Restaurar un paquete de literatura previamente exportado en la biblioteca Zotero actual
- Importar literatura compartida por un colaborador

### Restricciones de entrada

| Tipo de restricción | Descripción |
|---------|------|
| Unidad de entrada | Flujo de trabajo (no se requiere selección de elementos Zotero) |
| Método de importación | Seleccionar un archivo ZIP producido por Export Literature Bundle |
| Contexto de colección | Si se selecciona una colección real en la vista actual, los nuevos elementos se añaden a ella; de lo contrario, los elementos se importan a la raíz de la biblioteca |

### Comportamiento

1. Validar el bundle: tipo, versión, rutas de archivo, inventario de archivos, tamaño e integridad. El fallo de validación aborta sin modificar la biblioteca.
2. Para cada elemento principal en el bundle, crear un nuevo grafo de elementos Zotero: metadatos bibliográficos, etiquetas, adjuntos, notas, imágenes incrustadas y adjuntos de URL de enlace.
3. Restaurar relaciones entre elementos entre elementos principales importados correctamente del mismo bundle.
4. Si un solo elemento principal falla al importar, limpiar ese elemento y sus hijos recién creados, luego continuar con los elementos restantes.

La importación nunca reutiliza IDs o claves de elementos Zotero originales, nunca deduplica, fusiona ni sobrescribe elementos existentes. Reimportar el mismo bundle produce copias independientes.

### Salidas

Nuevos elementos principales Zotero con sus grafos de elementos completos. Los archivos faltantes, fallos de limpieza o fallos de restauración de relaciones se reportan como advertencias; el resultado puede estar parcialmente completado.

## Duración estimada

Depende del número de elementos, tamaños de adjuntos y velocidad del disco local. Los metadatos puros o notas pequeñas se completan rápidamente; los PDF grandes o muchas imágenes aumentan la duración proporcionalmente.

## Dependencias

- No se requiere conexión al backend
- Solo depende del almacenamiento local de Zotero y los permisos de acceso a archivos

## Flujos de trabajo relacionados

- [Export/Import Notes](export-import-notes) — Solo exportar o importar notas de análisis
- [Export Research Bundle](export-research-bundle) — Ensamblar un paquete de investigación de solo lectura para un proyecto de artículo (propósito diferente)
