# Debug Probe

## Scopo

Il pacchetto debug probe è utilizzato principalmente per lo sviluppo del sistema di Workflow, i test e la diagnosi dei problemi. Contiene più Workflow di sola visibilità in debug che coprono il contratto di `applyResult`, l'Orchestrazione di sequenze, l'esecuzione interattiva e gli scenari di connettività di Host Bridge.

Tutti i Workflow di debug sono contrassegnati con `debug_only: true` e sono visibili solo in modalità debug.

## Workflow di debug inclusi

### Debug del contratto di Apply

Verifica le varie combinazioni di invocazione degli hook `buildRequest` / `applyResult`:

| Workflow | Descrizione |
|----------|-------------|
| Debug: Apply Single Result | Singolo job + metodo di recupero del risultato |
| Debug: Apply Single Bundle | Singolo job + metodo di recupero del bundle |
| Debug: Apply Sequence Result | Sequenza a più passaggi + recupero del risultato |
| Debug: Apply Sequence Bundle | Sequenza a più passaggi + recupero del bundle |
| Debug: Apply Bundle Then Result | Bundle seguito da invocazione combinata del risultato |
| Debug: Apply Result Then Bundle | Risultato seguito da invocazione combinata del bundle |

### Debug delle sequenze

Verifica il meccanismo di coordinamento a più passaggi dell'Orchestrazione di sequenze:

| Workflow | Descrizione |
|----------|-------------|
| Debug Sequence Linear Probe | Verifica l'esecuzione seriale e il passaggio del testimone predefinito (pass_through) |
| Debug Sequence Workspace Reuse Probe | Verifica il riutilizzo dello spazio di lavoro tra i passaggi (workspace: reuse-workflow) |
| Debug Sequence Context Isolation Probe | Verifica il filtraggio esplicito del testimone e lo spazio di lavoro isolato (workspace: new + mappatura selettiva del testimone) |

### Debug interattivo

Verifica i Workflow interattivi che richiedono risposte dell'utente:

| Workflow | Descrizione |
|----------|-------------|
| Debug: Interactive Choice Probe | Verifica il flusso di scelta interattiva |
| Debug: Interactive Then Result | Esecuzione interattiva seguita dal recupero del risultato |

### Debug di Host Bridge

| Workflow | Descrizione |
|----------|-------------|
| Debug: Host Bridge ConnectivityProbe | Verifica la connettività e le autorizzazioni di Host Bridge |

### Generale

| Workflow | Descrizione |
|----------|-------------|
| Workflow Debug Probe | Verifica lo stato pre-esecuzione del Workflow e apre il pannello diagnostico |

## Quando utilizzarli

- Verificare il comportamento dopo aver sviluppato o modificato il sistema di Workflow
- Risolvere problemi di esecuzione anomala dei Workflow
- Verificare il meccanismo di passaggio del testimone dell'Orchestrazione di sequenze
- Verificare se il contratto dell'hook `applyResult` soddisfa le aspettative
- Verificare la connettività e la configurazione delle autorizzazioni di Host Bridge

## Dipendenze

- **Backend**: Servizio Skill-Runner
- Tutti sono contrassegnati come `debug_only`, appaiono solo in modalità debug

## Passi successivi

- [Debug e test](custom/debugging) — Metodi di debug per i Workflow personalizzati
- [Sistema di hook](custom/hooks) — Firme e utilizzo delle API degli hook
