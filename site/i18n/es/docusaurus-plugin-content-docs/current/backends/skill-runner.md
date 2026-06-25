# Despliegue y configuración de Skill-Runner

## ¿Qué es Skill-Runner?

Skill-Runner es un servicio independiente de ejecución de skills de agente. Zotero Agents se comunica con Skill-Runner a través de la API HTTP para enviar solicitudes de skills y obtener resultados. Admite múltiples CLIs de agente de IA como motores de backend y puede desplegarse como un contenedor Docker independiente o como servicio local.

> **🏆 Prioridad de recomendación**: Si ya tienes una herramienta de agente compatible con ACP en tu máquina (Codex, OpenCode, Claude Code, etc.), por favor usa primero el [backend ACP](./acp), que no requiere configuración adicional. Skill-Runner es adecuado para escenarios que requieren un servicio persistente en segundo plano o compartición en red local.

## Modos de despliegue

### Recomendado: Despliegue persistente con Docker

Un Skill-Runner desplegado con Docker se ejecuta como un servicio persistente independiente, **sin verse afectado por el inicio/detención de Zotero** — al cerrar Zotero las tareas pueden seguir ejecutándose en segundo plano, y en el siguiente inicio de Zotero puedes reanudarlas u obtener directamente los resultados completados.

Adecuado para:
- Tareas de larga duración (Topic Synthesis, análisis de literatura en lotes, etc.)
- Compartir una única instancia de Skill-Runner entre múltiples dispositivos en una red local
- Usuarios con experiencia en Docker

#### docker compose (Recomendado)

```yaml
version: "3"
services:
  skill-runner:
    image: leike0813/skill-runner:latest
    ports:
      - "9813:9813"
      - "17681:17681"
    volumes:
      - ./skills:/app/skills
      - skillrunner_cache:/opt/cache
      - ./data:/app/data
    environment:
      - SKILL_RUNNER_DATA_DIR=/app/data
      - UI_BASIC_AUTH_ENABLED=false

volumes:
  skillrunner_cache:
```

```bash
mkdir -p data skills
docker compose up -d --build
```

Tras el inicio:
- **Servicio API**: `http://localhost:9813/v1`
- **Interfaz de gestión**: `http://localhost:9813/ui`

#### Ejecución directa con Docker

```bash
docker run --rm -p 9813:9813 -p 17681:17681 \
  -v "$(pwd)/skills:/app/skills" \
  -v skillrunner_cache:/opt/cache \
  -v "$(pwd)/data:/app/data" \
  leike0813/skill-runner:latest
```

Descripción de puertos:

| Puerto | Propósito |
|--------|-----------|
| `9813` | API HTTP + Interfaz de gestión |
| `17681` | Terminal de motor en línea en el navegador (requiere ttyd) |

#### Configuración para producción

Para despliegues públicos, se recomienda habilitar la autenticación básica de la interfaz:

```bash
docker run --rm -p 9813:9813 \
  -v "$(pwd)/skills:/app/skills" \
  -e UI_BASIC_AUTH_ENABLED=true \
  -e UI_BASIC_AUTH_USERNAME=admin \
  -e UI_BASIC_AUTH_PASSWORD=your-password \
  leike0813/skill-runner:latest
```

Se recomienda utilizar esto con un proxy inverso HTTPS (como Nginx).

### Emergencia: Despliegue en modo local con un clic

> ⚠️ Este modo solo es adecuado para usuarios que **no saben cómo instalar herramientas de agente y no pueden usar Docker**. Si tienes capacidad para instalar CLIs de agente o usar Docker, por favor prefiere el [backend ACP](./acp) o el despliegue con Docker descrito arriba.

El Skill-Runner desplegado con un clic se inicia y se detiene automáticamente junto con el complemento de Zotero — **al cerrar Zotero se terminan todas las tareas en ejecución**, y no hay ejecución en segundo plano. Las tareas interrumpidas deben volver a enviarse.

**Pasos del despliegue:**

1. Abre **Zotero → Configuración → Zotero Agents**
2. Busca la sección **SkillRunner Local Backend**
3. Haz clic en **Desplegar con un clic** (si aún no está instalado)
   - El complemento descarga automáticamente la última versión desde GitHub Releases
   - Se instala en el directorio de datos del complemento
   - El estado cambia a "Instalado" al completarse
