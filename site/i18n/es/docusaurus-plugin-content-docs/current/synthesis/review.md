# Centro de revisión

La superficie Review es el lugar centralizado para gestionar todos los elementos pendientes de revisión en el sistema Synthesis. Contiene tres sub-pestañas: **Citation Matches**, **Concepts** y **Topic Graph**.

![Centro de revisión de Synthesis](/img/docs/synthesis/review.png)

## Revisión de coincidencias de citas

Cuando el sistema empareja automáticamente referencias con elementos de Zotero, las coincidencias que no se pueden determinar con certeza se envían como propuestas a la cola de revisión.

### Estado de las propuestas de coincidencia

| Estado | Descripción |
|--------|-------------|
| **Pending** | Candidato de coincidencia generado por el sistema en espera de confirmación o rechazo del usuario |
| **Accepted** | El usuario confirmó la vinculación; la referencia ahora está enlazada a un elemento de Zotero |
| **Rejected** | El usuario rechazó la vinculación |
| **Reopened** | Una propuesta procesada previamente reabierta para revisión |

### Acciones disponibles

- **Accept**: Confirmar la relación de vinculación cita-elemento
- **Reject**: Declinar la propuesta de coincidencia
- **Batch Operations**: Seleccionar múltiples propuestas para aceptar o rechazar en lote

### Confianza de coincidencia

Consulta [Índice y Grafo de Citas](index-and-citation) para las descripciones de los niveles de confianza. Las coincidencias deterministas y de alta confianza se procesan automáticamente; las coincidencias de confianza media e inferior entran en la cola de revisión.

### Filtrado y ordenación

Puedes filtrar la lista de propuestas por:

- Estado de coincidencia (pending / accepted / rejected)
- Estrategia de coincidencia (DOI / título / autor, etc.)
- Nivel de confianza
- Ordenar por tiempo o relevancia

## Revisión de conceptos

La expansión automática de la base de conocimiento de conceptos puede producir sugerencias de coincidencia de conceptos con baja confianza, requiriendo revisión y confirmación por parte del usuario.

### Objetivos de revisión

- **Sugerencias de nuevos conceptos**: Candidatos de nuevos conceptos extraídos automáticamente de la literatura
- **Confirmación de acepciones**: Confirmar cuando se añade un nuevo significado (acepción) a un concepto existente
- **Sugerencias de alias**: Confirmar cuando se detecta un nombre alternativo para el mismo concepto

### Cómo operar

Cada sugerencia muestra el nombre del concepto, fuente de extracción, nivel de confianza y evidencia de soporte. Puedes:

- **Accept**: Confirmar la sugerencia y escribirla en la base de conocimiento de conceptos
- **Reject**: Descartar la sugerencia
- **View Context**: Ver dónde aparece el concepto en la literatura

## Revisión del grafo de temas

Cuando el sistema detecta relaciones potenciales entre temas, genera propuestas de relación para revisión.

### Tipos de relaciones

| Relación | Descripción |
|----------|-------------|
| `broader_than` | A es un tema más amplio que B |
| `related_to` | Dos temas están relacionados |
| `overlaps_with` | Dos temas tienen superposición de contenido |
| `contrasts_with` | Dos temas contrastan entre sí |

### Contenido de la propuesta

Cada propuesta muestra:

- **Nombres y descripciones** del tema origen y destino
- **Tipo de relación sugerido**
- **Confianza** (basada en análisis semántico del contenido del tema)
- **Evidencia de soporte** (artículos cubiertos conjuntamente, etc.)

### Cómo operar

- **Accept**: Confirmar la relación y escribirla en el grafo de temas
- **Reject**: Descartar la sugerencia de relación
- **Reopen**: Reabrir una propuesta procesada previamente para revisión

## Siguientes pasos

- [Base de conocimiento de conceptos](concepts) — Gestionar conceptos, acepciones, alias
- [Temas](topic-synthesis) — Gestionar síntesis de temas
