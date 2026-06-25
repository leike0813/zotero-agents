# Panoramica sulla configurazione dei backend

Zotero Agents supporta tre tipi di backend, ciascuno adatto a diversi casi d'uso.

## Come scegliere

### 🥇 Prima scelta: Backend ACP

Se hai già uno strumento agent compatibile con ACP installato sul tuo computer (Codex, Claude Code, OpenCode, Hermes Agent, OpenClaw, Qwen Code, ecc.), puoi usare direttamente il backend ACP. **Nessun carico di configurazione aggiuntivo** — seleziona semplicemente l'agent corrispondente dall'elenco dei preset nel Backend Manager, e il plugin gestisce automaticamente il ciclo di vita del processo.

Alcuni agent (come OpenCode e Codex) supportano anche l'isolamento delle directory di configurazione e di persistenza delle sessioni tramite variabili d'ambiente, rendendo facile gestire più contesti di lavoro.

→ [Configurazione del backend ACP](#doc/backends%2Facp)

### 🥈 Seconda scelta: Skill-Runner distribuito con Docker

Se hai bisogno di **esecuzione persistente in background** (le attività continuano anche dopo la chiusura di Zotero e puoi riprenderle o recuperarne i risultati al riavvio), oppure hai la possibilità di configurare un server sulla tua rete locale, si consiglia di distribuire Skill-Runner con Docker come servizio persistente.

Uno Skill-Runner distribuito con Docker funziona in modo indipendente da Zotero e supporta la condivisione multi-utente, un'interfaccia di gestione Web, la gestione dei motori e altro ancora.

→ [Distribuzione e configurazione di Skill-Runner](#doc/backends%2Fskill-runner)

### 🥉 Solo in emergenza: Distribuzione locale di Skill-Runner con un clic

Questa opzione è adatta solo agli utenti che **non sanno come installare e configurare gli strumenti agent e non possono usare Docker**. La distribuzione con un clic si avvia e si arresta insieme al plugin — la chiusura di Zotero termina tutte le attività e non c'è esecuzione in background. Se sei in grado di installare agent o usare Docker, preferisci le due opzioni precedenti.

→ [Distribuzione e configurazione di Skill-Runner](#doc/backends%2Fskill-runner)

### Generic HTTP

Utilizzato per chiamare API HTTP specifiche (come il servizio di analisi documenti MinerU) che non coinvolgono l'esecuzione di modelli AI. Configurare secondo necessità.

→ [Configurazione del backend Generic HTTP](#doc/backends%2Fgeneric-http)

## Confronto tra i tipi di backend

| Tipo | Protocollo | Modalità di esecuzione | Raccomandazione | Caso d'uso |
|------|------------|----------------------|-----------------|------------|
| **Backend ACP** | Agent Client Protocol | Sottoprocesso locale | 🥇 Prima scelta | Hai uno strumento agent ACP, nessun carico di configurazione |
| **Skill-Runner (Docker)** | API HTTP | Servizio persistente | 🥈 Consigliato | Necessità di esecuzione persistente in background, condivisione LAN |
| **Skill-Runner (Un clic)** | API HTTP | Si avvia/arresta con il plugin | 🥉 Emergenza | Non puoi installare agent / Docker |
| **Generic HTTP** | HTTP | Servizio remoto | Secondo necessità | Chiamata ad API HTTP specifiche (es. MinerU) |

Tutti i backend sono configurati tramite **[Strumenti → Backend Manager](#doc/backends%2Fbackend-manager)**.

## Passi successivi

- [Configurazione del backend ACP](#doc/backends%2Facp)
- [Distribuzione e configurazione di Skill-Runner](#doc/backends%2Fskill-runner)
- [Configurazione del backend Generic HTTP](#doc/backends%2Fgeneric-http)
- [Guida all'uso del Backend Manager](#doc/backends%2Fbackend-manager)
