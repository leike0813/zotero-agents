# Zotero Agents

Ein Zotero-Plugin zur Ausführung von Agent Skills.

![Zotero Agents Research Workbench Poster](/img/poster.png)

## Was ist Zotero Agents?

Zotero Agents verwandelt Zotero in eine persönliche Forschungsarbeitsumgebung für das Zeitalter intelligenter Agenten. Es verbindet Ihre Literaturbibliothek, Agent-Backends, Workflows, Wissensgraphen und externe Tools und macht die Literaturanalyse von einer einmaligen Frage-Antwort-Interaktion zu einem nachhaltigen, überprüfbaren und erweiterbaren Forschungsprozess.

Die erste Funktionsebene sind die **pluginfähigen Workflows**. Forscher können komplexe Literaturaufgaben in wiederverwendbare Prozesse zerlegen: Paper-Parsing, Deep Reading, Zitationsanalyse, Tag-Normalisierung, Literatursuche, Themensynthese, Erstellung von Review-Material und vieles mehr. Workflows können sich mit verschiedenen Agent- oder Service-Backends verbinden und dabei das Langzeit-Kontextverständnis, Tool-Aufrufe und mehrstufiges Reasoning der Agenten nutzen, um Literaturverwaltungs- und Analyseworkflows zu automatisieren, die sonst repetitive manuelle Arbeit erfordern, und um mit wachsenden Forschungsanforderungen zu skalieren.

Die zweite Ebene ist die **Assistenten-Seitenleiste**. Sie bietet ein konversationelles Interaktionserlebnis im Stil eines Coding-Agenten und unterstützt die Verbindung mit verschiedenen Agent-Backends über das ACP-Protokoll sowie die Ausführung spezifischer Workflows über das Skill-Runner-Backend. Sie können Agenten Fragen beantworten lassen, Paper analysieren, nach verwandter Arbeit suchen, Referenzen zu Ihrer Bibliothek hinzufügen — bezogen auf den aktuellen Eintrag, ausgewählte Literatur oder die gesamte Bibliothek — und während langlaufender Aufgaben Konversationen, Bestätigungen, Korrekturen und Fortschrittsverfolgung durchführen.

Die dritte Ebene ist das **Synthesis Workbench**. Es zielt auf bibliotheksweites, langfristiges Wissenstracking ab und fasst Zusammenfassungen, Referenzen, Zitationssemantik, Tags, Konzepte und Themenbeziehungen, die aus einzelnen Paper-Analysen generiert wurden, zu einer einheitlichen Wissensplattform zusammen. Forscher können hier Referenznetzwerke verwalten, Zitations-Matches überprüfen, Zitationsgraphen erkunden, Literatur um Themen herum organisieren und mit der Themensynthese die Grundlagenliteratur, aktuelle Forschungen, Schlüsselargumente, methodische Meinungsverschiedenheiten, Abdeckungslücken und zukünftige Richtungen eines Forschungsbereichs strukturiert aufarbeiten. Das Ziel ist es, umfangreiches Lesen in strukturiertes Material zu verwandeln, das sich für Reviews, Thesis-Proposals, Paper-Einleitungen und Forschungs-Roadmap-Design eignet.

Die vierte Ebene ist die **Host Bridge**. Über die `zotero-bridge`-CLI und den MCP-Service können externe Agenten direkt mit der Zotero-Bibliothek interagieren: Literaturkontext lesen, Einträge suchen, neue Referenzen hinzufügen, Analyseaufgaben aufrufen und strukturierte Ergebnisse zurückschreiben. Mit Agent-Workflows wie OpenClaw und Hermes können Sie Literatursuche, Filterung, Analyse, Zusammenfassung und Review-Erstellung delegieren, sodass langlaufende Forschungsaufgaben kontinuierlich im Hintergrund fortschreiten.

Der Kernwert von Zotero Agents ist, die Zotero-Bibliothek zu einer Forschungsumgebung zu machen, in der Agenten tatsächlich arbeiten können. Jeder Lese-, Analyse-, Review- und Vorbereitungsschritt kann als Wissen für die nächste Forschungsphase angesammelt werden.

