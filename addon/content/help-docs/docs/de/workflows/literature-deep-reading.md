# Deep Reading

## Zweck

Tiefgehende Lektüre eines Artikels durchführen und eine strukturierte, multiperspektivische Leseverständnisanalyse-Ansicht erstellen. Extrahiert automatisch Kapitelstruktur, Kernkonzepte und Referenzen, unterstützt absatzweise Übersetzung und gibt ein eigenständiges HTML-Lesedokument aus.

## Anwendungsfälle

- Systematische tiefgehende Lektüre eines wichtigen Artikels
- Umfassende Analyse erhalten, einschließlich Kapitelanmerkungen, Schlüsselkonzepte und weiterführende Literatur
- Zweisprachiges paralleles Lesen benötigen (Originaltext + Zielsprachen-Übersetzung)

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

Der Deep-Reading-Workflow ist eine **vollautomatische** mehrstufige Verarbeitungspipeline, die keine Benutzereingriffe erfordert:

## Geschätzte Dauer

| Dateigröße | Geschätzte Zeit |
|---------|---------|
| Kurzer Artikel (≤10 Seiten) | 8-12 Minuten |
| Standard (10-30 Seiten) | 12-18 Minuten |
| Langer Artikel (30+ Seiten) | 18-25 Minuten |

Dieser Workflow umfasst eine mehrstufige Verarbeitung (Leitfaden → Anreicherung → Übersetzung → Organisation → Rendering) und ist damit der am längsten laufende Einzelartikel-Analyse-Workflow.

## Modell-Empfehlung

🟡 Modelle mit **starkem Textverständnis** werden empfohlen. Dieser Workflow erfordert eine mehrschichtige Tiefenanalyse des Artikels (Struktur, Konzepte, Argumentationslogik), was hohe Anforderungen an das semantische Verständnis des Modells stellt. Wenn Subagent-Delegationsfähigkeit verfügbar ist, können Phasen parallel ausgeführt werden, was die Gesamtzeit erheblich verkürzt.

## Ausgaben

```
1. Vorbereitungsphase
   └── Quelldatei hochladen, source_bundle.zip erstellen
       └── Enthält Originaltext, Bilder und bestehende Referenzen

2. Leitfaden- und Kontextsammlung
   └── Originaltextstruktur und Metadaten analysieren
       └── Verwandten Kontext über Host Bridge sammeln

3. Leseanreicherung
   └── Kapitelanmerkungen, Schlüsselkonzepte, Referenzanalyse erstellen
       └── Zusammenfassungs- und weiterführende Leseansichten

4. Blockweise Übersetzung
   └── Normalisierte Übersetzung nach stabilen Blöcken
       └── Zweisprachige parallele Übersetzungsansicht erstellen

5. Abschließendes Rendering
   └── Alle Analyseansichten integrieren
       └── Als eigenständige HTML-Datei rendern
```

## Ausgabe-Artefakte

Nach Abschluss der Ausführung wird ein verknüpfter Anhang, der auf die erstellte HTML-Datei verweist, unter dem übergeordneten Eintrag erstellt:

- **Format**: Eigenständige HTML-Datei (kann im Browser geöffnet werden)
- **Inhalt**: Vollständige Deep-Reading-Ansicht einschließlich Originaltextstruktur, Kapitelanmerkungen, Konzeptanalyse, Referenzen, zweisprachige Übersetzungen usw.
- **Lebenszyklus**: Jede Ausführung überschreibt und aktualisiert

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-deep-reading_1.webp" alt="Deep Reading Eröffnungsleitfaden" title="Deep Reading Eröffnungsleitfaden" loading="lazy" /><figcaption>Deep Reading Eröffnungsleitfaden</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-deep-reading_2.webp" alt="Deep Reading Zweisprachiges dynamisches Lesen" title="Deep Reading Zweisprachiges dynamisches Lesen" loading="lazy" /><figcaption>Deep Reading Zweisprachiges dynamisches Lesen</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-deep-reading_3.webp" alt="Deep Reading Referenz-Abstractlesen" title="Deep Reading Referenz-Abstractlesen" loading="lazy" /><figcaption>Deep Reading Referenz-Abstractlesen</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-deep-reading_4.webp" alt="Deep Reading Referenz-2-Hop-Subgraph" title="Deep Reading Referenz-2-Hop-Subgraph" loading="lazy" /><figcaption>Deep Reading Referenz-2-Hop-Subgraph</figcaption></figure>

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `target_language` | string | Zielsprache | `zh-CN` |

Verfügbare Werte: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Benutzerdefinierte Eingabe wird ebenfalls unterstützt.

## Abhängigkeiten

- **Backend**: ACP-Backend (erfordert ACP-Protokollunterstützung)
- **Backend-Konfiguration**: Konfigurieren Sie einen ACP-Backend-Typ im Backend Manager

## Verwandte Workflows

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Automatisch Literatur-Zusammenfassungen und Zitationsanalysen erstellen
- [Interactive Literature Explainer](#doc/workflows%2Fliterature-explainer) — Dialog mit KI für tiefes Literaturverständnis
