# Panoramica sui Workflow

## Cos'è un Workflow?

I Workflow sono la funzionalità principale di Zotero Agents e consentono di combinare più passaggi di skill in pipeline di elaborazione automatizzate. Un Workflow definisce un'attività completa: dall' Ricezione dell'input, all'elaborazione dei dati, fino alla produzione dell'output.

## Struttura di un Workflow

```
workflow.json (file manifesto)
├── manifest: dichiara metadati, versione, nome
├── parameters: definisce i parametri configurabili
├── inputs: definisce i tipi di input (allegati, elementi, note, ecc.)
├── hooks: script hook JavaScript (filtrano gli input, costruiscono le richieste, applicano i risultati)
└── provider: specifica il tipo di backend richiesto
```

### Tipi di unità di input

| Tipo | Descrizione |
|------|-------------|
| `attachment` | File allegati di un elemento |
| `parent` | Elemento padre dell'elemento selezionato |
| `note` | Elemento nota |
| `workflow` | Ambito batch |

### Sistema di hook

I Workflow possono eseguire script JavaScript personalizzati in varie fasi dell'esecuzione:

- **filterInputs**: Filtrare e selezionare gli input
- **buildRequest**: Costruire il contenuto della richiesta inviata al backend
- **normalizeSettings**: Normalizzare le impostazioni dell'utente
- **applyResult**: Applicare i risultati restituiti dal backend a Zotero

## Tre backend di esecuzione

I Workflow possono essere eseguiti tramite tre tipi di backend:

| Backend | Tipo di richiesta | Caso d'uso |
|---------|------------------|------------|
| **Skill-Runner** | `skill.run.v1` | Esecuzione generica di skill, supporta la modalità interattiva |
| **ACP** | `acp.skill.run.v1` | Esecuzione di skill tramite backend ACP |
| **Generic HTTP** | `generic-http.request.v1` | Chiamate API HTTP |

## Pacchetto ufficiale dei Workflow

I Workflow ufficiali sono pubblicati e installati come **pacchetti standalone**, disaccoppiati dal plugin stesso. Metodi di installazione:

- Menu contestuale → **Zotero Agents** → **📦 Installa pacchetto ufficiale dei Workflow**
- Fai clic su **Installa pacchetto ufficiale dei Workflow** nelle Preferenze

I pacchetti ufficiali supportano tre canali di aggiornamento: stabile / beta / dev. Il plugin verifica automaticamente la presenza di aggiornamenti all'avvio.

## Workflow ufficiali

Il plugin include una serie di workflow ufficiali, raggruppati per funzione:

### 📚 Strumenti per l'analisi della letteratura

| Workflow | Scopo | Input | Backend | Docs |
|----------|-------|-------|---------|------|
| **Analisi della letteratura** ⭐ | Genera riassunto, riferimenti, analisi delle citazioni da PDF/MD. Può innescare a cascata la regolazione dei tag | Allegato | Skill-Runner | [Dettagli](#doc/workflows%2Fliterature-analysis) |
| **Spiegatore interattivo della letteratura** | Dialogo multi-turno con l'AI per una comprensione approfondita della letteratura, con risposte verificate per prevenire allucinazioni | Allegato | Skill-Runner | [Dettagli](#doc/workflows%2Fliterature-explainer) |
| **Lettura approfondita** | Genera una vista HTML strutturata di lettura approfondita con supporto per la traduzione | Allegato | ACP | [Dettagli](#doc/workflows%2Fliterature-deep-reading) |
| **Ricerca e acquisizione della letteratura** | Lascia che l'Agent cerchi letteratura accademica e la acquisisca direttamente in Zotero | workflow | ACP | [Dettagli](#doc/workflows%2Fliterature-search-ingest) |
| **Bootstrapper dei tag** | Crea in modo interattivo un vocabolario controllato di tag per un dominio di ricerca | workflow | Skill-Runner | [Dettagli](#doc/workflows%2Ftag-bootstrapper) |
| **Regolatore dei tag** | Normalizza i tag in base a un vocabolario controllato e inferisce nuovi tag | Elemento padre | Skill-Runner | [Dettagli](#doc/workflows%2Ftag-regulator) |
| **Esporta/Importa note** | Esporta o importa note di analisi con supporto per la modifica e la reimportazione | Elemento padre | Nessun backend richiesto | [Dettagli](#doc/workflows%2Fexport-import-notes) |

### 🛠️ Utilità

| Workflow | Scopo | Input | Backend | Docs |
|----------|-------|-------|---------|------|
| **Analisi PDF MinerU** | Chiama il servizio MinerU per analizzare il PDF in Markdown | Allegato | Generic HTTP | [Dettagli](#doc/workflows%2Fmineru) |
| **Sintesi dell'argomento** | Pipeline in tre passaggi per creare analisi e rapporti di sintesi dell'argomento | workflow | ACP | [Dettagli](#doc/workflows%2Ftopic-synthesis) |
| **Strutturazione della letteratura per il manoscritto** | Genera bozze LaTeX per Introduzione / Lavori correlati | workflow | ACP | [Dettagli](#doc/workflows%2Fmanuscript-literature-framing) |

### 🔧 Strumenti di debug

| Workflow | Scopo | Backend | Docs |
|----------|-------|---------|------|
| **Debug Probe** | Test di sviluppo e diagnostica del sistema di Workflow | Skill-Runner | [Dettagli](#doc/workflows%2Fdebug-probe) |

## Passi successivi

- [Invocazione e configurazione dei Workflow](#doc/workflows%2Finvocation)
- [Configurazione dei backend](#doc/backends%2Findex) — Istruzioni dettagliate per la configurazione dei backend
