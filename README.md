# Report Issue - Webex Webhook per dispositivi Cisco RoomOS

Questa soluzione permette agli utenti in sala riunioni di segnalare problemi direttamente dal pannello Touch Cisco, inviando una notifica via webhook a uno spazio Webex.

## Flusso utente

1. Utente preme **Segnala Problema** sulla home screen del Touch panel
2. Si apre la pagina web su **Touch panel (Controller) e TV (OSD)** contemporaneamente
3. Tocca il campo Nome → si apre la **tastiera nativa RoomOS**
4. Seleziona la categoria del problema
5. Aggiunge dettagli opzionali (tastiera nativa)
6. Preme **Invia Segnalazione** → messaggio Webex inviato
7. Pagina si chiude automaticamente dopo 6 secondi

Il pulsante **Chiudi Pagina** (rosso) sulla home screen chiude la WebView in qualsiasi momento.

## File

| File | Descrizione |
|------|-------------|
| `ReportIssue_WebDialog.js` | Macro RoomOS - gestisce apertura/chiusura WebView |
| `ReportIssue_Panel.xml` | Pannello UI Extensions - pulsanti home screen |
| `index.html` | Pagina web (deve essere hostata su GitHub Pages) |

## Setup sul dispositivo (una tantum)

### 1. Abilita WebSocket xAPI
Da SSH o dalla web interface del device:
```
xConfiguration NetworkServices HTTP Mode: HTTP+HTTPS
xConfiguration NetworkServices Websocket: FollowHTTPService
xConfiguration Security Xapi WebSocket ApiKey Allowed: True
xConfiguration WebEngine Features Xapi Peripherals AllowedHosts Hosts: hunterwood01.github.io
```

### 2. Carica la macro
- Apri il **Macro Editor** sul device
- Crea una nuova macro e incolla il contenuto di `ReportIssue_WebDialog.js`
- Salva e attiva

### 3. Carica il pannello
- Apri **UI Extensions Editor**
- Importa `ReportIssue_Panel.xml`
- Esporta sul device

### 4. Configura webhook
Modifica `WEBHOOK_URL` in `ReportIssue_WebDialog.js` con il tuo webhook Webex.

## Note tecniche

- La pagina usa **jsxapi** (libreria ufficiale Cisco) per connettersi all'xAPI locale tramite WebSocket
- La tastiera nativa viene aperta tramite `xapi.Command.UserInterface.Message.TextInput.Display`
- La WebView viene chiusa tramite `xapi.Command.UserInterface.WebView.Clear` direttamente dalla pagina
- Il motore JS della macro e' **QuickJS** - non supporta `URLSearchParams`, arrow functions nei listener, ne' newline nei parametri xAPI
