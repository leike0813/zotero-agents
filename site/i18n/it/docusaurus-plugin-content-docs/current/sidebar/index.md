# Panoramica della barra laterale

## Cos'è la barra laterale?

La barra laterale è un pratico pannello operativo fornito da Zotero Agents, posizionato sul lato destro della finestra principale di Zotero. Consente di interagire con i backend, visualizzare lo stato delle esecuzioni e gestire l'esecuzione degli skill senza abbandonare il contesto di lavoro corrente.

## Come aprire

- **Pulsante nella barra degli strumenti**: Fare clic sul pulsante di attivazione della barra laterale nella barra degli strumenti di Zotero
- **Menu**: **Strumenti → Apri barra laterale**
- **Azione dalla Dashboard**: Fare clic su "Apri/Chiudi barra laterale" nella Dashboard

![Pulsante della barra laterale nella barra degli strumenti](/img/icon_sidebar.png)

![Stato dell'indicatore di attesa risposta della barra laterale](/img/icon_sidebar_glow.png)

## Note sull'architettura

La barra laterale utilizza un'**architettura a iframe**: tre schede caricano ciascuna una pagina HTML indipendente come iframe figlio, comunicando con il processo principale del plugin tramite postMessage. Questo design assicura che le schede non interferiscano tra loro, con ogni pannello che dispone di un contesto di rendering indipendente.

In modalità Workspace, le tre schede sono integrate in un contenitore unificato; in modalità legacy, ogni pannello può anche essere incorporato direttamente nel riquadro della libreria e nel riquadro del lettore di Zotero.

## Tre schede

| Scheda | Funzione | Casi d'uso |
|--------|----------|------------|
| **ACP Chat** | Conversare con il backend ACP utilizzando l'elemento corrente come contesto | Porre domande durante la lettura della letteratura, assistenza nella scrittura |
| **ACP Skills** | Monitorare e gestire le esecuzioni degli skill tramite il backend ACP | Visualizzare il progresso delle esecuzioni, esaminare i risultati, gestire le richieste di autorizzazione |
| **SkillRunner** | Visualizzare e interagire con le esecuzioni del backend Skill-Runner | Gestire le esecuzioni interattive, gestire l'autenticazione |

## Guida all'interfaccia

### Cambio scheda

La barra delle schede nella parte superiore della barra laterale consente di passare da un pannello all'altro. Lo stato della scheda precedente viene preservato durante il cambio.

### Regolazione della larghezza

La larghezza della barra laterale può essere regolata liberamente trascinando il bordo sinistro, per adattarsi alle diverse esigenze di visualizzazione dei contenuti.

### Componenti comuni

Tutte le schede condividono i seguenti componenti UI comuni:

- **Banner**: Barra informativa superiore che mostra le informazioni del progetto attualmente selezionato e i pulsanti azione
- **Transcript View**: Area principale per i log delle conversazioni o delle esecuzioni, con supporto per le modalità di visualizzazione Plain e Bubble
- **Reply Area**: Area di input inferiore per inviare messaggi o risposte
- **Drawer Panels**: Pannelli dettagli espandibili sui lati sinistro e destro
- **Prompt Component**: Messaggi mostrati quando è richiesta l'interazione dell'utente
- **Plan Component**: Progresso visivo per piani multi-step

## Collegamenti rapidi a ciascuna scheda

- [Utilizzo di ACP Chat](./acp-chat) — Interazione conversazionale con il backend
- [ACP Skills](./acp-skills) — Gestire le esecuzioni degli skill ACP
- [Scheda SkillRunner](./skillrunner-tab) — Gestire le esecuzioni di Skill-Runner

## Pagine correlate

- [Panoramica della Dashboard](../dashboard) — Monitoraggio centrale e gestione delle attività
