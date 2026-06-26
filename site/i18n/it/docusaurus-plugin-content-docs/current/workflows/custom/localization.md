# Localizzazione

Il sistema dei Workflow supporta la localizzazione multi-lingua, permettendo allo stesso Workflow di visualizzare nomi e descrizioni corrispondenti nelle diverse interfacce linguistiche di Zotero.

## Gerarchia di localizzazione

La localizzazione dei Workflow ricade nella seguente ordine di priorità:

```
Messaggi inline (manifest.i18n.messages)  ← Priorità più alta
        ↓
File di localizzazione a livello di pacchetto (locales/ del workflow-package)
        ↓
Campi grezzi del manifesto (label / description ecc. valori predefiniti in inglese)
        ↓
Ricerca della chiave (es. "workflows.my-id.label")
```

## Localizzazione inline (Workflow singolo)

Definita direttamente in `workflow.json`:

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的 Workflow",
        "taskNameTemplate": "处理中: {query}",
        "parameters.language.title": "语言",
        "parameters.language.description": "选择输出内容的语言"
      },
      "ja-JP": {
        "label": "マイワークフロー",
        "taskNameTemplate": "処理中: {query}"
      }
    }
  }
}
```

Campi come `label` e `taskNameTemplate` nel manifesto grezzo servono come valori predefiniti (solitamente in inglese) e le traduzioni in `i18n.messages` sovrascrivono il testo visualizzato per la lingua corrispondente.

### Convenzioni di denominazione delle chiavi

```
label                                    — Nome del Workflow
taskNameTemplate                         — Modello del nome dell'attività
parameters.<paramKey>.title              — Titolo del parametro
parameters.<paramKey>.description         — Descrizione del parametro
skills.<skillId>.name                    — Nome visualizzato dello skill nel workflow corrente
```

`skills.<skillId>.name` influisce solo sul nome visualizzato nell'interfaccia. Il `runner.json.name` del pacchetto Skill rimane il nome predefinito dello skill; se il workflow non dichiara una traduzione corrispondente, l'interfaccia mostra `runner.json.name` come fallback.

## Localizzazione a livello di pacchetto (Pacchetto multi-Workflow)

Dichiara i file di localizzazione in `workflow-package.json`:

```json
{
  "id": "my-package",
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

Contenuto di `locales/zh-CN.json`:

```json
{
  "workflows.my-workflow.label": "我的工作流",
  "workflows.my-workflow.taskNameTemplate": "处理中: {query}",
  "workflows.my-workflow.skills.my-skill.name": "我的技能",
  "workflows.my-workflow.parameters.language.title": "语言",
  "workflows.another-workflow.label": "另一个工作流"
}
```

Le chiavi nei file di localizzazione a livello di pacchetto utilizzano il formato completamente qualificato: `workflows.<workflowId>.<campo>`.

### Uso misto

I messaggi a livello di pacchetto e quelli inline del Workflow possono coesistere, con i messaggi inline che hanno priorità più alta. Migliori pratiche:

- Mantieni la lingua predefinita (es. inglese) nei campi di workflow.json
- Posiziona le traduzioni nei file di localizzazione a livello di pacchetto per una gestione unificata
- Se una traduzione è molto specifica per un particolare Workflow, può anche essere posizionata nei messaggi inline del Workflow

## Logica di corrispondenza della lingua

Il sistema tenta di corrispondere alle impostazioni linguistiche dell'utente nel seguente ordine:

1. **Corrispondenza esatta**: La lingua dell'utente è `"zh-CN"`, cerca i messaggi `"zh-CN"`
2. **Corrispondenza del sotto-tag della lingua**: La lingua dell'utente è `"zh-Hans-CN"`, se non viene trovata una corrispondenza esatta, prova a corrispondere `"zh"`
3. **Ricerca del defaultLocale**: Usa la lingua specificata da `i18n.defaultLocale`
4. **Ricerca del valore del campo grezzo**: Usa i valori dei campi grezzi in `workflow.json` (es. `label`)
5. **Ricerca della chiave**: Visualizza il nome della chiave stessa

## Localizzazione degli enum dei valori dei parametri

Se un parametro ha valori enum, il testo visualizzato per i valori enum attualmente utilizza i campi `title` e `description` del parametro. Per scenari complessi che richiedono la localizzazione dei valori enum stessi, si consiglia di spiegarlo nel `label` o nella descrizione del Workflow.

## Aggiungere una nuova lingua a un Workflow

1. Crea un nuovo file `<lingua>.json` nella directory `locales/` del pacchetto
2. Fai riferimento ai file di localizzazione esistenti (es. `zh-CN.json`) e traduci tutte le chiavi
3. Aggiungi la nuova voce della lingua in `i18n.locales` di `workflow-package.json`
4. Ricarica il plugin per rendere effettive le modifiche

## Riferimento

- Esempio di file di localizzazione ufficiale: `content/official/workflows/literature-workbench-package/locales/zh-CN.json`
- Esempio di dichiarazione i18n a livello di pacchetto: `content/official/workflows/literature-workbench-package/workflow-package.json`

## Passi successivi

- [Tipi di richiesta](request-kinds) — Scegli il backend di esecuzione e il tipo di richiesta
- [Pacchettizzazione e distribuzione](packaging) — Pubblica pacchetti di Workflow con localizzazione
