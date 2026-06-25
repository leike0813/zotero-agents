# Invocación y configuración de flujos de trabajo

## Métodos de invocación

![Botón de barra de herramientas para ejecutar flujo de trabajo](/img/icon_play.png)

### A través del menú contextual

1. Seleccionar uno o más elementos en la lista de elementos de Zotero
2. Hacer clic derecho y seleccionar el submenú **Zotero Agents**
3. Elegir un flujo de trabajo de la lista
4. Si aparece un diálogo de configuración, completar los parámetros y hacer clic en Ejecutar

### A través del panel de control

1. Abrir el **Panel de control** (botón de la barra de herramientas o menú)
2. Buscar el flujo de trabajo objetivo en la lista de flujos de trabajo de la página principal
3. Hacer clic en el botón **Ejecutar**
4. Si aparece un diálogo de configuración, completar los parámetros y enviar

## Diálogo de configuración del flujo de trabajo

Antes de ejecutar un flujo de trabajo, puede aparecer un diálogo de configuración con las siguientes opciones:

### Configuración de parámetros

Muestra todos los parámetros configurables declarados por el flujo de trabajo, que varían según la definición de cada flujo.

### Opciones del proveedor

| Opción | Descripción |
|--------|-------------|
| Selección de backend | Elegir la instancia de backend para ejecutar este flujo de trabajo |
| Selección de modelo | El modelo de IA a utilizar (proporcionado por el backend) |
| Configuración de modo | Configuración del modo de ejecución |
| Esfuerzo de razonamiento | Nivel de esfuerzo de razonamiento (si el backend lo admite) |

### Modos de ejecución

| Modo | Descripción |
|------|-------------|
| `auto` | Ejecución automática, no requiere intervención del usuario |
| `sync` | Ejecución síncrona, espera los resultados |
| `async` | Ejecución asíncrona, se ejecuta en segundo plano |

### Modos de SkillRunner

Para backends de Skill-Runner:

| Modo | Descripción |
|------|-------------|
| `auto` | Ejecución no interactiva, adecuada para habilidades que no requieren entrada del usuario |
| `interactive` | Ejecución interactiva, puede requerir entrada del usuario durante la ejecución |

## Ejecución y monitoreo

- Después de enviar una tarea, se puede ver el progreso de ejecución en el Panel de control
- Actualizaciones de estado en tiempo real (en cola → en ejecución → exitoso/fallido/cancelado)
- Para flujos de trabajo interactivos, se puede responder a tareas que esperan entrada en la barra lateral
- Una vez completada la ejecución, los resultados se aplican a Zotero a través de scripts de hooks

## Notas

- Ejecutar un flujo de trabajo por primera vez puede requerir la configuración del backend
- Algunos flujos de trabajo pueden tener requisitos de entrada específicos (por ejemplo, se deben seleccionar adjuntos)
- Los flujos de trabajo interactivos requieren que Zotero permanezca en ejecución para gestionar la entrada del usuario