4. Haz clic en **Iniciar**
   - Dirección predeterminada: `http://127.0.0.1:29813`
   - Si el puerto está ocupado, intenta automáticamente los siguientes 10 puertos

**Descripción de los botones de acción:**

| Botón | Función |
|--------|----------|
| Desplegar | Descarga e instala el runtime de Skill-Runner |
| Iniciar | Inicia el proceso local de Skill-Runner |
| Detener | Detiene el proceso de Skill-Runner en ejecución |
| Desinstalar | Elimina los archivos del runtime instalados |
| Abrir interfaz de gestión | Abre la interfaz web de gestión integrada de Skill-Runner en la barra lateral |
| Abrir carpeta de skills | Abre el directorio donde se almacenan los archivos de skills |
| Actualizar caché de modelos | Actualiza la caché de la lista de modelos del backend |
| Abrir consola de depuración | Ver la salida de logs del backend |

### Modo remoto

Conéctate a una instancia de Skill-Runner remota o alojada en la nube.

> ⚠️ **Aviso de seguridad**: La versión actual no proporciona protección de seguridad adicional para conexiones remotas (como TLS, verificación de claves API, etc.), dependiendo únicamente de la autenticación Bearer Token. **No se recomiendan conexiones remotas en entornos no LAN**. Al desplegar dentro de una red local, se recomienda usar un firewall para restringir las fuentes de acceso.

**Pasos de configuración:**

1. Abre **Herramientas → [Backend Manager](backend-manager)**
2. Cambia a la pestaña **SkillRunner**
3. Haz clic en **Añadir SkillRunner**
4. Rellena:
   - **Nombre a mostrar**: Un nombre descriptivo
   - **URL base**: Dirección de la instancia remota (ej., `http://192.168.1.100:9813`)
   - **Autenticación**: Selecciona `bearer` y rellena el **Token de autenticación** (si el backend requiere autenticación)
   - **Tiempo de espera**: Tiempo de espera de la solicitud (opcional)
5. Haz clic en **Guardar** en la esquina inferior derecha

## Despliegue local (sin Docker)

### Script de despliegue rápido

```bash
# Linux / macOS
./scripts/deploy_local.sh

# Windows (PowerShell)
.\scripts\deploy_local.ps1
```

Requisitos previos: `uv`, `Node.js`, `npm`. `ttyd` es opcional.

### CLI de control

```bash
# Verificar estado
./scripts/skill-runnerctl status --mode local --json

# Iniciar
./scripts/skill-runnerctl up --mode local --json

# Detener
./scripts/skill-runnerctl down --mode local --json
```

Parámetros predeterminados del modo local:
- **Linux/macOS**: `$HOME/.local/share/skill-runner`
- **Windows**: `%LOCALAPPDATA%\SkillRunner`
- **Puerto**: `29813` (alternativa `29813-29823`)
- **Vinculación**: solo `127.0.0.1`

### Instalador de releases

```bash
# Linux / macOS
./scripts/skill-runner-install.sh --version v0.4.3

# Windows (PowerShell)
.\scripts\skill-runner-install.ps1 -Version v0.4.3
```

El script descarga automáticamente `skill-runner-<versión>.tar.gz` + `.sha256` y verifica la integridad SHA256 antes de la instalación.

## Sistema de motores

Skill-Runner admite múltiples CLIs de agente de IA como motores de ejecución y proporciona una capa de adaptación unificada.

### Motores admitidos

| Motor | Nombre del paquete |
|-------|-------------------|
| Codex | `@openai/codex` |
| Gemini CLI | `@google/gemini-cli` |
| OpenCode | `opencode-ai` |
| Claude Code | `@anthropic-ai/claude-code` |
| Qwen | `@qwen-code/qwen-cli` |

### Prioridad de configuración

La configuración del motor se combina en cuatro capas (baja → alta):

1. **Valores predeterminados del motor**: Configuración predeterminada incorporada en el adaptador del motor
2. **Valores recomendados del skill**: Configuración recomendada del paquete de skill `assets/<engine>_config.*`
3. **Opciones del usuario**: Parámetros del cuerpo de la solicitud API
4. **Configuración forzada**: Configuración forzada del adaptador del motor (no puede ser sobrescrita)

### Autenticación del motor

