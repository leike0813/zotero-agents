# Erste Schritte

## 1. Offizielle Workflow-Pakete installieren

Das Plugin selbst enthält keine Geschäftslogik. Nach der Installation des Plugins müssen Sie zunächst die offiziellen Workflow-Pakete installieren:

1. Klicken Sie mit der rechten Maustaste auf einen beliebigen Zotero-Eintrag → **Zotero Agents** → **📦 Install Official Workflow Packages**
2. Warten Sie, bis der Download und die Installation abgeschlossen sind
3. Nach erfolgreicher Installation sind alle offiziellen Workflows im Dashboard sichtbar

Sie können die offiziellen Pakete auch jederzeit über **Zotero → Einstellungen → Zotero Agents** installieren oder aktualisieren.

## 2. Ein Backend konfigurieren

### ACP-Backend (empfohlen)

Dies ist die empfohlene Vorgehensweise — solange Sie ein ACP-kompatibles Agent-Tool auf Ihrem Rechner installiert haben, ist keine zusätzliche Konfiguration erforderlich.

1. Öffnen Sie **Extras → [Backend Manager](backends/backend-manager)**
2. Wechseln Sie zum Reiter **ACP**
3. Wählen Sie Ihr Agent-Tool aus dem Dropdown-Menü **Add from Preset** (Codex / OpenCode / Claude Code usw.)
4. Das Preset füllt den Befehl automatisch aus; klicken Sie auf **Save** in der unteren rechten Ecke

**Erste Verwendung eines Agent-Tools?** Informationen zur Installation finden Sie in der offiziellen Dokumentation des jeweiligen Tools:

