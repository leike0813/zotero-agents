# Dashboard

## Panoramica

La Dashboard è il pannello di monitoraggio e controllo centrale per Zotero Agents. Qui puoi visualizzare lo stato delle attività, gestire i workflow, sfogliare la cronologia e ispezionare i log di runtime.

## Come Aprire

- **Pulsante Barra degli Strumenti**: Clicca sull'icona Zotero Agents nella barra degli strumenti di Zotero
- **Menu**: **Strumenti → Apri Dashboard**
- **Scheda Zotero**: Aperta tramite il menu, visualizzata come una scheda indipendente di Zotero

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_workbench.webp" alt="Pulsante Dashboard della Barra degli Strumenti di Zotero Agents" title="Pulsante Dashboard della Barra degli Strumenti di Zotero Agents" loading="lazy" /><figcaption>Pulsante Dashboard della Barra degli Strumenti di Zotero Agents</figcaption></figure>

## Pagine

### Home

La pagina predefinita della Dashboard, che visualizza:

- **Elenco Workflow**: Tutti i workflow disponibili, con pulsanti di esecuzione e impostazioni
- **Area ACP Chat**: Accesso rapido alle conversazioni ACP
- **Esecuzioni Skill ACP**: Stato delle esecuzioni skill per i backend ACP
- **Feedback Skill**: Visualizza le valutazioni e i commenti recenti sui feedback delle esecuzioni skill
- **Riepilogo Attività**: Panoramica delle attività in esecuzione

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_home.webp" alt="Dashboard Home" title="Dashboard Home" loading="lazy" /><figcaption>Dashboard Home</figcaption></figure>

### Opzioni Workflow

La pagina di impostazioni dei parametri dei workflow:

- Visualizza e modifica la configurazione di ogni workflow
- Imposta i parametri predefiniti
- Seleziona il backend predefinito

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_workflow-settings.webp" alt="Pagina Opzioni Workflow della Dashboard" title="Pagina Opzioni Workflow della Dashboard" loading="lazy" /><figcaption>Pagina Opzioni Workflow della Dashboard</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_acp-backend.webp" alt="Elenco Attività Backend ACP della Dashboard" title="Elenco Attività Backend ACP della Dashboard" loading="lazy" /><figcaption>Elenco Attività Backend ACP della Dashboard</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skillrunner-backend.webp" alt="Elenco Attività Backend SkillRunner della Dashboard" title="Elenco Attività Backend SkillRunner della Dashboard" loading="lazy" /><figcaption>Elenco Attività Backend SkillRunner della Dashboard</figcaption></figure>

### Prodotti

Sfogliare e gestire i prodotti dei workflow:

- Visualizza gli artefatti di output delle esecuzioni dei workflow
- Apri le cartelle dei prodotti
- Anteprima e rimozione dei prodotti

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_products.webp" alt="Archivio Prodotti della Dashboard" title="Archivio Prodotti della Dashboard" loading="lazy" /><figcaption>Archivio Prodotti della Dashboard</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skill-feedback.webp" alt="Archivio Feedback Skill della Dashboard" title="Archivio Feedback Skill della Dashboard" loading="lazy" /><figcaption>Archivio Feedback Skill della Dashboard</figcaption></figure>

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_logs.webp" alt="Visualizzatore Log di Runtime della Dashboard" title="Visualizzatore Log di Runtime della Dashboard" loading="lazy" /><figcaption>Visualizzatore Log di Runtime della Dashboard</figcaption></figure>

## Pulsante Barra degli Strumenti

Il pulsante icona Zotero Agents nella barra degli strumenti di Zotero supporta:

- Clic sinistro: Apri/commuta la Dashboard
- Visualizza il conteggio delle attività in esecuzione
- Mostra un popup con l'elenco delle attività in esecuzione
