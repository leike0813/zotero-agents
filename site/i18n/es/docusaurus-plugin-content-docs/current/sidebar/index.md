# Descripción general de la barra lateral

## ¿Qué es la barra lateral?

La barra lateral es un panel de operaciones conveniente que proporciona Zotero Agents, ubicado como un panel flotante en el lado derecho de la ventana principal de Zotero. Permite interactuar con los backends, ver el estado de ejecución y gestionar la ejecución de skills sin salir del contexto de trabajo actual.

## Cómo abrirla

- **Botón de la barra de herramientas**: Haz clic en el botón de alternancia de la barra lateral en la barra de herramientas de Zotero
- **Menú**: **Herramientas → Abrir barra lateral**
- **Acción del Dashboard**: Haz clic en "Abrir/Cerrar barra lateral" en el Dashboard

![Botón de la barra lateral](/img/icon_sidebar.png)

![Estado del indicador de respuesta pendiente de la barra lateral](/img/icon_sidebar_glow.png)

## Notas sobre la arquitectura

La barra lateral utiliza una **arquitectura iframe**: tres pestañas que cargan cada una una página HTML independiente como iframe hijo, comunicándose con el proceso principal del plugin mediante postMessage. Este diseño garantiza que las pestañas no interfieran entre sí, con cada panel teniendo un contexto de renderizado independiente.

En el modo Workspace, las tres pestañas se integran en un contenedor unificado; en el modo heredado, cada panel también puede integrarse directamente en el panel de biblioteca y el panel de lectura de Zotero.

## Tres pestañas

| Pestaña | Función | Casos de uso |
|---------|---------|--------------|
| **ACP Chat** | Conversar con el backend ACP usando el elemento actual como contexto | Hacer preguntas mientras se lee literatura, asistencia en escritura |
| **ACP Skills** | Monitorizar y gestionar ejecuciones de skills a través del backend ACP | Ver progreso de ejecución, inspeccionar resultados, manejar solicitudes de permisos |
| **SkillRunner** | Ver e interactuar con ejecuciones del backend Skill-Runner | Gestionar ejecuciones interactivas, manejar autenticación |

## Guía de la interfaz

### Cambio de pestaña

La barra de pestañas en la parte superior de la barra lateral permite alternar entre los tres paneles. El estado de la pestaña anterior se conserva al cambiar.

### Ajuste de ancho

El ancho de la barra lateral se puede ajustar libremente arrastrando el borde izquierdo para adaptarse a diferentes necesidades de visualización de contenido.

### Componentes comunes

Todas las pestañas comparten los siguientes componentes de interfaz comunes:

- **Banner**: Barra de información superior que muestra la información del proyecto seleccionado actualmente y botones de acción
- **Transcript View**: Área principal para conversaciones o registros de ejecución, con soporte para modos de visualización Plain y Bubble
- **Reply Area**: Área de entrada inferior para enviar mensajes o respuestas
- **Drawer Panels**: Paneles de detalles expandibles en los lados izquierdo y derecho
- **Prompt Component**: Mensajes emergentes que se muestran cuando se requiere la interacción del usuario
- **Plan Component**: Progreso visual para planes de múltiples pasos

## Enlaces rápidos a cada pestaña

- [Uso de ACP Chat](./acp-chat) — Interacción conversacional con el backend
- [ACP Skills](./acp-skills) — Gestionar ejecuciones de skills ACP
- [Pestaña SkillRunner](./skillrunner-tab) — Gestionar ejecuciones de Skill-Runner

## Páginas relacionadas

- [Descripción general del Dashboard](../dashboard) — Monitorización central y gestión de tareas
