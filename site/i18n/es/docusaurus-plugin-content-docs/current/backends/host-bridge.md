# Host Bridge

## Descripción general

Host Bridge es el servidor HTTP integrado del complemento que permite a las herramientas de IA externas (Codex, Claude Code, OpenCode, etc.) acceder directamente a tu biblioteca Zotero. Es el puente de comunicación entre los agentes ACP y Zotero, y sirve como transporte subyacente tanto para el CLI `zotero-bridge` como para el MCP Server.

## Arquitectura

```
Proceso del complemento Zotero
│
├── Servidor HTTP Host Bridge (loopback: 127.0.0.1:<puerto>)
│     ├── Autenticación Bearer Token (cada solicitud)
│     ├── Puerta de aprobación de escritura (por operación)
│     └── Router de capacidades (60+ capacidades)
│
└── CLI zotero-bridge (binario complementario)
      ├── Comandos semánticos (context, library, mutation, synthesis)
      ├── Archivos de configuración (bridge-profile.json)
      └── Modo stdin/pipe (para integración con agentes ACP)
```

Versión del protocolo: `host-bridge.v2`. Todos los endpoints excepto `GET /bridge/v1/health` requieren autenticación Bearer Token. Los contratos de capacidades usan `host-bridge.capabilities.v2`.

## Configuración

Zotero → Configuración → Zotero Agents → Host Bridge

| Configuración | Tipo | Predeterminado | Descripción |
|---------------|------|----------------|-------------|
| **Habilitar MCP Server** | boolean | `true` | Habilitar también el protocolo MCP para agentes de terceros |
| **Desactivar aprobación de escritura** | boolean | `false` | Peligroso: omitir toda aprobación de escritura. Marcado como zona de peligro roja |
| **Habilitar acceso LAN** | boolean | `false` | Vincular a `0.0.0.0` para acceso LAN (fuerza puerto fijo) |
| **Puerto fijo** | boolean | `false` | Fijar puerto (predeterminado 26570) en lugar de usar un puerto aleatorio |
| **Número de puerto** | number | `26570` | Puerto utilizado en modo fijo (1024-65535) |
| **IP LAN** | string | `""` | Sobrescritura manual de la IP LAN anunciada; dejar vacío para autodetección |
| **Iniciar / Mostrar endpoint** | button | — | Asegurar que el servidor está funcionando y mostrar la URL del endpoint actual |
| **Rotar token** | button | — | Rotar el token de sesión |
| **Crear / Rotar token maestro** | button | — | Generar un token persistente entre sesiones |
| **Copiar token maestro** | button | — | Copiar el token al portapapeles |
| **Copiar perfil CLI remoto** | button | — | Copiar el JSON completo del perfil CLI remoto |
| **Instalar CLI** | button | — | Instalación con un clic de `zotero-bridge` en el PATH del sistema |

## Modelo de seguridad

### Autenticación Bearer Token

- Cada solicitud debe incluir el encabezado `Authorization: Bearer <token>`
- **Token de sesión**: generado automáticamente al iniciar el complemento (24 bytes en base64), vive durante la sesión del complemento
- **Token maestro**: token persistente opcional, almacenamiento cifrado con AES-256-GCM, para acceso CLI entre sesiones
- Los tokens nunca se escriben en prompts, logs ni salidas de agente

### Aprobación de escritura

Las operaciones de escritura requieren la aprobación de la interfaz de Zotero:

| Nivel | Descripción |
|-------|-------------|
| **Aprobación requerida** | `mutation.execute`, `workflow submit`, `debug.zotero.eval`, `citation_graph.refresh_metrics` |
| **Auto-aprobadas** | Todas las operaciones de solo lectura, `diagnostic.get_status`, `mutation.preview` |

**Auto-aprobación de doble puerta:**
1. El manifiesto del workflow declara `allowWriteApprovalBypass: true`
2. El usuario marca explícitamente la auto-aprobación en el diálogo de envío

Ambas condiciones deben cumplirse para que la auto-aprobación surta efecto.

### Seguridad LAN / Remoto

- El modo LAN vincula `0.0.0.0` y debe habilitarse manualmente. **Usar solo en redes de confianza**
- El acceso remoto requiere un token maestro (creado manualmente), nunca se distribuye automáticamente
- La autodetección de IP LAN utiliza la reflexión de red del backend SkillRunner; puede sobrescribirse manualmente

