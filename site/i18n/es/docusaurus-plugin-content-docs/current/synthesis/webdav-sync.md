# WebDAV Sync

## Descripción general

WebDAV Sync es el mecanismo de sincronización entre dispositivos para Synthesis Workbench, reemplazando al obsoleto Git Sync. Intercambia instantáneas de paquetes de estado duraderos deterministas a través del protocolo WebDAV.

Funciona con cualquier servidor compatible con WebDAV (Nextcloud, ownCloud, Synology, etc.). No requiere Git.

## Requisitos previos

- Un servidor WebDAV accesible
- Credenciales WebDAV (nombre de usuario + contraseña o token específico de aplicación)

## Configuración

Zotero → Settings → Zotero Agents → WebDAV Sync

| Ajuste | Tipo | Valor por defecto | Descripción |
|--------|------|-------------------|-------------|
| **Enable WebDAV Sync** | boolean | `false` | Interruptor principal |
| **Base URL** | string | `""` | URL del servidor WebDAV, por ejemplo `https://nextcloud.example.com/remote.php/dav/files/user/` |
| **Remote Path** | string | `"zotero-agents"` | Directorio remoto bajo la URL base |
| **Username** | string | `""` | Nombre de usuario WebDAV (opcional) |
| **Password / App Token** | encrypted | `""` | Contraseña o token (cifrado con AES-256-GCM) |
| **Auto Sync** | boolean | `false` | Activar sincronización automáticamente después de cambios en Synthesis |
| **Auto Retry** | boolean | `false` | Reintentar fallos transitorios automáticamente |

Botones de acción:

- **Save Settings**: Persistir ajustes no relativos a credenciales
- **Save Credential**: Cifrar y almacenar contraseña/token
- **Test Connection**: Enviar una solicitud PROPFIND para verificar la conectividad

## Disposición de archivos remotos

```
<remotePath>/
├── HEAD.json                           # Puntero de instantánea actual
└── snapshots/
    └── <snapshotId>/
        ├── manifest.json               # Manifiesto del paquete duradero
        └── bundles/                    # Archivos de paquetes duraderos deterministas
```

**HEAD.json** contiene `snapshot_id`, `manifest_hash`, `updated_at`, `producer_version`. Las instantáneas se cargan completamente antes de actualizar HEAD — las sincronizaciones interrumpidas nunca corrompen el remoto.

## Qué se sincroniza

| Sincronizado | No sincronizado |
|--------------|-----------------|
| Temas | Bases de datos de ejecución SQLite |
| Conceptos (conceptos, acepciones, alias, relaciones) | Registros de ejecución |
| Grafo de temas (nodos, aristas) | Archivos del espacio de trabajo |
| Referencias (vinculaciones, redirecciones) | Estado de cola y bloqueos |
| Elementos de revisión | Proyecciones reconstruibles (disposición de citas, métricas, caché) |
| Etiquetas (vocabulario controlado) | Credenciales |
| Elementos relacionados | Archivos temporales |

## Flujo de sincronización

```
idle → queued → syncing → idle
                 ├── blocked_conflict (requiere resolución manual)
                 └── failed_retryable / failed_permanent
```

| Paso | Descripción |
|------|-------------|
| 1. HEAD | Leer HEAD.json remoto |
| 2. Download | Descargar manifiesto + paquetes si existe una instantánea más reciente |
| 3. Preview | Validar la instantánea importada, comparar hashes de entidades |
| 4. Conflict Check | Detectar cambios bilaterales |
| 5. Apply | Importar la instantánea remota al Canonical Store local |
| 6. Export | Exportar el estado local actual como paquetes |
| 7. Upload | Cargar manifiesto + paquetes |
| 8. HEAD Update | Actualizar HEAD.json al final (ETag/If-Match para seguridad de concurrencia) |

## Gestión de conflictos

La detección de conflictos se basa en comparación de hashes a nivel de entidad. Se genera un conflicto cuando la misma entidad cambió tanto local como remotamente.

**Tipos de conflictos:**

- Modificación bilateral de entidad
- Conflicto de actualización vs tombstone
- Divergencia de elementos de revisión
- Divergencia de destino de vinculación/redirección de referencias

**Acciones de resolución:**

| Acción | Descripción |
|--------|-------------|
| `keep_local` | Mantener estado local, cerrar puerta de conflicto, poner en cola la siguiente exportación |
| `clear_after_manual_edit` | Después de la fusión manual, re-validar; limpiar el marcador de conflicto cuando se resuelva |

El panel de sincronización de la página Home de Workbench muestra los detalles del conflicto y los botones de acción.

## Seguridad

- **Cifrado de credenciales**: AES-256-GCM, con clave derivada del token maestro de Host Bridge (PBKDF2-SHA256, 100.000 iteraciones)
- **Nunca se devuelve texto plano**: la credencial no es legible después de guardarla
- **Saneamiento de URL**: las credenciales se eliminan de la salida de registro
- **HTTP Basic Auth**: Autenticación básica estándar sobre HTTPS

## Limitaciones

| Limitación | Detalle |
|------------|---------|
| **Manual por defecto** | La sincronización automática y el reintento automático están desactivados por defecto |
| **Sin compresión** | Las instantáneas v1 son paquetes JSON sin procesar |
| **Sin limpieza de instantáneas antiguas** | Las instantáneas remotas se acumulan; se requiere limpieza manual |
| **Sin fusión a nivel de campo** | Los conflictos son a nivel de entidad |
| **Suposición de dispositivo único** | Las escrituras concurrentes desde múltiples dispositivos pueden causar conflictos |

## Siguientes pasos

- [Panel Home](home) — Ver estado de sincronización
- [Preferencias](../preferences) — Configurar WebDAV sync
- [Git Sync](git-sync) (obsoleto) — Referencia histórica
