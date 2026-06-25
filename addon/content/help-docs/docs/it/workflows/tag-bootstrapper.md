# Bootstrapper dei tag

## Scopo

Creare in modo interattivo un vocabolario controllato di tag per un dominio di ricerca con l'AI. Si consiglia di eseguirlo prima della tua prima [Analisi della letteratura](#doc/workflows%2Fliterature-analysis) per stabilire una base per la successiva regolazione automatica dei tag.

## Casi d'uso

- Iniziare una nuova direzione di ricerca e aver bisogno di stabilire un sistema di tag
- Non esiste ancora un vocabolario controllato di tag nella libreria corrente di Zotero
- Voler che l'AI aiuti a progettare una classificazione di tag specifica per il dominio

## Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | workflow (non è necessario selezionare elementi) |
| Metodo di attivazione | Esegui dalla Dashboard |

## Flusso di esecuzione

```
1. Avvia l'interazione
   └── Dialoga con l'AI nella Dashboard

2. Definisci il dominio
   └── Descrivi il tuo campo di ricerca e le aree di interesse
       └── L'AI propone un sistema di classificazione dei tag

3. Raffinamento iterativo
   └── Esamina i tag suggeriti dall'AI
       └── Adatta, aggiungi, rimuovi, rinomina

4. Conferma e scrivi
   └── Scrivi il vocabolario finale dei tag nel sistema di Sintesi
```

### Dettagli dell'interazione

- Il Workflow viene eseguito in modalità **interattiva**, dialogando con l'AI nella Dashboard
- Puoi adattare la direzione in qualsiasi momento durante la conversazione

## Durata stimata

| Scenario | Tempo stimato |
|----------|--------------|
| Creazione del vocabolario iniziale | 3-8 minuti |
| Aggiunta di tag | 3-5 minuti |

## Raccomandazioni sul modello

🟢 È sufficiente un modello di capacità media; non è necessario il modello più potente.

## Output

Dopo il completamento dell'esecuzione, il vocabolario controllato dei tag viene scritto nel sistema di Sintesi e può essere visualizzato e gestito nella pagina Tag del Synthesis Workbench.

## Parametri

| Parametro | Tipo | Descrizione | Predefinito |
|-----------|------|-------------|-------------|
| `tag_note_language` | string | Lingua delle note dei tag | `zh-CN` |

Valori disponibili: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. È supportato anche l'inserimento personalizzato.

## Dipendenze

- **Backend**: Servizio Skill-Runner
- **Configurazione del backend**: Configurare un backend di tipo Skill-Runner nel Backend Manager
- **Skill**: La skill `tag-bootstrapper` deve essere distribuita sul Skill-Runner

## Workflow correlati

- [Analisi della letteratura](#doc/workflows%2Fliterature-analysis) — Può attivare automaticamente la regolazione dei tag a cascata durante l'analisi
- [Regolatore dei tag](#doc/workflows%2Ftag-regulator) — Esegui la regolazione dei tag sulla letteratura esistente
