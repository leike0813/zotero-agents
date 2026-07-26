# Literature Translator

## Propósito

Traducir un adjunto de literatura (Markdown o PDF) a un idioma de destino especificado, produciendo un archivo Markdown traducido y datos de alineación bilingüe. Se recomienda encarecidamente convertir primero los PDF a Markdown usando [MinerU](#doc/workflows%2Fmineru) para una calidad de traducción significativamente mejor.

## Entradas

| Parámetro | Requerido | Descripción |
| --- | --- | --- |
| `target_language` | No | Idioma de destino (predeterminado: `zh-CN`). Soportados: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Se aceptan valores personalizados. |
| `mode` | No | Modo de traducción: `fast` (predeterminado) o `high_quality` (más lento). |

Tipos de adjunto aceptados: `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf`.

### Métodos de activación

- Seleccionar un adjunto directamente (PDF o Markdown)
- Seleccionar un elemento principal — el complemento encuentra automáticamente el primer adjunto que califique
- Solo se procesa un adjunto por elemento principal
- Los elementos con una traducción existente en el idioma de destino se omiten automáticamente

## Comportamiento

1. Resolver el adjunto objetivo de la selección (adjunto directo o primer adjunto que califique bajo el elemento principal).
2. Verificar si ya existe un artefacto de traducción para el idioma de destino; si es así, omitir.
3. Enviar el trabajo de traducción al backend Skill-Runner con el skill `literature-translator`.
4. La canalización de traducción ejecuta múltiples etapas: análisis de alineación, ejecución de traducción y verificación de QA.
5. Escribir el archivo Markdown traducido en el mismo directorio que la fuente, nombrado `<source-name>_<target-language>.md`, y crear un adjunto vinculado bajo el elemento principal.

El flujo de trabajo es completamente automático y no se detiene para intervención del usuario.

## Resultado y aplicación

| Artefacto | Descripción |
|----------|-------------|
| Markdown traducido | Escrito junto al archivo fuente como `<source-name>_<target-language>.md` |
| Adjunto vinculado | Creado bajo el elemento principal apuntando al Markdown traducido |
| Datos de alineación | JSON de alineación bilingüe en el espacio de trabajo del skill |
| Glosario | JSON de glosario extraído en el espacio de trabajo del skill |
| Informe de QA | JSON de informe de aseguramiento de calidad en el espacio de trabajo del skill |

## Duración estimada

| Tamaño del archivo | Tiempo estimado |
|-----------|---------------|
| Artículo corto (≤10 páginas) | 3–5 minutos |
| Estándar (10–30 páginas) | 5–10 minutos |
| Artículo largo (30+ páginas) | 10–18 minutos |

## Recomendación de modelo

Se recomienda un modelo con capacidad de delegación de subagentes. La canalización de traducción incluye etapas de análisis de alineación, ejecución de traducción y verificación de QA. La delegación de subagentes permite el procesamiento paralelo de estas subtareas, mejorando significativamente la eficiencia y la consistencia de la traducción.

## Dependencias

- **Backend**: Skill-Runner
- **Skill**: `literature-translator`

## Flujos de trabajo relacionados

- [MinerU PDF Parsing](#doc/workflows%2Fmineru) — Convertir PDF a Markdown primero para mejor calidad de traducción
- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Generar resumen de literatura y artefactos de análisis
