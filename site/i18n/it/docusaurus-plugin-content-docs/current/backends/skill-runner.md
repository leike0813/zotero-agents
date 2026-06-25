# Distribuzione e configurazione di Skill-Runner

## Cos'è Skill-Runner?

Skill-Runner è un servizio autonomo per l'esecuzione di skill agent. Zotero Agents comunica con Skill-Runner tramite l'API HTTP per inviare richieste di skill e recuperare i risultati. Supporta più CLI agent AI come motori di backend e può essere distribuito come container Docker indipendente o come servizio locale.

> **🏆 Priorità di raccomandazione**: Se hai già uno strumento agent compatibile con ACP sul tuo computer (Codex, OpenCode, Claude Code, ecc.), usa prima il [backend ACP](./acp), che non richiede alcuna configurazione aggiuntiva. Skill-Runner è adatto a scenari che richiedono un servizio persistente in background o la condivisione in LAN.

## Modalità di distribuzione

### Consigliata: Distribuzione persistente con Docker

Uno Skill-Runner distribuito con Docker funziona come un servizio persistente indipendente, **non influenzato dall'avvio/arresto di Zotero** — la chiusura di Zotero permette alle attività di continuare in background e al riavvio di Zotero puoi riprenderle o recuperare direttamente i risultati completati.

Adatto a:
- Attività di lunga durata (Sintesi di argomenti, analisi di letteratura in batch, ecc.)
- Condivisione di una singola istanza di Skill-Runner tra più dispositivi in LAN
- Utenti con esperienza Docker

#### docker compose (Consigliato)

```yaml
version: "3"
services:
  skill-runner:
    image: leike0813/skill-runner:latest
    ports:
      - "9813:9813"
      - "17681:17681"
    volumes:
      - ./skills:/app/skills
      - skillrunner_cache:/opt/cache
      - ./data:/app/data
    environment:
      - SKILL_RUNNER_DATA_DIR=/app/data
      - UI_BASIC_AUTH_ENABLED=false

volumes:
  skillrunner_cache:
```

```bash
mkdir -p data skills
docker compose up -d --build
```

Dopo l'avvio:
- **Servizio API**: `http://localhost:9813/v1`
- **Interfaccia di gestione**: `http://localhost:9813/ui`

#### Esecuzione diretta con Docker

```bash
docker run --rm -p 9813:9813 -p 17681:17681 \
  -v "$(pwd)/skills:/app/skills" \
  -v skillrunner_cache:/opt/cache \
  -v "$(pwd)/data:/app/data" \
  leike0813/skill-runner:latest
```

Descrizione delle porte:

| Porta | Scopo |
|-------|-------|
| `9813` | API HTTP + Interfaccia di gestione |
| `17681` | Terminale engine inline nel browser (richiede ttyd) |

#### Configurazione per la produzione

Per distribuzioni pubbliche, si consiglia di abilitare l'autenticazione di base dell'interfaccia:

```bash
docker run --rm -p 9813:9813 \
  -v "$(pwd)/skills:/app/skills" \
  -e UI_BASIC_AUTH_ENABLED=true \
  -e UI_BASIC_AUTH_USERNAME=admin \
  -e UI_BASIC_AUTH_PASSWORD=your-password \
  leike0813/skill-runner:latest
```

Si consiglia di utilizzare questa configurazione con un proxy inverso HTTPS (come Nginx).

### Emergenza: Distribuzione in modalità locale con un clic

> ⚠️ Questa modalità è adatta solo agli utenti che **non sanno come installare gli strumenti agent e non possono usare Docker**. Se sei in grado di installare CLI agent o usare Docker, preferisci il [backend ACP](./acp) o la distribuzione Docker descritta sopra.

Lo Skill-Runner distribuito con un clic si avvia e si arresta automaticamente con il plugin di Zotero — **la chiusura di Zotero termina tutte le attività in esecuzione** e non c'è esecuzione in background. Le attività interrotte devono essere inviate di nuovo.

**Passaggi di distribuzione:**

1. Apri **Zotero → Impostazioni → Zotero Agents**
2. Trova la sezione **Backend locale SkillRunner**
3. Fai clic su **Distribuisci con un clic** (se non ancora installato)
   - Il plugin scarica automaticamente l'ultima versione da GitHub Releases
   - Si installa nella directory dei dati del plugin
   - Lo stato cambia a "Installato" al termine
4. Fai clic su **Avvia**
   - Indirizzo predefinito: `http://127.0.0.1:29813`
   - Se la porta è occupata, prova automaticamente le 10 porte successive