> **Unterstützte Zotero-Versionen**: Dieses Plugin unterstützt Zotero 7 und Zotero 9. Die primäre Entwicklung und Tests erfolgen auf Zotero 9. Zotero 8 wird theoretisch vollständig unterstützt (das Plugin-Framework ist zwischen 8/9 unverändert). Zotero 7 sollte ebenfalls theoretisch funktionieren, wurde aber nicht gründlich getestet; die zukünftige Wartung wird sich auf Zotero 9 konzentrieren. Zotero-7-Benutzer, die auf Probleme stoßen, sollten diese auf [Issues](https://github.com/leike0813/zotero-agents/issues) melden.

:::tip Tipp
Das Plugin wird **ohne integrierte Geschäftslogik** ausgeliefert. Alle Workflows werden über separate **offizielle Workflow-Pakete** bereitgestellt, die Benutzer nach der Installation des Plugins herunterladen und installieren müssen. Details finden Sie im [Installationsleitfaden](/installation).
:::

## Funktionen

- **⚙️ Backend-Verwaltung** — Unterstützt ACP-, Skill-Runner- und Generic-HTTP-Backend-Typen
- **🔧 Workflow-System** — Definition von mehrstufigen automatisierten Verarbeitungspipelines
- **📊 Dashboard** — Aufgabenstatus überwachen, Verlauf durchsuchen und Logs einsehen
- **🖥️ Seitenleisten-Panel** — Interaktion mit Backends, ohne den aktuellen Arbeitskontext zu verlassen
- **📖 Integrierter Markdown-Reader** — Doppelklick auf `.md`-Anhänge, um sie in Zotero zu öffnen, mit Gliederung, Suche, Mathematik-Rendering und Code-Hervorhebung
- **💬 ACP-Chat** — KI-Konversation mit Literatur als Kontext
- **🔬 Synthesis Workbench** — Plattform für tiefe Literaturanalyse
- **🏷️ Tag-Verwaltung** — Kontrolliertes Tag-Vokabular und automatisches Tagging
- **📈 Zitationsgraph** — Visualisierung und Analyse von Zitationsbeziehungen
- **📝 Themensynthese** — Automatisierte Themenanalyse und Berichtsgenerierung

## Schnellzugriff

- [Installationsleitfaden](/installation) — Installation des Plugins und seiner Abhängigkeiten
- [Erste Schritte](/getting-started) — Konfigurieren Sie Ihr erstes Backend und führen Sie einen Skill aus
- [Backend-Konfiguration](/backends/) — Lernen Sie die drei unterstützten Backend-Typen kennen

## Dokumentation

| Abschnitt | Beschreibung |
|-----------|-------------|
| [Installationsleitfaden](/installation) | Plugin-Installation, Installation offizieller Workflow-Pakete, Skill-Runner-Backend-Bereitstellung |
| [Integrierter Markdown-Reader](/markdown-reader) | Doppelklick auf `.md`-Dateien zum Öffnen in Zotero, mit Gliederung, Suche und Mathematik-Rendering |
| [Backend-Konfiguration](/backends/) | Konfigurationsleitfaden für ACP-, Skill-Runner- und Generic-HTTP-Backends |
| [Workflow](/workflows/) | Workflow-Einführung und Aufrufleitfaden |
| [Dashboard](/dashboard) | Leitfaden zur Nutzung des zentralen Überwachungspanels |
| [Seitenleiste & ACP-Chat](/sidebar/) | Seitenleisten-Panel und Konversationsfunktionen |
| [Synthesis Workbench](/synthesis/) | Leitfaden zur Nutzung des Synthesis Workbench |
| [Einstellungen](/preferences) | Plugin-Einstellungsreferenz |

## Projektressourcen

- [GitHub-Repository](https://github.com/leike0813/zotero-agents)
- [Issue Tracker](https://github.com/leike0813/zotero-agents/issues)
- [Gitee-Mirror](https://gitee.com/leike0813/zotero-agents)
