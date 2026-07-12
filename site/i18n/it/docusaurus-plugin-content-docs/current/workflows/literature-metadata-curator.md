# Literature Metadata Curator

## Scopo

Interrogare, correggere e completare i metadati bibliografici per un elemento padre Zotero selezionato. Il workflow gestisce casi come inconsistenza nella maiuscolizzazione del titolo, autori mancanti, campi rivista/volume/pagina incompleti, voci DOI/ISBN incomplete e tipi di elemento impostati in modo errato.

## Input

| Parametro | Richiesto | Descrizione |
| --- | --- | --- |

Nessun parametro configurabile dall'utente. Selezionare esattamente un elemento padre nell'elenco degli elementi Zotero. Allegati ed elementi multipli non sono accettati.

## Comportamento

Il workflow viene eseguito completamente automaticamente senza conferma dell'utente. Segue due percorsi:

1. **Percorso veloce locale**: Se l'elemento ha un DOI, ISBN o un URL che si risolve deterministicamente a un identificatore DOI, arXiv o PubMed, il workflow chiama `runtime.hostApi.metadata.translateIdentifier` (una facade controllata di sola lettura Zotero `Translate.Search`). Quando l'identificatore candidato corrisponde e contiene informazioni bibliografiche preziose, i risultati vengono scritti direttamente.
2. **Fallback a Skill-Runner**: Se non esiste un identificatore affidabile, la ricerca locale non restituisce risultati, il traduttore fallisce, il candidato non è affidabile o l'identificatore non corrisponde, il workflow esegue lo skill `literature-metadata-search` per un recupero di metadati basato sul web leggero.

Entrambi i percorsi condividono lo stesso formato di risultato canonico e lo stesso gestore di applicazione.

### Regole di scrittura

Il workflow aggiorna i campi bibliografici dell'elemento padre:

- Titolo, DOI, ISBN, ISSN, URL, abstract, data, lingua, catalogo della biblioteca
- Campi rivista/conferenza/libro/tesi/rapporto (nome rivista, volume/fascicolo/pagine, editore, nome conferenza, scuola, tipo rapporto, ecc.)
- Creatori (autori, autori istituzionali, ecc.)
- `itemType` quando supportato da evidenze ad alta confidenza (ad esempio, articolo di rivista corretto in tesi)

Il workflow **non** modifica allegati, note, tag, raccolte, elementi correlati, file PDF o snapshot web.

Senza un identificatore stabile, il workflow sovrascrive un titolo esistente o cambia il tipo di elemento solo quando: il candidato può essere provato come la stessa opera diretta, almeno due segnali bibliografici indipendenti concordano e una pagina di destinazione autorevole lo corrobora. I titoli del contenitore vengono scritti nel campo contenitore appropriato piuttosto che sostituire il titolo dell'opera. Risultati a bassa confidenza, candidati conflittuali o risultati solo sospetti vengono saltati.

## Output e applicazione

Le modifiche ai metadati vengono applicate direttamente all'elemento padre Zotero selezionato. Non è richiesto alcun passaggio di conferma intermedio.

## Raccomandazione del modello

- **Percorso veloce riuscito** (DOI/ISBN/identificatore URL supportato presente): Nessun modello backend necessario.
- **Fallback a `literature-metadata-search`**: Si raccomanda un modello con capacità di ricerca web. Il compito è un recupero leggero e una verifica delle evidenze — non richiede capacità di scrittura in formato lungo, ma deve distinguere omonimi, versioni preprint vs. pubblicate, articoli vs. tesi e diverse edizioni.

## Dipendenze

- **Backend**: Skill-Runner (per fallback dopo fallimento della ricerca locale)
- **Skill**: `literature-metadata-search`
- **Zotero Host API**: `metadata.translateIdentifier` (percorso veloce controllato di sola lettura)
- **Apply Handler**: `handlers.parent.updateMetadata`

## Workflow correlati

- [Literature Search & Ingest](literature-search-ingest) — Cercare nuova letteratura e acquisirla in Zotero
- [Literature Analysis](literature-analysis) — Generare sintesi e analisi delle citazioni da PDF/Markdown
- [Tag Regulator](tag-regulator) — Normalizzare i tag dopo il completamento dei metadati
