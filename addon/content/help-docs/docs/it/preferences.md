# Preferenze

Le impostazioni di Zotero Agents si trovano in **Zotero → Impostazioni → Zotero Agents** (Windows/Linux) o **Zotero → Preferenze → Zotero Agents** (macOS).

## Impostazioni Workflow

### Directory Workflow

- **Percorso**: Directory personalizzata per memorizzare i workflow
- **Posizione Predefinita**: `<Dati Zotero>/zotero-agents/data/workflows`
- **Scansione Workflow**: Clicca sul pulsante per riscansionare la directory e caricare tutti i workflow

### Directory Skill

- **Percorso**: Directory personalizzata per memorizzare i pacchetti skill
- **Scansione**: Clicca sul pulsante per scansionare la directory e caricare le skill

### Pacchetti di Workflow Ufficiali

I workflow ufficiali sono distribuiti tramite Pacchetti di Contenuto separati, disaccoppiati dal plugin stesso.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_workflow.webp" alt="Pagina Impostazioni Workflow" title="Pagina Impostazioni Workflow" loading="lazy" /><figcaption>Pagina Impostazioni Workflow</figcaption></figure>

| Impostazione | Tipo | Descrizione |
|---------|------|-------------|
| **Installa Pacchetti di Workflow Ufficiali** | pulsante | Scarica e installa l'ultimo pacchetto ufficiale da GitHub / Gitee |
| **Controlla Aggiornamenti** | pulsante | Controlla se è disponibile una nuova versione in remoto |
| **Stato** | testo | Visualizza la versione del pacchetto attualmente installato e le informazioni sul canale |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_official-workflow-contents.webp" alt="Contenuto Pacchetto di Workflow Ufficiale" title="Contenuto Pacchetto di Workflow Ufficiale" loading="lazy" /><figcaption>Contenuto Pacchetto di Workflow Ufficiale</figcaption></figure>

#### Canali di Aggiornamento

Puoi scegliere tra tre canali di aggiornamento:

| Canale | Descrizione |
|---------|-------------|
| **stable** | Rilascio stabile (consigliato) |
| **beta** | Rilascio beta, include funzionalità imminenti |
| **dev** | Rilascio di sviluppo, include le ultime modifiche sperimentali |

Dopo aver cambiato canale, clicca su **Controlla Aggiornamenti** per ottenere l'ultimo pacchetto per quel canale.

### Impostazioni di Runtime

- **Abilita Feedback Esecuzione Skill**: Quando abilitato, le esecuzioni skill possono scrivere sidecar Markdown di feedback, che vengono raccolti dal pannello Feedback Skill della Dashboard

## Host Bridge

Un servizio HTTP integrato per l'accesso degli strumenti AI esterni e della CLI alla biblioteca Zotero. Vedi [Host Bridge](#doc/backends%2Fhost-bridge) per i dettagli.

| Impostazione | Tipo | Descrizione |
|---------|------|-------------|
| **Abilita Server MCP** | booleano | Esponi anche l'interfaccia protocollo MCP |
| **Disabilita Approvazione Scrittura** | booleano | Pericoloso: bypassa tutte le approvazioni di scrittura |
| **Abilita Accesso LAN** | booleano | Consenti accesso LAN |
| **Porta Fissa** | booleano | Usa una porta fissa invece di una casuale |
| **Numero Porta** | numero | Valore porta fissa (predefinita 26570) |
| **IP LAN** | stringa | Specifica manualmente l'IP pubblicizzato (lascia vuoto per il rilevamento automatico) |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_host-bridge.webp" alt="Pagina Impostazioni Host Bridge" title="Pagina Impostazioni Host Bridge" loading="lazy" /><figcaption>Pagina Impostazioni Host Bridge</figcaption></figure>

Pulsanti azione:

- **Avvia/Mostra Endpoint**: Avvia il servizio e visualizza l'URL dell'endpoint
- **Ruota Token**: Ruota il token di sessione
- **Crea/Ruota Master Token**: Genera un token persistente
- **Copia Master Token**: Copia negli appunti
- **Copia Profilo CLI Remoto**: Ottieni la configurazione della connessione remota
- **Installa CLI**: Installa con un clic `zotero-bridge`

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_host-bridge_expand.webp" alt="Area Azioni Pericolose Host Bridge Espansa" title="Area Azioni Pericolose Host Bridge Espansa" loading="lazy" /><figcaption>Area Azioni Pericolose Host Bridge Espansa</figcaption></figure>

## Backend Locale SkillRunner

> ⚠️ Questa modalità è adatta solo per utenti che non hanno familiarità con l'installazione di strumenti agent e non possono utilizzare Docker. Se hai già un agent ACP o puoi utilizzare Docker, preferisci il [backend ACP](#doc/backends%2Facp) o il [Skill-Runner distribuito con Docker](#doc/backends%2Fskill-runner#recommended-docker-persistent-deployment).