| Método | Descripción | Recomendación |
|--------|-------------|---------------|
| **Proxy OAuth** | Completa el OAuth mediante la interfaz de gestión; las credenciales se almacenan automáticamente | ⭐ Recomendado |
| **Delegación CLI** | Usa el flujo de inicio de sesión local incorporado del motor | Alternativa |
| **TUI en línea** | Terminal del motor en el navegador (requiere ttyd) | Para depuración |
| **Importar archivo de credenciales** | Sube archivos de credenciales a través de la interfaz | Alternativa |
| **Inicio de sesión CLI en contenedor** | Ejecuta el inicio de sesión CLI directamente mediante `docker exec` | Para entornos de contenedor |

## Interfaz de gestión

La interfaz web integrada proporciona capacidades operativas completas para Skill-Runner.

URL de acceso: `http://localhost:<puerto>/ui`

| Función | Descripción |
|---------|-------------|
| **Explorador de skills** | Ver skills instaladas, inspeccionar la estructura del paquete y el contenido de archivos |
| **Gestión de motores** | Supervisar el estado del motor, activar actualizaciones, ver logs del motor |
| **Catálogo de modelos** | Explorar y gestionar las instantáneas de modelos del motor |
| **TUI en línea** | Lanzar terminales del motor directamente en el navegador (requiere ttyd) |
| **Configuración** | Nivel de log, período de retención de datos, tamaño máximo del directorio, etc. |

## Resumen de la API REST

### Endpoints de ejecución principales

```bash
# Listar skills disponibles
curl http://localhost:9813/v1/skills

# Crear un job (ejecutar un skill)
curl -X POST http://localhost:9813/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "my-skill",
    "engine": "gemini",
    "parameter": { "language": "zh-CN" },
    "model": "gemini-3-pro-preview"
  }'

# Obtener resultados
curl http://localhost:9813/v1/jobs/<request_id>/result

# Cancelar un job
curl -X POST http://localhost:9813/v1/jobs/<request_id>/cancel
```

### Monitoreo en tiempo real (SSE)

Dos canales SSE para observar el proceso de ejecución en tiempo real:

| Canal | Endpoint | Propósito |
|-------|----------|-----------|
| Chat | `GET /v1/jobs/{id}/chat?cursor=N` | Flujo de burbujas de chat |
| Eventos | `GET /v1/jobs/{id}/events?cursor=N` | Flujo completo de eventos del protocolo |

Ambos canales admiten reconexión basada en cursor tras desconexión.

### API de gestión

Endpoints de gestión JSON estables, adecuados para integración con frontend:

| Endpoint | Propósito |
|----------|-----------|
| `GET /v1/management/skills` | Resumen de skills |
| `GET /v1/management/engines` | Estado de motores |
| `GET /v1/management/runs` | Historial de ejecuciones (paginado) |
| `GET /v1/management/runs/{id}/chat` | Flujo SSE de conversación |
| `POST /v1/management/runs/{id}/reply` | Enviar una respuesta a un skill interactivo |
| `POST /v1/management/runs/{id}/cancel` | Cancelar una ejecución |

### API de arrendamiento del runtime local

El modo de runtime local utiliza una gestión del ciclo de vida basada en arrendamientos:

| Endpoint | Propósito |
|----------|-----------|
| `POST /v1/local-runtime/lease/acquire` | Adquirir un arrendamiento |
| `POST /v1/local-runtime/lease/heartbeat` | Renovar arrendamiento (TTL: 60s) |
| `POST /v1/local-runtime/lease/release` | Liberar el arrendamiento |

El runtime local se termina automáticamente cuando expira el arrendamiento.

## Gestión de paquetes de skills

### Instalación persistente

```bash
# Subir un zip de paquete de skills
curl -X POST http://localhost:9813/v1/skill-packages/install \
  -H "Content-Type: multipart/form-data" \
  -F "file=@my-skill.zip"
```

Reglas de validación del servidor:
- El paquete debe contener un directorio de nivel superior
- Debe tener `SKILL.md` + `assets/runner.json`
- Debe tener tres archivos de esquema (input / parameter / output)
- El nombre del directorio == `runner.json.id` == nombre en frontmatter de `SKILL.md` (consistencia de identidad)
- Las actualizaciones deben ser estrictamente de versión creciente

### Ejecución temporal (sin instalación)

```bash
# Crear una ejecución temporal
curl -X POST http://localhost:9813/v1/temp-skill-runs \
  -H "Content-Type: application/json" \
  -d '{ "engine": "gemini", "parameter": {} }'

# Subir un paquete de skills e iniciar
curl -X POST http://localhost:9813/v1/temp-skill-runs/<id>/upload \
  -F "skill_package=@my-skill.zip"
```

