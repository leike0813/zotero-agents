# Git Sync

:::warning Veraltet

Git Sync wurde in der aktuellen Version als veraltet markiert und ist extern nicht mehr verfügbar. Das Plugin ist auf **WebDAV Durable Bundle Sync** umgestiegen, der das WebDAV-Protokoll verwendet, um Synthesis-Persistierungszustands-Snapshots (anstelle von Git-Repositories) für leichtere geräteübergreifende Synchronisierung auszutauschen.

**Bitte verwenden Sie stattdessen [WebDAV Sync](#doc/synthesis%2Fwebdav-sync).**

Git Sync wird nur noch als impliziter interner Transportkanal beibehalten (für historische Diagnostik und zukünftige Bereinigung). Die folgende Dokumentation wird als historische Referenz aufbewahrt.

:::

Git Sync ist eine optionale Funktion von Synthesis Workbench, die Wissensgraphdaten aus dem Canonical Store mit einem Git-Repository synchronisiert und so Versionskontrolle, Sicherung und Zusammenarbeit ermöglicht.

## Anwendungsfälle

- **Versionskontrolle**: Änderungsverlauf für alle Tag-Vokabulare, Themensynthesen und die Konzept-Wissensbasis nachverfolgen
- **Sicherung**: Strukturierte Wissensdaten in einem entfernten Git-Repository sichern
- **Zusammenarbeit**: Mehrere Forscher teilen dasselbe Tag-System und Analyseergebnisse

## Konfiguration

Konfigurieren Sie Git Sync in den Zotero-Einstellungen:

Zotero → Einstellungen → Zotero Agents → Synthesis Git Sync

| Einstellung | Beschreibung |
|-------------|-------------|
| **Git Sync aktivieren** | Sync ein-/ausschalten |
| **Remote-Repository-URL** | Git-Remote-Repository-Adresse (unterstützt HTTPS und SSH) |
| **Branch-Name** | Git-Branch, der für den Sync verwendet wird |

### Voraussetzungen

- Git installiert (im System-PATH verfügbar)
- Ein zugängliches Git-Remote-Repository (GitHub, Gitee, selbst gehostet usw.)
- Bei Verwendung eines HTTPS-Repositorys müssen Git-Anmeldedaten konfiguriert sein

## Sync-Umfang

Git Sync synchronisiert nur **kanonische Domain-Assets** (strukturierte Wissensdaten im Canonical Store), ausschließlich Laufzeitdaten.

### Was synchronisiert wird

| Domain | Inhalt |
|--------|--------|
| `tags/` | Kontrolliertes Tag-Vokabular |
| `topics/` | Strukturierte Artefakte für die Themensynthese |
| `concepts/` | Konzept-Wissensbasis (Konzepte, Sinnvarianten, Aliase, Beziehungen) |
| `topic-graph/` | Themen-Graph-Knoten und -Kanten |
| `citation-graph/` | Zitationsgraph-Snapshots |

### Was nicht synchronisiert wird

| Nicht synchronisiert | Grund |
|----------------------|-------|
| `state/`-Datenbanken | SQLite-Laufzeitstatus; kann aus kanonischen Assets neu aufgebaut werden |
| Laufzeitprotokolle | Temporäre Diagnosedaten |
| Workspace-Dateien | Während der Ausführung generierte temporäre Daten |
| Warteschlangen- und Sperrzustand | Interner Planungszustand |

## Sync-Zustandsmaschine

Das Sync-System verwendet eine warteschlangengesteuerte Zustandsmaschine, um Konsistenz zu gewährleisten:

```
idle → queued → syncing → idle
                  ↓
            blocked_conflict
                  ↓
            failed_retryable / failed_permanent / disabled
```

| Zustand | Beschreibung |
|---------|-------------|
| `idle` | Leerlauf, keine ausstehenden Aufgaben |
| `queued` | Änderungen stehen zum Sync an |
| `syncing` | Sync-Vorgang läuft |
| `blocked_conflict` | Sync fehlgeschlagen; Konflikte erfordern manuelle Beilegung |
| `failed_retryable` | Vorübergehender Fehler (z. B. Netzwerkprobleme); wiederholbar |
| `failed_permanent` | Dauerhafter Fehler (z. B. Konfigurationsfehler) |
| `disabled` | Git Sync ist ausgeschaltet |

## Konfliktbehandlung

Konflikte entstehen, wenn sowohl lokal als auch remote nicht zusammengeführte Änderungen vorliegen.

### Konfliktbericht

Der Konfliktbericht listet:

- **Betroffene Dateipfade**
- **Lokaler Versions-Hash**
- **Remote-Versions-Hash**
- **Konfliktgrund** (z. B. beide Seiten haben denselben Tag gleichzeitig geändert)

### Lösungsschritte

1. Betrachten Sie den Konfliktbericht im Git-Sync-Panel auf der Home-Seite
2. Analysieren Sie den Konfliktinhalt (Dateiebenen-Granularität)
3. Entscheiden Sie, ob Sie die lokale Version, die Remote-Version behalten oder manuell zusammenführen möchten
4. Nach Abschluss der Zusammenführung committen Sie die Änderungen

## Best Practices

### Regelmäßiger Sync

Git Sync ist kein Echtzeit-Sync. Es wird empfohlen:

- Manuell den Sync auszulösen, nachdem eine Reihe von Tag-Verwaltungs- oder Themenänderungen abgeschlossen ist
- Oder den Sync-Status auf der Home-Seite zu überwachen, um sicherzustellen, dass die Warteschlange nicht überläuft

### Teamzusammenarbeit

Wenn mehrere Personen dasselbe Tag-Vokabular teilen:

- Es wird empfohlen, eine dedizierte Person für die Vokabularverwaltung zu benennen
- Nachdem Tag-Änderungen über Git Sync verteilt wurden, führen die anderen Mitglieder ein Sync-Pull durch
- Konflikte durch Absprache beilegen

### Sicherungsstrategie

- Git Sync ergänzt den Canonical Store als zusätzliche Sicherung; er ersetzt nicht die Sicherung der Zotero-Daten selbst
- Es wird empfohlen, das Git-Repository regelmäßig auf den Remote zu pushen (eingebaute Unterstützung)
- Der initiale Sync kann lange dauern; nachfolgende Syncs sind inkrementell

## Nächste Schritte

- [Home-Dashboard](#doc/synthesis%2Fhome) – Das Sync-Status-Panel anzeigen
- [Tag-Verwaltung](#doc/synthesis%2Ftags) – Das kontrollierte Tag-Vokabular verwalten
- [Einstellungen](#doc/preferences) – Git-Repository-Parameter konfigurieren
