# ACP-Backend-Konfiguration

## Was ist ACP?

ACP (Agent Client Protocol) ist ein Protokoll zur Kommunikation mit Agent-Backends. Zotero Agents kommuniziert über das ACP-Protokoll mit lokal laufenden Agent-Prozessen (wie Codex, Claude Code, OpenCode usw.), um Unterhaltungen und Skill-Ausführung zu ermöglichen.

Das ACP-Backend ist die **empfohlene** Konfigurationsmethode — solange Sie ein ACP-kompatibles Agent-Tool auf Ihrem Rechner installiert haben, können Sie es direkt ohne zusätzliche Konfiguration verwenden.

## Neu bei Agent?

Wenn Sie zum ersten Mal mit Agent-Tools arbeiten und nicht wissen, welches Sie wählen oder wie Sie es installieren sollen, finden Sie hier eine Anleitung:

**[Agent-Einstiegsleitfaden](https://agent.ps5.online)**

## Warum ACP an erster Stelle?

- **Kein Konfigurationsaufwand**: Keine zusätzlichen Dienste bereitstellen; verwenden Sie die Agent-Tools, die bereits auf Ihrem Rechner vorhanden sind
- **Automatische Prozessverwaltung**: Das Plugin gibt den Startbefehl in der Konfiguration vor und verwaltet den Agent-Prozesslebenszyklus automatisch
- **Multi-Agent-Unterstützung**: Konfigurieren Sie mehrere verschiedene Agent-Backends gleichzeitig und wechseln Sie nach Bedarf zwischen ihnen
- **Konfigurationsisolierung**: Einige Agenten (wie OpenCode und Codex) unterstützen die Isolierung von Konfigurationsverzeichnissen und Sitzungsperistenzverzeichnissen über Umgebungsvariablen

## Konfigurationsschritte

1. Stellen Sie sicher, dass mindestens ein ACP-kompatibles Agent-CLI-Tool auf Ihrem Rechner installiert ist
2. Öffnen Sie **Werkzeuge → [Backend-Manager](backend-manager)**
3. Wechseln Sie zur Registerkarte **ACP**
4. Wählen Sie Ihr Agent-Tool aus dem Dropdown-Menü **Aus Voreinstellung hinzufügen**, oder klicken Sie auf **ACP hinzufügen**, um manuell zu konfigurieren
5. Füllen Sie die folgenden Felder aus:
   - **Anzeigename**: Ein benutzerfreundlicher Name (z. B. „Mein OpenCode")
   - **Befehl**: Befehl zum Starten des ACP-Backends (Voreinstellungen füllen automatisch aus, aber Sie können auch manuell bearbeiten)
   - **Argumente**: Zusätzliche Argumente für den Befehl (optional)
   - **Umgebungsvariablen**: Zusätzliche Umgebungsvariablen (optional, für Konfigurationsisolierung usw.)
6. Klicken Sie auf **Speichern** in der unteren rechten Ecke

### Verbindungsüberprüfung

Nach dem Speichern erkennt das Plugin automatisch die Fähigkeiten des Backends:

- Prüft, ob der Befehl vorhanden ist
- Stellt eine Verbindung her und initialisiert
- Ruft verfügbare Modelle und Modi ab
- Berechnet einen Konfigurations-Fingerabdruck, um nachfolgende Änderungen zu erkennen

Wenn die Erkennung fehlschlägt, überprüfen Sie, ob das Agent-CLI korrekt installiert ist und das Befehlsformat stimmt.

## Unterstützte Agent-Voreinstellungen

Das Plugin bietet mehrere integrierte Presets. Nach Klick auf **Aus Preset hinzufügen** wählst du links einen Agent und rechts werden Startoptionen sowie eine schreibgeschützte Konfigurationsvorschau angezeigt.

**Mit npx starten** wechselt den Befehl in die Form `npx <package>` und zeigt einen Hinweis auf die benötigte Installation von Node.js und npm an. Codex, Claude Code, Factory Droid, Pi ACP und Amp ACP verwenden standardmäßig npx; alle anderen Voreinstellungen verwenden standardmäßig ihren installierten Befehl. Nach Aktivierung von npx wird dem Profil-Anzeigenamen das Suffix `(npm)` angehängt.

Durch Deaktivieren von **Mit npx starten** wird die benannte ausführbare Datei der Voreinstellung gestartet, die bereits installiert sein muss (zum Beispiel `gemini`, `copilot`, `opencode` oder `kimi`). Voreinstellungen ohne npx-Option verwenden immer das installierte CLI: Hermes, natives Cursor (`agent`), Mistral Vibe, OpenHands, Goose, Junie, Kiro CLI und Oh My Pi. Pi ACP und Amp ACP sind Adapter, daher müssen die zugrunde liegenden Pi- und Amp-Agent-CLIs ebenfalls installiert und authentifiziert sein. Oh My Pi basiert auf Bun. Die Aktivierung von npx erfordert Node.js und npm.

**Isolierte Umgebung** ist nur für Agents verfügbar, die Isolierung unterstützen. Nach dem Aktivieren injiziert das Plugin die dokumentierten Isolierungs-Umgebungsvariablen oder Session-Verzeichnis-Argumente in die Vorschau und zeigt einen Hinweis an, dass Agent-Optionen und Authentifizierung in diesem Verzeichnis selbst verwaltet werden müssen. Nach Aktivierung der Isolierung wird dem Profil-Anzeigenamen das Suffix `(Isolated)` angehängt.

![ACP-Preset-Dialog](/img/docs/backends/backend-manager_ACP-preset.png)

<!-- prettier-ignore -->
| Voreinstellung | Standardbefehl | Beschreibung |
| --- | --- | --- |
| **OpenCode** | `opencode acp` | OpenCode-ACP-Backend; injiziert `OPENCODE_CONFIG_CONTENT`, um Berechtigungsfragen abzulehnen, und unterstützt isoliertes Konfigurationsverzeichnis über `OPENCODE_CONFIG_DIR` |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | ACP-Adapter für OpenAI Codex |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | ACP-Adapter für Claude Code |
| **Gemini CLI** | `gemini --acp` | Gemini-CLI-ACP-Modus |
| **Hermes** | `hermes acp` | Hermes-Agent-ACP-Backend |
| **Qwen Code** | `qwen --acp` | Qwen-Code-ACP-Modus; unterstützt isoliertes Konfigurationsverzeichnis über `QWEN_HOME` |
| **GitHub Copilot** | `copilot --acp --stdio` | GitHub-Copilot-CLI-ACP-Modus; unterstützt isoliertes Konfigurationsverzeichnis über `COPILOT_HOME` |
| **Qoder CLI** | `qoder --acp` | Qoder-CLI-ACP-Modus; unterstützt dokumentiertes isoliertes Konfigurationsverzeichnis über `QODER_CONFIG_DIR` |
| **Cursor Agent ACP** | `cursor-agent-acp` | Cursor-Agent-ACP-Adapter; unterstützt dokumentiertes isoliertes Session-Verzeichnis über `--session-dir` |
| **DeepAgents** | `deepagents-acp` | DeepAgents-ACP-Adapter |
| **Auggie** | `auggie --acp` | Auggie-ACP-Modus |
| **Kilo** | `kilo acp` | Kilo-Code-ACP-Modus; injiziert `KILO_CONFIG_CONTENT`, um Berechtigungsfragen abzulehnen, und die Isolierung der Kern-XDG-Pfade für Konfiguration, Daten/Session/Auth/Log und Cache wurde beobachtet |
| **Cline** | `cline --acp` | Cline-ACP-Modus; unterstützt isoliertes Konfigurationsverzeichnis über `CLINE_DIR` |
| **CodeBuddy** | `codebuddy --acp` | CodeBuddy-ACP-Modus; unterstützt isoliertes Konfigurationsverzeichnis über `CODEBUDDY_CONFIG_DIR` |
| **Grok** | `grok agent stdio` | Grok-Agent-Stdio-Modus; unterstützt Home-/Konfigurationsisolierung über `GROK_HOME` |
| **Cursor** | `agent acp` | Nativer Cursor-ACP-Einstieg, getrennt vom Cursor-Agent-ACP-Adapter; unterstützt isoliertes Konfigurationsverzeichnis über `CURSOR_CONFIG_DIR` |
| **Kimi Code** | `kimi acp` | Kimi-Code-ACP-Modus; unterstützt isoliertes Konfigurationsverzeichnis über `KIMI_CODE_HOME` |
| **MiniMax Code** | `mcode acp` | MiniMax-Code-ACP-Modus; bei aktiviertem npx wird explizit die ausführbare Datei `mcode` aus `@minimax-ai/code` ausgewählt, und die Isolierung verwendet `MINIMAX_DATA_DIR` |
| **Mistral Vibe** | `vibe-acp` | Mistral-Vibe-ACP-Modus; unterstützt Home-/Konfigurationsisolierung über `VIBE_HOME` |
| **OpenHands** | `openhands acp` | OpenHands-ACP-Modus; die Isolierung trennt Persistenz- und Konversationsspeicher über `OPENHANDS_PERSISTENCE_DIR` und `OPENHANDS_CONVERSATIONS_DIR` |
| **DeepSeek Harness** | `dsh --profile acp` | DeepSeek-Harness-ACP-Modus; unterstützt Home-/Konfigurationsisolierung über `DSH_HOME` |
| **Factory Droid** | `npx -y droid@latest exec --output-format acp-daemon` | Factory-Droid-ACP-Daemon-Modus; deaktiviert die Droid-Auto-Aktualisierung über `DROID_DISABLE_AUTO_UPDATE` und `FACTORY_DROID_AUTO_UPDATE_ENABLED` |
| **Goose** | `goose acp` | Goose-ACP-Modus; unterstützt Pfadwurzel-Isolierung über `GOOSE_PATH_ROOT` |
| **Junie** | `junie --acp=true` | Junie-ACP-Modus; unterstützt Home-/Konfigurationsisolierung über `JUNIE_HOME` |
| **Kiro CLI** | `kiro-cli acp` | Kiro-CLI-ACP-Modus |
| **Pi ACP** | `npx -y pi-acp@latest` | Pi-ACP-Adapter; benötigt das Pi-Coding-Agent-CLI und unterstützt isoliertes Konfigurationsverzeichnis über `PI_CODING_AGENT_DIR` |
| **Amp ACP** | `npx -y amp-acp@latest` | Amp-ACP-Adapter; benötigt das Amp-CLI, und die Isolierung verlagert nur den Thread-/Session-Zustand des Adapters über `AMP_ACP_STATE_DIR` |
| **Oh My Pi** | `omp acp` | Oh-My-Pi-ACP-Modus; benötigt Bun und wird nur als installierter Befehl angeboten |

Nur OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code und Hermes Agent wurden getestet. Die Verfügbarkeit anderer ACP-Backends hängt von deren Backend-Implementierungen ab und wird von diesem Plugin nicht garantiert. Bei Problemen kannst du Befehlsargumente und Umgebungsvariablen selbst anpassen; maßgeblich sind das ACP-Protokoll und die offizielle Dokumentation des jeweiligen Backends.

Nach Auswahl eines Presets können Sie weiterhin jedes Feld manuell bearbeiten.

## Empfehlungen zur Umgebungsvariablenkonfiguration

Einige Agenten unterstützen Konfigurationsisolierung und Sitzungspersistenz über Umgebungsvariablen oder Befehlsargumente. Voreinstellungen mit aktivierter **Isolierter Umgebung** injizieren die dokumentierten Werte automatisch; für manuelle Profile fügen Sie die entsprechenden Werte selbst hinzu:

Die Isolierung verlagert nur die angegebenen Dateisystemwurzeln. Die Amp-ACP-Isolierung betrifft nur den Thread-/Session-Zustand des Adapters, während Amp-Konfiguration und -Anmeldedaten unabhängig konfiguriert bleiben. Die native Cursor-Isolierung betrifft das Cursor-Konfigurationsverzeichnis, getrennt vom Session-Verzeichnis des `cursor-agent-acp`-Adapters. Der eigene Cache von Copilot und der Schlüsselbund von Goose bleiben außerhalb der injizierten Pfade.

Die Voreinstellungen OpenCode und Kilo injizieren außerdem stets eine Inline-Berechtigungskonfiguration: `OPENCODE_CONFIG_CONTENT` bzw. `KILO_CONFIG_CONTENT`, beide mit dem Wert `{"permission":{"question":"deny"}}`. Sie können diese Werte nach dem Hinzufügen der Voreinstellung bearbeiten oder entfernen.

<!-- prettier-ignore -->
| Einstellung | Agent | Zweck |
| --- | --- | --- |
| `OPENCODE_CONFIG_DIR` | OpenCode | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `CODEX_HOME` | Codex | Ein unabhängiges Home-/Konfigurationsverzeichnis festlegen |
| `CLAUDE_CONFIG_DIR` | Claude Code | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `GEMINI_CLI_HOME` | Gemini CLI | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `HERMES_HOME` | Hermes Agent | Ein unabhängiges Home-/Konfigurationsverzeichnis festlegen |
| `QODER_CONFIG_DIR` | Qoder CLI | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `QWEN_HOME` | Qwen Code | Ein unabhängiges Home-/Konfigurationsverzeichnis festlegen |
| `COPILOT_HOME` | GitHub Copilot | Ein unabhängiges Konfigurationsverzeichnis festlegen; der eigene Cache von Copilot bleibt außerhalb dieses Pfads |
| `CLINE_DIR` | Cline | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `CODEBUDDY_CONFIG_DIR` | CodeBuddy | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `GROK_HOME` | Grok | Ein unabhängiges Home-/Konfigurationsverzeichnis festlegen |
| `CURSOR_CONFIG_DIR` | Cursor (natives ACP) | Ein unabhängiges Konfigurationsverzeichnis festlegen |
| `KIMI_CODE_HOME` | Kimi Code | Ein unabhängiges Home-/Konfigurationsverzeichnis festlegen |
| `MINIMAX_DATA_DIR` | MiniMax Code | Ein unabhängiges Datenverzeichnis festlegen |
| `VIBE_HOME` | Mistral Vibe | Ein unabhängiges Home-/Konfigurationsverzeichnis festlegen |
| `OPENHANDS_PERSISTENCE_DIR`, `OPENHANDS_CONVERSATIONS_DIR` | OpenHands | Eine unabhängige Persistenzwurzel und ihren Konversationsspeicher (`<root>/conversations`) festlegen |
| `DSH_HOME` | DeepSeek Harness | Ein unabhängiges Home-/Konfigurationsverzeichnis festlegen |
| `GOOSE_PATH_ROOT` | Goose | Eine unabhängige Pfadwurzel festlegen; der Schlüsselbund von Goose bleibt außerhalb dieses Pfads |
| `JUNIE_HOME` | Junie | Ein unabhängiges Home-/Konfigurationsverzeichnis festlegen |
| `PI_CODING_AGENT_DIR` | Pi ACP | Ein unabhängiges Konfigurationsverzeichnis des Pi-Coding-Agent festlegen |
| `AMP_ACP_STATE_DIR` | Amp ACP | Nur den Thread-/Session-Zustand des Adapters verlagern; Amp-Konfiguration und -Anmeldedaten bleiben unabhängig konfiguriert |
| `--session-dir <path>` | Cursor Agent ACP | Ein unabhängiges Sitzungsperistenzverzeichnis festlegen |
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | Kilo | Unabhängige XDG-Wurzeln für Konfiguration, Daten/Session/Auth/Log und Cache-Zustand festlegen. Dies deckt die beobachteten Kernpfade ab, beweist aber nicht, dass jeder Kilo-Unterbefehl oder jedes Plugin globale Verzeichnisse vermeidet. |

## Kostenlose Modelloptionen

Mehrere Engines bieten **kostenlosen Modellzugriff** — ideal für den Einstieg ohne Bezahlung:

| Engine                    | Kostenlose Option              | Funktionsweise                                                                                                                                                                                             |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kilo Code**             | Auto Free-Modus                | Der integrierte Auto Free-Modus von Kilo Code leitet jede Anfrage automatisch an ein geeignetes kostenloses Modell weiter. In den Kilo Code-Einstellungen aktivieren — kein API-Key erforderlich           |
| **OpenCode Zen**          | Integrierte kostenlose Modelle | Die [OpenCode Zen](https://opencode.ai/zen)-Edition enthält kostenlosen Modellzugriff ohne API-Abonnement                                                                                                  |
| **OpenCode + OpenRouter** | Kostenlose OpenRouter-Modelle  | Konfigurieren Sie OpenCode zur Nutzung von [OpenRouter](https://openrouter.ai/) und wählen Sie kostenlose Modelle (z. B. Gemini 2.5 Flash, DeepSeek V3). Ein kostenloses OpenRouter-Konto ist erforderlich |

### Einschränkungen der kostenlosen Stufe

Kostenlose Modelle sind für die gelegentliche Nutzung ausreichend, beachten Sie jedoch folgende Einschränkungen:

| Einschränkung                   | Auswirkung                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ratenbegrenzung**             | Anfragen können gedrosselt werden — je nach Anbieterlast 5–20 Anfragen pro Minute. Stapelverarbeitung wird deutlich verlangsamt                       |
| **Gleichzeitigkeit**            | In der Regel auf eine gleichzeitige Anfrage beschränkt. Mehrere gleichzeitige Workflows können in die Warteschlange gestellt werden oder fehlschlagen |
| **Modellverfügbarkeit**         | Kostenlose Modellpools können zu Spitzenzeiten erschöpft sein. Fehler wie „Modell nicht verfügbar" oder „Kapazität überschritten" können auftreten    |
| **Modellwechsel**               | Anbieter können kostenlose Modelle ohne Vorankündigung austauschen (Upgrade oder Downgrade). Die Ausgabequalität kann zwischen Durchläufen variieren  |
| **Keine SLA / Zuverlässigkeit** | Kostenlose Stufen bieten keine Verfügbarkeitsgarantie. Dienste können vorübergehend nicht verfügbar sein oder eingestellt werden                      |

> Wenn Sie zuverlässige Stapelverarbeitung oder produktive Nutzung benötigen, ziehen Sie einen kostenpflichtigen Plan wie [OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW) (10 $/Monat) oder einen Coding Plan (Bailian, Zhipu usw.) in Betracht. Die Kosten pro Artikel sind im Vergleich zur Zeitersparnis vernachlässigbar.

## Anfragetypen

Das ACP-Backend unterstützt zwei Anfragetypen:

- `acp.prompt.v1` — Konversationsinteraktion (ACP-Chat)
- `acp.skill.run.v1` — Skill-Ausführung (ACP-Skills)

Dasselbe ACP-Backend kann gleichzeitig sowohl für Unterhaltungen als auch für Skill-Ausführungen verwendet werden.

## Sitzungsverwaltung

- Jedes Backend kann mehrere Sitzungen (Unterhaltungen) haben, die dauerhaft in der Plugin-Datenbank gespeichert werden
- Verschiedene ACP-Backends können gleichzeitig laufen, ohne sich gegenseitig zu beeinträchtigen
- Sitzungen können im [ACP-Chat](../sidebar/acp-chat) verwaltet werden

## Nächste Schritte

Nach Abschluss der Konfiguration können Sie:

- Im [Seitenleisten-ACP-Chat](../sidebar/acp-chat) mit dem Backend chatten
- ACP-Skill-Ausführungen im [Dashboard](../dashboard) anzeigen
- Das ACP-Backend zur Ausführung von Aufgaben in der [Workflow-Liste](../workflows/) verwenden