**Descrizione dei pulsanti azione:**

| Pulsante | Funzione |
|----------|----------|
| Distribuisci | Scarica e installa il runtime di Skill-Runner |
| Avvia | Avvia il processo locale di Skill-Runner |
| Arresta | Arresta il processo in esecuzione di Skill-Runner |
| Disinstalla | Rimuove i file runtime installati |
| Apri interfaccia di gestione | Apri l'interfaccia di gestione Web integrata di Skill-Runner nella barra laterale |
| Apri cartella Skill | Apri la directory in cui sono memorizzati i file delle skill |
| Aggiorna cache modelli | Aggiorna la cache dell'elenco dei modelli del backend |
| Apri console di debug | Visualizza l'output dei log del backend |

### Modalità remota

Connettiti a un'istanza di Skill-Runner remota o ospitata su cloud.

> ⚠️ **Avviso di sicurezza**: La versione corrente non fornisce ulteriori protezioni di sicurezza per le connessioni remote (come TLS, verifica della chiave API, ecc.), basandosi solo sull'autenticazione con Bearer Token. **Le connessioni remote non sono consigliate in ambienti non LAN**. Durante la distribuzione in una LAN, si consiglia di usare un firewall per limitare le fonti di accesso.

**Passaggi di configurazione:**

1. Apri **Strumenti → [Backend Manager](backend-manager)**
2. Passa alla scheda **SkillRunner**
3. Fai clic su **Aggiungi SkillRunner**
4. Compila:
   - **Nome visualizzato**: Un nome descrittivo
   - **URL di base**: Indirizzo dell'istanza remota (es. `http://192.168.1.100:9813`)
   - **Autenticazione**: Seleziona `bearer` e compila il **Token di autenticazione** (se il backend richiede autenticazione)
   - **Timeout**: Timeout della richiesta (opzionale)
5. Fai clic su **Salva** nell'angolo in basso a destra

## Distribuzione locale (senza Docker)

### Script di distribuzione rapida

```bash
# Linux / macOS
./scripts/deploy_local.sh

# Windows (PowerShell)
.\scripts\deploy_local.ps1
```

Prerequisiti: `uv`, `Node.js`, `npm`. `ttyd` è opzionale.

### CLI di controllo

```bash
# Verifica lo stato
./scripts/skill-runnerctl status --mode local --json

# Avvia
./scripts/skill-runnerctl up --mode local --json

# Arresta
./scripts/skill-runnerctl down --mode local --json
```

Parametri predefiniti della modalità locale:
- **Linux/macOS**: `$HOME/.local/share/skill-runner`
- **Windows**: `%LOCALAPPDATA%\SkillRunner`
- **Porta**: `29813` (fallback `29813-29823`)
- **Bind**: Solo `127.0.0.1`

### Installatore da release

```bash
# Linux / macOS
./scripts/skill-runner-install.sh --version v0.4.3

# Windows (PowerShell)
.\scripts\skill-runner-install.ps1 -Version v0.4.3
```

Lo script scarica automaticamente `skill-runner-<version>.tar.gz` + `.sha256` e verifica l'integrità SHA256 prima dell'installazione.

## Sistema dei motori

Skill-Runner supporta più CLI agent AI come motori di esecuzione e fornisce un livello di adattamento unificato.

### Motori supportati

| Motore | Nome del pacchetto |
|--------|-------------------|
| Codex | `@openai/codex` |
| Gemini CLI | `@google/gemini-cli` |
| OpenCode | `opencode-ai` |
| Claude Code | `@anthropic-ai/claude-code` |
| Qwen | `@qwen-code/qwen-cli` |

### Priorità di configurazione

La configurazione del motore viene unita da quattro livelli (basso → alto):

1. **Valori predefiniti del motore**: Configurazione predefinita integrata nell'adattatore del motore
2. **Valori consigliati dalla skill**: Configurazione consigliata dal pacchetto skill `assets/<engine>_config.*`
3. **Opzioni utente**: Parametri dal corpo della richiesta API
4. **Configurazione forzata**: Configurazione forzata dall'adattatore del motore (non può essere sovrascritta)

### Autenticazione del motore

