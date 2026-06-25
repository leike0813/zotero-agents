# Interactive Literature Explainer

## Propósito

Mantener un diálogo multifase con la IA para comprender en profundidad el contenido de la literatura. Admite preguntas libres basadas en el contexto de la literatura y genera automáticamente notas de estudio estructuradas al finalizar la conversación.

:::tip No hay que preocuparse por las alucinaciones
Las respuestas de la IA deben pasar por una **puerta de verificación**. Las respuestas con incertidumbre se marcan explícitamente, para que puedas discutir con confianza los detalles del artículo con la IA.
:::

## Casos de uso

- Encontrar conceptos o terminología que no se entienden al leer un artículo
- Profundizar en una parte específica del artículo (métodos, experimentos, derivaciones)
- Trabajar con la IA para rastrear el razonamiento y las contribuciones del artículo

## Restricciones de entrada

| Tipo de restricción | Descripción |
|---------------------|-------------|
| Unidad de entrada | Adjunto |
| Tipos aceptados | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Límite por elemento padre | Como máximo 1 adjunto |

### Métodos de activación

- Seleccionar directamente un adjunto PDF o Markdown
- Seleccionar el elemento padre, y el complemento expandirá automáticamente su primer adjunto elegible

## Flujo de ejecución

```
1. Construir solicitud
   └── Subir archivo fuente a Skill-Runner
       └── Invocar skill_id: "literature-explainer"

2. Procesamiento en Skill-Runner
   └── Iniciar modo interactivo
       └── Abrir panel de chat del Panel de control

3. Interacción del usuario
   └── Conversar con la IA en el Panel de control de tareas
       └── Enviar mensajes, ver respuestas

4. Finalizar conversación
   └── El usuario cierra o cancela manualmente
       └── Generar resultados de la conversación
```

### Flujo de interacción

1. Después de que el flujo de trabajo se inicia, el Panel de control de tareas abre automáticamente el panel de chat
2. Escribir preguntas o instrucciones en la entrada del chat
3. Las respuestas de la IA se muestran en tiempo real en el panel
4. La conversación puede continuar hasta que el usuario decida finalizarla
5. Cerrar el panel activa el procesamiento de resultados

## Duración estimada

Depende del número de turnos de conversación. La carga de literatura y la inicialización toman aproximadamente 1-2 minutos, después de lo cual la conversación procede en tiempo real.

## Recomendación de modelo

🟡 Se recomiendan modelos con **capacidad de búsqueda web**. Literature Explainer tiene un mecanismo integrado de verificación de evidencia — si el modelo puede buscar en la web para verificar citas y hechos del artículo, la calidad de verificación mejora significativamente. Cuando el acceso web no está disponible, la funcionalidad de verificación se ve severamente limitada, pero aún es posible realizar razonamiento y preguntas basadas en el contenido de la literatura.

## Resultados

Una vez completada la ejecución, se crea **1 nota de estudio (nota de conversación)** bajo el elemento padre:

- Tipo: `data-zs-note-kind="conversation"`
- Contenido: Historial de preguntas y respuestas (formato HTML), que se puede conservar como notas de estudio
- Estrategia de actualización: Cada ejecución crea una nueva nota de conversación (en lugar de sobrescribir)

![Nota de estudio de Literature Explainer](/img/docs/workflows/literature-explainer_note.png)

## Parámetros

| Parámetro | Tipo | Descripción | Valor predeterminado |
|-----------|------|-------------|---------------------|
| `language` | string | Idioma de la conversación | `zh-CN` |

Valores disponibles: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. También se admite entrada personalizada.

## Dependencias

- **Backend**: Servicio Skill-Runner
- **Configuración del backend**: Configurar un backend de tipo Skill-Runner en el gestor de backends
- **Habilidad**: La habilidad `literature-explainer` debe estar desplegada en el Skill-Runner

## Flujos de trabajo relacionados

- [Literature Analysis](literature-analysis) — Generar resúmenes de literatura automáticamente (se recomienda ejecutar primero)
- [Deep Reading](literature-deep-reading) — Generar una vista estructurada de lectura profunda
