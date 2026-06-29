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
│     └── Router de capacidades (30+ capacidades)
│
└── CLI zotero-bridge (binario complementario)
      ├── Comandos semánticos (context, library, mutation, synthesis)
      ├── Archivos de configuración (bridge-profile.json)
      └── Modo stdin/pipe (para integración con agentes ACP)
```

Versión del protocolo: `host-bridge.v1`. Todos los endpoints excepto `GET /bridge/v1/health` requieren autenticación Bearer Token.

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

```
zotero-bridge status                           # Verificación de estado (sin autenticación)
zotero-bridge manifest                         # Manifiesto completo de capacidades
zotero-bridge call <capacidad> [--input]      # Llamada directa a capacidad
zotero-bridge item search --query <texto>
zotero-bridge item get --key <key>
zotero-bridge item notes --key <key>
zotero-bridge item attachments --key <key>
zotero-bridge note get --key <key>
zotero-bridge note payloads --key <key>
zotero-bridge note payload --key <key>
zotero-bridge library list --input '{"limit":50}'
zotero-bridge library snapshot --input '{"limit":200,"cursor":"0"}'
zotero-bridge topics list
zotero-bridge topics get-context --input <JSON>
zotero-bridge topics get-report --input <JSON>
zotero-bridge schemas get
zotero-bridge concepts query --input <JSON>
zotero-bridge citation-graph query-cluster --input <JSON>
zotero-bridge citation-graph get-overview
zotero-bridge library-index get
zotero-bridge resolvers resolve --input <JSON>
zotero-bridge reference-index get
zotero-bridge paper-artifacts get-manifest --input <JSON>
zotero-bridge paper-artifacts read --input <JSON>
zotero-bridge insights get-attention-queue
zotero-bridge literature ingest --input <JSON>
zotero-bridge workflow list
zotero-bridge workflow describe --workflow <id>
zotero-bridge workflow submit --workflow <id> (--input <JSON> | --none)
zotero-bridge workflow agent-run --workflow <id> (--input <JSON> | --none) --output-dir <DIR>
zotero-bridge workflow run <runId>
zotero-bridge task list [--workflow <id>] [--active-only]
zotero-bridge file download <fileId> --output <path>
```

La entrada acepta: JSON en línea, ruta de archivo JSON, sintaxis `@file`, `-` (stdin).

### Contrato de salida

stdout siempre emite exactamente un objeto JSON:

```json
{ "ok": true, "data": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
{ "ok": false, "error": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
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
  "protocol": "host-bridge.v1",
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
<summary>Todas las 30+ capacidades</summary>

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

### Mutation

| Capacidad | Descripción |
|-----------|-------------|
| `mutation.preview` | Previsualizar una operación de escritura (sin ejecutar) |
| `mutation.execute` | Ejecutar una operación de escritura (requiere aprobación) |

### Synthesis

| Capacidad | Descripción |
|-----------|-------------|
| `topics.list` | Listar todos los temas |
| `topics.get_context` | Obtener contexto de un tema |
| `topics.get_report` | Obtener informe de un tema |
| `topics.get_review_input` | Ensamblar paquete de revisión de tema |
| `schemas.get` | Obtener definiciones de esquemas |
| `concepts.query` | Consultar base de conocimiento de conceptos |
| `citation_graph.query_cluster` | Consultar clúster de citas |
| `citation_graph.get_overview` | Obtener visión general del grafo |
| `citation_graph.get_slice` | Extraer porción de subgrafo |
| `citation_graph.get_metrics` | Calcular métricas del grafo |
| `citation_graph.rank_external_references` | Clasificar referencias externas |
| `citation_graph.rank_library_papers` | Clasificar artículos de la biblioteca |
| `paper_artifacts.get_manifest` | Obtener manifiesto de artefactos |
| `paper_artifacts.read` | Leer contenido de artefactos |
| `paper_artifacts.export_filtered` | Exportar artefactos filtrados |
| `paper_artifacts.resolve_topic_digest` | Resolver resumen de tema |
| `insights.get_attention_queue` | Obtener cola de atención |
| `resolvers.resolve` | Resolver referencias/temas |
| `reference_index.get` | Obtener índice de referencias |
| `library_index.get` | Obtener índice de biblioteca |

### Diagnostic

| Capacidad | Descripción |
|-----------|-------------|
| `diagnostic.get_status` | Obtener estado del servicio |

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
