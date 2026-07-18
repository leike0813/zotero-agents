# Zotero Library Agent

## Panoramica

Zotero Library Agent è la superficie di attività limitata e on-demand del [Host Bridge](#doc/backends%2Fhost-bridge). Consente agli agenti IA di operare su una libreria Zotero per richieste finite — ispezionare elementi, recuperare contesto, leggere dati di letteratura e sintesi, eseguire workflow, applicare mutazioni approvate, trasferire file e consegnare prove — senza diventare un servizio di manutenzione della libreria residente.

Il Host Bridge espone tre superfici, ognuna con un ruolo diverso:

| Superficie | Ruolo | Quando usarla |
|------------|-------|---------------|
| **CLI Bundle** (`zotero-bridge`) | Installazione, connessione e contratti di comandi di basso livello | Accesso CLI diretto alle capacità del Host Bridge |
| **Library Agent** | Routing di attività limitate, consegna di prove e risultati verificabili | Richiesta finita che necessita di routing dell'intento e prova di completamento |
| **Librarian Profile** (Hermes) | Indice residente, manutenzione programmata e servizio continuo della libreria | Indicizzazione locale persistente, job cron o monitoraggio continuo |

## Cosa fornisce il Library Agent

- **Routing delle attività**: Indirizza l'intento corrente alla più piccola famiglia di comandi corrispondente senza richiedere una scansione completa della tabella dei comandi.
- **Riferimenti ai journey**: Sette manuali di journey dettagliati coprono categorie di attività specifiche, ciascuno specifica rami, casi limite, requisiti di prova, limiti di approvazione e percorsi di recupero.
- **Consegna di prove**: Pacchetti di prova portabili con validazione di forma deterministica e calcolo del digest degli artefatti.
- **Limiti di autorità**: Impone che il Host Bridge sia l'unico percorso di controllo, impedendo l'accesso diretto allo storage di Zotero o il comportamento di servizio in background.
- **Operazioni limitate**: Ogni attività è completata quando il risultato richiesto e la sua prova sono osservabili — una conferma di invio o una consegna preparata non costituiscono di per sé il completamento.

## Flusso di attività limitato

1. **Confermare la connessione**: Verificare la CLI caricata e il profilo Host Bridge. Eseguire `zotero-bridge surface identity --json` per confrontare con il manifesto fornito e confermare il `releaseSetId` del repository.
2. **Router l'intento**: Leggere il riferimento al routing delle attività per scegliere la più piccola famiglia di comandi che soddisfi la richiesta.
3. **Caricare il journey corrispondente**: Leggere esattamente un manuale di journey che corrisponda alla categoria dell'attività.
4. **Preservare le prove**: Mantenere i fatti Host correnti, gli handle restituiti, gli artefatti locali e lo stato di approvazione come prove distinte.
5. **Eseguire o inviare**: Per i workflow, seguire il riferimento all'esecuzione dei workflow; non inviare mai opzioni di workflow attraverso una modalità di esecuzione che non le accetti.
6. **Costruire e validare**: Costruire il pacchetto di prova finale e validarlo con l'helper fornito.

L'attività è completata solo quando il risultato richiesto e la sua prova sono osservabili.

## Categorie di journey

Il Library Agent include sette manuali di journey, ognuno dei quali copre un dominio di attività specifico:

| Journey | Ambito |
|---------|--------|
| **Contesto corrente e lettura della libreria** | Selezione deittica, ricerca versus elenco, dettaglio dell'elemento, note e prove degli allegati |
| **Note, allegati e preparazione** | Frammenti di note e payload, annotazioni, preparazione PDF/Markdown/analisi e allegati generati |
| **Contesto di ricerca di sintesi** | Argomenti, viste del grafo di citazioni, indici, risolutori, artefatti, schemi e code di attenzione |
| **Workflow di proprietà del Host** | Descrizione del workflow, requisiti, validazione, invio, monitoraggio, permessi, interazione e prove Product |
| **Consegna di proprietà dell'Agent** | Esecuzione del bundle agent-run, validazione dei risultati, apply-back e recupero delle ricevute |
| **Writeback concreto** | Mutazioni visualizzate in anteprima, comandi di scrittura semantica, approvazione e verifica in tempo reale |
| **Product e file** | Percorsi locali, file registrati, Product della Dashboard, download e consegna degli allegati |

Ogni journey rimanda alle schede dei comandi CLI `zotero-bridge` fornite quando sono necessari campi esatti di payload o risultato.

## Limiti di autorità e sicurezza

Il Library Agent impone limiti rigorosi per prevenire mutazioni involontarie di Zotero:

- **Solo Host Bridge**: Trattare il Host Bridge come l'unico percorso di controllo di Zotero e Zotero Agents. Non leggere né scrivere direttamente database di Zotero, directory di storage, interni del plugin o stato del browser.
- **Lavoro limitato**: Non trasformare il Library Agent in un servizio di libreria in background. Eseguire lavoro limitato per la richiesta corrente e restituire il controllo quando il risultato o la decisione utente richiesta è disponibile.
- **Nessuna scrittura non presidiata**: Non eseguire scritture programmate o non presenziate. Una richiesta utente corrente e l'approvazione del Host Bridge regolano ogni mutazione o apply-back.
- **Nessuna supposizione obsoleta**: Non trattare voci di cache, riferimenti generati o pacchetti di prova come verità live di Zotero; confermare i fatti correnti tramite Host Bridge quando la freschezza è importante.

## Consegna di prove

Il Library Agent produce pacchetti di prova portabili per la continuità delle attività. Un pacchetto di prova contiene:

- **Stato**: `completed`, `canceled` o `failed`
- **Sommario**: Risultati concisi locali all'attività
- **File di prova** (opzionale): Un pacchetto di prova costruito e validato dall'helper, consumabile da un altro agente o attività
- **Diagnostica** (opzionale): Informazioni di diagnostica strutturate

Costruire e validare un pacchetto di prova con l'helper fornito:

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

L'helper valida la forma deterministica, calcola i digest degli artefatti e ispeziona i bundle di workflow. L'agente rimane responsabile della scelta dei comandi, dell'interpretazione, della sufficienza delle prove e dell'autorizzazione di un'azione esaminata.

## Gestione degli errori

- Preservare i codici di errore strutturati e i campi handle quando si segnala un errore.
- Riscoprire un comando o un oggetto solo quando l'errore indica sintassi o identità obsolete; non indovinare handle alternativi.
- Quando un'operazione restituisce un handle di file o un percorso di output, verificare il file dichiarato prima di usarlo come input di prova o apply-back.
- Quando mancano autorità, input o intento utente richiesti, fermarsi al limite e indicare la decisione mancante esatta.

## Integrazione

Il Library Agent dipende dal Host Bridge per tutto l'accesso a Zotero. Prima di usare il Library Agent:

1. Assicurarsi che il Host Bridge sia in esecuzione (Zotero → Impostazioni → Zotero Agents → Host Bridge → **Avvia / Mostra endpoint**).
2. Installare la CLI `zotero-bridge` (usare il pulsante **Installa CLI** nel pannello delle preferenze del Host Bridge).
3. Configurare il profilo di connessione con l'URL dell'endpoint e il token Bearer. Vedere [Configurazione del Host Bridge](#doc/backends%2Fhost-bridge) per la configurazione dettagliata.

## Prossimi passi

- [Host Bridge](#doc/backends%2Fhost-bridge) — riferimento completo della CLI `zotero-bridge` e delle capacità del Host Bridge
- [Hermes Profiles](#doc/backends%2Fhermes-profiles) — servizio di libreria residente con indicizzazione locale e manutenzione programmata
- [Workflows](#doc/workflows%2Findex) — panoramica di tutti i workflow integrati e personalizzati
- [MCP Server](#doc/backends%2Fmcp-server) — interfaccia di protocollo alternativa per client compatibili MCP
