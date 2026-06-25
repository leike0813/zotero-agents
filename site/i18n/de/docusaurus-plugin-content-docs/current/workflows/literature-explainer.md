# Interactive Literature Explainer

## Zweck

Führen Sie mehrstufige Dialoge mit der KI, um Literaturinhalte tiefgehend zu verstehen. Unterstützt freiformulierte Fragen und Antworten, die auf dem Literaturkontext basieren, und erstellt automatisch strukturierte Lernnotizen nach Gesprächsende.

:::tip Keine Halluzinationen zu befürchten
KI-Antworten müssen ein **Verifizierungstor** durchlaufen. Antworten mit Unsicherheit werden ausdrücklich gekennzeichnet, sodass Sie vertrauensvoll mit der KI über Artikeldetails diskutieren können.
:::

## Anwendungsfälle

- Beim Lesen eines Artikels auf Begriffe oder Terminologie stoßen, die Sie nicht verstehen
- Tiefer in einen bestimmten Teil des Artikels eintauchen (Methoden, Experimente, Herleitungen)
- Mit der KI zusammen die Argumentationskette und die Beiträge des Artikels nachvollziehen

## Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Anhang |
| Akzeptierte Typen | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Pro übergeordnetem Eintrag | Höchstens 1 Anhang |

### Auslösemethoden

- Direkt einen PDF- oder Markdown-Anhang auswählen
- Den übergeordneten Eintrag auswählen, und das Plugin erweitert automatisch seinen ersten qualifizierenden Anhang

## Ausführungsablauf

```
1. Anfrage erstellen
   └── Quelldatei zu Skill-Runner hochladen
       └── skill_id: "literature-explainer" aufrufen

2. Skill-Runner-Verarbeitung
   └── Interaktiven Modus starten
       └── Dashboard-Chatpanel öffnen

3. Benutzerinteraktion
   └── Im Task-Dashboard mit der KI kommunizieren
       └── Nachrichten senden, Antworten ansehen

4. Gespräch beenden
   └── Benutzer schließt oder bricht manuell ab
       └── Gesprächsergebnisse erstellen
```

### Interaktionsablauf

1. Nach dem Start des Workflows öffnet das Task-Dashboard automatisch das Chatpanel
2. Geben Sie Fragen oder Anweisungen in die Chat-Eingabe ein
3. KI-Antworten werden in Echtzeit im Panel angezeigt
4. Das Gespräch kann fortgesetzt werden, bis der Benutzer sich entscheidet, es zu beenden
5. Das Schließen des Panels löst die Ergebnisverarbeitung aus

## Geschätzte Dauer

Abhängig von der Anzahl der Gesprächsrunden. Das Laden der Literatur und die Initialisierung dauern etwa 1-2 Minuten, danach läuft das Gespräch in Echtzeit.

## Modell-Empfehlung

🟡 Modelle mit **Web-Suchfähigkeit** werden empfohlen. Der Literature Explainer verfügt über einen integrierten Evidenz-Verifizierungsmechanismus — wenn das Modell das Web durchsuchen kann, um Zitate und Fakten im Artikel zu überprüfen, verbessert sich die Verifizierungsqualität erheblich. Wenn kein Webzugang verfügbar ist, ist die Verifizierungsfunktion stark eingeschränkt, aber Schlussfolgerungen und Fragen und Antworten basierend auf dem Literaturinhalt sind weiterhin möglich.

## Ausgaben

Nach Abschluss der Ausführung wird **1 Lernnotiz (Gesprächs-Notiz)** unter dem übergeordneten Eintrag erstellt:

- Typ: `data-zs-note-kind="conversation"`
- Inhalt: Fragen-und-Antworten-Verlauf (HTML-Format), der als Lernnotizen aufbewahrt werden kann
- Aktualisierungsstrategie: Jede Ausführung erstellt eine neue Gesprächs-Notiz (anstatt zu überschreiben)

![Literature Explainer Lernnotiz](/img/docs/workflows/literature-explainer_note.png)

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `language` | string | Gesprächssprache | `zh-CN` |

Verfügbare Werte: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Benutzerdefinierte Eingabe wird ebenfalls unterstützt.

## Abhängigkeiten

- **Backend**: Skill-Runner-Dienst
- **Backend-Konfiguration**: Konfigurieren Sie einen Skill-Runner-Backend-Typ im Backend Manager
- **Skill**: Der Skill `literature-explainer` muss auf dem Skill-Runner bereitgestellt sein

## Verwandte Workflows

- [Literature Analysis](literature-analysis) — Automatisch Literatur-Zusammenfassungen erstellen (empfohlen, zuerst auszuführen)
- [Deep Reading](literature-deep-reading) — Eine strukturierte Deep-Reading-Ansicht erstellen
