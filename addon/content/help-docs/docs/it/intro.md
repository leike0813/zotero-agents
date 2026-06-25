# Zotero Agents

Un plugin Zotero per eseguire skill degli agent.

<figure class="zs-doc-figure zs-doc-figure--poster"><img src="chrome://zotero-skills/content/help-docs/assets/img/poster.webp" alt="Poster del banco di lavoro di ricerca Zotero Agents" title="Poster del banco di lavoro di ricerca Zotero Agents" loading="lazy" /><figcaption>Poster del banco di lavoro di ricerca Zotero Agents</figcaption></figure>

## Cos'è Zotero Agents?

Zotero Agents trasforma Zotero in un banco di lavoro personale per la ricerca nell'era degli agent intelligenti. Collega la tua biblioteca di letteratura, backend per agent, workflow, grafi della conoscenza e strumenti esterni, trasformando l'analisi della letteratura da un Q&A puntuale a un processo di ricerca sostenibile, verificabile ed estendibile.

Il primo livello di funzionalità è rappresentato dai **workflow pluggabili**. I ricercatori possono scomporre compiti complessi sulla letteratura in processi riutilizzabili: parsing di articoli, lettura approfondita, analisi delle citazioni, normalizzazione dei tag, ricerca bibliografica, sintesi tematica, generazione di materiale per review e altro ancora. I workflow possono connettersi a diversi backend di agent o servizi, sfruttando la comprensione del contesto esteso, la chiamata di strumenti e il ragionamento multi-step degli agent per automatizzare flussi di lavoro di gestione e analisi della letteratura che altrimenti richiederebbero operazioni manuali ripetitive, e per espandersi al evolversi delle esigenze di ricerca.

Il secondo livello è la **Barra Laterale dell'Assistente**. Fornisce un'esperienza di interazione conversazionale in stile agent di codice, supportando la connessione a vari backend di agent tramite il protocollo ACP, nonché l'esecuzione di workflow specifici tramite il backend Skill-Runner. Puoi chiedere agli agent di rispondere a domande, analizzare articoli, cercare lavori correlati, aggiungere riferimenti alla tua biblioteca in base all'elemento corrente, alla letteratura selezionata o all'intera biblioteca, e continuare conversazioni, conferme, correzioni e monitoraggio dell'avanzamento durante attività di lunga durata.

Il terzo livello è il **Synthesis Workbench**. È rivolto alla costruzione di conoscenza a livello di biblioteca e a lungo termine, consolidando riassunti, riferimenti, semantica delle citazioni, tag, concetti e relazioni tematiche generati dalle analisi dei singoli articoli in una piattaforma di conoscenza unificata. I ricercatori possono gestire qui le reti di riferimenti, verificare le corrispondenze delle citazioni, esplorare i grafi delle citazioni, organizzare la letteratura attorno a temi e utilizzare la Sintesi Tematica per delineare la letteratura fondamentale, il lavoro all'avanguardia, le argomentazioni chiave, i disaccordi metodologici, le lacune di copertura e le direzioni future di un'area di ricerca. Il suo obiettivo è trasformare una lettura estesa in materiale strutturato adatto a review, proposte di tesi, introduzioni di articoli e progettazione di roadmap di ricerca.

Il quarto livello è l'**Host Bridge**. Tramite la CLI `zotero-bridge` e il servizio MCP, gli agent esterni possono interagire direttamente con la biblioteca Zotero: leggere il contesto della letteratura, cercare elementi, aggiungere nuovi riferimenti, invocare attività di analisi e riscrivere risultati strutturati. Con workflow di agent come OpenClaw e Hermes, puoi delegare la ricerca, il filtraggio, l'analisi, la sintesi e la stesura di review, consentendo alle attività di ricerca di lunga durata di progredire continuamente in background.