## El CLI `zotero-bridge`

`zotero-bridge` es una herramienta CLI escrita en Rust para que agentes ACP y usuarios de terminal llamen a Host Bridge.

### Instalación

Usa el botón "Instalar CLI" en las preferencias. Las ejecuciones ACP usan el binario incluido en el complemento (inyectado en el PATH del workspace).

### Prioridad de resolución de endpoint / token

| Fuente | Endpoint | Token |
|--------|----------|-------|
| Flag CLI | `--endpoint` | — |
| Entorno | `ZOTERO_BRIDGE_ENDPOINT` | `ZOTERO_BRIDGE_TOKEN` |
| Archivo de perfil | campo `endpoint` | `auth.token` / `auth.tokenEnv` |

### Comandos semánticos

<details>
<summary>Todos los 125 comandos canónicos</summary>

#### surface — Superficie del agente
```
zotero-bridge surface identity --json
zotero-bridge surface describe <command...> --json
zotero-bridge surface search --intent <text>
```

#### bridge — Estado del servidor y perfil
```
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status
zotero-bridge call <capability> [--input <json>]
```

#### library — Lectura de la biblioteca
```
zotero-bridge library items list [--cursor <c>]
zotero-bridge library item search --query <text>
zotero-bridge library item get --key <key>
zotero-bridge library item notes --key <key>
zotero-bridge library item attachments --key <key>
zotero-bridge library note get --key <key>
zotero-bridge library note payloads --key <key>
zotero-bridge library note payload --key <key> --payload-id <id>
zotero-bridge library annotation list --key <key>
zotero-bridge library annotation export --key <key> --format json|markdown
zotero-bridge library snapshot --input <json>
zotero-bridge library readiness audit --input <json>
zotero-bridge library readiness missing-pdf --input <json>
zotero-bridge library readiness missing-markdown --input <json>
zotero-bridge library readiness missing-analysis --input <json>
```

#### context — Contexto de UI y navegación
```
zotero-bridge context current
zotero-bridge context selection get
zotero-bridge context selection open
zotero-bridge context item open --key <key>
zotero-bridge context note open --key <key>
zotero-bridge context collection open --key <key>
```

#### synthesis — Capa de síntesis
```
zotero-bridge synthesis topic list --input <json>
zotero-bridge synthesis topic find-by-paper-ref --input <json>
zotero-bridge synthesis topic get-context --input <json>
zotero-bridge synthesis topic get-report --input <json>
zotero-bridge synthesis topic get-review-input --input <json>
zotero-bridge synthesis schema get
zotero-bridge synthesis concept query --input <json>
zotero-bridge synthesis graph overview --input <json>
zotero-bridge synthesis graph query-cluster --input <json>
zotero-bridge synthesis graph get-slice --input <json>
zotero-bridge synthesis graph get-layout --input <json>
zotero-bridge synthesis graph get-metrics --input <json>
zotero-bridge synthesis graph rank-external-references --input <json>
zotero-bridge synthesis graph rank-library-papers --input <json>
zotero-bridge synthesis graph refresh-metrics --input <json>
zotero-bridge synthesis graph update --input <json>
zotero-bridge synthesis index status
zotero-bridge synthesis index library get --input <json>
zotero-bridge synthesis index reference get --input <json>
zotero-bridge synthesis cache status
zotero-bridge synthesis cache refresh-reference-sidecar --input <json>
zotero-bridge synthesis cache invalidate --input <json>
zotero-bridge synthesis resolver resolve --input <json>
zotero-bridge synthesis artifact manifest --input <json>
zotero-bridge synthesis artifact read --input <json>
zotero-bridge synthesis artifact export-filtered --input <json>
zotero-bridge synthesis artifact resolve-topic-digest --input <json>
zotero-bridge synthesis insight attention-queue
```