| Metodo | Descrizione | Raccomandazione |
|--------|-------------|-----------------|
| **Proxy OAuth** | Completa l'OAuth tramite l'interfaccia di gestione; le credenziali vengono memorizzate automaticamente | ⭐ Consigliato |
| **Delega CLI** | Usa il flusso di accesso locale integrato del motore | Alternativa |
| **TUI inline** | Terminale del motore nel browser (richiede ttyd) | Per il debug |
| **Importa file di credenziali** | Carica i file di credenziali tramite l'interfaccia | Alternativa |
| **Accesso CLI nel container** | Esegui l'accesso CLI direttamente tramite `docker exec` | Per ambienti container |

## Interfaccia di gestione

L'interfaccia di gestione Web integrata fornisce tutte le funzionalità operative per Skill-Runner.

URL di accesso: `http://localhost:<port>/ui`

| Funzionalità | Descrizione |
|-------------|-------------|
| **Browser delle skill** | Visualizza le skill installate, esamina la struttura dei pacchetti e il contenuto dei file |
| **Gestione dei motori** | Monitora lo stato dei motori, attiva gli aggiornamenti, visualizza i log dei motori |
| **Catalogo dei modelli** | Sfoglia e gestisci gli snapshot dei modelli dei motori |
| **TUI inline** | Avvia i terminali dei motori direttamente nel browser (richiede ttyd) |
| **Impostazioni** | Livello dei log, periodo di conservazione dei dati, dimensione massima della directory, ecc. |

## Panoramica dell'API REST

### Endpoint di esecuzione principali

```bash
# Elenca le skill disponibili
curl http://localhost:9813/v1/skills

# Crea un job (esegui una skill)
curl -X POST http://localhost:9813/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "my-skill",
    "engine": "gemini",
    "parameter": { "language": "zh-CN" },
    "model": "gemini-3-pro-preview"
  }'

# Ottieni i risultati
curl http://localhost:9813/v1/jobs/<request_id>/result

# Annulla un job
curl -X POST http://localhost:9813/v1/jobs/<request_id>/cancel
```

### Monitoraggio in tempo reale (SSE)

Due canali SSE per osservare in tempo reale il processo di esecuzione:

| Canale | Endpoint | Scopo |
|--------|----------|-------|
| Chat | `GET /v1/jobs/{id}/chat?cursor=N` | Flusso dei messaggi della chat |
| Eventi | `GET /v1/jobs/{id}/events?cursor=N` | Flusso completo degli eventi del protocollo |

Entrambi i canali supportano la riconnessione basata su cursore dopo la disconnessione.

### API di gestione

Endpoint di gestione JSON stabili, adatti all'integrazione con il frontend:

| Endpoint | Scopo |
|----------|-------|
| `GET /v1/management/skills` | Riepilogo delle skill |
| `GET /v1/management/engines` | Stato dei motori |
| `GET /v1/management/runs` | Cronologia delle esecuzioni (paginata) |
| `GET /v1/management/runs/{id}/chat` | Flusso SSE della conversazione |
| `POST /v1/management/runs/{id}/reply` | Invia una risposta a una skill interattiva |
| `POST /v1/management/runs/{id}/cancel` | Annulla un'esecuzione |

### API di lease del runtime locale

La modalità runtime locale utilizza una gestione del ciclo di vita basata su lease:

| Endpoint | Scopo |
|----------|-------|
| `POST /v1/local-runtime/lease/acquire` | Acquisisci un lease |
| `POST /v1/local-runtime/lease/heartbeat` | Rinnova il lease (TTL: 60s) |
| `POST /v1/local-runtime/lease/release` | Rilascia il lease |

Il runtime locale si termina automaticamente alla scadenza del lease.

## Gestione dei pacchetti skill

### Installazione persistente

```bash
# Carica un pacchetto skill zip
curl -X POST http://localhost:9813/v1/skill-packages/install \
  -H "Content-Type: multipart/form-data" \
  -F "file=@my-skill.zip"
```