Lo Skill-Runner locale si avvia e si ferma con il plugin — chiudere Zotero termina tutte le attività. Funzionalità di gestione runtime:

| Funzionalità | Descrizione |
|---------|-------------|
| **Distribuzione con Un Clic** | Scarica e installa l'ultima versione del runtime Skill-Runner |
| **Avvia** | Avvia il processo Skill-Runner locale |
| **Ferma** | Ferma lo Skill-Runner locale in esecuzione |
| **Disinstalla** | Rimuovi i file runtime installati |
| **Apri Interfaccia Gestione** | Apri l'interfaccia di gestione backend nel plugin |
| **Apri Cartella Skill** | Apri la directory dove sono memorizzati i file skill |
| **Aggiorna Cache Modelli** | Aggiorna la cache dell'elenco dei modelli del backend |
| **Apri Console Debug** | Visualizza l'output del log del backend |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_skillrunner-local-backend.webp" alt="Pagina Impostazioni Backend Locale SkillRunner" title="Pagina Impostazioni Backend Locale SkillRunner" loading="lazy" /><figcaption>Pagina Impostazioni Backend Locale SkillRunner</figcaption></figure>

## Gestione Backend

Gestisci tutti i profili backend:

- Raggruppati per fornitore (SkillRunner, ACP, Generic HTTP)
- Aggiungi/modifica/elimina backend
- Ogni backend può essere configurato con: ID, URL Base, Bearer Token, Timeout

## Sincronizzazione WebDAV

Soluzione di sincronizzazione multi-dispositivo per il Synthesis Workbench, in sostituzione della deprecata Sincronizzazione Git. Vedi [Sincronizzazione WebDAV](#doc/synthesis%2Fwebdav-sync) per i dettagli.

| Impostazione | Tipo | Predefinito | Descrizione |
|---------|------|---------|-------------|
| **Abilita Sincronizzazione WebDAV** | booleano | `false` | Interruttore principale |
| **URL Base** | stringa | `""` | Indirizzo server WebDAV |
| **Percorso Remoto** | stringa | `"zotero-agents"` | Percorso directory remota |
| **Nome Utente** | stringa | `""` | Nome utente WebDAV |
| **Password/Token** | crittografato | `""` | Password o token app (crittografato AES-256-GCM) |
| **Sincronizzazione Automatica** | booleano | `false` | Attiva automaticamente la sincronizzazione dopo ogni modifica |
| **Riprova Automaticamente** | booleano | `false` | Riprova automaticamente in caso di fallimento |

Pulsanti azione: Salva Impostazioni, Salva Credenziali, Test Connessione.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_WebDAV-sync.webp" alt="Pagina Impostazioni Sincronizzazione WebDAV" title="Pagina Impostazioni Sincronizzazione WebDAV" loading="lazy" /><figcaption>Pagina Impostazioni Sincronizzazione WebDAV</figcaption></figure>

## Dati Runtime

Visualizza la directory radice di persistenza, l'utilizzo runtime e la diagnostica di integrità:

- **Radice Persistenza**: `<Dati Zotero>/zotero-agents/data/`
- **Archivio Canonico Synthesis**: SQLite locale + pacchetti persistenti
- **Dimensioni Directory**: data/, cache/, logs/, tmp/, ecc.
- **Pannello Diagnostica**: Rileva problemi del filesystem (ad esempio, file WAL non puliti)

Nota: L'Archivio Canonico Synthesis e i database di stato sono solo diagnostici e non possono essere puliti qui.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_storage-and-persistence.webp" alt="Pagina Gestione Dati Runtime e Persistenza" title="Pagina Gestione Dati Runtime e Persistenza" loading="lazy" /><figcaption>Pagina Gestione Dati Runtime e Persistenza</figcaption></figure>

## Opzioni Generali

- **Backend Predefinito**: Seleziona l'istanza backend predefinita da utilizzare
- **Avvia Backend Localmente in Modo Automatico**: Avvia automaticamente Skill-Runner quando Zotero si avvia
- **Livello Log**: Imposta il livello di logging
- **Abilita Lettore Markdown Integrato**: Quando selezionato, il doppio clic sugli allegati `.md` li apre nel lettore integrato; quando deselezionato, viene ripristinato l'apritore predefinito di sistema (abilitato per impostazione predefinita)

## Percorso di Navigazione Impostazioni

```
Zotero → Impostazioni → Zotero Agents
├── Impostazioni Workflow
│   ├── Directory Workflow
│   ├── Directory Skill
│   ├── Pacchetti di Workflow Ufficiali
│   └── Impostazioni Runtime
├── Host Bridge
│   ├── Avvio/Arresto Servizio
│   ├── Rete & Porta
│   └── Gestione Token
├── Backend Locale SkillRunner
├── Gestione Backend
├── Sincronizzazione WebDAV
├── Dati Runtime
└── Opzioni Generali
```
