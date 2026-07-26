# Tag Auditor

## Scopo

Scansionare tutti gli elementi regolari di primo livello nella libreria Zotero rispetto al vocabolario di tag controllato e segnalare la conformità dei tag per elemento. I risultati vengono scritti nel pannello di audit dei tag di Synthesis Workbench per la revisione e la successiva regolazione.

## Input

Nessun parametro e nessuna selezione di elementi Zotero richiesta. Il workflow opera sull'intera libreria.

## Comportamento

1. Caricare il vocabolario di tag controllato da Synthesis tramite `exportTagVocabularyForRegulator`.
2. Scorri pagina per pagina tutti gli elementi regolari di primo livello nella libreria (escludendo elementi secondari, note, allegati ed elementi eliminati).
3. Per ogni elemento, raccogli i suoi tag correnti e valuta la conformità: un tag è non conforme se non è presente nel vocabolario controllato.
4. Raggruppa le voci di audit per ID libreria e scrivile in Synthesis tramite `replaceTagAuditRecords`.

Il workflow è completamente automatico e non modifica alcun elemento o tag Zotero. È una scansione di sola lettura che produce record di audit per il pannello Tag.

## Output e applicazione

Il pannello di audit dei Tag di Synthesis Workbench mostra record di audit per elemento, ciascuno contenente:

| Campo | Descrizione |
|-------|-------------|
| `itemKey` | La chiave dell'elemento Zotero |
| `compliant` | Se tutti i tag dell'elemento sono nel vocabolario controllato |
| `nonCompliantTags` | Elenco dei tag non trovati nel vocabolario controllato |

Il risultato dell'esecuzione riassume il numero di elementi sottoposti ad audit e di elementi che necessitano di regolazione dei tag per libreria. Eseguire nuovamente il workflow sostituisce i record di audit precedenti (idempotente all'interno dello stesso stato del vocabolario).

Un prerequisito è che un vocabolario di tag controllato deve essere già definito nella pagina Tag di Synthesis Workbench.

## Dipendenze

- Non è richiesta connessione al backend
- **Vocabolario controllato**: Un vocabolario di tag controllato deve essere definito prima; vedere [Gestione tag](#doc/synthesis%2Ftags)

## Workflow correlati

- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Normalizzare i tag in base al vocabolario controllato e inferire nuovi tag
- [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) — Creare interattivamente un vocabolario di tag controllato