Regole di validazione lato server:
- Il pacchetto deve contenere una directory di primo livello
- Deve avere `SKILL.md` + `assets/runner.json`
- Deve avere tre file schema (input / parameter / output)
- Il nome della directory == `runner.json.id` == nome del frontmatter di `SKILL.md` (coerenza dell'identità)
- Gli aggiornamenti devono essere strettamente in versione crescente

### Esecuzione temporanea (senza installazione)

```bash
# Crea un'esecuzione temporanea
curl -X POST http://localhost:9813/v1/temp-skill-runs \
  -H "Content-Type: application/json" \
  -d '{ "engine": "gemini", "parameter": {} }'

# Carica un pacchetto skill e avvia
curl -X POST http://localhost:9813/v1/temp-skill-runs/<id>/upload \
  -F "skill_package=@my-skill.zip"
```

Le esecuzioni temporanee vengono pulite automaticamente dopo aver raggiunto uno stato terminale.

## Ciclo di vita dell'esecuzione

Una tipica esecuzione di una skill comprende le seguenti fasi:

```
1. Configurazione e caricamento
   └── Il client invia POST /v1/jobs
       └── Facoltativamente carica i file di input

2. Orchestrazione
   └── Carica il manifesto della skill
       └── Valida lo schema dei parametri
       └── Verifica la compatibilità del motore
       └── Applica i limiti di concorrenza

3. Adattamento del motore
   └── Prepara l'ambiente (copia il pacchetto skill)
       └── Analizza i file di input
       └── Costruisce il prompt tramite template Jinja2
       └── Imposta l'attendibilità della directory di esecuzione

4. Esecuzione
   └── La CLI del motore si avvia come sottoprocesso
       └── Directory di lavoro isolata
       └── stdout/stderr trasmessi in tempo reale

5. Completamento
   └── Validazione dell'output (rispetto a output.schema.json)
       └── Analisi dei file artifact
       └── Generazione del Bundle (zip + manifesto)
       └── Stato impostato a riuscito / fallito / annullato
```

Quando un'esecuzione fallisce, il pacchetto di debug contiene log completi e file diagnostici.

## Struttura della directory dei dati

```
data/
├── runs/<run_id>/              # Spazio di lavoro dell'esecuzione
│   ├── .state/state.json       # Stato dell'esecuzione
│   ├── .audit/                 # Log di audit
│   ├── result/result.json      # Output strutturato finale
│   ├── artifacts/              # File generati dalla skill
│   └── bundle/                 # Risultati pacchettizzati (zip + manifesto)
├── requests/<request_id>/      # Dati della fase di richiesta
│   ├── uploads/                # File di input caricati
│   └── request.json            # Parametri della richiesta originale
├── logs/                       # Log dell'applicazione (ruotati quotidianamente)
└── system_settings.json        # Impostazioni di sistema modificabili dall'interfaccia
```

## Riferimento delle variabili d'ambiente

| Variabile | Descrizione | Predefinito |
|-----------|-------------|-------------|
| `SKILL_RUNNER_DATA_DIR` | Directory dei dati di esecuzione | `./data` |
| `SKILL_RUNNER_AGENT_HOME` | Directory home isolata per la configurazione dell'agent | `auto` |
| `SKILL_RUNNER_RUNTIME_MODE` | Modalità runtime: local / container | `auto` |
| `UI_BASIC_AUTH_ENABLED` | Abilita l'autenticazione di base dell'interfaccia | `false` |
| `UI_BASIC_AUTH_USERNAME` | Nome utente dell'autenticazione di base | — |
| `UI_BASIC_AUTH_PASSWORD` | Password dell'autenticazione di base | — |

## Descrizione degli stati di esecuzione

| Stato | Descrizione |
|-------|-------------|
| unknown | Stato iniziale, non ancora rilevato |
| starting | In fase di avvio |
| running | In esecuzione normale |
| stopped | Arrestato |
| degraded | In esecuzione anomala |
| reconciling_after_heartbeat_fail | Rilevamento heartbeat fallito, in recupero |

## Descrizione delle porte

- Porta predefinita: `29813` (intervallo locale del plugin)
- Porta API per distribuzione standalone: `9813`
- Intervallo di fallback: 10 porte consecutive (29813–29822)
- Intervallo di heartbeat: 20 secondi
- Rilevamento di avvio automatico: controlla ogni 15 secondi

## Log

I log vengono scritti in `data/logs/skill_runner.log` (ruotati quotidianamente). Puoi configurare il livello dei log, il periodo di conservazione e la dimensione massima della directory tramite la pagina delle impostazioni dell'interfaccia di gestione.

All'avvio del container, vengono generati anche log diagnostici di bootstrap strutturati in `${SKILL_RUNNER_DATA_DIR}/logs/bootstrap.log` e `agent_bootstrap_report.json`.

## Passi successivi

- [Scopri i Workflow](../workflows/) — Skill-Runner è uno dei principali backend per l'esecuzione dei workflow
- [Introduzione alla Dashboard](../dashboard) — Monitora lo stato di esecuzione delle attività
- [Scheda SkillRunner](../sidebar/skillrunner-tab) — Visualizza e interagisci con le esecuzioni di SkillRunner nella barra laterale