| Agent | Installationsleitfaden |
|-------|----------------------|
| **OpenCode** | [opencode.ai docs](https://opencode.ai/docs) |
| **Codex** | [OpenAI Codex docs](https://platform.openai.com/docs) |
| **Claude Code** | [Anthropic docs](https://docs.anthropic.com/en/docs/claude-code) |
| **Gemini CLI** | [Google docs](https://github.com/google-gemini/gemini-cli) |
| **Qwen Code** | [Alibaba Cloud docs](https://help.aliyun.com/zh/model-studio/qwen-code) |

→ Details siehe [ACP-Backend-Konfiguration](backends/acp)

### MinerU-Backend (für PDF-Parsing)

Der MinerU-Workflow kann PDFs in Markdown umwandeln und ist damit der ideale Vorverarbeitungsschritt für alle nachfolgenden Literaturanalysen. Die Konfiguration ist unkompliziert:

1. Besuchen Sie [mineru.net](https://mineru.net), um ein Konto zu registrieren, und fordern Sie ein API-Token unter **API → API Management** an
2. Öffnen Sie **Extras → [Backend Manager](backends/backend-manager)**
3. Wechseln Sie zum Reiter **Generic HTTP** und klicken Sie auf **Add Generic HTTP**
4. Füllen Sie die Felder aus: Display Name `MinerU Official` · Base URL `https://mineru.net` · Authentication `bearer` · Auth Token: fügen Sie Ihr API-Token ein · Timeout `60000`
5. Klicken Sie auf **Save** in der unteren rechten Ecke

→ Details siehe [MinerU-Benutzerhandbuch](workflows/mineru)

### Alternative: Docker-bereitgestellter Skill-Runner

Wenn Sie persistente Hintergrundverarbeitung oder LAN-Freigabe benötigen, können Sie den [Skill-Runner mit Docker bereitstellen](backends/skill-runner#recommended-docker-persistent-deployment). Nach der Bereitstellung fügen Sie eine Backend-Instanz im SkillRunner-Reiter hinzu.

> Detaillierte Anweisungen finden Sie im [Backend Manager](backends/backend-manager).

## 3. Vollständiger Workflow

Nachfolgend wird ein vollständiger End-to-End-Workflow beschrieben. Es wird empfohlen, jeden Schritt der Reihe nach auszuprobieren. Wählen Sie zunächst ein Paper mit PDF-Anhang aus Ihrer Bibliothek aus.

### Schritt 1: PDF → Markdown (MinerU)

Klicken Sie mit der rechten Maustaste auf dieses Paper (oder direkt auf den PDF-Anhang) und wählen Sie **Zotero Agents → MinerU**. Nach einer kurzen Wartezeit wird eine `.md`-Datei des Paper-Inhalts im selben Verzeichnis wie das PDF generiert.

### Schritt 2: Den integrierten Markdown-Reader ausprobieren

Suchen Sie die neu generierte `.md`-Datei in der Zotero-Anhangliste und **doppelklicken Sie, um sie im integrierten Reader zu öffnen** — mit Gliederungsnavigation, Suche, mathematischer Formelwiedergabe und Code-Syntaxhervorhebung. Wenn Sie den integrierten Reader nicht verwenden möchten, können Sie ihn in den Einstellungen deaktivieren und auf den Standard-Öffner des Systems zurückgreifen.

→ Details siehe [Integrierter Markdown-Reader](markdown-reader)

### Schritt 3: Literaturanalyse durchführen

Klicken Sie mit der rechten Maustaste auf dieses Paper (oder direkt auf den `.md`-Anhang) und wählen Sie **Zotero Agents → Literature Analysis**. Der Agent generiert automatisch drei Artefakte; nach Abschluss erscheinen drei Notizanhänge unter dem Eintrag:

| Notiz | Inhalt |
|-------|--------|
| **Digest** | Paper-Zusammenfassung — Forschungshintergrund, Methoden, Ergebnisse und Schlussfolgerungen |
| **References** | Strukturierte Referenzen — eine tabellarische Zitationsliste |
| **Citation Analysis** | Zitationsanalysebericht — Zitationskontext und Klassifizierung der Zitationsabsicht |

→ Details siehe [Literaturanalyse](workflows/literature-analysis)

### Schritt 4: Interaktiver Literatur-Explainer

Wenn Sie Fragen zu diesem Paper haben, klicken Sie mit der rechten Maustaste und wählen Sie **Zotero Agents → Literature Explainer**. Die Seitenleiste öffnet automatisch das Chat-Panel, in dem Sie frei mit dem Agenten über den Inhalt des Papers kommunizieren können. Die Antworten des Agenten durchlaufen ein Verifizierungs-Gate, sodass Sie sich keine Sorgen über Erfindungen machen müssen. Nach dem Gespräch wird die Q&A-Aufzeichnung als Lernnotizen generiert.

→ Details siehe [Literatur-Explainer](workflows/literature-explainer)

### Schritt 5: Deep Reading

Wenn Sie ein wichtiges Paper gründlich und systematisch lesen möchten, klicken Sie mit der rechten Maustaste und wählen Sie **Zotero Agents → Deep Reading**. Der Agent erstellt ein aufbereitetes, eigenständiges HTML-Dokument — einschließlich Abschnittsanalyse, Schlüsselkonzepte, Referenzen und zweisprachiger Übersetzungen. Angereichert mit Ihren Bibliotheksinformationen (falls verfügbar) trägt dieses Dokument auch den breiteren Forschungskontext, verwandte Konzepte und Schlüsselfragen.

→ Details siehe [Deep Reading](workflows/literature-deep-reading)

### Schritt 6: Themensynthese — Von einzelnen Papers zum Gesamtbild

Sobald Ihre Bibliothek eine gewisse Größe erreicht hat und die relevanten Papers alle einer Literaturanalyse und Tag-Normalisierung unterzogen wurden, können Sie eine Themensynthese erstellen.

Führen Sie **Create Topic Synthesis** über das Dashboard aus, geben Sie eine Beschreibung Ihrer Forschungsrichtung ein, und der Agent identifiziert automatisch relevante Papers in Ihrer Bibliothek und generiert einen äußerst strengen, präzisen und umfassenden Synthesebericht. Dieser Bericht basiert ausschließlich auf Ihren Bibliotheksinhalten und ist weitaus präziser und zuverlässiger als generische KI-Antworten.

→ Details siehe [Themensynthese](workflows/topic-synthesis)

## Nächste Schritte

- **Stapelverarbeitung**: Führen Sie die [Literaturanalyse](workflows/literature-analysis) für Papers in Ihrer Bibliothek massenhaft durch, um die Grundlage für die Synthese zu schaffen
- **Tag-System**: Verwenden Sie den [Tag Bootstrapper](workflows/tag-bootstrapper), um ein kontrolliertes Vokabular zu erstellen und Ihre Metadaten zu standardisieren
- **Graph-Erkundung**: Visualisieren Sie Ihr Zitationsnetzwerk im [Synthesis Workbench](synthesis)
- **Eigene Entwicklung**: Lesen Sie [Benutzerdefinierte Workflows](workflows/custom/), um eigene Workflows zu erstellen
- **Probleme melden**: Melden Sie Probleme auf [GitHub](https://github.com/leike0813/zotero-agents/issues) oder [Gitee](https://gitee.com/leike0813/zotero-agents/issues)
