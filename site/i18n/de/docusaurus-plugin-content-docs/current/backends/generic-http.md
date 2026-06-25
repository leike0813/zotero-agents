# Generisches-HTTP-Backend-Konfiguration

## Zweck

Das generische HTTP-Backend wird verwendet, um rohe HTTP-Anfragen an beliebige URLs zu senden. Es führt keine Agent-Skills aus, sondern dient als allgemeiner HTTP-Client.

## Hauptanwendungsfall: MinerU-Dokumentparse

Die Hauptnutzung des generischen HTTP-Backends ist die Unterstützung des **MinerU-Workflows** — eines PDF-Dokumentparse-Workflows.

MinerU ist ein Dokumentparse-Dienst, der PDF-Dateien in das Markdown-Format umwandelt. Der MinerU-Workflow sendet Anfragen über das generische HTTP-Backend an den MinerU-Dienst, um Parsergebnisse zu erhalten.

### MinerU konfigurieren

1. Besuchen Sie [mineru.net](https://mineru.net), um ein Konto zu registrieren, und erhalten Sie ein API-Token von der Seite **API → API-Verwaltung**
2. Öffnen Sie **Werkzeuge → [Backend-Manager](backend-manager)**
3. Wechseln Sie zur Registerkarte **Generisches HTTP**
4. Klicken Sie auf **Generisches HTTP hinzufügen**
5. Füllen Sie aus:

| Feld | Wert |
|-------|-------|
| Anzeigename | `MinerU Official` |
| Basis-URL | `https://mineru.net` |
| Authentifizierung | `bearer` |
| Auth-Token | Fügen Sie Ihr API-Token ein |
| Zeitlimit | `60000` (60 Sekunden) |

6. Klicken Sie auf **Speichern** in der unteren rechten Ecke

## Konfigurationsfelder

| Feld | Erforderlich | Beschreibung |
|-------|----------|-------------|
| Anzeigename | Ja | Anzeigename für das Backend |
| Basis-URL | Ja | Basisadresse des HTTP-Dienstes |
| Bearer-Token | Nein | Authentifizierungstoken |
| Zeitlimit | Nein | Anfragetimeout (Millisekunden) |

## Technische Details

Das generische HTTP-Backend unterstützt:
- **Einstufige Anfragen**: `generic-http.request.v1` — Eine einzelne HTTP-Anfrage senden
- **Mehrstufige Pipelines**: `generic-http.steps.v1` — Verkettete Anfragen mit JSON-Pfad-Extraktion (`$.*`-Ausdrücke), die Werte aus vorherigen Antworten als Parameter für nachfolgende Anfragen extrahieren
- **Multipart-Uploads**: Datei-Upload-Unterstützung
- Abfrage- und Wiederholungsmechanismen

## Nächste Schritte

- [Workflows kennenlernen](../workflows/) — Generische HTTP-Backends werden hauptsächlich für bestimmte Workflows verwendet