#### mutation — Operaciones de escritura
```
zotero-bridge mutation preview --input <json>
zotero-bridge mutation apply --input <json>
zotero-bridge mutation literature-ingest --input <json>
zotero-bridge mutation tag add --input <json>
zotero-bridge mutation tag remove --input <json>
zotero-bridge mutation collection create --input <json>
zotero-bridge mutation collection add-items --input <json>
zotero-bridge mutation collection remove-items --input <json>
zotero-bridge mutation item update --input <json>
zotero-bridge mutation item attach-file --input <json>
zotero-bridge mutation note create --input <json>
zotero-bridge mutation note update --input <json>
zotero-bridge mutation note upsert-payload --input <json>
```

#### workflow — Gestión de workflows
```
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> (--input <json> | --none)
zotero-bridge workflow queue list [--workflow <id>]
zotero-bridge workflow queue cancel --submission-id <id>
zotero-bridge workflow submission get --submission-id <id>
zotero-bridge workflow describe --workflow <id> [--json]
zotero-bridge workflow validate --input <json>
zotero-bridge workflow requirements --workflow <id> --input <json>
zotero-bridge workflow profile list
zotero-bridge workflow profile describe --profile <id>
zotero-bridge workflow profile validate --profile <id>
zotero-bridge workflow agent-run --workflow <id> (--input <json> | --none) --output-dir <dir>
zotero-bridge workflow agent-bundle inspect --path <path>
zotero-bridge workflow agent-result validate --input <json>
zotero-bridge workflow agent-apply --run-id <id> --input <json>
zotero-bridge workflow agent-apply-status --run-id <id>
zotero-bridge workflow agent-renew --run-id <id>
zotero-bridge workflow agent-abandon --run-id <id>
```

#### run — Observación en tiempo de ejecución
```
zotero-bridge run get --run-id <id>
zotero-bridge run cancel --run-id <id>
zotero-bridge run list [--workflow <id>]
zotero-bridge run active
zotero-bridge run recent
zotero-bridge run workflow recent
zotero-bridge run skill get --run-id <id>
zotero-bridge run skill reply --run-id <id> --input <json>
zotero-bridge run skill connect --run-id <id>
zotero-bridge run skill recent
zotero-bridge run skill events --run-id <id>
zotero-bridge run notification list [--limit <n>]
zotero-bridge run notification wait [--timeout-ms <ms>]
zotero-bridge run notification ack --notification-id <id>
zotero-bridge run permission pending
zotero-bridge run permission get --request-id <id>
```

#### file — Transferencias de archivos
```
zotero-bridge file download <fileId> --output <path>
zotero-bridge file upload --path <path>
```

#### product — Productos del Dashboard
```
zotero-bridge product list [--limit <n>]
zotero-bridge product get --product-id <id>
zotero-bridge product download --product-id <id> --output <path>
zotero-bridge product remove --product-id <id>
```

#### operation — Operaciones persistentes
```
zotero-bridge operation get --operation-id <id>
```

</details>

La entrada acepta: JSON en línea, ruta de archivo JSON, sintaxis `@file`, `-` (stdin).

Para el catálogo de comandos completo y actualizado, ejecuta `zotero-bridge surface identity --json` para ver el `commandCatalogChecksum` actual, y luego `zotero-bridge surface describe <command...>` para el contrato de cualquier comando específico.

### Contrato de salida

stdout siempre emite exactamente un objeto JSON:

```json
{ "ok": true, "data": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
{ "ok": false, "error": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
```

Códigos de salida de error:

| Categoría | Código de salida |
|-----------|-----------------:|
| usage | 2 |
| config | 3 |
| connection | 4 |
| auth | 5 |
| permission | 6 |
| validation | 7 |
| capability | 8 |
| workflow | 9 |
| download | 10 |
| protocol | 11 |
| internal | 70 |

### Archivos de perfil

Ubicaciones conocidas del perfil:

| SO | Ruta |
|----|------|
| Windows | `%LOCALAPPDATA%\zotero-agents\bridge-profile.json` |
| macOS | `~/Library/Application Support/zotero-agents/bridge-profile.json` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/zotero-agents/bridge-profile.json` |

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v2",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "connectionMode": "local",
  "auth": { "type": "bearer", "tokenEnv": "ZOTERO_BRIDGE_TOKEN" }
}
```

## Integración con agentes ACP

Cuando un agente ACP ejecuta un skill, el complemento inyecta automáticamente:

```
<workspaceDir>/.zotero-bridge/
  bin/zotero-bridge(.cmd)     # Shim del CLI
  profile.json                # Perfil de conexión (token mediante variable de entorno)
  README.md                   # Pistas de uso
```

Variables de entorno inyectadas:

- `ZOTERO_BRIDGE_PROFILE` — ruta a profile.json
- `ZOTERO_BRIDGE_TOKEN` — bearer token
- `ZOTERO_BRIDGE_SCOPE` — JSON de ámbito de aprobación
- `PATH` / `Path` — se antepone `.zotero-bridge/bin`

## Capacidades disponibles

<details>
<summary>Todas las 60+ capacidades</summary>

### Context

| Capacidad | Descripción |
|-----------|-------------|
| `context.get_current_view` | Información de la vista actual de Zotero |
| `context.get_selected_items` | Elementos actualmente seleccionados |

### Library

| Capacidad | Descripción |
|-----------|-------------|
| `library.search_items` | Buscar elementos |
| `library.get_item_detail` | Obtener detalles de un elemento |
| `library.list_items` | Listado paginado de elementos |
| `library.sync_snapshot` | Paginated metadata snapshot for local indexing |
| `library.get_item_notes` | Listar notas |
| `library.get_note_detail` | Leer contenido de una nota |
| `library.list_note_payloads` | Listar payloads de notas |
| `library.get_note_payload` | Obtener un payload específico |
| `library.get_item_attachments` | Listar adjuntos |
| `library.list_annotations` | Listar anotaciones del lector |
| `library.export_annotations` | Exportar anotaciones del lector como markdown o JSON |
| `library.readiness_audit` | Auditoría de preparación de biblioteca paginada de solo lectura |

### Mutation

| Capacidad | Descripción |
|-----------|-------------|
| `mutation.preview` | Previsualizar una operación de escritura (sin ejecutar) |
| `mutation.execute` | Ejecutar una operación de escritura (requiere aprobación) |

### Workflow Products

| Capacidad | Descripción |
|-----------|-------------|
| `workflow_products.list` | Listar productos normales del Dashboard |
| `workflow_products.get` | Devolver metadatos públicos de un producto |
| `workflow_products.read_asset` | Registrar un asset de producto para descarga |
| `workflow_products.export` | Exportar uno o todos los assets de producto |
| `workflow_products.remove` | Eliminar un registro de producto |

### Synthesis — Temas

| Capacidad | Descripción |
|-----------|-------------|
| `topics.list` | Listar todos los temas |
| `topics.find_by_paper_ref` | Buscar temas por referencia de papel |
| `topics.get_context` | Obtener contexto de un tema |
| `topics.get_report` | Obtener informe de un tema |
| `topics.get_review_input` | Ensamblar paquete de revisión de tema |

### Synthesis — Grafo de citas

| Capacidad | Descripción |
|-----------|-------------|
| `citation_graph.query_cluster` | Consultar clúster de citas |
| `citation_graph.get_overview` | Obtener visión general del grafo |
| `citation_graph.get_slice` | Extraer porción de subgrafo |
| `citation_graph.get_metrics` | Calcular métricas del grafo |
| `citation_graph.get_layout` | Obtener coordenadas de diseño persistidas |
| `citation_graph.rank_external_references` | Clasificar referencias externas |
| `citation_graph.rank_library_papers` | Clasificar artículos de la biblioteca |
| `citation_graph.refresh_metrics` | Diagnóstico: actualizar métricas persistidas |
| `citation_graph.update` | Iniciar actualización atómica del grafo de citas |

### Synthesis — Conceptos, esquemas, resolutores

| Capacidad | Descripción |
|-----------|-------------|
| `concepts.query` | Consultar base de conocimiento de conceptos |
| `schemas.get` | Obtener definiciones de esquemas |
| `resolvers.resolve` | Resolver referencias/temas |

### Synthesis — Artefactos de papel

| Capacidad | Descripción |
|-----------|-------------|
| `paper_artifacts.get_manifest` | Obtener manifiesto de artefactos |
| `paper_artifacts.read` | Leer contenido de artefactos |
| `paper_artifacts.export_filtered` | Exportar artefactos filtrados |
| `paper_artifacts.resolve_topic_digest` | Resolver resumen de tema |

