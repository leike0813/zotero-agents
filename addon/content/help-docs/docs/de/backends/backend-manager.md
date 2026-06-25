# Backend-Manager

Der Backend-Manager ist das zentrale Dialogfenster zur Verwaltung aller Backend-Konfigurationen. Darüber können Sie Backend-Verbindungen hinzufügen, bearbeiten, löschen und überprüfen.

## So öffnen Sie ihn

- **Menü**: **Werkzeuge → Backend-Manager**

## Oberflächenlayout

```
┌─────────────────────────────────────────────────┐
│  Backend-Manager                        [Abbrechen] [Speichern] │
├─────────────────────────────────────────────────┤
│  [ACP] [SkillRunner] [Generisches HTTP]              │
├─────────────────────────────────────────────────┤
│  ACP                                   [ACP hinzufügen] │
│                                                 │
│  ┌─ Anzeigename: [________]  ─┐               │
│  │  Befehl:      [________]    │               │
│  │  Argumente:    Argument-Editor │             │
│  │  Umgebungsvariablen: Umgeb.-Var.-Editor │  [Entfernen]  │
│  └──────────────────────────────┘               │
│                                                 │
│  ┌─ Anzeigename: [________]  ─┐               │
│  │  ...                       │  [Entfernen]      │
│  └──────────────────────────────┘               │
└─────────────────────────────────────────────────┘
```

## Allgemeine Vorgänge

### Registerkartenwechsel

Oben im Dialogfenster befinden sich drei Registerkarten: **ACP**, **SkillRunner** und **Generisches HTTP**. Klicken Sie auf eine Registerkarte, um zum entsprechenden Backend-Typ-Konfigurationsbereich zu wechseln. Jede Registerkarte listet alle konfigurierten Backends dieses Typs auf.

### Backend hinzufügen

Klicken Sie auf die Schaltfläche **Hinzufügen** unter einer Registerkarte, um eine neue leere Konfigurationszeile für diesen Typ zu erstellen. Füllen Sie die Felder aus und klicken Sie auf **Speichern** in der unteren rechten Ecke, um die Änderungen zu übernehmen.

### Backend bearbeiten

Ändern Sie die Felder direkt in der Konfigurationszeile. Nicht gespeicherte Änderungen werden nicht wirksam.

### Backend löschen

Klicken Sie auf die Schaltfläche **Entfernen** in einer Konfigurationszeile, um das Backend zu löschen. Löschungen werden nach dem Speichern wirksam.

### Speichern & Abbrechen

| Schaltfläche | Position | Funktion |
|--------|----------|----------|
| **Speichern** | Unten rechts im Dialogfenster | Alle Änderungen speichern und das Dialogfenster schließen |
| **Abbrechen** | Unten rechts im Dialogfenster (neben Speichern) | Alle nicht gespeicherten Änderungen verwerfen und das Dialogfenster schließen |

Wenn vor dem Schließen des Dialogfensters ungespeicherte Änderungen vorhanden sind, erscheint eine Bestätigungsaufforderung.

---

## ACP-Registerkarte

ACP-Backends sind lokal ausgeführte Agent-Unterprozesse. Die Konfiguration gibt den Startbefehl vor, und das Plugin verwaltet den Prozesslebenszyklus.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_ACP.webp" alt="ACP-Backend-Konfigurationsseite" title="ACP-Backend-Konfigurationsseite" loading="lazy" /><figcaption>ACP-Backend-Konfigurationsseite</figcaption></figure>

### Feldbeschreibungen

| Feld | Erforderlich | Beschreibung |
|-------|----------|-------------|
| **Anzeigename** | Ja | Anzeigename für das Backend, zur Identifizierung im Dashboard und in der Seitenleiste |
| **Befehl** | Ja | Befehl zum Starten des ACP-Backends (z. B. `npx opencode-ai@latest acp`) |
| **Argumente** | Nein | Zusätzliche Argumente für den Befehl, die über den Argument-Editor einzeln hinzugefügt werden |
| **Umgebungsvariablen** | Nein | Zusätzliche Umgebungsvariablen, die über den Umgebungsvariablen-Editor einzeln hinzugefügt werden (Schlüssel-Wert-Paare) |

### ACP-Voreinstellungen

Oben auf der ACP-Registerkarte befindet sich ein Dropdown-Menü **Aus Voreinstellung hinzufügen**. Nach Auswahl einer Voreinstellung füllt das Plugin automatisch den Befehl und die gängigen Parameter aus.

Eingebaute Voreinstellungen:

