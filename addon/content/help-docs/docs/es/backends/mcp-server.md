# MCP Server

## Descripción general

MCP (Model Context Protocol) Server es un servicio de protocolo integrado que expone tu biblioteca Zotero y las capacidades de Synthesis como más de 40 herramientas MCP. Los clientes compatibles con MCP (Claude Desktop, Cursor, extensiones de VS Code, etc.) pueden acceder directamente a los datos de Zotero.

MCP Server comparte el registro de capacidades subyacente de Host Bridge, pero sigue la especificación del protocolo MCP (transporte HTTP Streamable, JSON-RPC 2.0).

## Configuración

Zotero → Configuración → Zotero Agents → Host Bridge → **Habilitar MCP Server**

Una única casilla activa o desactiva el servidor. Habilitado por defecto.

### Valores predeterminados no configurables

| Configuración | Valor | Razón |
|---------------|-------|-------|
| Dirección de escucha | `127.0.0.1` | Seguridad: solo loopback |
| Validación de origen | Estricta | Solo `127.0.0.1`, `localhost`, `[::1]` |
| Límite de tamaño de solicitud | 1 MB | Protección de memoria |
| Protección de escritura | Habilitada | Todas las operaciones de escritura requieren aprobación |

## Seguridad

- **Autenticación Bearer Token**: comparte el mismo token de sesión/maestro que Host Bridge
- **Solo loopback**: no es posible el acceso remoto
- **Validación de origen**: las solicitudes de origen cruzado se rechazan (403)
- **Límite de 1 MB**: las solicitudes de mayor tamaño se rechazan con 413
- **Cola monohilo**: 1 en ejecución + 8 en cola, 45s de tiempo de ejecución, 30s de tiempo de espera en cola
- **Circuit breakers**: 3 fallos en 5 minutos → herramienta pausada durante 60s

## Conexión de clientes MCP

### Endpoint

```
http://127.0.0.1:<puerto>/mcp
```

El puerto se asigna automáticamente (rango 26370-26569). Consulta el endpoint de Host Bridge en las preferencias para conocer el puerto real.

### Ejemplo de configuración para Claude Desktop

```json
{
  "mcpServers": {
    "zotero-skills": {
      "type": "http",
      "url": "http://127.0.0.1:26370/mcp",
      "headers": {
        "Authorization": "Bearer <tu-token>"
      }
    }
  }
}
```

Obtén el token en Preferencias → Host Bridge → **Copiar token maestro**.

### Detalles del protocolo

- Transporte: HTTP Streamable (`POST /mcp`)
- Versión: `2025-06-18`
- Identidad del servidor: `zotero-skills` / `"Zotero Agents Context Broker"` v0.4.0
- `GET /mcp` → 405 (solo se acepta POST)
- Las solicitudes sin `id` → se tratan como notificaciones (sin respuesta)
- `id: null` → explícitamente inválido

## Inventario de herramientas

<details>
<summary>Todas las 40+ herramientas</summary>

### Herramientas de lectura

| Herramienta | Descripción |
|-------------|-------------|
| `get_current_view` | Información de la vista actual de Zotero |
| `get_selected_items` | Resúmenes de los elementos actualmente seleccionados |
| `search_items` | Buscar elementos (límite ≤ 50) |
| `list_library_items` | Listado paginado de elementos |
| `get_item_detail` | Metadatos completos del elemento |
| `get_item_notes` | Listar notas hijas |
| `get_note_detail` | Leer cuerpo de la nota (por fragmentos, ≤16k caracteres por fragmento) |
| `list_note_payloads` | Listar payloads de workflow en una nota |
| `get_note_payload` | Leer un payload |
| `get_item_attachments` | Listar manifiestos de adjuntos (sin bytes de archivo) |
| `prepare_paper_reading_context` | Agregar metadatos, notas, payloads, adjuntos para un artículo |

### Herramientas de escritura (requieren aprobación)

| Herramienta | Descripción |
|-------------|-------------|
| `preview_mutation` | Previsualizar una operación de escritura sin ejecutar |
| `update_item_fields` | Actualizar campos permitidos en un elemento |
| `add_item_tags` | Añadir etiquetas a uno o más elementos |
| `remove_item_tags` | Eliminar etiquetas |
| `create_child_note` | Crear una nota hija |
| `update_note` | Actualizar el cuerpo de una nota |
| `create_markdown_note` | Crear una nota con HTML renderizado + payload markdown en base64 |
| `update_markdown_note` | Actualizar una nota existente respaldada por markdown |
| `ingest_paper` | Importar un artículo por DOI/arXiv/PMID/ISBN (con adjunto PDF) |
| `add_items_to_collection` | Añadir elementos a una colección |
| `remove_items_from_collection` | Eliminar elementos de una colección |

### Herramienta de diagnóstico

| Herramienta | Descripción |
|-------------|-------------|
| `get_mcp_status` | Diagnóstico del servicio: cola, circuit breakers, solicitudes recientes |

### Herramientas de Synthesis

| Herramienta | Descripción |
|-------------|-------------|
| `topics.list` | Listar todos los temas |
| `topics.find_by_paper_ref` | Buscar temas por referencia de artículo |
| `topics.get_context` | Obtener contexto completo del tema |
| `topics.get_review_input` | Ensamblar paquete de revisión del tema |
| `schemas.get` | Obtener definiciones de esquemas |
| `concepts.query` | Consultar la base de conocimiento de conceptos |
| `citation_graph.query_cluster` | Consultar clúster de citas |
| `citation_graph.get_overview` | Obtener visión general del grafo |
| `citation_graph.get_slice` | Extraer porción de subgrafo |
| `citation_graph.get_metrics` | Calcular métricas del grafo (pagerank, foundation, frontier) |
| `citation_graph.rank_external_references` | Clasificar referencias externas |
| `citation_graph.rank_library_papers` | Clasificar artículos de la biblioteca |
| `library_index.get` | Índice paginado de la biblioteca |
| `resolvers.resolve` | Resolver referencias/temas |
| `reference_index.get` | Obtener índice de referencias |
| `paper_artifacts.get_manifest` | Obtener manifiesto de artefactos |
| `paper_artifacts.read` | Leer contenido de artefactos |
| `paper_artifacts.export_filtered` | Exportar artefactos filtrados |
| `paper_artifacts.resolve_topic_digest` | Resolver resumen de tema |
| `insights.get_attention_queue` | Obtener cola de atención |

</details>

## Protección de escritura

Las herramientas de escritura siguen el mismo modelo de aprobación que Host Bridge:

```
El cliente MCP invoca una herramienta de escritura
  │
  ├── Bearer Token validado
  ├── Ámbito de la herramienta extraído
  ├── Verificación de aprobación:
  │     ├── Herramienta de solo lectura → ejecutar inmediatamente
  │     ├── Escritura pre-aprobada → ejecutar inmediatamente
  │     └── Aprobación necesaria → encolar en la interfaz de Zotero
  └── Ejecutar / Denegar
```

Cola: máximo 50 aprobaciones pendientes; más de 10 escrituras denegadas en 5 minutos → circuit breaker (desactivado durante 30s).

## Próximos pasos

- [Host Bridge](#doc/backends%2Fhost-bridge) — El transporte subyacente y herramienta CLI
- [Preferencias](#doc/preferences) — Ver las configuraciones de MCP Server