### Synthesis — Índices y descubrimientos

| Capacidad | Descripción |
|-----------|-------------|
| `reference_index.get` | Obtener índice de referencias |
| `reference_sidecar.refresh` | Iniciar actualización del sidecar de referencias |
| `library_index.get` | Obtener índice de biblioteca |
| `insights.get_attention_queue` | Obtener cola de atención |
| `synthesis.operation.get` | Leer recibo persistente de operación de síntesis |

### Diagnostic

| Capacidad | Descripción |
|-----------|-------------|
| `diagnostic.get_status` | Obtener estado del servicio |

### Debug (solo modo debug)

| Capacidad | Descripción |
|-----------|-------------|
| `debug.status` | Snapshot de estado de debug de Host Bridge |
| `debug.persistence.snapshot` | Snapshot de persistencia en tiempo de ejecución |
| `debug.tasks.snapshot` | Diagnóstico de tareas de workflow y ejecuciones ACP |
| `debug.zotero.eval` | Ejecutar JavaScript aprobado en contexto Zotero |
| `debug.acpSkillRun.reapplyResult` | Re-ejecutar applyResult para una ejecución de skill ACP |
| `debug.skillrunner.connections.snapshot` | Diagnóstico del governor de conexiones SkillRunner |
| `debug.synthesis.snapshot` | Snapshot de operación y caché de síntesis |
| `debug.synthesis.diff` | Comparar payloads de Zotero vs cachés del repositorio |
| `debug.synthesis.cache.list` | Listar filas de la caché sidecar de síntesis |
| `debug.synthesis.operations.list` | Listar operaciones de síntesis |
| `debug.synthesis.paper.inspect` | Inspeccionar un papel a través de cachés |
| `debug.synthesis.topic.inspect` | Inspeccionar un tema a través de artefactos |
| `debug.synthesis.profiler.list` | Ejecuciones del profiler de síntesis |
| `debug.synthesis.cleanInstallReset` | Peligroso: restablecer estado de la BD de síntesis |

</details>

## Flujo de aprobación de escritura

```
El agente llama a una capacidad de escritura
  │
  ├── 1. La solicitud llega a Host Bridge (con Bearer Token)
  ├── 2. Token validado
  ├── 3. Ámbito extraído
  ├── 4. Verificación de aprobación:
  │     ├── Ámbito de solo lectura → ejecutar inmediatamente
  │     ├── autoApproveWrites = true Y usuario pre-aprobó → ejecutar
  │     └── Aprobación necesaria → encolar en la interfaz de Zotero
  ├── 5. Aviso de aprobación mostrado en ACP Chat / panel SkillRunner
  │     ├── El usuario aprueba → ejecutar
  │     └── El usuario deniega → devolver error
  └── 6. Resultado devuelto, log de auditoría escrito
```

Enrutamiento por ámbito:

| Ámbito | Interfaz de aprobación |
|--------|----------------------|
| `acp-skill-run` | Interfaz ACP Skills |
| `acp-chat` | Panel ACP Chat |
| `skillrunner-run` | Panel SkillRunner |
| Sin ámbito / `global` | Interfaz de aprobación global de Zotero |

## Acceso LAN / Remoto

1. Marca **Habilitar acceso LAN** en las preferencias
2. Fija un puerto o anota el puerto actual
3. Crea / copia un **token maestro**
4. Haz clic en **Copiar perfil CLI remoto** para obtener la configuración de conexión completa
5. En la máquina remota, configura `endpoint` (`http://<IP_LAN>:<puerto>/bridge/v1`) y el token
6. Prueba: `zotero-bridge status --endpoint http://<IP_LAN>:<puerto>/bridge/v1`

**Importante:** El modo LAN omite la protección de loopback. Utilizar solo en redes locales de confianza.

## Próximos pasos

- [MCP Server](mcp-server) — Interfaz de protocolo estandarizado para clientes compatibles con MCP (Claude Desktop, etc.)
- [Hermes Profiles](hermes-profiles) — Perfil instalable para gestionar tu biblioteca Zotero con agentes de IA
- [Preferencias](../preferences) — Ver todas las configuraciones de Host Bridge
- [Backend ACP](acp) — Conocer la configuración de agentes ACP
