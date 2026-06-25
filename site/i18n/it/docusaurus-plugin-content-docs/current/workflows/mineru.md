# Analisi PDF MinerU

## Scopo

Chiamare il servizio MinerU per analizzare documenti PDF, estraendo testo e immagini di alta qualità in Markdown, producendo file di nota direttamente leggibili.

MinerU è uno strumento di analisi PDF basato sul deep learning che estrae testo e figure di alta qualità dagli articoli accademici.

## Casi d'uso

- Convertire la letteratura in formato PDF in Markdown modificabile
- Preparare documenti di testo semplice per Workflow a valle (es. Analisi della letteratura, Lettura approfondita)
- Estrarre immagini e tabelle dai PDF

## Configurazione del backend MinerU

### 1. Registrare un account MinerU e ottenere un Token API

1. Visita [mineru.net](https://mineru.net) per registrare un account
2. Dopo l'accesso, vai alla pagina **API → Gestione API**
3. Crea o copia un Token API

### 2. Aggiungere un backend nel Backend Manager

1. Apri **Strumenti → [Backend Manager](../backends/backend-manager)**
2. Passa alla scheda **Generic HTTP**
3. Fai clic su **Aggiungi Generic HTTP**
4. Compila i seguenti campi:

| Campo | Valore |
|-------|--------|
| Nome visualizzato | `MinerU Official` (o qualsiasi nome a scelta) |
| URL di base | `https://mineru.net` |
| Metodo di autenticazione | `bearer` |
| Token di autenticazione | Incolla il Token API ottenuto nel passaggio precedente |
| Timeout | `60000` (60 secondi) |

5. Fai clic su **Salva** nell'angolo in basso a destra

## Vincoli di input

| Tipo di vincolo | Descrizione |
|-----------------|-------------|
| Unità di input | Allegato |
| Tipi accettati | `application/pdf` (solo PDF) |
| Rilevamento dei conflitti | Se esiste già un file `.md` con lo stesso nome nella stessa directory, il PDF viene saltato |

### Metodi di attivazione

- Selezionare direttamente uno o più allegati PDF
- Selezionare l'elemento padre e il plugin espanderà automaticamente gli allegati PDF figli

### Gestione dei conflitti

- Verifica se `<nome file PDF>.md` esiste nella directory di destinazione
- Se esiste, l'input viene saltato durante la preelaborazione
- Se tutti i candidati hanno conflitti, il Workflow non invia alcuna attività

## Flusso di esecuzione

```
1. Richiedi URL di caricamento
   └── POST all'API di MinerU per ottenere batch_id e upload_url

2. Carica il file
   └── Caricamento binario del file PDF

3. Polling per i risultati
   └── Interrogazioni ripetute fino al completamento o al fallimento dell'elaborazione
       └── Intervallo: 2 secondi

4. Scarica i risultati
   └── Scarica il bundle (formato zip)

5. Materializzazione locale
   └── Estrai il bundle
       └── Estrai il contenuto Markdown
       └── Estrai le immagini
       └── Riscrivi i percorsi delle immagini nel Markdown in percorsi relativi locali
       └── Scrivi nella stessa directory del PDF
```

## Output

### 1. File Markdown

- **Posizione**: Stessa directory del PDF
- **Denominazione**: `<nome file originale>.md`
- **Contenuto**: Testo Markdown analizzato
- **Codifica**: UTF-8

### 2. Directory delle immagini

- **Posizione**: Stessa directory del PDF: `Images_<ItemKey>/`
- **Contenuto**: File di immagini estratti dal PDF

### 3. Allegato collegato

- **Tipo**: Collegamento a file locale
- **Posizione**: Sotto l'elemento padre
- **Destinazione**: Il file `.md`

### Logica di pulizia

- Se `Images_<ItemKey>/` esiste già nella directory di destinazione, la vecchia directory viene eliminata prima della scrittura
- Evita di creare allegati collegati `.md` duplicati già esistenti

## Durata stimata

| Dimensione del PDF | Tempo stimato |
|--------------------|--------------|
| Articolo breve (≤15 pagine) | 30 secondi - 1 minuto |
| Standard (15-40 pagine) | 1-2 minuti |
| Articolo lungo (40+ pagine) | 2-3 minuti |

La durata dipende principalmente dalla velocità di elaborazione del servizio MinerU.

## Parametri

Il Workflow MinerU non ha parametri configurabili dall'utente.

## Raccomandazioni sul modello

Non è richiesto alcun modello LLM. Questo Workflow chiama solo il servizio MinerU tramite API HTTP.

## Dipendenze

- **Backend**: Servizio MinerU (backend Generic HTTP)
- **Configurazione del backend**: Configurare un backend di tipo Generic HTTP nel Backend Manager
- **Autenticazione**: È richiesto un Token API valido (Bearer token)
- **URL del servizio MinerU**: `https://mineru.net` o un'altra istanza distribuita

## Workflow correlati

- [Analisi della letteratura](literature-analysis) — Genera riassunti e analisi delle citazioni dal Markdown analizzato
