# Guida all'Installazione

## Requisiti di Sistema

- **Zotero**: 7.0 o successivo (Zotero 9 consigliato)
- **Piattaforma**: Windows 10+, macOS 12+, Linux (x86_64 / x86 / ARM64 / ARM)

> **Informazioni sulle Versioni di Zotero**: Questo plugin è sviluppato e testato su Zotero 9. Zotero 8 è teoricamente pienamente supportato (il framework del plugin non ha cambiamenti significativi tra Zotero 8/9); Zotero 7 dovrebbe essere supportato in teoria ma non è stato testato approfonditamente a causa di risorse limitate. La manutenzione futura si concentrerà su Zotero 9. Se incontri problemi su Zotero 7, segnalali su [Issues](https://github.com/leike0813/zotero-agents/issues).

## Installazione del Plugin

### Da GitHub/Gitee Release (Consigliato)

1. Visita [GitHub Releases](https://github.com/leike0813/zotero-agents/releases) o [Mirror Releases Gitee](https://gitee.com/leike0813/zotero-agents/releases)
2. Scarica il file `.xpi` più recente
3. In Zotero, apri **Strumenti → Componenti aggiuntivi**
4. Clicca sull'icona dell'ingranaggio e seleziona **Installa componente aggiuntivo da file...**
5. Seleziona il file `.xpi` scaricato

### Tramite Zotero Plugin Marketplace

Se hai installato il plugin [Zotero Plugin Marketplace](https://github.com/syt2/zotero-addons), puoi cercare e installare Zotero Agents direttamente dal marketplace:

1. Clicca sull'icona <figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/zotero-addons_icon.webp" alt="" title="" loading="lazy" /></figure> nella barra degli strumenti di Zotero per aprire il marketplace
2. Cerca **Zotero Agents**
3. Clicca su installa

### Compilazione da Sorgente

```bash
git clone https://github.com/leike0813/zotero-agents.git
cd zotero-agents
npm install
npm run build
```

L'output di compilazione si trova nella directory `.scaffold/build/`.

## Installazione dei Pacchetti di Workflow Ufficiali

Il plugin viene distribuito **senza logica di business integrata**. Tutti i workflow sono forniti tramite pacchetti di workflow ufficiali separati.

### Metodo 1: Installazione da Menu (Consigliato)

1. Dopo aver riavviato Zotero, fai clic destro su qualsiasi elemento → **Zotero Agents** → **📦 Installa Pacchetti di Workflow Ufficiali**
2. Il plugin scarica automaticamente gli ultimi pacchetti ufficiali da GitHub / Gitee
3. Una notifica di successo appare al completamento; tutti i workflow ufficiali saranno quindi visibili nella Dashboard

### Metodo 2: Installazione dalle Preferenze

1. Apri **Zotero → Impostazioni → Zotero Agents**
2. Nella sezione **Impostazioni Workflow**, clicca su **Installa Pacchetti di Workflow Ufficiali**
3. Puoi anche cambiare il canale di aggiornamento (stabile / beta / dev) qui e verificare la presenza di aggiornamenti

### Meccanismo di Aggiornamento

- Il plugin verifica automaticamente la presenza di nuove versioni dei pacchetti ufficiali all'avvio
- Una finestra di dialogo di conferma appare quando è disponibile una nuova versione
- L'elenco dei workflow viene automaticamente ricaricato dopo l'aggiornamento

Repository dei Pacchetti di Workflow Ufficiali: [GitHub](https://github.com/leike0813/zotero-agents-workflows) · [Mirror Gitee](https://gitee.com/leike0813/zotero-agents-workflows)

## Verifica dell'Installazione

1. Riavvia Zotero
2. Dovresti vedere l'icona **Zotero Agents** nella barra degli strumenti di Zotero
3. Fai clic destro su qualsiasi elemento — il sottomenu **Zotero Agents** dovrebbe apparire (con i workflow disponibili)

Se il menu contestuale mostra solo un'opzione **📦 Installa Pacchetti di Workflow Ufficiali**, i pacchetti ufficiali non sono ancora stati installati — segui le istruzioni sopra per installarli. Dopo l'installazione riuscita, procedi a [Primi Passi](#doc/getting-started) per configurare un backend ed eseguire il tuo primo workflow.
