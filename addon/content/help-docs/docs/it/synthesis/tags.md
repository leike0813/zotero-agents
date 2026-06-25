# Gestione dei Tag

## Cos'è il Vocabolario dei Tag?

Il Vocabolario dei Tag è un sistema di tag standardizzato utilizzato per l'annotazione coerente della letteratura. A differenza dei tag a forma libera nativi di Zotero, i tag in un vocabolario controllato seguono convenzioni di denominazione unificate, il che facilita le statistiche e il recupero.

## Facet

Ogni tag appartiene a un Facet (dimensione). I seguenti facet sono attualmente supportati:

| Facet | Descrizione | Esempio |
|-------|-------------|---------|
| `field` | Campo di ricerca | `field:natural_language_processing` |
| `topic` | Argomento di ricerca | `topic:transformer_architecture` |
| `method` | Metodo di ricerca | `method:reinforcement_learning` |
| `model` | Modello utilizzato | `model:gpt-4` |
| `ai_task` | Tipo di compito AI | `ai_task:text_summarization` |
| `data` | Dataset | `data:imagenet` |
| `tool` | Strumento | `tool:python` |
| `status` | Marcatore di stato | `status:to_read` |

Formato dei tag: `^[a-z_]+:[a-zA-Z0-9/_.-]+$`, massimo 120 caratteri.

## Scheda Vocabulary

Nella pagina Synthesis Workbench → Tags → Vocabulary, è possibile:

- **Visualizzare**: Tutti i tag canonici definiti, con stato, facet, alias e conteggio di utilizzo
- **Aggiungere**: Creare nuovi tag canonici
- **Modificare**: Modificare i metadati dei tag
- **Deprecare**: Contrassegnare un tag come deprecato, specificando opzionalmente un tag sostitutivo
- **Importare JSON**: Importare un vocabolario di tag da un file JSON (supporta l'anteprima prima della conferma)
- **Esportare JSON**: Esportare il vocabolario corrente in un file JSON

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/tags.webp" alt="Pagina Tag di Synthesis" title="Pagina Tag di Synthesis" loading="lazy" /><figcaption>Pagina Tag di Synthesis</figcaption></figure>

Stati dei tag:
- `active`: Attivo
- `deprecated`: Deprecato (ha un tag sostitutivo)
- `warning`: Avviso (potrebbe richiedere revisione)

## Scheda Staged (Tag in sospeso)

Lo skill **tag-regulator** analizza automaticamente i metadati della letteratura e genera suggerimenti di tag controllati, mostrati nella pagina Staged.

### Flusso di approvazione

1. Esaminare l'elenco dei tag suggeriti
2. Per ciascun tag, è possibile:
   - **Promuovi**: Aggiungere il tag al vocabolario canonico
   - **Scarta**: Rifiutare il suggerimento
   - **Cancella tutti i pending**: Scartare in blocco tutti i suggerimenti

### Formato di importazione/esportazione

Il vocabolario dei tag supporta l'importazione/esportazione in formato JSON (formato TagVocab), consentendo:

- Migrazione dei sistemi di tag tra librerie
- Condivisione in team delle convenzioni di tag
- Backup e controllo versione

## Workflow correlato

La standardizzazione e l'inferenza automatica dei tag sono gestite dal workflow [Tag Regulator](#doc/workflows%2Ftag-regulator). Eseguendo questo workflow è possibile pulire e integrare automaticamente i tag in base al vocabolario controllato.
