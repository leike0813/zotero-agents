# Collection Collector

## Scopo

Popolare una raccolta Zotero esistente con letteratura pertinente già presente nella stessa libreria. Il workflow interpreta un ambito di raccolta richiesto in testo libero, esamina metadati, tag e appartenenza ai Synthesis Topic correnti e applica un elenco di appartenenza validato.

## Input

| Parametro | Richiesto | Descrizione |
| --- | --- | --- |
| `collection` | Sì | Raccolta Zotero esistente selezionata per percorso. |
| `collectionScope` | Sì | Significato, argomento di ricerca o confine della letteratura rappresentato dalla raccolta. |

Non è richiesta la selezione di elementi Zotero.

## Comportamento

1. Scorri pagina per pagina tutti gli elementi regolari di primo livello nella libreria della raccolta target.
2. Escludi gli elementi già presenti nella raccolta target.
3. Costruisci candidati da corrispondenze di metadati/tag e Synthesis Topics esistenti pertinenti.
4. Valuta semanticamente al massimo 250 candidati in batch da 20.
5. Seleziona articoli con una rilevanza di almeno `0.65` e conserva l'evidenza e la ragione per ogni decisione.
6. Ricontrolla l'appartenenza corrente e aggiungi gli elementi rimanenti tramite workflow apply.

Il workflow è automatico e non si ferma per conferma. Non cerca sul web, non acquisisce nuovi articoli, non modifica tag, non crea raccolte e non muta Synthesis Topics. Un contesto Topic mancante si degrada a evidenza di metadati e tag.

## Output e applicazione

Il risultato dell'esecuzione contiene i riferimenti agli elementi Zotero selezionati, i titoli, i valori di rilevanza, la base di evidenza, gli ID Topic corrispondenti, le ragioni, le avvertenze e le diagnostiche di selezione. Una selezione vuota è un no-op riuscito. Apply valida nuovamente la destinazione e i riferimenti agli elementi e rimane idempotente se l'appartenenza è cambiata durante l'esecuzione dello skill.
