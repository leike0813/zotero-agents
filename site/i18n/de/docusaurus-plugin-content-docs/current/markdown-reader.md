# Integrierter Markdown-Reader

## Übersicht

Das Plugin enthält einen leichtgewichtigen Markdown-Reader. Wenn Sie in Zotero auf einen beliebigen `.md`-Anhang **doppelklicken**, wird dieser automatisch im integrierten Reader geöffnet, sodass kein Wechsel zu einer externen Anwendung erforderlich ist.

![Seite des integrierten Markdown-Readers](/img/docs/markdown-reader.png)

Der Reader ist standardmäßig aktiviert. Um ihn zu deaktivieren (und zum Standard-Öffner des Systems zurückzukehren), deaktivieren Sie die entsprechende Option unter **Einstellungen → Allgemein**.

## Funktionen

### Gliederungsnavigation

Die linke Seitenleiste analysiert automatisch die Überschriftenebenen (h1–h4) aus dem Dokument. Klicken Sie auf eine beliebige Überschrift, um schnell zum entsprechenden Abschnitt zu springen.

### Volltextsuche

Das Suchfeld in der Symbolleiste unterstützt die Schlüsselwortsuche mit Hervorhebung der Treffer.

### Markdown-Rendering

- **Codeblöcke**: highlight.js-Syntaxhervorhebung für gängige Programmiersprachen
- **Mathematische Formeln**: KaTeX-Rendering für LaTeX-Formeln, sowohl inline als auch als Blockanzeige
- **Tabellen, Listen, Blockzitate**: Vollständige Unterstützung der Standard-Markdown-Syntax
- **Bilder**: Bilder mit relativen Pfaden werden automatisch geladen

### Schriftgröße & Breite

- **Schriftgrößenanpassung**: Einstellbar von 12px bis 24px; klicken Sie auf die +/- Schaltflächen in der Symbolleiste, um schrittweise anzupassen
- **Lesbreite**: Unterstützt schmale (860px) und breite (1160px) Modi für verschiedene Bildschirmgrößen

### Symbolleisten-Aktionen

| Schaltfläche | Funktion |
|-------------|----------|
| Suchfeld | Volltext-Schlüsselwortsuche |
| Aktualisieren | Datei erneut einlesen und neu rendern |
| Markdown kopieren | Den rohen Markdown-Inhalt in die Zwischenablage kopieren |
| Pfad kopieren | Den Dateipfad in die Zwischenablage kopieren |
| Schriftgröße - | Schriftgröße verkleinern |
| Schriftgröße + | Schriftgröße vergrößern |
| Breitenumschaltung | Zwischen schmalem/breitem Lesemodus wechseln |
| Nach oben | Sanft nach oben zum Dokumentanfang scrollen |
| Extern öffnen | Datei mit der Standardanwendung des Systems öffnen |

### Automatische Theme-Anpassung

Der Reader passt sich automatisch an das helle/dunkle Theme von Zotero an, ohne dass ein manueller Wechsel erforderlich ist.

## Einstellungen

Unter **Zotero → Einstellungen → Zotero Agents → Allgemein**:

- **Integrierten Markdown-Reader aktivieren**: Wenn aktiviert, werden `.md`-Anhänge durch Doppelklick im integrierten Reader geöffnet; wenn deaktiviert, wird der Standard-Öffner des Systems wiederhergestellt.

## Technische Hinweise

- Rendering-Engine: `markdown-it` + KaTeX + highlight.js
- Sicherheit: Integrierte HTML-Bereinigung entfernt unsichere Tags und Event-Handler wie script/style/iframe
- Unterstützte Dateitypen: `.md`, `.markdown` (Erkennung sowohl über Dateierweiterung als auch MIME-Typ)
