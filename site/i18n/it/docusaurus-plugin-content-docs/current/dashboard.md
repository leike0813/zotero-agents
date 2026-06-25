# Dashboard

## Panoramica

La Dashboard è il pannello di monitoraggio e controllo centrale per Zotero Agents. Qui puoi visualizzare lo stato delle attività, gestire i workflow, sfogliare la cronologia e ispezionare i log di runtime.

## Come Aprire

- **Pulsante Barra degli Strumenti**: Clicca sull'icona Zotero Agents nella barra degli strumenti di Zotero
- **Menu**: **Strumenti → Apri Dashboard**
- **Scheda Zotero**: Aperta tramite il menu, visualizzata come una scheda indipendente di Zotero

![Pulsante Dashboard della Barra degli Strumenti di Zotero Agents](/img/icon_workbench.png)

## Pagine

### Home

La pagina predefinita della Dashboard, che visualizza:

- **Elenco Workflow**: Tutti i workflow disponibili, con pulsanti di esecuzione e impostazioni
- **Area ACP Chat**: Accesso rapido alle conversazioni ACP
- **Esecuzioni Skill ACP**: Stato delle esecuzioni skill per i backend ACP
- **Feedback Skill**: Visualizza le valutazioni e i commenti recenti sui feedback delle esecuzioni skill
- **Riepilogo Attività**: Panoramica delle attività in esecuzione

![Dashboard Home](/img/docs/dashboard_home.png)

### Opzioni Workflow

La pagina di impostazioni dei parametri dei workflow:

- Visualizza e modifica la configurazione di ogni workflow
- Imposta i parametri predefiniti
- Seleziona il backend predefinito

![Pagina Opzioni Workflow della Dashboard](/img/docs/dashboard_workflow-settings.png)

### Backend

La pagina di gestione dei backend:

- Elenco di tutti i backend configurati
- Cronologia delle attività per ogni backend
- Viste dettagliate dei backend (varia per tipo)

Viste dettagliate dei backend:

| Tipo Backend | Visualizzazione |
|-------------|---------|
| Generic HTTP | Tabella attività + log di runtime |
| SkillRunner | Tabella esecuzioni + area di stato + area di conversazione + azioni rispondi/annulla |
| ACP | Vista Esecuzione Skill |

![Elenco Attività Backend ACP della Dashboard](/img/docs/dashboard_acp-backend.png)

![Elenco Attività Backend SkillRunner della Dashboard](/img/docs/dashboard_skillrunner-backend.png)

### Prodotti

Sfogliare e gestire i prodotti dei workflow:

- Visualizza gli artefatti di output delle esecuzioni dei workflow
- Apri le cartelle dei prodotti
- Anteprima e rimozione dei prodotti

![Archivio Prodotti della Dashboard](/img/docs/dashboard_products.png)

## Feedback Skill

Il pannello Feedback Skill visualizza i feedback recenti sulle esecuzioni skill:

| Colonna | Descrizione |
|--------|-------------|
| Workflow | Nome del workflow eseguito |
| Backend | Il backend che ha eseguito l'esecuzione |
| Valutazione | Valutazione dell'utente (1–5) |
| Commento | Commento di feedback |
| Timestamp | Quando il feedback è stato inviato |

Azioni:
- **Filtro**: Filtra per valutazione, workflow o intervallo di tempo
- **Esporta**: Esporta i dati di feedback per l'analisi

![Archivio Feedback Skill della Dashboard](/img/docs/dashboard_skill-feedback.png)

## Stato delle Attività

| Stato | Descrizione |
|--------|-------------|
| `queued` | In attesa di essere eseguito |
| `running` | In esecuzione attualmente |
| `waiting_user` | In attesa dell'input dell'utente |
| `waiting_auth` | In attesa dell'autorizzazione |
| `succeeded` | Esecuzione riuscita |
| `failed` | Esecuzione fallita |
| `canceled` | Annullata |

## Visualizzatore Log di Runtime

La Dashboard include un visualizzatore di log integrato:

- Filtra per backend
- Filtra per workflow
- Filtra per livello di log
- Filtra per intervallo di tempo
- Esportazione diagnostica
- Copia del riepilogo dei problemi

![Visualizzatore Log di Runtime della Dashboard](/img/docs/dashboard_logs.png)

## Pulsante Barra degli Strumenti

Il pulsante icona Zotero Agents nella barra degli strumenti di Zotero supporta:

- Clic sinistro: Apri/commuta la Dashboard
- Visualizza il conteggio delle attività in esecuzione
- Mostra un popup con l'elenco delle attività in esecuzione