Las ejecuciones temporales se limpian automáticamente al alcanzar un estado terminal.

## Ciclo de vida de ejecución

Una ejecución típica de skill incluye las siguientes etapas:

```
1. Configuración y carga
   └── El cliente envía POST /v1/jobs
       └── Opcionalmente sube archivos de entrada

2. Orquestación
   └── Carga el manifiesto del skill
       └── Valida el esquema de parámetros
       └── Verifica compatibilidad del motor
       └── Aplica límites de concurrencia

3. Adaptación del motor
   └── Prepara el entorno (copia el paquete de skills)
       └── Analiza archivos de entrada
       └── Construye el prompt mediante plantillas Jinja2
       └── Establece la confianza del directorio de ejecución

4. Ejecución
   └── El CLI del motor se inicia como subproceso
       └── Directorio de trabajo aislado
       └── stdout/stderr se transmiten en tiempo real

5. Finalización
   └── Validación de salida (contra output.schema.json)
       └── Análisis de archivos de artefactos
       └── Generación del Bundle (zip + manifiesto)
       └── Estado establecido a succeeded / failed / canceled
```

Cuando una ejecución falla, el paquete de depuración contiene logs completos y archivos de diagnóstico.

## Estructura del directorio de datos

```
data/
├── runs/<run_id>/              # Espacio de trabajo de la ejecución
│   ├── .state/state.json       # Estado de la ejecución
│   ├── .audit/                 # Logs de auditoría
│   ├── result/result.json      # Salida estructurada final
│   ├── artifacts/              # Archivos generados por el skill
│   └── bundle/                 # Resultados empaquetados (zip + manifiesto)
├── requests/<request_id>/      # Datos de la fase de solicitud
│   ├── uploads/                # Archivos de entrada subidos
│   └── request.json            # Parámetros originales de la solicitud
├── logs/                       # Logs de la aplicación (rotación diaria)
└── system_settings.json        # Configuración del sistema editable desde la interfaz
```

## Referencia de variables de entorno

| Variable | Descripción | Predeterminado |
|----------|-------------|----------------|
| `SKILL_RUNNER_DATA_DIR` | Directorio de datos de ejecución | `./data` |
| `SKILL_RUNNER_AGENT_HOME` | Directorio home de configuración aislada del agente | `auto` |
| `SKILL_RUNNER_RUNTIME_MODE` | Modo de ejecución: local / container | `auto` |
| `UI_BASIC_AUTH_ENABLED` | Habilitar Basic Auth de la interfaz | `false` |
| `UI_BASIC_AUTH_USERNAME` | Nombre de usuario Basic Auth | — |
| `UI_BASIC_AUTH_PASSWORD` | Contraseña Basic Auth | — |

## Descripción de estados de ejecución

| Estado | Descripción |
|--------|-------------|
| unknown | Estado inicial, aún no detectado |
| starting | Iniciando |
| running | Ejecutándose normalmente |
| stopped | Detenido |
| degraded | Ejecutándose anormalmente |
| reconciling_after_heartbeat_fail | Detección de heartbeat falló, recuperándose |

## Descripción de puertos

- Puerto predeterminado: `29813` (rango local del complemento)
- Puerto API de despliegue independiente: `9813`
- Rango alternativo: 10 puertos consecutivos (29813–29822)
- Intervalo de heartbeat: 20 segundos
- Detección de inicio automático: verifica cada 15 segundos

## Logs

Los logs se escriben en `data/logs/skill_runner.log` (rotación diaria). Puedes configurar el nivel de log, el período de retención y el tamaño máximo del directorio a través de la página de configuración de la interfaz de gestión.

Al iniciar el contenedor, también se generan logs de diagnóstico de arranque estructurados en `${SKILL_RUNNER_DATA_DIR}/logs/bootstrap.log` y `agent_bootstrap_report.json`.

## Próximos pasos

- [Conocer los Workflows](../workflows/) — Skill-Runner es uno de los principales backends para ejecutar workflows
- [Introducción al Dashboard](../dashboard) — Supervisar el estado de ejecución de tareas
- [Pestaña SkillRunner](../sidebar/skillrunner-tab) — Ver e interactuar con ejecuciones de SkillRunner en la barra lateral
