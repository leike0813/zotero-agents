# Lettore Markdown Integrato

## Panoramica

Il plugin include un lettore Markdown leggero. Quando **fai doppio clic su qualsiasi allegato `.md`** in Zotero, si apre automaticamente nel lettore integrato, eliminando la necessità di passare a un'applicazione esterna.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/markdown-reader.webp" alt="Pagina del Lettore Markdown Integrato" title="Pagina del Lettore Markdown Integrato" loading="lazy" /><figcaption>Pagina del Lettore Markdown Integrato</figcaption></figure>

Il lettore è abilitato per impostazione predefinita. Per disabilitarlo (ripristinando l'apritore predefinito di sistema), deseleziona l'opzione in **Preferenze → Generale**.

## Funzionalità

### Navigazione della Struttura

La barra laterale sinistra analizza automaticamente i livelli di intestazione (h1–h4) dal documento. Clicca su qualsiasi intestazione per saltare rapidamente alla sezione corrispondente.

### Ricerca nel Testo Completo

La casella di ricerca nella barra degli strumenti supporta la ricerca di parole chiave con evidenziazione delle occorrenze.

### Rendering Markdown

- **Blocchi di Codice**: Evidenziazione della sintassi highlight.js per i principali linguaggi di programmazione
- **Formule Matematiche**: Rendering KaTeX per formule LaTeX, supportando sia la visualizzazione inline che a blocco
- **Tabelle, Elenchi, Citazioni**: Supporto completo per la sintassi Markdown standard
- **Immagini**: Le immagini con percorso relativo vengono caricate automaticamente

### Dimensione Carattere e Larghezza

- **Regolazione Dimensione Carattere**: Regolabile da 12px a 24px; clicca sui pulsanti +/- nella barra degli strumenti per regolare in modo incrementale
- **Larghezza di Lettura**: Supporta le modalità stretta (860px) e larga (1160px) per diverse dimensioni dello schermo

### Azioni della Barra degli Strumenti

| Pulsante | Funzione |
|--------|----------|
| Casella di Ricerca | Ricerca di parole chiave nel testo completo |
| Aggiorna | Rilegge il file e renderizza nuovamente |
| Copia Markdown | Copia il contenuto Markdown grezzo negli appunti |
| Copia Percorso | Copia il percorso del file negli appunti |
| Dimensione Carattere - | Diminuisce la dimensione del carattere |
| Dimensione Carattere + | Aumenta la dimensione del carattere |
| Commutazione Larghezza | Passa tra la modalità di lettura stretta/larga |
| Torna in Cima | Scorrimento fluido verso l'alto del documento |
| Apri Esternamente | Apre il file con l'applicazione predefinita di sistema |

### Tematizzazione Automatica

Il lettore si adatta automaticamente al tema chiaro/scuro di Zotero senza necessità di commutazione manuale.

## Preferenze

In **Zotero → Impostazioni → Zotero Agents → Generale**:

- **Abilita Lettore Markdown Integrato**: Quando selezionato, il doppio clic sugli allegati `.md` li apre nel lettore integrato; quando deselezionato, viene ripristinato l'apritore predefinito di sistema.

## Note Tecniche

- Motore di rendering: `markdown-it` + KaTeX + highlight.js
- Sicurezza: La sanitizzazione HTML integrata rimuove tag non sicuri e gestori di eventi come script/style/iframe
- Tipi di file supportati: `.md`, `.markdown` (rilevati sia per estensione del file che per tipo MIME)
