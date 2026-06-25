# Configurazione del backend ACP

## Cos'è l'ACP?

ACP (Agent Client Protocol) è un protocollo per comunicare con i backend agent. Zotero Agents comunica con i processi agent in esecuzione locale (come Codex, Claude Code, OpenCode, ecc.) tramite il protocollo ACP per abilitare conversazioni ed esecuzione di skill.

Il backend ACP è il metodo di configurazione **consigliato** — finché hai uno strumento agent compatibile con ACP installato sul tuo computer, puoi usarlo direttamente senza alcuna configurazione aggiuntiva.

## Perché l'ACP come prima scelta?

- **Nessun carico di configurazione**: Non è necessario distribuire servizi aggiuntivi; usa gli strumenti agent già presenti sul tuo computer
- **Gestione automatica dei processi**: Il plugin specifica il comando di avvio nella configurazione e gestisce automaticamente il ciclo di vita del processo agent
- **Supporto multi-agent**: Configura più backend agent contemporaneamente e passa da uno all'altro secondo necessità
- **Isolamento della configurazione**: Alcuni agent (come OpenCode e Codex) supportano l'isolamento delle directory di configurazione e di persistenza delle sessioni tramite variabili d'ambiente

## Passaggi di configurazione

1. Assicurati di avere almeno uno strumento agent CLI compatibile con ACP installato sul tuo computer
2. Apri **Strumenti → [Backend Manager](#doc/backends%2Fbackend-manager)**
3. Passa alla scheda **ACP**
4. Seleziona il tuo strumento agent dal menu a tendina **Aggiungi da preset**, oppure fai clic su **Aggiungi ACP** per configurare manualmente
5. Compila i seguenti campi:
   - **Nome visualizzato**: Un nome descrittivo (es. "Il mio OpenCode")
   - **Comando**: Comando per avviare il backend ACP (i preset si compilano automaticamente, ma puoi anche modificare manualmente)
   - **Argomenti**: Argomenti aggiuntivi per il comando (opzionale)
   - **Variabili d'ambiente**: Variabili d'ambiente aggiuntive (opzionale, utilizzate per l'isolamento della configurazione, ecc.)
6. Fai clic su **Salva** nell'angolo in basso a destra

### Verifica della connessione

Dopo il salvataggio, il plugin rileva automaticamente le funzionalità del backend:
- Verifica se il comando esiste
- Si connette e si inizializza
- Recupera i modelli e le modalità disponibili
- Calcola un'impronta digitale della configurazione per rilevare eventuali modifiche successive

Se il rilevamento fallisce, verifica che l'agent CLI sia installato correttamente e che il formato del comando sia corretto.

## Preset agent supportati

Il plugin fornisce diversi preset integrati che puoi selezionare direttamente dal menu a tendina **Aggiungi da preset**:

| Preset | Comando | Descrizione |
|--------|---------|-------------|
| **Codex** | `npx codex acp` | Agent di codifica ufficiale di OpenAI |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` | CLI ufficiale di Anthropic |
| **OpenCode** | `npx opencode-ai@latest acp` | Framework agent generico con supporto per l'isolamento tramite variabili d'ambiente |
| **Gemini CLI** | `npx @google/gemini-cli acp` | Google Gemini |
| **Hermes** | `npx hermes acp` | Hermes Agent |
| **Qwen Code** | `qwen-code acp` | Qwen Code |

Puoi comunque modificare manualmente qualsiasi campo dopo aver selezionato un preset.

## Raccomandazioni sulla configurazione delle variabili d'ambiente

Alcuni agent supportano l'isolamento della configurazione e la persistenza delle sessioni tramite variabili d'ambiente; è sufficiente aggiungerle nell'editor delle variabili d'ambiente:

| Variabile d'ambiente | Agent | Scopo |
|----------------------|-------|-------|
| `OPENCODE_CONFIG` | OpenCode | Specifica una directory di configurazione indipendente |
| `OPENCODE_SESSION_DIR` | OpenCode | Specifica una directory di persistenza delle sessioni |
| `CODEX_CONFIG_DIR` | Codex | Specifica una directory di configurazione indipendente |

## Tipi di richiesta

Il backend ACP supporta due tipi di richiesta:
- `acp.prompt.v1` — Interazione conversazionale (Chat ACP)
- `acp.skill.run.v1` — Esecuzione di skill (Competenze ACP)

Lo stesso backend ACP può essere usato contemporaneamente sia per le conversazioni che per le esecuzioni di skill.

## Gestione delle sessioni

- Ogni backend può avere più sessioni (conversazioni), che sono memorizzate in modo persistente nel database del plugin
- Diversi backend ACP possono funzionare simultaneamente senza interferire tra loro
- Le sessioni possono essere gestite nella [Chat ACP](#doc/sidebar%2Facp-chat)

## Passi successivi

Dopo aver completato la configurazione, puoi:
- Chattare con il backend nella [Chat ACP della barra laterale](#doc/sidebar%2Facp-chat)
- Visualizzare le esecuzioni di skill ACP nella [Dashboard](#doc/dashboard)
- Usare il backend ACP per eseguire attività nell'[Elenco dei Workflow](#doc/workflows%2Findex)