Il valore fondamentale di Zotero Agents è rendere la biblioteca Zotero un ambiente di ricerca in cui gli agent possono lavorare concretamente. Ogni fase di lettura, analisi, revisione e preparazione alla scrittura può essere accumulata come conoscenza per la fase successiva della ricerca.

> **Versioni Zotero Supportate**: Questo plugin supporta Zotero 7 e Zotero 9. Lo sviluppo primario e i test sono effettuati su Zotero 9. Zotero 8 è teoricamente pienamente supportato (il framework del plugin è invariato tra 8/9). Anche Zotero 7 dovrebbe funzionare in teoria ma non è stato testato approfonditamente; la manutenzione futura si concentrerà su Zotero 9. Gli utenti di Zotero 7 che incontrano problemi dovrebbero segnalarli su [Issues](https://github.com/leike0813/zotero-agents/issues).

:::tip Suggerimento
Il plugin viene distribuito **senza logica di business integrata**. Tutti i workflow sono forniti tramite **pacchetti di workflow ufficiali** separati che gli utenti devono scaricare e installare dopo aver installato il plugin. Vedi la [Guida all'Installazione](#doc/installation) per i dettagli.
:::

## Funzionalità

- **⚙️ Gestione Backend** — Supporta i tipi di backend ACP, Skill-Runner e Generic HTTP
- **🔧 Sistema di Workflow** — Definisci pipeline di elaborazione automatizzata multi-step
- **📊 Dashboard** — Monitora lo stato delle attività, sfoglia la cronologia e ispeziona i log
- **🖥️ Pannello Barra Laterale** — Interagisci con i backend senza lasciare il contesto di lavoro corrente
- **📖 Lettore Markdown Integrato** — Doppio clic sugli allegati `.md` per aprirli in Zotero, con struttura, ricerca, rendering matematico ed evidenziazione del codice
- **💬 ACP Chat** — Conversazione AI con la letteratura come contesto
- **🔬 Synthesis Workbench** — Piattaforma di analisi approfondita della letteratura
- **🏷️ Gestione Tag** — Vocabolario controllato dei tag e tagging automatico
- **📈 Grafo delle Citazioni** — Visualizzazione e analisi delle relazioni di citazione
- **📝 Sintesi Tematica** — Analisi tematica automatizzata e generazione di report

## Link Rapidi

- [Guida all'Installazione](#doc/installation) — Installa il plugin e le sue dipendenze
- [Primi Passi](#doc/getting-started) — Configura il tuo primo backend ed esegui una skill
- [Configurazione Backend](#doc/backends%2Findex) — Scopri i tre tipi di backend supportati

## Documentazione

| Sezione | Descrizione |
|---------|-------------|
| [Guida all'Installazione](#doc/installation) | Installazione del plugin, installazione dei pacchetti di workflow ufficiali, distribuzione del backend Skill-Runner |
| [Lettore Markdown Integrato](#doc/markdown-reader) | Doppio clic sui file `.md` per aprirli in Zotero, con struttura, ricerca e rendering matematico |
| [Configurazione Backend](#doc/backends%2Findex) | Guida alla configurazione per i backend ACP, Skill-Runner e Generic HTTP |
| [Workflow](#doc/workflows%2Findex) | Introduzione ai workflow e guida all'invocazione |
| [Dashboard](#doc/dashboard) | Guida all'uso del pannello di monitoraggio centrale |
| [Barra Laterale & ACP Chat](#doc/sidebar%2Findex) | Pannello della barra laterale e funzionalità di conversazione |
| [Synthesis Workbench](#doc/synthesis%2Findex) | Guida all'uso del banco di lavoro di sintesi |
| [Preferenze](#doc/preferences) | Riferimento alle impostazioni del plugin |

## Risorse del Progetto

- [Repository GitHub](https://github.com/leike0813/zotero-agents)
- [Tracker dei Problemi](https://github.com/leike0813/zotero-agents/issues)
- [Mirror Gitee](https://gitee.com/leike0813/zotero-agents)
