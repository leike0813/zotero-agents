# Configurazione del backend Generic HTTP

## Scopo

Il backend Generic HTTP viene utilizzato per inviare richieste HTTP grezze a qualsiasi URL. Non esegue skill agent, ma funge da client HTTP generico.

## Caso d'uso principale: Analisi documenti MinerU

L'utilizzo principale del backend Generic HTTP è supportare il **Workflow MinerU** — un Workflow di analisi dei documenti PDF.

MinerU è un servizio di analisi documenti che converte file PDF in formato Markdown. Il Workflow MinerU invia richieste al servizio MinerU tramite il backend Generic HTTP per ottenere i risultati dell'analisi.

### Configurazione di MinerU

1. Visita [mineru.net](https://mineru.net) per registrare un account e ottieni un Token API dalla pagina **API → Gestione API**
2. Apri **Strumenti → [Backend Manager](backend-manager)**
3. Passa alla scheda **Generic HTTP**
4. Fai clic su **Aggiungi Generic HTTP**
5. Compila:

| Campo | Valore |
|-------|--------|
| Nome visualizzato | `MinerU Official` |
| URL di base | `https://mineru.net` |
| Autenticazione | `bearer` |
| Token di autenticazione | Incolla il tuo Token API |
| Timeout | `600000` (10 minuti) |

6. Fai clic su **Salva** nell'angolo in basso a destra

## Campi di configurazione

| Campo | Obbligatorio | Descrizione |
|-------|-------------|-------------|
| Nome visualizzato | Sì | Nome visualizzato per il backend |
| URL di base | Sì | Indirizzo di base del servizio HTTP |
| Bearer Token | No | Token di autenticazione |
| Timeout | No | Timeout della richiesta (millisecondi) |

## Dettagli tecnici

Il backend Generic HTTP supporta:
- **Richieste a passaggio singolo**: `generic-http.request.v1` — Invia una singola richiesta HTTP
- **Pipeline a più passaggi**: `generic-http.steps.v1` — Richieste concatenate con estrazione di percorsi JSON (espressioni `$.*`), che estraggono valori dalle risposte precedenti come parametri per le richieste successive
- **Caricamenti multipart**: Supporto per il caricamento di file
- Meccanismi di polling e retry

## Passi successivi

- [Scopri i Workflow](../workflows/) — I backend Generic HTTP sono utilizzati principalmente per Workflow specifici
