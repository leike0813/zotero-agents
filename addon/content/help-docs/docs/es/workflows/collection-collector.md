# Collection Collector

## Propósito

Llenar una colección Zotero existente con literatura relevante que ya está presente en la misma biblioteca. El flujo de trabajo interpreta un alcance de colección de texto libre requerido, revisa los metadatos, etiquetas y membresía de Synthesis Topic actuales, y aplica una lista de membresía validada.

## Entradas

| Parámetro | Requerido | Descripción |
| --- | --- | --- |
| `collection` | Sí | Colección Zotero existente seleccionada por ruta. |
| `collectionScope` | Sí | Significado, tema de investigación o límite de literatura representado por la colección. |

No se requiere selección de elementos Zotero.

## Comportamiento

1. Recorrer por páginas todos los elementos regulares de nivel superior en la biblioteca de la colección objetivo.
2. Excluir elementos ya presentes en la colección objetivo.
3. Construir candidatos a partir de coincidencias de metadatos/etiquetas y Synthesis Topics existentes relevantes.
4. Evaluar semánticamente como máximo 250 candidatos en lotes de 20.
5. Seleccionar artículos con una relevancia de al menos `0.65` y conservar la evidencia y razón de cada decisión.
6. Volver a verificar la membresía actual y agregar los elementos restantes a través de workflow apply.

El flujo de trabajo es automático y no se detiene para confirmación. No busca en la web, no incorpora nuevos artículos, no edita etiquetas, no crea colecciones ni muta Synthesis Topics. El contexto de Topic faltante se degrada a evidencia de metadatos y etiquetas.

## Resultado y aplicación

El resultado de la ejecución contiene las referencias de elementos Zotero seleccionados, títulos, valores de relevancia, base de evidencia, IDs de Topic coincidentes, razones, advertencias y diagnósticos de selección. Una selección vacía es un no-op exitoso. Apply valida nuevamente el objetivo y las referencias de elementos y permanece idempotente si la membresía cambió mientras el skill se ejecutaba.
