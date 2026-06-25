# Backend-Konfigurationsübersicht

Zotero Agents unterstützt drei Backend-Typen, die jeweils für unterschiedliche Anwendungsfälle geeignet sind.

## Auswahlhilfe

### 🥇 Erste Wahl: ACP-Backend

Wenn Sie bereits ein ACP-kompatibles Agent-Tool auf Ihrem Rechner installiert haben (Codex, Claude Code, OpenCode, Hermes Agent, OpenClaw, Qwen Code usw.), können Sie das ACP-Backend direkt verwenden. **Kein zusätzlicher Konfigurationsaufwand** — wählen Sie einfach den entsprechenden Agenten aus der vorgefertigten Liste im Backend-Manager, und das Plugin übernimmt die Verwaltung des Prozesslebenszyklus automatisch.

Einige Agenten (wie OpenCode und Codex) unterstützen zudem die Isolierung von Konfigurationsverzeichnissen und Sitzungsperistenzverzeichnissen über Umgebungsvariablen, was die Verwaltung mehrerer Arbeitskontexte erleichtert.

→ [ACP-Backend-Konfiguration](#doc/backends%2Facp)

### 🥈 Zweite Wahl: Docker-basierter Skill-Runner

Wenn Sie **persistente Hintergrundausführung** benötigen (Aufgaben laufen nach dem Schließen von Zotero weiter und Sie können sie beim nächsten Start fortsetzen oder Ergebnisse abrufen) oder die Möglichkeit haben, einen Server in Ihrem lokalen Netzwerk einzurichten, wird empfohlen, Skill-Runner mit Docker als persistenten Dienst bereitzustellen.

Ein Docker-basierter Skill-Runner läuft unabhängig von Zotero und unterstützt Mehrbenutzerfreigabe, eine Web-Verwaltungsoberfläche, Engine-Verwaltung und mehr.

→ [Skill-Runner-Bereitstellung & -Konfiguration](#doc/backends%2Fskill-runner)

### 🥉 Nur im Notfall: Ein-Klick-Lokale Skill-Runner-Bereitstellung

Dies ist nur für Benutzer geeignet, die **keine Kenntnisse zur Installation und Konfiguration von Agent-Tools haben und Docker nicht verwenden können**. Die Ein-Klick-Bereitstellung startet und stoppt zusammen mit dem Plugin — das Schließen von Zotero beendet alle Aufgaben, und es gibt keine Hintergrundausführung. Wenn Sie in der Lage sind, Agenten zu installieren oder Docker zu verwenden, bevorzugen Sie bitte die beiden oben genannten Optionen.

→ [Skill-Runner-Bereitstellung & -Konfiguration](#doc/backends%2Fskill-runner)

### Generisches HTTP

Wird zum Aufruf bestimmter HTTP-APIs (wie des MinerU-Dokumentparsers) verwendet, die keine KI-Modellausführung beinhalten. Nach Bedarf konfigurieren.

→ [Generisches-HTTP-Backend-Konfiguration](#doc/backends%2Fgeneric-http)

## Backend-Typ-Vergleich

| Typ | Protokoll | Ausführungsmodus | Empfehlung | Anwendungsfall |
|------|----------|---------------|----------------|----------|
| **ACP-Backend** | Agent Client Protocol | Lokaler Unterprozess | 🥇 Erste Wahl | Sie haben ein ACP-Agent-Tool, kein zusätzlicher Konfigurationsaufwand |
| **Skill-Runner (Docker)** | HTTP-API | Persistenter Dienst | 🥈 Empfohlen | Persistente Hintergrundausführung, LAN-Freigabe erforderlich |
| **Skill-Runner (Ein-Klick)** | HTTP-API | Startet/stoppt mit Plugin | 🥉 Notfall | Agenten / Docker können überhaupt nicht installiert werden |
| **Generisches HTTP** | HTTP | Remote-Dienst | Nach Bedarf | Aufruf bestimmter HTTP-APIs (z. B. MinerU) |

Alle Backends werden über den **[Werkzeuge → Backend-Manager](#doc/backends%2Fbackend-manager)** konfiguriert.

## Nächste Schritte

- [ACP-Backend-Konfiguration](#doc/backends%2Facp)
- [Skill-Runner-Bereitstellung & -Konfiguration](#doc/backends%2Fskill-runner)
- [Generisches-HTTP-Backend-Konfiguration](#doc/backends%2Fgeneric-http)
- [Backend-Manager-Benutzerhandbuch](#doc/backends%2Fbackend-manager)
