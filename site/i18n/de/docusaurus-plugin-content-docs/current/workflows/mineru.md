# MinerU PDF-Parsung

## Zweck

Den MinerU-Dienst aufrufen, um PDF-Dokumente zu parsen, qualitativ hochwertigen Markdown-Text und Bilder zu extrahieren und direkt lesbare Notizdateien zu erstellen.

MinerU ist ein auf Deep Learning basierendes PDF-Parsungswerkzeug, das qualitativ hochwertigen Text und Abbildungen aus akademischen Artikeln extrahiert.

## Anwendungsfälle

- Literatur im PDF-Format in bearbeitbares Markdown umwandeln
- Plain-Text-Dokumente für nachgelagerte Workflows vorbereiten (z. B. Literature Analysis, Deep Reading)
- Bilder und Tabellen aus PDFs extrahieren

## Konfiguration des MinerU-Backends

### 1. MinerU-Konto registrieren und API-Token erhalten

1. Besuchen Sie [mineru.net](https://mineru.net), um ein Konto zu registrieren
2. Melden Sie sich an und gehen Sie zur Seite **API → API-Verwaltung**
3. Einen API-Token erstellen oder kopieren

### 2. Backend im Backend Manager hinzufügen

1. Öffnen Sie **Tools → [Backend Manager](../backends/backend-manager)**
2. Wechseln Sie zum Tab **Generic HTTP**
3. Klicken Sie auf **Generic HTTP hinzufügen**
4. Füllen Sie die folgenden Felder aus:

| Feld | Wert |
|------|-----|
| Anzeigename | `MinerU Official` (oder ein beliebiger Name) |
| Base URL | `https://mineru.net` |
| Auth Method | `bearer` |
| Auth Token | Den im vorherigen Schritt erhaltenen API-Token einfügen |
| Timeout | `600000` (10 Minuten) |

5. Klicken Sie auf **Speichern** in der unteren rechten Ecke

## Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Anhang |
| Akzeptierte Typen | `application/pdf` (nur PDF) |
| Konflikt-Erkennung | Wenn eine `.md`-Datei mit demselben Namen bereits im selben Verzeichnis existiert, wird die PDF übersprungen |

### Auslösemethoden

- Direkt einen oder mehrere PDF-Anhänge auswählen
- Den übergeordneten Eintrag auswählen, und das Plugin erweitert automatisch seine untergeordneten PDF-Anhänge

### Konfliktbehandlung

- Es wird geprüft, ob `<PDF-Dateiname>.md` im Zielverzeichnis existiert
- Falls vorhanden, wird die Eingabe bei der Vorverarbeitung übersprungen
- Wenn alle Kandidaten Konflikte haben, reicht der Workflow keine Aufgaben ein

## Ausführungsablauf

```
1. Upload-URL anfordern
   └── POST an MinerU-API, um batch_id und upload_url zu erhalten

2. Datei hochladen
   └── Binärer Upload der PDF-Datei

3. Ergebnisse abfragen
   └── Wiederholte Abfragen, bis die Verarbeitung abgeschlossen ist oder fehlschlägt
       └── Intervall: 2 Sekunden

4. Ergebnisse herunterladen
   └── Bundle (zip-Format) herunterladen

5. Lokale Materialisierung
   └── Bundle entpacken
       └── Markdown-Inhalt extrahieren
       └── Bilder extrahieren
       └── Bildpfade in Markdown auf lokale relative Pfade umschreiben
       └── In dasselbe Verzeichnis wie die PDF schreiben
```

## Ausgaben

### 1. Markdown-Datei

- **Speicherort**: Dasselbe Verzeichnis wie die PDF
- **Benennung**: `<Originaldateiname>.md`
- **Inhalt**: Geparster Markdown-Text
- **Kodierung**: UTF-8

### 2. Bilderverzeichnis

- **Speicherort**: Dasselbe Verzeichnis wie die PDF: `Images_<ItemKey>/`
- **Inhalt**: Aus der PDF extrahierte Bilddateien

### 3. Verknüpfter Anhang

- **Typ**: Link zur lokalen Datei
- **Speicherort**: Unter dem übergeordneten Eintrag
- **Ziel**: Die `.md`-Datei

### Bereinigungslogik

- Wenn `Images_<ItemKey>/` bereits im Zielverzeichnis existiert, wird das alte Verzeichnis vor dem Schreiben gelöscht
- Vermeidet das Erstellen duplizierter `.md`-Verknüpfungsanhänge, die bereits existieren

## Geschätzte Dauer

| PDF-Größe | Geschätzte Zeit |
|---------|---------|
| Kurzer Artikel (≤15 Seiten) | 30 Sekunden - 1 Minute |
| Standard (15-40 Seiten) | 1-2 Minuten |
| Langer Artikel (40+ Seiten) | 2-3 Minuten |

Die Dauer hängt hauptsächlich von der Verarbeitungsgeschwindigkeit des MinerU-Dienstes ab.

## Parameter

Der MinerU-Workflow hat keine benutzerkonfigurierbaren Parameter.

## Modell-Empfehlung

Kein LLM-Modell erforderlich. Dieser Workflow ruft nur den MinerU-Dienst über die HTTP-API auf.

## Abhängigkeiten

- **Backend**: MinerU-Dienst (Generic HTTP Backend)
- **Backend-Konfiguration**: Konfigurieren Sie einen Generic HTTP Backend-Typ im Backend Manager
- **Authentifizierung**: Ein gültiger API-Token (Bearer-Token) ist erforderlich
- **MinerU-Dienst-URL**: `https://mineru.net` oder eine andere bereitgestellte Instanz

## Verwandte Workflows

- [Literature Analysis](literature-analysis) — Zusammenfassungen und Zitationsanalysen aus dem geparsten Markdown erstellen
