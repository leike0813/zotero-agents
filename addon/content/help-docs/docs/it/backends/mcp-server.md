# Server MCP

## Panoramica

Il Server MCP (Model Context Protocol) è un servizio di protocollo integrato che espone la tua libreria Zotero e le funzionalità di Sintesi come oltre 40 strumenti MCP. I client compatibili con MCP (Claude Desktop, Cursor, estensioni VS Code, ecc.) possono accedere direttamente ai dati di Zotero.

Il Server MCP condivide il registro sottostante delle funzionalità di Host Bridge, ma segue le specifiche del protocollo MCP (trasporto Streamable HTTP, JSON-RPC 2.0).

## Configurazione

Zotero → Impostazioni → Zotero Agents → Host Bridge → **Abilita Server MCP**

Un'unica casella di spunta attiva o disattiva il server. Abilitato per impostazione predefinita.

### Impostazioni non configurabili

| Impostazione | Valore | Motivo |
|-------------|--------|--------|
| Indirizzo di ascolto | `127.0.0.1` | Sicurezza: solo loopback |
| Validazione dell'origine | Rigida | Solo `127.0.0.1`, `localhost`, `[::1]` |
| Limite dimensione richiesta | 1 MB | Protezione della memoria |
| Protezione scrittura | Abilitata | Tutte le operazioni di scrittura richiedono approvazione |

## Sicurezza

- **Autenticazione con Bearer Token**: condivide lo stesso token di sessione/master con Host Bridge
- **Solo loopback**: nessun accesso remoto possibile
- **Validazione dell'origine**: le richieste cross-origin vengono rifiutate (403)
- **Limite di 1 MB**: i corpi troppo grandi vengono rifiutati con 413
- **Coda a thread singolo**: 1 in esecuzione + 8 in attesa, timeout di esecuzione di 45s, timeout di coda di 30s
- **Circuit breaker**: 3 fallimenti in 5 minuti → strumento in pausa per 60s

## Connessione dei client MCP

### Endpoint

```
http://127.0.0.1:<porta>/mcp
```

La porta viene assegnata automaticamente (intervallo 26370-26569). Controlla l'endpoint di Host Bridge nelle preferenze per la porta effettiva.

### Esempio di configurazione per Claude Desktop

```json
{
  "mcpServers": {
    "zotero-skills": {
      "type": "http",
      "url": "http://127.0.0.1:26370/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

Ottieni il token da Preferenze → Host Bridge → **Copia Master Token**.

### Dettagli del protocollo

- Trasporto: Streamable HTTP (`POST /mcp`)
- Versione: `2025-06-18`
- Identità del server: `zotero-skills` / `"Zotero Agents Context Broker"` v0.4.0
- `GET /mcp` → 405 (solo POST accettato)
- Richieste senza `id` → trattate come notifiche (nessuna risposta)
- `id: null` → esplicitamente non valido

## Inventario degli strumenti

<details>
<summary>Tutti i 40+ strumenti</summary>

### Strumenti di lettura

| Strumento | Descrizione |
|-----------|-------------|
| `get_current_view` | Informazioni sulla vista corrente di Zotero |
| `get_selected_items` | Riepiloghi degli elementi attualmente selezionati |
| `search_items` | Cerca elementi (limite ≤ 50) |
| `list_library_items` | Elenco paginato degli elementi |
| `get_item_detail` | Metadati completi dell'elemento |
| `get_item_notes` | Elenca le note figlie |
| `get_note_detail` | Leggi il corpo della nota (in blocchi, ≤16k caratteri per blocco) |
| `list_note_payloads` | Elenca i payload dei Workflow in una nota |
| `get_note_payload` | Leggi un payload |
| `get_item_attachments` | Elenca i manifest degli allegati (senza byte dei file) |
| `prepare_paper_reading_context` | Aggrega metadati, note, payload, allegati per un articolo |

### Strumenti di scrittura (richiedono approvazione)

| Strumento | Descrizione |
|-----------|-------------|
| `preview_mutation` | Visualizza l'anteprima di un'operazione di scrittura senza eseguirla |
| `update_item_fields` | Aggiorna i campi consentiti su un elemento |
| `add_item_tags` | Aggiungi tag a uno o più elementi |
| `remove_item_tags` | Rimuovi tag |
| `create_child_note` | Crea una nota figlia |
| `update_note` | Aggiorna il corpo di una nota |
| `create_markdown_note` | Crea una nota con HTML renderizzato + payload markdown in base64 |
| `update_markdown_note` | Aggiorna una nota esistente basata su markdown |
| `ingest_paper` | Acquisisci un articolo tramite DOI/arXiv/PMID/ISBN (con allegato PDF) |
| `add_items_to_collection` | Aggiungi elementi a una collezione |
| `remove_items_from_collection` | Rimuovi elementi da una collezione |

### Strumento diagnostico

| Strumento | Descrizione |
|-----------|-------------|
| `get_mcp_status` | Diagnostica del servizio: coda, circuit breaker, richieste recenti |

### Strumenti di sintesi

| Strumento | Descrizione |
|-----------|-------------|
| `topics.list` | Elenca tutti gli argomenti |
| `topics.find_by_paper_ref` | Trova gli argomenti tramite riferimento all'articolo |
| `topics.get_context` | Ottieni il contesto completo dell'argomento |
| `topics.get_review_input` | Assembla il pacchetto di revisione dell'argomento |
| `schemas.get` | Ottieni le definizioni degli schemi |
| `concepts.query` | Interroga la base di conoscenza dei concetti |
| `citation_graph.query_cluster` | Interroga il cluster di citazioni |
| `citation_graph.get_overview` | Ottieni la panoramica del grafo |
| `citation_graph.get_slice` | Estrai una porzione del sottografo |
| `citation_graph.get_metrics` | Calcola le metriche del grafo (pagerank, foundation, frontier) |
| `citation_graph.rank_external_references` | Classifica i riferimenti esterni |
| `citation_graph.rank_library_papers` | Classifica gli articoli della libreria |
| `library_index.get` | Indice paginato della libreria |
| `resolvers.resolve` | Risolvi i risolvitori di riferimenti/argomenti |
| `reference_index.get` | Ottieni l'indice dei riferimenti |
| `paper_artifacts.get_manifest` | Ottieni il manifesto degli artifact |
| `paper_artifacts.read` | Leggi il contenuto degli artifact |
| `paper_artifacts.export_filtered` | Esporta gli artifact filtrati |
| `paper_artifacts.resolve_topic_digest` | Risolvi il riassunto dell'argomento |
| `insights.get_attention_queue` | Ottieni la coda di attenzione |

</details>

## Protezione della scrittura

Gli strumenti di scrittura seguono lo stesso modello di approvazione di Host Bridge:

```
Il client MCP invoca uno strumento di scrittura
  │
  ├── Bearer Token validato
  ├── Ambito dello strumento estratto
  ├── Verifica dell'approvazione:
  │     ├── Strumento di sola lettura → esegui immediatamente
  │     ├── Scrittura pre-approvata → esegui immediatamente
  │     └── Approvazione necessaria → in coda all'interfaccia di Zotero
  └── Esegui / Rifiuta
```

Coda: massimo 50 approvazioni in attesa; >10 scritture rifiutate in 5 minuti → circuit breaker (disabilitato per 30s).

## Passi successivi

- [Host Bridge](#doc/backends%2Fhost-bridge) — Il trasporto sottostante e lo strumento CLI
- [Preferenze](#doc/preferences) — Visualizza le impostazioni del Server MCP
