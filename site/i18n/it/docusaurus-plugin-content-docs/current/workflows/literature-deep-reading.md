# Lettura approfondita

## Scopo

Eseguire una lettura approfondita di un articolo, generando una vista di analisi della lettura strutturata e multi-prospettica. Estrae automaticamente la struttura dei capitoli, i concetti fondamentali e i riferimenti, supporta la traduzione paragrafo per paragrafo e produce un documento HTML di lettura autonomo.

## Casi d'uso

- Leggere approfonditamente e in modo sistematico un articolo importante
- Ottenere un'analisi completa che includa annotazioni dei capitoli, concetti chiave e ulteriori letture
- Necessità di una lettura bilingue parallela (testo originale + traduzione nella lingua di destinazione)

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

Il Workflow di lettura approfondita è una pipeline di elaborazione **completamente automatica** a più stadi che non richiede intervento dell'utente:

## Durata stimata

| Dimensione del file | Tempo stimato |
|---------------------|--------------|
| Articolo breve (≤10 pagine) | 8-12 minuti |
| Standard (10-30 pagine) | 12-18 minuti |
| Articolo lungo (30+ pagine) | 18-25 minuti |

Questo Workflow coinvolge un'elaborazione a più stadi (guida → arricchimento → traduzione → organizzazione → rendering), rendendolo il Workflow di analisi di un singolo articolo con l'esecuzione più lunga.

## Raccomandazioni sul modello

🟡 Si raccomandano modelli con **forte comprensione del testo**. Questo Workflow richiede un'analisi approfondita multilivello dell'articolo (struttura, concetti, logica argomentativa), ponendo elevate richieste sulla comprensione semantica del modello. Se è disponibile la funzionalità di delega di sotto-agent, gli stadi possono essere eseguiti in parallelo, riducendo significativamente il tempo totale.

## Output

```
1. Fase di preparazione
   └── Carica il file sorgente, genera source_bundle.zip
       └── Contiene testo originale, immagini e riferimenti esistenti

2. Guida e raccolta del contesto
   └── Analizza la struttura del testo originale e i metadati
       └── Raccoglie il contesto correlato tramite Host Bridge

3. Arricchimento della lettura
   └── Genera annotazioni dei capitoli, concetti chiave, analisi dei riferimenti
       └── Viste di riassunto e ulteriori letture

4. Traduzione blocco per blocco
   └── Normalizza la traduzione per blocchi stabili
       └── Genera vista di traduzione bilingue parallela

5. Rendering finale
   └── Integra tutte le viste di analisi
       └── Renderizza come file HTML autonomo
```

## Artifact di output

Dopo il completamento dell'esecuzione, viene creato un allegato collegato che punta al file HTML generato sotto l'elemento padre:

- **Formato**: File HTML autonomo (può essere aperto in un browser)
- **Contenuto**: Vista completa di lettura approfondita che include struttura del testo originale, annotazioni dei capitoli, analisi dei concetti, riferimenti, traduzioni bilingui, ecc.
- **Ciclo di vita**: Ogni esecuzione sovrascrive e aggiorna

![Guida all'apertura della Lettura approfondita](/img/docs/workflows/literature-deep-reading_1.png)

![Lettura dinamica bilingue della Lettura approfondita](/img/docs/workflows/literature-deep-reading_2.png)

![Lettura degli abstract dei riferimenti della Lettura approfondita](/img/docs/workflows/literature-deep-reading_3.png)

![Sottografo a 2 hop dei riferimenti della Lettura approfondita](/img/docs/workflows/literature-deep-reading_4.png)

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|-----------|------|-------------|-------------|
| `target_language` | string | Lingua di destinazione | `zh-CN` |

Valori disponibili: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. È supportato anche l'inserimento personalizzato.

## Dipendenze

- **Backend**: Backend ACP (richiede il supporto del protocollo ACP)
- **Configurazione del backend**: Configurare un backend di tipo ACP nel Backend Manager

## Workflow correlati

- [Analisi della letteratura](literature-analysis) — Genera automaticamente riassunti della letteratura e analisi delle citazioni
- [Spiegatore interattivo della letteratura](literature-explainer) — Dialogo con l'AI per una comprensione approfondita della letteratura
