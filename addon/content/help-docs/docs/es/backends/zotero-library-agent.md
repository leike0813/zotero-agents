# Zotero Library Agent

## Descripción general

Zotero Library Agent es la superficie de tareas limitada y bajo demanda de [Host Bridge](#doc/backends%2Fhost-bridge). Permite a los agentes de IA operar una biblioteca Zotero para solicitudes finitas — inspeccionar elementos, recuperar contexto, leer datos de literatura y síntesis, ejecutar workflows, aplicar mutaciones aprobadas, transferir archivos y entregar evidencia — sin convertirse en un servicio de mantenimiento de biblioteca residente.

Host Bridge expone tres superficies, cada una con un rol diferente:

| Superficie | Rol | Cuándo usar |
|------------|-----|-------------|
| **CLI Bundle** (`zotero-bridge`) | Instalación, conexión y contratos de comandos de bajo nivel | Se necesita acceso directo por CLI a las capacidades de Host Bridge |
| **Library Agent** | Enrutamiento de tareas limitadas, entrega de evidencia y resultados auditables | Se tiene una solicitud finita que necesita enrutamiento de intención y evidencia de completitud |
| **Librarian Profile** (Hermes) | Índice residente, mantenimiento programado y servicio continuo de biblioteca | Se necesita indexación local persistente, trabajos cron o monitoreo continuo |

## Qué proporciona el Library Agent

- **Enrutamiento de tareas**: Dirige la intención actual a la familia de comandos más pequeña que coincida sin requerir un escaneo completo de la tabla de comandos.
- **Referencias de journey**: Siete manuales de journey detallados cubren categorías específicas de tareas, cada uno especificando ramas, casos límite, requisitos de evidencia, límites de aprobación y rutas de recuperación.
- **Entrega de evidencia**: Paquetes de evidencia portátiles con validación de forma determinista y cálculo de digest de artefactos.
- **Límites de autoridad**: Impone que Host Bridge sea la única ruta de control, evitando el acceso directo al almacenamiento de Zotero o el comportamiento de servicio en segundo plano.
- **Operaciones limitadas**: Cada tarea se completa cuando el resultado solicitado y su evidencia son observables — una confirmación de envío o una entrega preparada no constituyen completitud por sí mismas.

## Flujo de tareas limitado

1. **Confirmar conexión**: Verificar la CLI cargada y el perfil de Host Bridge. Ejecutar `zotero-bridge surface identity --json` para comparar con el manifiesto empaquetado y confirmar el `releaseSetId` del repositorio.
2. **Enrutar la intención**: Leer la referencia de enrutamiento de tareas para elegir la familia de comandos más pequeña que satisfaga la solicitud.
3. **Cargar el journey correspondiente**: Leer exactamente un manual de journey que coincida con la categoría de tarea.
4. **Preservar evidencia**: Mantener los hechos actuales de Host, los handles devueltos, los artefactos locales y el estado de aprobación como evidencia distinta.
5. **Ejecutar o enviar**: Para workflows, seguir la referencia de ejecución de workflows; nunca enviar opciones de workflow a través de un modo de ejecución que no las acepte.
6. **Construir y validar**: Construir el paquete de evidencia final y validarlo con el helper incluido.

La tarea está completa solo cuando el resultado solicitado y su evidencia son observables.

## Categorías de journey

El Library Agent incluye siete manuales de journey, cada uno cubriendo un dominio de tarea específico:

| Journey | Alcance |
|---------|---------|
| **Contexto actual y lectura de biblioteca** | Selección deíctica, búsqueda versus listado, detalle de elemento, notas y evidencia de adjuntos |
| **Notas, adjuntos y preparación** | Fragmentos y payloads de notas, anotaciones, preparación de PDF/Markdown/análisis y adjuntos generados |
| **Contexto de investigación de síntesis** | Temas, vistas de grafo de citas, índices, resolutores, artefactos, esquemas y colas de atención |
| **Workflow propiedad de Host** | Descripción de workflow, requisitos, validación, envío, monitoreo, permisos, interacción y evidencia de Product |
| **Entrega propiedad de Agent** | Ejecución de bundle de agent-run, validación de resultados, apply-back y recuperación de recibos |
| **Writeback concreto** | Mutaciones previsualizadas, comandos de escritura semántica, aprobación y verificación en vivo |
| **Products y archivos** | Rutas locales, archivos registrados, Products del Dashboard, descargas y entrega de adjuntos |

Cada journey apunta a las tarjetas de comandos CLI de `zotero-bridge` incluidas cuando se necesitan campos exactos de payload o resultado.

## Límites de autoridad y seguridad

El Library Agent impone límites estrictos para prevenir mutaciones no intencionadas en Zotero:

- **Solo Host Bridge**: Tratar Host Bridge como la única ruta de control de Zotero y Zotero Agents. No leer ni escribir directamente bases de datos de Zotero, directorios de almacenamiento, internos del plugin o estado del navegador.
- **Trabajo limitado**: No convertir el Library Agent en un servicio de biblioteca en segundo plano. Realizar trabajo limitado para la solicitud actual y devolver el control cuando el resultado o la decisión de usuario requerida esté disponible.
- **Sin escrituras desatendidas**: No realizar escrituras programadas o desatendidas. Una solicitud de usuario actual y la aprobación de Host Bridge rigen cada mutación o apply-back.
- **Sin suposiciones obsoletas**: No tratar entradas de caché, referencias generadas o paquetes de evidencia como verdad en vivo de Zotero; confirmar hechos actuales a través de Host Bridge cuando la frescura importa.

## Entrega de evidencia

El Library Agent produce paquetes de evidencia portátiles para la continuidad de tareas. Un paquete de evidencia contiene:

- **Estado**: `completed`, `canceled` o `failed`
- **Resumen**: Hallazgos concisos locales a la tarea
- **Archivo de evidencia** (opcional): Un paquete de evidencia construido y validado por el helper que otro agente o tarea puede consumir
- **Diagnósticos** (opcional): Información de diagnóstico estructurada

Construir y validar un paquete de evidencia con el helper incluido:

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

El helper valida forma determinista, calcula digests de artefactos e inspecciona bundles de workflow. El agente sigue siendo responsable de la elección de comandos, interpretación, suficiencia de evidencia y si una acción revisada está autorizada.

## Manejo de fallos

- Preservar códigos de error estructurados y campos de handle al reportar un fallo.
- Redescubrir un comando u objeto solo cuando el error indique sintaxis o identidad obsoleta; no adivinar handles alternativos.
- Cuando una operación devuelve un handle de archivo o ruta de salida, verificar el archivo declarado antes de usarlo como entrada de evidencia o apply-back.
- Cuando falta autoridad, entrada o intención de usuario requerida, detenerse en el límite e indicar la decisión faltante exacta.

## Integración

El Library Agent depende de Host Bridge para todo acceso a Zotero. Antes de usar el Library Agent:

1. Asegurar que Host Bridge está ejecutándose (Zotero → Configuración → Zotero Agents → Host Bridge → **Iniciar / Mostrar endpoint**).
2. Instalar la CLI `zotero-bridge` (usar el botón **Instalar CLI** en el panel de preferencias de Host Bridge).
3. Configurar el perfil de conexión con la URL del endpoint y el token Bearer. Ver [Configuración de Host Bridge](#doc/backends%2Fhost-bridge) para configuración detallada.

## Próximos pasos

- [Host Bridge](#doc/backends%2Fhost-bridge) — referencia completa de la CLI `zotero-bridge` y capacidades de Host Bridge
- [Hermes Profiles](#doc/backends%2Fhermes-profiles) — servicio de biblioteca residente con indexación local y mantenimiento programado
- [Workflows](#doc/workflows%2Findex) — resumen de todos los workflows integrados y personalizados
- [MCP Server](#doc/backends%2Fmcp-server) — interfaz de protocolo alternativa para clientes compatibles con MCP
