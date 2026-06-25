# WebDAV Sync

## Überblick

WebDAV Sync ist der geräteübergreifende Synchronisierungsmechanismus für Synthesis Workbench und ersetzt das veraltete Git Sync. Er tauscht deterministische Durable-State-Bundle-Snapshots über das WebDAV-Protokoll aus.

Funktioniert mit jedem WebDAV-konformen Server (Nextcloud, ownCloud, Synology usw.). Kein Git erforderlich.

## Voraussetzungen

- Ein zugänglicher WebDAV-Server
- WebDAV-Anmeldedaten (Benutzername + Passwort oder anwendungsspezifisches Token)

## Konfiguration

Zotero → Einstellungen → Zotero Agents → WebDAV Sync

| Einstellung | Typ | Standard | Beschreibung |
|-------------|-----|----------|-------------|
| **WebDAV Sync aktivieren** | boolean | `false` | Hauptschalter |
| **Basis-URL** | string | `""` | WebDAV-Server-URL, z. B. `https://nextcloud.example.com/remote.php/dav/files/user/` |
| **Remote-Pfad** | string | `"zotero-agents"` | Remote-Verzeichnis unter der Basis-URL |
| **Benutzername** | string | `""` | WebDAV-Benutzername (optional) |
| **Passwort / App-Token** | verschlüsselt | `""` | Passwort oder Token (AES-256-GCM-verschlüsselt) |
| **Auto-Sync** | boolean | `false` | Sync automatisch nach Synthesis-Änderungen auslösen |
| **Auto-Retry** | boolean | `false` | Vorübergehende Fehler automatisch wiederholen |

Aktions-Schaltflächen:

- **Einstellungen speichern**: Nicht-Anmeldedaten-Einstellungen persistieren
- **Anmeldedaten speichern**: Passwort/Token verschlüsselt speichern
- **Verbindung testen**: Eine PROPFIND-Anfrage senden, um die Konnektivität zu überprüfen

## Remote-Dateistruktur

```
<remotePath>/
├── HEAD.json                           # Aktueller Snapshot-Zeiger
└── snapshots/
    └── <snapshotId>/
        ├── manifest.json               # Durable-Bundle-Manifest
        └── bundles/                    # Deterministische Durable-Bundle-Dateien
```

**HEAD.json** enthält `snapshot_id`, `manifest_hash`, `updated_at`, `producer_version`. Snapshots werden vollständig hochgeladen, bevor HEAD aktualisiert wird – unterbrochene Syncs beschädigen niemals das Remote.

## Was synchronisiert wird

| Synchronisiert | Nicht synchronisiert |
|----------------|---------------------|
| Themen | SQLite-Laufzeitdatenbanken |
| Konzepte (Konzepte, Sinnvarianten, Aliase, Relationen) | Laufzeitprotokolle |
| Themen-Graph (Knoten, Kanten) | Workspace-Dateien |
| Referenzen (Bindungen, Umleitungen) | Warteschlangen- und Sperrzustand |
| Review-Elemente | Neu aufbaubare Projektionen (Zitationslayout, Metriken, Cache) |
| Tags (kontrolliertes Vokabular) | Anmeldedaten |
| Verwandte Objekte | Temporäre Dateien |

## Sync-Ablauf

```
idle → queued → syncing → idle
                 ├── blocked_conflict (manuelle Beilegung erforderlich)
                 └── failed_retryable / failed_permanent
```

| Schritt | Beschreibung |
|---------|-------------|
| 1. HEAD | Remote-HEAD.json lesen |
| 2. Download | Manifest + Bundles herunterladen, wenn ein neuerer Snapshot vorhanden ist |
| 3. Vorschau | Importierten Snapshot validieren, Entity-Hashes vergleichen |
| 4. Konfliktprüfung | Beidseitige Änderungen erkennen |
| 5. Anwenden | Remote-Snapshot in den lokalen Canonical Store importieren |
| 6. Export | Aktuellen lokalen Zustand als Bundles exportieren |
| 7. Upload | Manifest + Bundles hochladen |
| 8. HEAD-Aktualisierung | HEAD.json zuletzt aktualisieren (ETag/If-Match für Nebenläufigkeitssicherheit) |

## Konfliktbehandlung

Die Konflikterkennung basiert auf Entity-Hash-Vergleichen. Ein Konflikt wird ausgelöst, wenn dieselbe Entity sowohl lokal als auch remote geändert wurde.

**Konflikttypen:**

- Beidseitige Entity-Modifikation
- Update-vs.-Tombstone-Konflikt
- Review-Element-Divergenz
- Referenz-Bindungs-/Umleitungsziel-Divergenz

**Lösungsaktionen:**

| Aktion | Beschreibung |
|--------|-------------|
| `keep_local` | Lokalen Zustand behalten, Konflikt-Gate schließen, nächsten Export in die Warteschlange stellen |
| `clear_after_manual_edit` | Nach manueller Zusammenführung erneut validieren; den Konfliktmarker bei Beilegung löschen |

Das Sync-Panel auf der Workbench-Home-Seite zeigt Konfliktdetails und Aktions-Schaltflächen.

## Sicherheit

- **Anmeldedatenverschlüsselung**: AES-256-GCM, keyed zum Host-Bridge-Master-Token (PBKDF2-SHA256, 100.000 Iterationen)
- **Klartext wird niemals zurückgegeben**: Anmeldedaten sind nach dem Speichern nicht lesbar
- **URL-Bereinigung**: Anmeldedaten werden aus der Protokollausgabe entfernt
- **HTTP Basic Auth**: Standard-Basic-Authentifizierung über HTTPS

## Einschränkungen

| Einschränkung | Detail |
|---------------|--------|
| **Standardmäßig manuell** | Auto-Sync und Auto-Retry sind standardmäßig ausgeschaltet |
| **Keine Kompression** | v1-Snapshots sind rohe JSON-Bundles |
| **Keine Bereinigung alter Snapshots** | Remote-Snapshots sammeln sich an; manuelle Bereinigung erforderlich |
| **Kein Merge auf Feldebene** | Konflikte liegen auf Entity-Ebene vor |
| **Single-Device-Annahme** | Gleichzeitige Schreibvorgänge von mehreren Geräten können Konflikte verursachen |

## Nächste Schritte

- [Home-Dashboard](home) – Sync-Status anzeigen
- [Einstellungen](../preferences) – WebDAV Sync konfigurieren
- [Git Sync](git-sync) (veraltet) – Historische Referenz
