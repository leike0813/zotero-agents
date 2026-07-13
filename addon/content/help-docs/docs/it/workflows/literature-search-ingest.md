# Literature Search & Ingest

## Scopo

Cercare letteratura accademica con l'IA e acquisire i risultati approvati direttamente in Zotero. Una query vuota può avviare una conversazione guidata che trasforma un bisogno di ricerca in un brief di ricerca confermato.

## Modalità di ricerca

| Modalità | Descrizione |
|------|------|
| `auto` | Rileva una modalità adatta per una query non vuota; una query vuota avvia la pianificazione guidata. |
| `guided` | Chiarire il bisogno di ricerca, ispezionare la copertura locale Zotero/Synthesis ed eseguire direttamente il brief confermato. |
| `topic_expansion` | Ricerca per direzione di ricerca o argomento. |
| `paper_seed_expansion` | Espansione da un articolo seed. |
| `targeted_ingest` | Individuare e acquisire con precisione un singolo articolo. |

## Flusso di esecuzione

```
1. Pianificazione guidata (query auto vuota o modalità guided)
    └── Chiarire l'obiettivo di ricerca in brevi turni
    └── Leggere solo la copertura locale Zotero/Synthesis
    └── Presentare un brief di ricerca strutturato
    └── Attendere conferma; nessuna ricerca web o scrittura prima della conferma

2. Ricerca e selezione dei candidati
    └── Cercare secondo il brief confermato o la modalità esplicita
    └── Verificare identificatori, metadati autorevoli, pagine di destinazione e prove legali di PDF pubblico
    └── L'utente seleziona gli articoli da acquisire

3. Acquisizione e completamento
    └── Acquisire ogni articolo approvato tramite zotero-bridge
    └── Produrre JSON di acquisizione conciso, inclusi i collegamenti PDF mancanti
```

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|------|------|------|------|
| `query` | string | Argomento di ricerca, identificatore di articolo, seed o valore vuoto per la pianificazione guidata. | Vuoto |
| `searchMode` | string | `auto`, `guided`, `topic_expansion`, `paper_seed_expansion` o `targeted_ingest`. | `auto` |
| `targetCollection` | string | Collection destinazione opzionale. | Vuoto |

## Output

- Le prove del candidato vengono verificate prima che l'utente possa approvare l'acquisizione.
- Ogni acquisizione riuscita viene creata o riutilizzata in Zotero; i collegamenti legali alle pagine di destinazione rimangono disponibili quando non viene allegato alcun PDF.
- Le esecuzioni guidate riportano `search_mode: "guided"`; le altre esecuzioni mantengono la loro modalità di ricerca concreta.

## Dipendenze

- **Backend**: Backend ACP con esecuzione interattiva
- **Skill**: `literature-search-ingest`
