# Spiegatore interattivo della letteratura

## Scopo

Dialogare in più turni con l'AI per comprendere approfonditamente i contenuti della letteratura. Supporta domande e risposte libere basate sul contesto della letteratura e genera automaticamente note di studio strutturate al termine della conversazione.

:::tip Non preoccuparti delle allucinazioni
Le risposte dell'AI devono superare un **cancello di verifica**. Le risposte con incertezza vengono contrassegnate esplicitamente, quindi puoi discutere con fiducia dei dettagli dell'articolo con l'AI.
:::

## Casi d'uso

- Incontrare concetti o terminologie che non si comprendono durante la lettura di un articolo
- Voler approfondire una parte specifica dell'articolo (metodi, esperimenti, derivazioni)
- Lavorare con l'AI per seguire il ragionamento e i contributi dell'articolo

## Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | Allegato |
| Tipi accettati | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Limite per elemento padre | Al massimo 1 allegato |

### Metodi di attivazione

- Selezionare direttamente un allegato PDF o Markdown
- Selezionare l'elemento padre e il plugin espanderà automaticamente il primo allegato idoneo

## Flusso di esecuzione

```
1. Costruisci la richiesta
   └── Carica il file sorgente su Skill-Runner
       └── Invoca skill_id: "literature-explainer"

2. Elaborazione di Skill-Runner
   └── Avvia la modalità interattiva
       └── Apri il pannello chat della Dashboard

3. Interazione dell'utente
   └── Dialoga con l'AI nella Dashboard delle attività
       └── Invia messaggi, visualizza le risposte

4. Termina la conversazione
   └── L'utente chiude o annulla manualmente
       └── Genera i risultati della conversazione
```

### Flusso di interazione

1. Dopo l'avvio del Workflow, la Dashboard delle attività apre automaticamente il pannello chat
2. Digita domande o istruzioni nell'input della chat
3. Le risposte dell'AI vengono visualizzate in tempo reale nel pannello
4. La conversazione può continuare fino a quando l'utente sceglie di terminarla
5. La chiusura del pannello attiva l'elaborazione dei risultati

## Durata stimata

Dipende dal numero di turni di conversazione. Il caricamento della letteratura e l'inizializzazione richiedono circa 1-2 minuti, dopodiché la conversazione procede in tempo reale.

## Raccomandazioni sul modello

🟡 Si raccomandano modelli con **funzionalità di ricerca web**. Lo Spiegatore della letteratura ha un meccanismo di verifica delle prove integrato — se il modello può cercare sul web per verificare citazioni e fatti nell'articolo, la qualità della verifica migliora significativamente. Quando l'accesso al web non è disponibile, la funzionalità di verifica è fortemente limitata, ma è comunque possibile ragionare e rispondere a domande basate sul contenuto della letteratura.

## Output

Dopo il completamento dell'esecuzione, viene creata **1 Nota di studio (Nota di conversazione)** sotto l'elemento padre:

- Tipo: `data-zs-note-kind="conversation"`
- Contenuto: Cronologia di domande e risposte (formato HTML), che può essere conservata come note di studio
- Strategia di aggiornamento: Ogni esecuzione crea una nuova nota di conversazione (invece di sovrascrivere)

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-explainer_note.webp" alt="Nota di studio dello Spiegatore della letteratura" title="Nota di studio dello Spiegatore della letteratura" loading="lazy" /><figcaption>Nota di studio dello Spiegatore della letteratura</figcaption></figure>

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|-----------|------|-------------|-------------|
| `language` | string | Lingua della conversazione | `zh-CN` |

Valori disponibili: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. È supportato anche l'inserimento personalizzato.

## Dipendenze

- **Backend**: Servizio Skill-Runner
- **Configurazione del backend**: Configurare un backend di tipo Skill-Runner nel Backend Manager
- **Skill**: La skill `literature-explainer` deve essere distribuita sul Skill-Runner

## Workflow correlati

- [Analisi della letteratura](#doc/workflows%2Fliterature-analysis) — Genera automaticamente riassunti della letteratura (si consiglia di eseguirlo prima)
- [Lettura approfondita](#doc/workflows%2Fliterature-deep-reading) — Genera una vista strutturata di lettura approfondita
