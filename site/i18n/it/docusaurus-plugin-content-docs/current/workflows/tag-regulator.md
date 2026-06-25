# Regolatore dei tag

## Scopo

Normalizzare i tag degli elementi di Zotero in base a un vocabolario controllato e utilizzare l'AI per inferire possibili nuovi tag.

Questo Workflow chiama la skill `tag-regulator` sul backend Skill-Runner per verificare la conformità dei tag al vocabolario e raccomandare tag pertinenti.

## Casi d'uso

- Pulire in batch tag non standard
- Raccomandare automaticamente tag per gli elementi in base a un vocabolario controllato esistente
- Mantenere aggiornamenti e affinamenti continui del vocabolario controllato

## Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | Elemento padre |
| Origine dei dati | Ottenuta dall'elemento padre: tag correnti, metadati (titolo, autori, abstract, ecc.) |

Se esiste un payload incorporato di riassunto markdown generato da literature-analysis, il Workflow lo caricherà automaticamente come contesto facoltativo per migliorare la qualità dell'inferenza.

### Metodi di attivazione

- Selezionare direttamente uno o più elementi di Zotero (elementi padre)
- Dopo aver selezionato gli elementi, scegliere "Regolatore dei tag" dal menu contestuale

## Flusso di esecuzione

```
1. Carica il vocabolario controllato
   └── Legge tagVocabularyJson dalle preferenze di Zotero
       └── Analizza l'elenco dei tag validi nel vocabolario

2. Costruisci la richiesta
   └── Raccoglie i metadati dell'elemento padre e l'elenco dei tag correnti
       └── Scrive il vocabolario controllato in un file YAML temporaneo
       └── Carica su Skill-Runner

3. Elaborazione di Skill-Runner
   └── Invoca skill_id: "tag-regulator"
       └── Verifica la conformità dei tag
       └── Genera i tag suggeriti (suggest_tags)

4. Restituisci i risultati
   └── Applica le modifiche ai tag (rimuove i tag non conformi, aggiunge i tag raccomandati)
       └── Riconcilia i tag suggeriti rispetto al vocabolario locale corrente
       └── Elabora i tag suggeriti (interazione popup)
```

### Logica di elaborazione dei tag

- **remove_tags**: I tag correnti non presenti nel vocabolario controllato verranno rimossi
- **add_tags**: Tag inferiti dai metadati, aggiunti direttamente all'elemento
- **suggest_tags**: Nuovi tag suggeriti dall'AI, richiedono la conferma dell'utente
- **digest_markdown**: Contesto di arricchimento facoltativo, caricato solo quando esiste un payload incorporato di riassunto markdown

### Regole di sincronizzazione in tempo reale

Quando i risultati vengono restituiti, viene letto lo stato locale più recente:

- Se un `suggest_tag` è già entrato nel vocabolario controllato, non viene mostrato alcun popup; partecipa all'aggiornamento dell'elemento con la semantica di `add_tags`
- Se un `suggest_tag` è già nell'area di staging, non verrà scritto di nuovo nell'area di staging
- Solo i suggerimenti che rimangono non elaborati entreranno nel popup

### Durata stimata

| Scenario | Tempo stimato per articolo |
|----------|--------------------------|
| Senza riassunto (Analisi della letteratura non eseguita) | Circa 1 minuto |
| Con riassunto (Analisi della letteratura già eseguita) | 1-3 minuti |

Se l'elemento ha già un riassunto, l'AI utilizzerà il riassunto come contesto aggiuntivo, risultando in un'inferenza più precisa ma più lunga.

### Popup dei tag suggeriti

Per i `suggest_tags`, una finestra di dialogo chiede all'utente come gestirli:

- **Aggiungi**: Aggiungi direttamente al vocabolario controllato
- **Metti in staging**: Posiziona nell'area di staging per una revisione successiva
- **Rifiuta**: Ignora il suggerimento
- **Aggiungi tutti / Metti in staging tutti / Rifiuta tutti**: Elaborazione in batch

La finestra di dialogo ha un conto alla rovescia automatico di 10 secondi per il staging; se scaduto, i suggerimenti vengono automaticamente messi in staging.

## Output

### 1. Modifiche ai tag
- **remove_tags**: Rimuove dall'elemento i tag non presenti nel vocabolario
- **add_tags**: Aggiunge i tag raccomandati all'elemento
- Applicati direttamente agli elementi di Zotero selezionati

### 2. Elaborazione dei tag suggeriti
- L'utente sceglie come gestirli tramite popup
- Tag accettati: Aggiunti alla preferenza `tagVocabularyJson`
- Tag in staging: Aggiunti alla preferenza `tagVocabularyStagedJson`

## Raccomandazioni sul modello

🟢 È sufficiente un modello leggero — la regolazione dei tag è essenzialmente un semplice compito di classificazione e corrispondenza che non richiede il modello più potente.

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|-----------|------|-------------|-------------|
| `infer_tag` | boolean | Se abilitare l'inferenza dei tag | `true` |
| `valid_tags_format` | string | Formato del vocabolario | `yaml` |
| `tag_note_language` | string | Lingua per le descrizioni dei suggerimenti | `zh-CN` |

### Valori disponibili per valid_tags_format

- `yaml`: Usa il formato YAML
- `json`: Usa il formato JSON
- `auto`: Rileva automaticamente

## Dipendenze

- **Vocabolario controllato**: È necessario creare prima un vocabolario controllato; vedi [Gestione dei tag](../synthesis/tags)
- **Backend**: Servizio Skill-Runner
- **Configurazione del backend**: Configurare un backend di tipo Skill-Runner nel Backend Manager
- **Skill**: La skill `tag-regulator` deve essere distribuita sul Skill-Runner

## Workflow correlati

- [Gestione dei tag](../synthesis/tags) — Gestisci il vocabolario controllato dei tag
