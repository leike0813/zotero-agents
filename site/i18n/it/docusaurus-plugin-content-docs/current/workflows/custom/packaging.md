# Pacchettizzazione e distribuzione

I Workflow supportano due forme: **Workflow singolo** e **pacchetto multi-Workflow**. I Workflow singoli sono adatti a scenari semplici, mentre i pacchetti multi-Workflow sono adatti a raccolte di Workflow con codice condiviso.

## Workflow singolo

La forma più semplice: una directory contenente un `workflow.json` e i suoi script Hook:

```
my-workflow/
├── workflow.json
└── hooks/
    ├── filterInputs.mjs
    └── applyResult.mjs
```

Un Workflow singolo non ha `packageId` e gli script Hook non possono condividere codice tramite importazioni relative.

## Pacchetto multi-Workflow

Quando più Workflow condividono logica, possono essere organizzati come un pacchetto:

```
my-package/
├── workflow-package.json       # Manifesto del pacchetto
├── lib/                        # Codice condiviso
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── filterInputs.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # File di localizzazione a livello di pacchetto
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### Codice condiviso all'interno di un pacchetto

Gli script Hook in un pacchetto possono importare moduli condivisi da `lib/` tramite percorsi relativi:

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // Logica di elaborazione condivisa
}
```

Nota: Gli script Hook vengono eseguiti come ES Module, supportando le istruzioni `import`, ma i percorsi di importazione devono essere relativi al file Hook stesso.

## Metodi di distribuzione

### Directory dei Workflow dell'utente

Posiziona la directory del Workflow sotto la **Directory dei Workflow** configurata nelle Preferenze di Zotero. Il Workflow Manager scansiona automaticamente questa directory (incluse le sottodirectory) e scopre tutti i file `workflow.json`.

Posizione della configurazione: Zotero → Impostazioni → Zotero Agents → Directory dei Workflow.

### Regole di scansione delle directory

- Il Workflow Manager **scansiona ricorsivamente** la directory dei Workflow e le sue sottodirectory
- Trovare un `workflow.json` lo registra come Workflow
- Se viene trovato `workflow-package.json` all'interno di una directory del pacchetto, i sotto-Workflow vengono caricati in modalità pacchetto
- Se la directory dei Workflow non esiste o non contiene Workflow validi, il Workflow Manager riporta un avviso ma non influisce sul funzionamento del plugin

### Compatibilità con altri formati

| Posizione di archiviazione | Visibilità | Descrizione |
|---------------------------|------------|-------------|
| Pacchetto ufficiale dei Workflow `content/official/workflows/` | Tutti gli utenti | Installato indipendentemente tramite il Feed dei contenuti; non direttamente modificabile dagli utenti |
| Directory dei Workflow dell'utente | Utente corrente | Può essere liberamente aggiunta/modificata/eliminata |
| Directory ufficiali + utente | Visualizzazione combinata | I Workflow di entrambe le posizioni vengono visualizzati fianco a fianco nella Dashboard |

## Validazione

Dopo aver distribuito un Workflow nella directory dell'utente:

1. **Riapri la Dashboard**; il nuovo Workflow dovrebbe apparire nell'elenco dei Workflow della pagina Home
2. Dopo aver selezionato gli elementi corrispondenti, fai clic con il tasto destro → Zotero Agents; il nuovo Workflow dovrebbe apparire
3. Prima di eseguire il Workflow, verifica che i parametri nella finestra di configurazione siano corretti

## Passi successivi

- [Localizzazione](localization) — Aggiungi il supporto multi-lingua ai Workflow
- [Tipi di richiesta](request-kinds) — Scegli il backend di esecuzione e il tipo di richiesta appropriati
- [Debug e test](debugging) — Verifica la correttezza dei Workflow
