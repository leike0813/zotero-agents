# Git Sync

:::warning Obsoleto

Git Sync ha quedado obsoleto en la versión actual y ya no está disponible externamente. El plugin ha cambiado a **WebDAV Durable Bundle Sync**, que utiliza el protocolo WebDAV para intercambiar instantáneas de estado persistente de Synthesis (en lugar de repositorios Git) para una sincronización entre dispositivos más ligera.

**Por favor, usa [WebDAV Sync](webdav-sync) en su lugar.**

Git Sync se mantiene solo como un canal de transporte interno implícito (utilizado para diagnósticos históricos y limpieza futura). La documentación a continuación se conserva como referencia histórica.

:::

Git Sync es una función opcional de Synthesis Workbench que sincroniza datos del grafo de conocimiento desde el Canonical Store a un repositorio Git, habilitando control de versiones, respaldo y colaboración.

## Casos de uso

- **Control de versiones**: Seguir el historial de cambios de todos los vocabularios de etiquetas, síntesis de temas y base de conocimiento de conceptos
- **Respaldo**: Respaldar datos de conocimiento estructurado a un repositorio Git remoto
- **Colaboración**: Múltiples investigadores comparten el mismo sistema de etiquetas y resultados de análisis

## Configuración

Configura Git Sync en las preferencias de Zotero:

Zotero → Settings → Zotero Agents → Synthesis Git Sync

| Ajuste | Descripción |
|--------|-------------|
| **Enable Git Sync** | Activar/desactivar la sincronización |
| **Remote Repository URL** | Dirección del repositorio Git remoto (admite HTTPS y SSH) |
| **Branch Name** | Rama Git utilizada para la sincronización |

### Requisitos previos

- Git instalado (disponible en el PATH del sistema)
- Un repositorio Git remoto accesible (GitHub, Gitee, autoalojado, etc.)
- Si se usa un repositorio HTTPS, se deben configurar las credenciales de Git

## Alcance de la sincronización

Git Sync solo sincroniza **activos del dominio canónico** (datos de conocimiento estructurados en el Canonical Store), excluyendo datos de ejecución.

### Qué se sincroniza

| Dominio | Contenido |
|---------|-----------|
| `tags/` | Vocabulario controlado de etiquetas |
| `topics/` | Artefactos estructurados para síntesis de temas |
| `concepts/` | Base de conocimiento de conceptos (conceptos, acepciones, alias, relaciones) |
| `topic-graph/` | Nodos y aristas del grafo de temas |
| `citation-graph/` | Instantáneas del grafo de citas |

### Qué no se sincroniza

| No sincronizado | Razón |
|-----------------|-------|
| Bases de datos `state/` | Estado de ejecución SQLite; se puede reconstruir desde los activos canónicos |
| Registros de ejecución | Datos de diagnóstico temporales |
| Archivos del espacio de trabajo | Datos temporales generados durante la ejecución |
| Estado de cola y bloqueos | Estado de planificación interno |

## Máquina de estados de sincronización

El sistema de sincronización utiliza una máquina de estados impulsada por cola para garantizar la consistencia:

```
idle → queued → syncing → idle
                  ↓
            blocked_conflict
                  ↓
            failed_retryable / failed_permanent / disabled
```

| Estado | Descripción |
|--------|-------------|
| `idle` | Inactivo, sin tareas pendientes |
| `queued` | Cambios pendientes de sincronización |
| `syncing` | Operación de sincronización en progreso |
| `blocked_conflict` | La sincronización falló; los conflictos requieren resolución manual |
| `failed_retryable` | Fallo temporal (por ejemplo, problemas de red); reintentable |
| `failed_permanent` | Fallo permanente (por ejemplo, error de configuración) |
| `disabled` | Git Sync está desactivado |

## Gestión de conflictos

Los conflictos surgen cuando tanto el local como el remoto tienen cambios no fusionados.

### Informe de conflictos

El informe de conflictos lista:

- **Rutas de archivos en conflicto**
- **Hash de la versión local**
- **Hash de la versión remota**
- **Razón del conflicto** (por ejemplo, ambos lados modificaron la misma etiqueta simultáneamente)

### Pasos de resolución

1. Ver el informe de conflictos en el panel de Git Sync en la página Home
2. Analizar el contenido del conflicto (granularidad a nivel de archivo)
3. Decidir si mantener la versión local, la versión remota o fusionar manualmente
4. Después de completar la fusión, confirmar los cambios

## Mejores prácticas

### Sincronización regular

Git Sync no es sincronización en tiempo real. Se recomienda:

- Activar manualmente la sincronización después de completar un lote de gestión de etiquetas o modificaciones de temas
- O monitorizar el estado de sincronización en la página Home para asegurar que la cola no se acumule

### Colaboración en equipo

Cuando varias personas comparten el mismo vocabulario de etiquetas:

- Se recomienda designar a una persona dedicada para la gestión del vocabulario
- Después de que los cambios de etiquetas se propaguen mediante Git Sync, los demás miembros realizan una extracción de sincronización
- Resolver conflictos mediante negociación

### Estrategia de respaldo

- Git Sync complementa el Canonical Store como respaldo adicional; no reemplaza el respaldo de los propios datos de Zotero
- Se recomienda enviar regularmente el repositorio Git al remoto (soporte integrado)
- La sincronización inicial puede tardar mucho tiempo; las sincronizaciones posteriores son incrementales

## Siguientes pasos

- [Panel Home](home) — Ver el panel de estado de sincronización
- [Gestión de etiquetas](tags) — Gestionar el vocabulario controlado de etiquetas
- [Preferencias](../preferences) — Configurar parámetros del repositorio Git
