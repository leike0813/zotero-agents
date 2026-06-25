# Übersicht über die Seitenleiste

## Was ist die Seitenleiste?

Die Seitenleiste ist ein praktisches Bedienpanel von Zotero Agents, das auf der rechten Seite des Zotero-Hauptfensters eingeblendet wird. Sie ermöglicht es Ihnen, mit Backends zu interagieren, den Ausführungsstatus einzusehen und die Skill-Ausführung zu verwalten, ohne Ihren aktuellen Arbeitskontext zu verlassen.

## So öffnen Sie die Seitenleiste

- **Symbolleiste**: Klicken Sie auf den Seitenleiste-Umschalter in der Zotero-Symbolleiste
- **Menü**: **Extras → Seitenleiste öffnen**
- **Dashboard-Aktion**: Klicken Sie im Dashboard auf „Open/Close Sidebar"

![Symbolleisten-Schaltfläche der Seitenleiste](/img/icon_sidebar.png)

![Seitenleiste im Status „Antwort ausstehend"](/img/icon_sidebar_glow.png)

## Architekturhinweise

Die Seitenleiste verwendet eine **iframe-Architektur**: Drei Tabs laden jeweils eine eigenständige HTML-Seite als Kind-iframe und kommunizieren über postMessage mit dem Plugin-Hauptprozess. Dieses Design stellt sicher, dass sich die Tabs nicht gegenseitig beeinflussen – jedes Panel verfügt über einen unabhängigen Renderkontext.

Im Workspace-Modus sind die drei Tabs in einem einheitlichen Container integriert; im Legacy-Modus kann jedes Panel auch direkt in den Zotero-Bibliotheksbereich und den Reader-Bereich eingebettet werden.

## Drei Tabs

| Tab | Funktion | Einsatzbereiche |
|-----|----------|----------------|
| **ACP Chat** | Unterhaltung mit dem ACP-Backend unter Verwendung des aktuellen Elements als Kontext | Fragen beim Lesen von Literatur, Schreibunterstützung |
| **ACP Skills** | Überwachung und Verwaltung von Skill-Ausführungen über das ACP-Backend | Ausführungsfortschritt anzeigen, Ergebnisse prüfen, Berechtigungsanfragen bearbeiten |
| **SkillRunner** | Anzeige und Interaktion mit Skill-Runner-Backend-Ausführungen | Interaktive Ausführungen verwalten, Authentifizierung bearbeiten |

## Benutzeroberfläche

### Tab-Umschaltung

Die Tableiste oben in der Seitenleiste ermöglicht das Umschalten zwischen den drei Panels. Der Zustand des vorherigen Tabs bleibt beim Umschalten erhalten.

### Breitenanpassung

Die Breite der Seitenleiste kann durch Ziehen des linken Randes frei eingestellt werden, um verschiedenen Anforderungen an die Inhaltsanzeige gerecht zu werden.

### Gemeinsame Komponenten

Alle Tabs verwenden die folgenden gemeinsamen UI-Komponenten:

- **Banner**: Informationsleiste oben, die aktuell ausgewählte Projektinformationen und Aktionsschaltflächen anzeigt
- **Transcript-Ansicht**: Hauptbereich für Unterhaltungs- oder Ausführungsprotokolle, mit den Anzeigemodi Plain und Bubble
- **Antwortbereich**: Eingabebereich unten zum Senden von Nachrichten oder Antworten
- **Seitenpanels**: Aufklappbare Detailbereiche an der linken und rechten Seite
- **Prompt-Komponente**: Eingabeaufforderungen, die angezeigt werden, wenn Benutzerinteraktion erforderlich ist
- **Plan-Komponente**: Visueller Fortschritt für mehrstufige Pläne

## Schnelllinks zu den einzelnen Tabs

- [ACP Chat-Nutzung](./acp-chat) — Unterhaltungsinteraktion mit dem Backend
- [ACP Skills](./acp-skills) — ACP-Skill-Ausführungen verwalten
- [SkillRunner-Tab](./skillrunner-tab) — Skill-Runner-Ausführungen verwalten

## Verwandte Seiten

- [Dashboard-Übersicht](../dashboard) — Zentrale Überwachung und Aufgabenverwaltung
