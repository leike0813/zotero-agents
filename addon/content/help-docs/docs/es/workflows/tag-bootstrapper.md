# Tag Bootstrapper

## Propósito

Crear interactivamente un vocabulario de etiquetas controlado para un dominio de investigación con la IA. Se recomienda ejecutar antes del primer [Literature Analysis](#doc/workflows%2Fliterature-analysis) para establecer una base para la regulación automática de etiquetas posterior.

## Casos de uso

- Iniciar una nueva dirección de investigación y necesitar establecer un sistema de etiquetas
- Aún no existe un vocabulario de etiquetas controlado en la biblioteca actual de Zotero
- Querer que la IA ayude a diseñar una clasificación de etiquetas específica del dominio

## Restricciones de entrada

| Tipo de restricción | Descripción |
|---------------------|-------------|
| Unidad de entrada | workflow (no es necesario seleccionar elementos) |
| Método de activación | Ejecutar desde el Panel de control |

## Flujo de ejecución

```
1. Iniciar interacción
   └── Conversar con la IA en el Panel de control

2. Definir dominio
   └── Describir el campo de investigación y áreas de interés
       └── La IA propone un sistema de clasificación de etiquetas

3. Refinamiento iterativo
   └── Revisar las etiquetas sugeridas por la IA
       └── Ajustar, añadir, eliminar, renombrar

4. Confirmar y escribir
   └── Escribir el vocabulario de etiquetas final en el sistema Synthesis
```

### Detalles de interacción

- El flujo de trabajo se ejecuta en modo **interactivo**, conversando con la IA en el Panel de control
- Se puede ajustar la dirección en cualquier momento durante la conversación

## Duración estimada

| Escenario | Tiempo estimado |
|-----------|-----------------|
| Creación de vocabulario inicial | 3-8 minutos |
| Añadir etiquetas | 3-5 minutos |

## Recomendación de modelo

🟢 Un modelo de capacidad media es suficiente; no se necesita el modelo más potente.

## Resultados

Una vez completada la ejecución, el vocabulario de etiquetas controlado se escribe en el sistema Synthesis y se puede ver y gestionar en la página de Etiquetas del Synthesis Workbench.

## Parámetros

| Parámetro | Tipo | Descripción | Valor predeterminado |
|-----------|------|-------------|---------------------|
| `tag_note_language` | string | Idioma de las notas de etiquetas | `zh-CN` |

Valores disponibles: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. También se admite entrada personalizada.

## Dependencias

- **Backend**: Servicio Skill-Runner
- **Configuración del backend**: Configurar un backend de tipo Skill-Runner en el gestor de backends
- **Habilidad**: La habilidad `tag-bootstrapper` debe estar desplegada en el Skill-Runner

## Flujos de trabajo relacionados

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Puede ejecutar automáticamente la regulación de etiquetas en cascada durante el análisis
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Ejecutar la regulación de etiquetas en la literatura existente
