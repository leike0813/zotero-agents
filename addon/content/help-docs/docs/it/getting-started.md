# Primi Passi

## 1. Installa i Pacchetti di Workflow Ufficiali

Il plugin stesso non contiene logica di business. Dopo aver installato il plugin, devi prima installare i pacchetti di workflow ufficiali:

1. Fai clic destro su qualsiasi elemento Zotero → **Zotero Agents** → **📦 Installa Pacchetti di Workflow Ufficiali**
2. Attendi il completamento del download e dell'installazione
3. Dopo l'installazione riuscita, tutti i workflow ufficiali saranno visibili nella Dashboard

Puoi anche installare o aggiornare i pacchetti ufficiali in qualsiasi momento da **Zotero → Impostazioni → Zotero Agents**.

## 2. Configura un Backend

### Backend ACP (Consigliato)

Questo è l'approccio più consigliato — fintanto che hai uno strumento agent compatibile con ACP installato sulla tua macchina, non richiede configurazione aggiuntiva.

1. Apri **Strumenti → [Gestione Backend](#doc/backends%2Fbackend-manager)**
2. Passa alla scheda **ACP**
3. Seleziona il tuo strumento agent dal menu a tendina **Aggiungi da Preimpostazione** (Codex / OpenCode / Claude Code, ecc.)
4. Il preset compila automaticamente il comando; clicca su **Salva** nell'angolo in basso a destra

**Prima volta che usi uno strumento agent?** Fai riferimento alla documentazione ufficiale dello strumento rispettivo per l'installazione:

| Agent | Guida all'Installazione |
|-------|-------------------|
| **OpenCode** | [Documentazione opencode.ai](https://opencode.ai/docs) |
| **Codex** | [Documentazione OpenAI Codex](https://platform.openai.com/docs) |
| **Claude Code** | [Documentazione Anthropic](https://docs.anthropic.com/en/docs/claude-code) |
| **Gemini CLI** | [Documentazione Google](https://github.com/google-gemini/gemini-cli) |
| **Qwen Code** | [Documentazione Alibaba Cloud](https://help.aliyun.com/zh/model-studio/qwen-code) |

→ Vedi [Configurazione Backend ACP](#doc/backends%2Facp) per i dettagli

### Backend MinerU (per il Parsing di PDF)

Il workflow MinerU può convertire PDF in Markdown, rendendolo il passo di pre-elaborazione ideale per tutta la successiva analisi della letteratura. La configurazione è semplice:

1. Visita [mineru.net](https://mineru.net) per registrare un account e ottenere un Token API da **API → Gestione API**
2. Apri **Strumenti → [Gestione Backend](#doc/backends%2Fbackend-manager)**
3. Passa alla scheda **Generic HTTP**, clicca su **Aggiungi Generic HTTP**
4. Compila: Nome Visualizzato `MinerU Official` · URL Base `https://mineru.net` · Autenticazione `bearer` · Token Auth: incolla il tuo Token API · Timeout `600000`
5. Clicca su **Salva** nell'angolo in basso a destra

→ Vedi [Guida all'Uso di MinerU](#doc/workflows%2Fmineru) per i dettagli

### Alternativa: Skill-Runner Distribuito con Docker

Se hai bisogno di esecuzione persistente in background o condivisione in LAN, puoi [distribuire Skill-Runner con Docker](#doc/backends%2Fskill-runner#recommended-docker-persistent-deployment). Dopo la distribuzione, aggiungi un'istanza backend nella scheda SkillRunner.

> Per istruzioni operative dettagliate, vedi [Gestione Backend](#doc/backends%2Fbackend-manager).

## 3. Workflow Completo

Di seguito è riportato un workflow completo end-to-end. Si consiglia di provare ogni passo in ordine. Per prima cosa, seleziona un articolo con un allegato PDF dalla tua biblioteca.

### Passo 1: PDF → Markdown (MinerU)

Fai clic destro su questo articolo (o direttamente sul suo allegato PDF) e seleziona **Zotero Agents → MinerU**. Dopo una breve attesa, verrà generato un file `.md` del contenuto dell'articolo nella stessa directory del PDF.

### Passo 2: Prova il Lettore Markdown Integrato

Trova il nuovo file `.md` generato nell'elenco degli allegati di Zotero e **doppio clic per aprirlo nel lettore integrato** — con navigazione della struttura, ricerca, rendering di formule matematiche ed evidenziazione della sintassi del codice. Se preferisci non utilizzare il lettore integrato, puoi disabilitarlo nelle Preferenze e ripristinare l'apritore predefinito di sistema.

→ Vedi [Lettore Markdown Integrato](#doc/markdown-reader) per i dettagli

### Passo 3: Esegui l'Analisi della Letteratura

Fai clic destro su questo articolo (o direttamente sull'allegato `.md`) e seleziona **Zotero Agents → Analisi Letteratura**. L'agent genererà automaticamente tre artefatti; al completamento, appariranno tre allegati di nota sotto l'elemento:

| Nota | Contenuto |
|------|---------|
| **Riassunto** | Riassunto dell'articolo — background di ricerca, metodi, risultati e conclusioni |
| **Riferimenti** | Riferimenti strutturati — un elenco di citazioni tabellare |
| **Analisi delle Citazioni** | Rapporto di analisi delle citazioni — contesto delle citazioni e classificazione dell'intento di citazione |

→ Vedi [Analisi della Letteratura](#doc/workflows%2Fliterature-analysis) per i dettagli

### Passo 4: Explainer Interattivo della Letteratura

Se hai domande su questo articolo, fai clic destro e seleziona **Zotero Agents → Explainer Letteratura**. La barra laterale aprirà automaticamente il pannello di chat, dove puoi conversare liberamente con l'agent sul contenuto dell'articolo. Le risposte dell'agent passano attraverso un gateway di verifica, quindi non devi preoccuparti della fabbricazione. Dopo la conversazione, il record di Q&A verrà generato come note di studio.

→ Vedi [Explainer Letteratura](#doc/workflows%2Fliterature-explainer) per i dettagli

### Passo 5: Lettura Approfondita

Quando hai bisogno di leggere in modo sistematico e approfondito un articolo importante, fai clic destro e seleziona **Zotero Agents → Lettura Approfondita**. L'agent produrrà un documento HTML standalone curato — inclusa analisi delle sezioni, concetti chiave, riferimenti e traduzioni bilingue. Arricchito con le informazioni della tua biblioteca (se disponibili), questo documento porterà anche il contesto di ricerca più ampio, i concetti correlati e le domande chiave.

→ Vedi [Lettura Approfondita](#doc/workflows%2Fliterature-deep-reading) per i dettagli

### Passo 6: Sintesi Tematica — Dai Singoli Articoli alla Visione d'Insieme

Una volta che la tua biblioteca ha raggiunto una certa dimensione e gli articoli pertinenti hanno subito l'analisi della letteratura e la normalizzazione dei tag, puoi creare una Sintesi Tematica.

Esegui **Crea Sintesi Tematica** dalla Dashboard, inserisci una descrizione della tua direzione di ricerca e l'agent identificherà automaticamente gli articoli pertinenti nella tua biblioteca e genererà un rapporto di sintesi estremamente rigoroso, preciso e completo. Questo rapporto è scritto interamente sulla base del contenuto della tua biblioteca, molto più preciso e affidabile delle risposte AI generiche.

→ Vedi [Sintesi Tematica](#doc/workflows%2Ftopic-synthesis) per i dettagli

## Prossimi Passi

- **Elaborazione Batch**: Esegui [Analisi della Letteratura](#doc/workflows%2Fliterature-analysis) sugli articoli nella tua biblioteca in blocco per costruire le fondamenta per la Sintesi
- **Sistema di Tag**: Usa [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) per creare un vocabolario controllato e standardizzare i tuoi metadati
- **Esplorazione del Grafo**: Visualizza la tua rete di citazioni nel [Synthesis Workbench](#doc/synthesis%2Findex)
- **Sviluppo Personalizzato**: Fai riferimento a [Workflow Personalizzati](#doc/workflows%2Fcustom%2Findex) per creare i tuoi workflow
- **Segnala Problemi**: Segnala problemi su [GitHub](https://github.com/leike0813/zotero-agents/issues) o [Gitee](https://gitee.com/leike0813/zotero-agents/issues)
