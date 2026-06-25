# Dashboard

## Descripción general

El Dashboard es el panel central de monitoreo y control de Zotero Agents. Aquí puedes ver el estado de las tareas, gestionar flujos de trabajo, navegar el historial e inspeccionar registros de ejecución.

## Cómo abrir

- **Botón de la barra de herramientas**: haz clic en el icono de Zotero Agents en la barra de herramientas de Zotero
- **Menú**: **Tools → Open Dashboard**
- **Pestaña de Zotero**: se abre a través del menú, mostrándose como una pestaña independiente de Zotero

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_workbench.webp" alt="Botón de Dashboard en la barra de herramientas de Zotero Agents" title="Botón de Dashboard en la barra de herramientas de Zotero Agents" loading="lazy" /><figcaption>Botón de Dashboard en la barra de herramientas de Zotero Agents</figcaption></figure>

## Páginas

### Inicio

La página predeterminada del Dashboard, que muestra:

- **Lista de flujos de trabajo**: todos los flujos de trabajo disponibles, con botones de ejecución y configuración
- **Área de ACP Chat**: acceso rápido a conversaciones ACP
- **Ejecuciones de ACP Skills**: estado de ejecución de skills para backends ACP
- **Skill Feedback**: ver las valoraciones y comentarios recientes de las ejecuciones de skills
- **Resumen de tareas**: visión general de las tareas en ejecución

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_home.webp" alt="Inicio del Dashboard" title="Inicio del Dashboard" loading="lazy" /><figcaption>Inicio del Dashboard</figcaption></figure>

### Opciones de flujo de trabajo

La página de configuración de parámetros de flujos de trabajo:

- Ver y modificar la configuración de cada flujo de trabajo
- Establecer parámetros predeterminados
- Seleccionar el backend predeterminado

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_workflow-settings.webp" alt="Página de opciones de flujo de trabajo del Dashboard" title="Página de opciones de flujo de trabajo del Dashboard" loading="lazy" /><figcaption>Página de opciones de flujo de trabajo del Dashboard</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_acp-backend.webp" alt="Lista de tareas del backend ACP en el Dashboard" title="Lista de tareas del backend ACP en el Dashboard" loading="lazy" /><figcaption>Lista de tareas del backend ACP en el Dashboard</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skillrunner-backend.webp" alt="Lista de tareas del backend SkillRunner en el Dashboard" title="Lista de tareas del backend SkillRunner en el Dashboard" loading="lazy" /><figcaption>Lista de tareas del backend SkillRunner en el Dashboard</figcaption></figure>

### Productos

Navegación y gestión de productos de flujos de trabajo:

- Ver artefactos de salida de ejecuciones de flujos de trabajo
- Abrir carpetas de productos
- Previsualizar y eliminar productos

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_products.webp" alt="Almacenamiento de productos del Dashboard" title="Almacenamiento de productos del Dashboard" loading="lazy" /><figcaption>Almacenamiento de productos del Dashboard</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skill-feedback.webp" alt="Almacenamiento de Skill Feedback del Dashboard" title="Almacenamiento de Skill Feedback del Dashboard" loading="lazy" /><figcaption>Almacenamiento de Skill Feedback del Dashboard</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_logs.webp" alt="Visor de registros de ejecución del Dashboard" title="Visor de registros de ejecución del Dashboard" loading="lazy" /><figcaption>Visor de registros de ejecución del Dashboard</figcaption></figure>

## Botón de la barra de herramientas

El botón de icono de Zotero Agents en la barra de herramientas de Zotero soporta:

- Clic izquierdo: abrir/alternar el Dashboard
- Muestra el recuento de tareas en ejecución
- Muestra una ventana emergente con la lista de tareas en ejecución
