# WebDAV Sync

## Panoramica

WebDAV Sync è il meccanismo di sincronizzazione multi-dispositivo per Synthesis Workbench, che sostituisce il deprecato Git Sync. Scambia snapshot deterministici di bundle di stato durevole tramite il protocollo WebDAV.

Funziona con qualsiasi server conforme a WebDAV (Nextcloud, ownCloud, Synology, ecc.). Non richiede Git.

## Prerequisiti

- Un server WebDAV accessibile
- Credenziali WebDAV (nome utente + password o token specifico per l'applicazione)

## Configurazione

Zotero → Impostazioni → Zotero Agents → WebDAV Sync

| Impostazione | Tipo | Predefinito | Descrizione |
|--------------|------|-------------|-------------|
| **Abilita WebDAV Sync** | boolean | `false` | Interruttore principale |
| **Base URL** | string | `""` | URL del server WebDAV, es. `https://nextcloud.example.com/remote.php/dav/files/user/` |
| **Remote Path** | string | `"zotero-agents"` | Directory remota sotto la base URL |
| **Username** | string | `""` | Nome utente WebDAV (opzionale) |
| **Password / App Token** | encrypted | `""` | Password o token (cifrato con AES-256-GCM) |
| **Auto Sync** | boolean | `false` | Attivare la sincronizzazione automaticamente dopo le modifiche di Synthesis |
| **Auto Retry** | boolean | `false` | Riprovare automaticamente i fallimenti transitori |

Pulsanti azione:

- **Salva impostazioni**: Persistere le impostazioni non relative alle credenziali
- **Salva credenziale**: Cifrare e memorizzare password/token
- **Test connessione**: Inviare una richiesta PROPFIND per verificare la connettività

## Layout dei file remoti

```
<remotePath>/
├── HEAD.json                           # Puntatore allo snapshot corrente
└── snapshots/
    └── <snapshotId>/
        ├── manifest.json               # Manifesto del bundle durevole
        └── bundles/                    # File bundle durevoli deterministici
```

**HEAD.json** contiene `snapshot_id`, `manifest_hash`, `updated_at`, `producer_version`. Gli snapshot vengono caricati completamente prima che HEAD venga aggiornato — le sincronizzazioni interrotte non corrompono mai il remoto.

## Cosa viene sincronizzato

| Sincronizzato | Non sincronizzato |
|---------------|-------------------|
| Argomenti | Database runtime SQLite |
| Concetti (concetti, sensi, alias, relazioni) | Log runtime |
| Grafo degli Argomenti (nodi, archi) | File workspace |
| Riferimenti (associazioni, reindirizzamenti) | Stato code e lock |
| Elementi di revisione | Proiezioni ricostruibili (layout citazioni, metriche, cache) |
| Tag (vocabolario controllato) | Credenziali |
| Elementi correlati | File temporanei |

## Flusso di sincronizzazione

```
idle → queued → syncing → idle
                 ├── blocked_conflict (richiede risoluzione manuale)
                 └── failed_retryable / failed_permanent
```

| Passo | Descrizione |
|-------|-------------|
| 1. HEAD | Leggere HEAD.json remoto |
| 2. Download | Scaricare manifesto + bundle se esiste uno snapshot più recente |
| 3. Anteprima | Validare lo snapshot importato, confrontare gli hash delle entità |
| 4. Controllo conflitti | Rilevare modifiche bilaterali |
| 5. Apply | Importare lo snapshot remoto nel Canonical Store locale |
| 6. Export | Esportare lo stato locale corrente come bundle |
| 7. Upload | Caricare manifesto + bundle |
| 8. Aggiornamento HEAD | Aggiornare HEAD.json per ultimo (ETag/If-Match per la sicurezza della concorrenza) |

## Gestione dei conflitti

Il rilevamento dei conflitti si basa sul confronto di hash a livello di entità. Un conflitto viene segnalato quando la stessa entità è cambiata sia localmente che remotamente.

**Tipi di conflitto:**

- Modifica bilaterale di un'entità
- Conflitto aggiornamento vs. tombstone
- Divergenza degli elementi di revisione
- Divergenza degli obiettivi di associazione/reindirizzamento dei riferimenti

**Azioni di risoluzione:**

| Azione | Descrizione |
|--------|-------------|
| `keep_local` | Mantenere lo stato locale, chiudere il gate del conflitto, accodare il prossimo export |
| `clear_after_manual_edit` | Dopo l'unione manuale, ri-validare; cancellare il marcatore di conflitto quando risolto |

Il pannello di sincronizzazione della pagina Home di Workbench mostra i dettagli del conflitto e i pulsanti di azione.

## Sicurezza

- **Crittografia delle credenziali**: AES-256-GCM, con chiave derivata dal master token di Host Bridge (PBKDF2-SHA256, 100.000 iterazioni)
- **Il testo in chiaro non viene mai restituito**: la credenziale non è leggibile dopo il salvataggio
- **Sanificazione URL**: le credenziali vengono rimosse dall'output dei log
- **HTTP Basic Auth**: Autenticazione Basic standard su HTTPS

## Limitazioni

| Limitazione | Dettaglio |
|-------------|-----------|
| **Manuale per impostazione predefinita** | Auto-sync e auto-retry sono disattivati per impostazione predefinita |
| **Nessuna compressione** | Gli snapshot v1 sono bundle JSON grezzi |
| **Nessuna pulizia dei vecchi snapshot** | Gli snapshot remoti si accumulano; è richiesta la pulizia manuale |
| **Nessuna unione a livello di campo** | I conflitti sono a livello di entità |
| **Assunzione di dispositivo singolo** | Scritture simultanee da più dispositivi possono causare conflitti |

## Prossimi passi

- [Dashboard Home](#doc/synthesis%2Fhome) — Visualizzare lo stato della sincronizzazione
- [Preferenze](#doc/preferences) — Configurare WebDAV Sync
- [Git Sync](#doc/synthesis%2Fgit-sync) (deprecato) — Riferimento storico
