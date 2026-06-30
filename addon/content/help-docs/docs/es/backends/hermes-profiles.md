# Perfil Hermes Zotero Librarian

## Resumen

**zotero-librarian** es un perfil [Hermes](https://github.com/anomalyco/hermes) listo para instalar que permite a los agentes de IA gestionar su biblioteca Zotero a través del [Host Bridge](#doc/backends%2Fhost-bridge). Incluye todo lo que un agente necesita: la CLI `zotero-bridge`, una plantilla de perfil de conexión Host Bridge, un índice local de metadatos SQLite, una caché de catálogo de workflows, scripts de monitoreo de ejecuciones y trabajos cron de mantenimiento programado.

El perfil se distribuye como un paquete independiente desde la rama `host-bridge/zotero-librarian-profile` del repositorio Zotero Agents.

## Qué puede hacer

| Funcionalidad | Descripción |
|---------------|-------------|
| **Índice local de metadatos** | Mantiene una instantánea SQLite consultable de su biblioteca Zotero — títulos, creadores, etiquetas, colecciones, DOIs, recuentos de notas/adjuntos — para consultas rápidas y con capacidad offline |
| **Caché de catálogo de workflows** | Almacena en caché localmente todos los contratos de carga de workflows integrados para que los agentes puedan enviar workflows conocidos sin volver a consultar esquemas en cada ejecución |
| **Mantenimiento programado** | Seis plantillas cron integradas: actualización de índice, actualización de catálogo de workflows, monitoreo de ejecuciones, triaje de bandeja de entrada, higiene de biblioteca y resúmenes de cola de atención |
| **Monitoreo de ejecuciones** | Rastrea las ejecuciones de workflows enviadas e informa cambios de estado, estados terminales o elementos que requieren atención |
| **Cola de atención** | Combina `insights.get_attention_queue` de Host Bridge con metadatos del índice local para mostrar tareas prioritarias de lectura y análisis |

## Instalación

### Requisitos previos

- [Zotero](https://www.zotero.org/) 7+ con el plugin **Zotero Agents** instalado
- Host Bridge en ejecución (verificar: Zotero → Configuración → Zotero Agents → Host Bridge → **Iniciar / Mostrar endpoint**)
- [Hermes](https://github.com/anomalyco/hermes) instalado en su sistema
- CLI `zotero-bridge` disponible (instalar mediante el botón **Instalar CLI** en el panel de configuración de Host Bridge)

### Instalar el perfil

```bash
hermes profile install zotero-librarian
```

Esto descarga el paquete del perfil y lo extrae en su directorio de perfiles de Hermes.

### Configurar Hermes

Edite `config.yaml` del perfil para configurar su proveedor de modelos preferido:

```yaml
# Dentro del directorio del perfil instalado
provider:
  type: anthropic    # o openai, local, etc.
  model: claude-sonnet-4-20250514
  # ... Clave API y otras configuraciones del proveedor
```

Consulte la [documentación de Hermes](https://github.com/anomalyco/hermes) para conocer todas las opciones de configuración del proveedor.

### Configurar la conexión Zotero Bridge

El perfil incluye una plantilla de conexión Host Bridge en `assets/host-bridge/profile.example.json`. Debe proporcionar el endpoint y el token reales:

1. Abra Zotero → Configuración → Zotero Agents → Host Bridge
2. Haga clic en **Iniciar / Mostrar endpoint** para asegurarse de que el bridge esté en ejecución y anote la URL del endpoint (ej. `http://127.0.0.1:26570/bridge/v1`)
3. Haga clic en **Copiar token maestro** (o use el token de sesión mostrado en el panel)
4. Establezca el token como variable de entorno:

```bash
# Linux / macOS
export ZOTERO_BRIDGE_TOKEN="<su-token>"

# Windows PowerShell
$env:ZOTERO_BRIDGE_TOKEN = "<su-token>"
```

5. Para acceso remoto/LAN, incluya también el endpoint directamente:

```bash
export ZOTERO_BRIDGE_ENDPOINT="http://127.0.0.1:26570/bridge/v1"
```

La plantilla del perfil utiliza `auth.tokenEnv: "ZOTERO_BRIDGE_TOKEN"`, por lo que la CLI toma el token automáticamente del entorno. Consulte [Configuración de Host Bridge](#doc/backends%2Fhost-bridge) para documentación detallada sobre endpoint, token y archivos de perfil.

### Verificar la configuración

```bash
# Verificar conectividad con Host Bridge
zotero-bridge status

# Instalar binarios CLI en el perfil (solo la primera vez)
python scripts/install_zotero_bridge_cli.py

# Actualización inicial del índice (extrae todos los metadatos de la biblioteca a SQLite local)
python scripts/zotero_librarian_index_service.py refresh

# Probar una búsqueda en el índice local
python scripts/zotero_librarian_index_service.py search "machine learning"
```

## Comandos del servicio de índice

La utilidad principal del perfil es `zotero_librarian_index_service.py`. Mantiene una base de datos SQLite local para consultas rápidas y repetidas de la biblioteca sin llamar a Zotero en cada solicitud.

| Comando | Descripción |
|---------|-------------|
| `refresh` | Pagina a través de `zotero-bridge library snapshot` y actualiza atómicamente el índice SQLite. Los elementos ausentes en la última actualización se marcan como eliminados. |
| `search "<consulta>"` | Búsqueda de texto completo en títulos, creadores, identificadores, etiquetas, colecciones y campos de publicación |
| `item <key-or-id>` | Devuelve un único registro indexado por clave de elemento Zotero o ID numérico |
| `stats` | Informa recuentos de elementos activos/eliminados, etiquetas, colecciones y estado del catálogo de workflows |
| `workflow-refresh` | Llama a `workflow list` y `workflow describe` para actualizar la caché del catálogo de workflows local |
| `workflow-show <id>` | Muestra el contrato de carga en caché para un workflow conocido |
| `run-register --run-id <id> --workflow-id <id>` | Registra una ejecución de workflow enviada para su monitoreo |
| `run-watch` | Verifica todas las ejecuciones registradas activas e informa cambios de estado o estados terminales |

## Casos de uso

### Gestión de biblioteca

**Triaje diario de bandeja de entrada** (`cron/inbox-triage.yaml`)

El cron de triaje de bandeja de entrada del perfil se ejecuta diariamente y verifica la integridad de los nuevos elementos en su biblioteca:

- Elementos con estado `0-inbox` (sin procesar)
- Etiquetas o asignaciones de colección faltantes
- DOI, URL o archivos adjuntos faltantes
- Artefactos de resumen o digest faltantes

Produce un informe de acciones sugeridas pero no realiza ninguna mutación en Zotero sin su aprobación.

**Higiene semanal de biblioteca** (`cron/library-hygiene.yaml`)

Se ejecuta semanalmente los lunes y escanea la biblioteca en busca de problemas de calidad de datos:

- Entradas duplicadas (por DOI, título o ISBN)
- Títulos sospechosos con caracteres corruptos
- Elementos huérfanos (sin colección principal)
- Colecciones vacías
- Recuentos excesivos de etiquetas en elementos individuales
- Elementos con tipos de elemento Zotero inusuales

Todas las sugerencias son de solo lectura hasta que apruebe explícitamente las acciones correctivas.

**Cola de atención** (`cron/attention-queue.yaml`)

Combina `insights.get_attention_queue` de Host Bridge con metadatos del índice local para mostrar una lista clasificada de tareas de alta prioridad: artículos para leer, vacíos de metadatos para completar, workflows para ejecutar.

### Búsqueda e importación de literatura

1. Busque primero en su índice local para evitar volver a agregar artículos que ya posee:
   ```bash
   python scripts/zotero_librarian_index_service.py search "attention mechanism survey"
   ```

2. Si no se encuentra un artículo, use el workflow `literature-search-ingest` para buscar en fuentes externas y agregarlo a Zotero:
   ```bash
   zotero-bridge workflow submit \
     --workflow literature-search-ingest \
     --none \
     --workflow-options '{"query":"attention mechanism survey","searchMode":"arxiv-and-doi"}'
   ```

3. Después de importar, ejecute los workflows tag-bootstrapper o tag-regulator para normalizar las etiquetas de los nuevos elementos.

### Workflows automatizados de análisis de literatura

El perfil cataloga todos los workflows integrados del plugin Zotero Agents. Una vez actualizado el catálogo, puede enviar cualquier workflow directamente sin volver a consultar su esquema.

**Análisis de literatura por lotes**

Envíe el workflow `literature-analysis` en una colección de artículos para generar resúmenes estructurados:

```bash
zotero-bridge workflow submit \
  --workflow literature-analysis \
  --items @items.json \
  --workflow-options '{"language":"es"}'
```

Registre y monitoree la ejecución:

```bash
python scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id literature-analysis
python scripts/zotero_librarian_index_service.py run-watch
```

**Lectura profunda de un solo artículo**

Para un análisis en profundidad de un artículo específico:

```bash
zotero-bridge workflow submit \
  --workflow literature-deep-reading \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"es","mode":"comprehensive"}'
```

**Síntesis de temas entre artículos**

Sintetice temas a través de una colección de artículos:

```bash
zotero-bridge workflow submit \
  --workflow create-topic-synthesis \
  --items @collection-items.json \
  --workflow-options '{"topicSeed":"self-supervised learning","language":"es"}'
```

**Asistencia de traducción**

Traduzca metadatos o resúmenes de artículos:

```bash
zotero-bridge workflow submit \
  --workflow literature-translator \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"es","mode":"metadata"}'
```

**Preguntas y respuestas sobre artículos**

Haga preguntas sobre el contenido de un artículo:

```bash
zotero-bridge workflow submit \
  --workflow literature-explainer \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"language":"es"}'
```

## Trabajos de mantenimiento programados

El perfil incluye seis plantillas cron preconfiguradas en el directorio `cron/`:

| Trabajo Cron | Programación | Comportamiento |
|-------------|-------------|----------------|
| `index-refresh` | Cada 6 horas | Pagina a través de `library snapshot` para mantener actualizado el índice SQLite local. Informa `[SILENT]` cuando no se detectan cambios. |
| `workflow-catalog-refresh` | Diario a las 03:00 | Llama a `workflow list` + `workflow describe` para actualizar la caché del catálogo de workflows. Informa `[SILENT]` cuando no hay cambios. |
| `run-monitor` | Cada 5 minutos | Llama a `run-watch` para verificar las ejecuciones registradas activas. Informa solo cambios de estado, estados terminales o elementos que requieren atención. |
| `inbox-triage` | Diario a las 09:00 | Busca elementos con `status:0-inbox`, etiquetas faltantes, colecciones faltantes, metadatos faltantes. Genera un informe de solo lectura. |
| `library-hygiene` | Semanal los lunes | Escanea entradas duplicadas, elementos huérfanos, colecciones vacías y problemas de calidad de datos. |
| `attention-queue` | Diario a las 18:00 | Combina los conocimientos de la cola de atención con datos del índice local para clasificar tareas de alta prioridad. |

Todos los trabajos de mantenimiento no interactivos utilizan marcadores `[SILENT]` para evitar molestar al usuario cuando no se encuentran resultados accionables.

## Límites de seguridad

- La plantilla de perfil (`profile.example.json`) nunca contiene tokens reales. Utilice siempre `ZOTERO_BRIDGE_TOKEN` como variable de entorno.
- Los trabajos cron de mantenimiento son de solo lectura por defecto. Las mutaciones requieren aprobación explícita del usuario.
- Nunca lea directamente los archivos de la base de datos de Zotero. Utilice siempre Host Bridge, `zotero-bridge` y el índice local producido a partir de `library.sync_snapshot`.

## Próximos pasos

- [Host Bridge](#doc/backends%2Fhost-bridge) — referencia completa de la CLI `zotero-bridge` y las capacidades de Host Bridge
- [Workflows](#doc/workflows%2Findex) — descripción general de todos los workflows integrados y personalizados
- [Servidor MCP](#doc/backends%2Fmcp-server) — interfaz de protocolo alternativa para clientes compatibles con MCP
