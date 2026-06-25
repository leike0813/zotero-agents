# Hub di Revisione

La superficie Review è il luogo centralizzato per gestire tutti gli elementi in sospeso nel sistema Synthesis. Contiene tre sotto-schede: **Corrispondenze citazioni**, **Concetti** e **Grafo degli argomenti**.

![Hub di Revisione di Synthesis](/img/docs/synthesis/review.png)

## Revisione delle corrispondenze di citazione

Quando il sistema abbina automaticamente i riferimenti agli elementi Zotero, le corrispondenze che non possono essere determinate con certezza vengono sottoposte come proposte alla coda di revisione.

### Stato delle proposte di corrispondenza

| Stato | Descrizione |
|-------|-------------|
| **In sospeso** | Candidato di corrispondenza generato dal sistema in attesa di conferma o rifiuto da parte dell'utente |
| **Accettato** | L'utente ha confermato l'associazione; il riferimento è ora collegato a un elemento Zotero |
| **Rifiutato** | L'utente ha rifiutato l'associazione |
| **Riaperto** | Una proposta precedentemente elaborata, riaperta per revisione |

### Azioni disponibili

- **Accetta**: Confermare la relazione di associazione citazione-elemento
- **Rifiuta**: Declinare la proposta di corrispondenza
- **Operazioni in batch**: Selezionare più proposte per accettarle o rifiutarle in blocco

### Confidenza della corrispondenza

Vedere [Indice e Grafo delle Citazioni](index-and-citation) per le descrizioni dei livelli di confidenza. Le corrispondenze deterministiche e ad alta confidenza vengono generalmente elaborate automaticamente; le corrispondenze a confidenza media e inferiore entrano nella coda di revisione.

### Filtro e ordinamento

È possibile filtrare l'elenco delle proposte per:

- Stato della corrispondenza (in sospeso / accettata / rifiutata)
- Strategia di corrispondenza (DOI / titolo / autore, ecc.)
- Livello di confidenza
- Ordinamento per data o rilevanza

## Revisione dei concetti

L'espansione automatica della base di conoscenza dei concetti può produrre suggerimenti di corrispondenza di concetti con bassa confidenza, richiedendo la revisione e la conferma da parte dell'utente.

### Obiettivi della revisione

- **Suggerimenti di nuovi concetti**: Nuovi candidati concetti estratti automaticamente dalla letteratura
- **Conferma del senso**: Conferma quando un nuovo significato (senso) viene aggiunto a un concetto esistente
- **Suggerimenti di alias**: Conferma quando viene rilevato un nome alternativo per lo stesso concetto

### Come operare

Ogni suggerimento mostra il nome del concetto, la fonte di estrazione, il livello di confidenza e le evidenze a supporto. È possibile:

- **Accetta**: Confermare il suggerimento e scriverlo nella base di conoscenza dei concetti
- **Rifiuta**: Scartare il suggerimento
- **Visualizza contesto**: Vedere dove il concetto appare nella letteratura

## Revisione del Grafo degli Argomenti

Quando il sistema rileva potenziali relazioni tra argomenti, genera proposte di relazione per la revisione.

### Tipi di relazione

| Relazione | Descrizione |
|-----------|-------------|
| `broader_than` | A è un argomento più ampio di B |
| `related_to` | Due argomenti sono correlati |
| `overlaps_with` | Due argomenti hanno sovrapposizione di contenuti |
| `contrasts_with` | Due argomenti sono in contrasto tra loro |

### Contenuto della proposta

Ogni proposta mostra:

- **Nomi e descrizioni dell'argomento sorgente e di destinazione**
- **Tipo di relazione suggerito**
- **Confidenza** (basata sull'analisi semantica dei contenuti degli argomenti)
- **Evidenze a supporto** (articoli coperti congiuntamente, ecc.)

### Come operare

- **Accetta**: Confermare la relazione e scriverla nel Grafo degli Argomenti
- **Rifiuta**: Scartare il suggerimento di relazione
- **Riapri**: Riaprire una proposta precedentemente elaborata per la revisione

## Prossimi passi

- [Base di Conoscenza dei Concetti](concepts) — Gestire concetti, sensi, alias
- [Argomenti](topic-synthesis) — Gestire le sintesi degli argomenti
