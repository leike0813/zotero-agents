# Dashboard

## Descripción general

El Dashboard es el panel central de monitoreo y control de Zotero Agents. Aquí puedes ver el estado de las tareas, gestionar flujos de trabajo, navegar el historial e inspeccionar registros de ejecución.

## Cómo abrir

- **Botón de la barra de herramientas**: haz clic en el icono de Zotero Agents en la barra de herramientas de Zotero
- **Menú**: **Tools → Open Dashboard**
- **Pestaña de Zotero**: se abre a través del menú, mostrándose como una pestaña independiente de Zotero

![Botón de Dashboard en la barra de herramientas de Zotero Agents](/img/icon_workbench.png)

## Páginas

### Inicio

La página predeterminada del Dashboard, que muestra:

- **Lista de flujos de trabajo**: todos los flujos de trabajo disponibles, con botones de ejecución y configuración
- **Área de ACP Chat**: acceso rápido a conversaciones ACP
- **Ejecuciones de ACP Skills**: estado de ejecución de skills para backends ACP
- **Skill Feedback**: ver las valoraciones y comentarios recientes de las ejecuciones de skills
- **Resumen de tareas**: visión general de las tareas en ejecución

![Inicio del Dashboard](/img/docs/dashboard_home.png)

### Opciones de flujo de trabajo

La página de configuración de parámetros de flujos de trabajo:

- Ver y modificar la configuración de cada flujo de trabajo
- Establecer parámetros predeterminados
- Seleccionar el backend predeterminado

![Página de opciones de flujo de trabajo del Dashboard](/img/docs/dashboard_workflow-settings.png)

### Backends

La página de gestión de backends:

- Lista de todos los backends configurados
- Historial de tareas de cada backend
- Vistas de detalle de backend (varía según el tipo)

Vistas de detalle de backend:

| Tipo de backend | Visualización |
|-----------------|---------------|
| Generic HTTP | Tabla de tareas + registros de ejecución |
| SkillRunner | Tabla de ejecuciones + área de estado + área de conversación + acciones de responder/cancelar |
| ACP | Vista de Skill Run |

![Lista de tareas del backend ACP en el Dashboard](/img/docs/dashboard_acp-backend.png)

![Lista de tareas del backend SkillRunner en el Dashboard](/img/docs/dashboard_skillrunner-backend.png)

### Productos

Navegación y gestión de productos de flujos de trabajo:

- Ver artefactos de salida de ejecuciones de flujos de trabajo
- Abrir carpetas de productos
- Previsualizar y eliminar productos

![Almacenamiento de productos del Dashboard](/img/docs/dashboard_products.png)

## Skill Feedback

El panel Skill Feedback muestra las valoraciones recientes de ejecuciones de skills:

| Columna | Descripción |
|---------|-------------|
| Workflow | Nombre del flujo de trabajo ejecutado |
| Backend | El backend que ejecutó la tarea |
| Rating | Valoración del usuario (1–5) |
| Comment | Comentario de valoración |
| Timestamp | Cuándo se envió la valoración |

Acciones:
- **Filtrar**: filtrar por valoración, flujo de trabajo o rango de tiempo
- **Exportar**: exportar datos de valoraciones para análisis

![Almacenamiento de Skill Feedback del Dashboard](/img/docs/dashboard_skill-feedback.png)

## Estado de tareas

| Estado | Descripción |
|--------|-------------|
| `queued` | Esperando ser ejecutada |
| `running` | Actualmente en ejecución |
| `waiting_user` | Esperando entrada del usuario |
| `waiting_auth` | Esperando autorización |
| `succeeded` | Ejecución completada con éxito |
| `failed` | Ejecución fallida |
| `canceled` | Cancelada |

## Visor de registros de ejecución

El Dashboard incluye un visor de registros integrado:

- Filtrar por backend
- Filtrar por flujo de trabajo
- Filtrar por nivel de registro
- Filtrar por rango de tiempo
- Exportación para diagnóstico
- Copia de resumen de incidencias

![Visor de registros de ejecución del Dashboard](/img/docs/dashboard_logs.png)

## Botón de la barra de herramientas

El botón de icono de Zotero Agents en la barra de herramientas de Zotero soporta:

- Clic izquierdo: abrir/alternar el Dashboard
- Muestra el recuento de tareas en ejecución
- Muestra una ventana emergente con la lista de tareas en ejecución
