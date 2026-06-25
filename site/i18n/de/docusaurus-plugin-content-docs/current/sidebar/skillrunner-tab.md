# SkillRunner-Tab

Der SkillRunner-Tab dient zur Anzeige und Interaktion mit Ausführungen, die über das Skill-Runner-Backend ausgeführt werden. Im Gegensatz zu ACP Skills, das sich auf die einmalige Skill-Ausführung konzentriert, liegt der Schwerpunkt des SkillRunner-Tabs auf der Verwaltung interaktiver Sitzungen.

## Oberflächenübersicht

![SkillRunner-Panel](/img/docs/sidebar/skillrunner-tab.png)

```
┌─────────────────────────────────────┐
│  Banner: Title / requestId / Status    │
├─────────────────────────────────────┤
│  ← Task Drawer  │  Main Content Area   │  Details → │
│               │  Transcript View            │
│  Running      │  Plan Component             │
│  └─ backend1  │  Prompt Component           │
│     └─ task A │  Reply Area                 │
│  Completed    │                             │
│  └─ backend1  │                             │
│     └─ task B │                             │
└─────────────────────────────────────┘
```

## Banner

Das Banner zeigt Informationen zur aktuell ausgewählten Aufgabe:

- **Titel**: Aufgabenname oder Skill-Kennung
- **Request-ID**: Eindeutige Anforderungskennung für die Aufgabe
- **Status**: Ausführungsstatus (running / waiting_user / waiting_auth / completed / failed)
- **Backend**: Backend-Informationen
- **Engine**: Die verwendete Engine (z.B. gemini, claude usw.)
- **Modell**: Das verwendete Modell
- **Aktualisiert**: Letzte Aktualisierungszeit
- **Schaltfläche zum Abbrechen der Aufgabe**

## Aufgaben-Panel (links)

Das linke Panel zeigt alle SkillRunner-Aufgaben, unterteilt in die Gruppen Running und Completed. Jeder Aufgabeneintrag zeigt Zusammenfassungsinformationen, eine Statusanzeige und eine Archivierungsaktion. Klicken Sie auf einen Eintrag, um zur Detailansicht dieser Aufgabe zu wechseln.

## Hauptbereich

### Transcript-Ansicht

Die SkillRunner-Transcript-Ansicht verwendet ein **Thinking-Chat-Modell**, das kontinuierliches Denken intelligent verarbeitet:

- **Thinking-Blöcke**: Der Denkprozess der KI wird als separate Thinking-Blöcke angezeigt
- **Tool-Aufrufe**: Zeigt Tool-Name, Eingabezusammenfassung und Ausführungsstatus
- **Nachrichten**: Gesprächsnachrichten von Assistent und Benutzer
- **Revision**: Versionsänderungsprotokolle der Ausgabe

Unterstützt ebenfalls die Anzeigemodi **Plain / Bubble**.

### Authentifizierungsablauf

Der SkillRunner-Tab unterstützt Authentifizierungsabläufe, sodass die Backend-Authentifizierung abgeschlossen werden kann, ohne das Panel zu verlassen:

**Authentifizierungs-Auslöser:**

- Wird automatisch ausgelöst, wenn ein Skill ausgeführt wird, der eine Authentifizierung erfordert
- Die Prompt-Komponente zeigt eine Authentifizierungsanfrage

**Unterstützte Authentifizierungsmethoden:**

| Methode | Beschreibung | Einsatzbereiche |
|---------|-------------|----------------|
| **OAuth Proxy** | OAuth-Ablauf über den Browser abschließen | Empfohlene Methode für Engines, die OAuth unterstützen |
| **Auth Code Input** | Manuelle Eingabe eines Authentifizierungscodes oder einer URL | Wenn die Engine einen Authentifizierungslink generiert hat |
| **File Import** | Import einer Anmeldedatei | Wenn bereits eine Anmeldedatei vorhanden ist |
| **Inline TUI** | Startet ein Terminal direkt im Panel | Wenn eine interaktive Anmeldung erforderlich ist |

**Beispielablauf für Authentifizierung (OAuth):**

1. Die Ausführung erkennt, dass eine Authentifizierung erforderlich ist
2. Die Prompt-Komponente zeigt „Authentication required" und die verfügbaren Authentifizierungsmethoden
3. Der Benutzer wählt OAuth Proxy
4. Der Browser öffnet die OAuth-Seite
5. Der Benutzer schließt die Authentifizierung ab
6. Die Ausführung wird automatisch fortgesetzt

### Prompt-Komponente

| Status | Anzeigeinhalt |
|--------|--------------|
| `waiting_user` | Wartet auf Benutzereingabe; zeigt Kontextbeschreibung und Schnelloptionen (falls verfügbar) |
| `waiting_auth` | Wartet auf Authentifizierung; zeigt Auswahl und Eingabe der Authentifizierungsmethode |
| `running` | Fortschrittsanzeige |
| `completed` | Abschlussbestätigung |
| `error` | Fehlerinformationen und Fehlerbehebungsvorschläge |

### Antwortbereich

- **Texteingabefeld**: Antwortinhalt eingeben
- **Senden/Abbrechen-Schaltfläche**

Im Gegensatz zu ACP Skills verfügt der Antwortbereich des SkillRunner-Tabs nicht über Modus-/Modell-/Reasoning-Selektoren (diese werden in den Backend-Einstellungen konfiguriert).

## Details-Panel (rechts)

| Bereich | Inhalt |
|---------|--------|
| **Ausführungs-Metadaten** | Titel, requestId, taskKey, Status, Terminal/Waiting-Flags |
| **Backend-Info** | Backend, Engine, Modell |
| **Aktualisierungszeit** | Letzte Aktivitätszeit |
| **Interaktionsinformation** | Aktuelle ausstehende Interaktionsinformationen (falls vorhanden) |
| **Session-Zusammenfassung** | Zusammenfassung des bisherigen Sitzungsverlaufs |
| **Revisionszusammenfassung** | Versionsänderungsprotokolle der Ausgabe |

## Verwandte Konfiguration

Vor der Nutzung des SkillRunner-Tabs muss ein [Skill-Runner-Backend](../backends/skill-runner) konfiguriert werden.