| Voreinstellung | Befehl |
|--------|---------|
| **OpenCode** | `npx opencode-ai@latest acp` |
| **Codex** | `npx codex acp` |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` |
| **Gemini CLI** | `npx @google/gemini-cli acp` |
| **Qwen Code** | `qwen-code acp` |

Sie können nach Auswahl einer Voreinstellung weiterhin jedes Feld manuell bearbeiten.

### Aktionsschaltflächen

| Schaltfläche | Funktion |
|--------|----------|
| **Laufzeitoptionen aktualisieren** | Erneutes Erkennen der Modellliste, Modusliste und sonstigen Laufzeitfähigkeiten des Backends |

### Argument-Editor

**Argument hinzufügen**: Klicken Sie auf die Hinzufügen-Schaltfläche und geben Sie den Argumentinhalt ein.
**Argument entfernen**: Klicken Sie auf die Entfernen-Schaltfläche neben dem Argument.

### Umgebungsvariablen-Editor

**Umgebungsvariable hinzufügen**: Klicken Sie auf die Hinzufügen-Schaltfläche und füllen Sie Schlüssel und Wert aus.
**Umgebungsvariable entfernen**: Klicken Sie auf die Entfernen-Schaltfläche neben der Variable.

---

## SkillRunner-Registerkarte

SkillRunner-Backends kommunizieren über die HTTP-API mit Skill-Runner-Diensten und unterstützen sowohl lokale als auch Remote-Bereitstellungsmodi.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_skillrunner.webp" alt="SkillRunner-Backend-Konfigurationsseite" title="SkillRunner-Backend-Konfigurationsseite" loading="lazy" /><figcaption>SkillRunner-Backend-Konfigurationsseite</figcaption></figure>

### Feldbeschreibungen

| Feld | Erforderlich | Beschreibung |
|-------|----------|-------------|
| **Anzeigename** | Ja | Anzeigename für das Backend |
| **Basis-URL** | Ja | Adresse des Skill-Runner-Dienstes (z. B. `http://127.0.0.1:29813`) |
| **Authentifizierung** | Nein | Wählen Sie `none` (keine Authentifizierung) oder `bearer` (Bearer-Token-Authentifizierung) |
| **Auth-Token** | Nein | Bearer-Token (nur ausfüllen, wenn Authentifizierung auf Bearer gesetzt ist) |
| **Zeitlimit** | Nein | Anfragetimeout (Millisekunden) |

### Aktionsschaltflächen

| Schaltfläche | Funktion |
|--------|----------|
| **Verwaltungsoberfläche öffnen** | Die integrierte Web-Verwaltungsoberfläche des Skill-Runners öffnen |
| **Modell-Cache aktualisieren** | Den Modelllisten-Cache für dieses Backend aktualisieren |

---

## Generisches-HTTP-Registerkarte

Generische HTTP-Backends werden verwendet, um Anfragen an beliebige HTTP-Dienste zu senden, hauptsächlich zum Aufruf externer APIs (wie des MinerU-Dokumentparsers).

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_generic-HTTP.webp" alt="Generisches-HTTP-Backend-Konfigurationsseite" title="Generisches-HTTP-Backend-Konfigurationsseite" loading="lazy" /><figcaption>Generisches-HTTP-Backend-Konfigurationsseite</figcaption></figure>

### Feldbeschreibungen

| Feld | Erforderlich | Beschreibung |
|-------|----------|-------------|
| **Anzeigename** | Ja | Anzeigename für das Backend |
| **Basis-URL** | Ja | Basisadresse des HTTP-Dienstes |
| **Authentifizierung** | Nein | Wählen Sie `none` oder `bearer` |
| **Auth-Token** | Nein | Bearer-Token (nur ausfüllen, wenn Authentifizierung auf Bearer gesetzt ist) |
| **Zeitlimit** | Nein | Anfragetimeout (Millisekunden) |

## Backend-Fähigkeitserkennung

Nach dem Speichern eines Backends erkennt das Plugin automatisch die Backend-Fähigkeiten im Hintergrund:

- **ACP**: Prüft Befehlsverfügbarkeit, Verbindungsinitialisierung, Modellliste, Modusliste und berechnet einen Konfigurations-Fingerabdruck, um nachfolgende Änderungen zu erkennen
- **SkillRunner**: Prüft API-Verfügbarkeit, Engine-Liste, Modellliste
- **Generisches HTTP**: Prüft die Erreichbarkeit des HTTP-Endpunkts

Erkennungsergebnisse werden als Backend-Statusanzeigen im Dashboard und in der Seitenleiste angezeigt.

## Nächste Schritte

Nach Abschluss der Konfiguration können Sie:

- Das ACP-Backend im [ACP-Chat](#doc/sidebar%2Facp-chat) oder [ACP-Skills](#doc/sidebar%2Facp-skills) verwenden
- SkillRunner-Ausführungen über die [SkillRunner-Registerkarte](#doc/sidebar%2Fskillrunner-tab) verwalten
- Die konfigurierten Backends zur Ausführung von Aufgaben in der [Workflow-Liste](#doc/workflows%2Findex) und im [Dashboard](#doc/dashboard) verwenden
