# Report Issue → Webex Webhook

Macro RoomOS con interfaccia grafica (web dialog) ospitata su **GitHub Pages**.
Invia le segnalazioni a uno spazio Webex tramite Incoming Webhook.

## Come funziona

1. L'utente preme **"Segnala Problema"** sul Touch Panel
2. Si apre un web dialog grafico con logo Cisco
3. L'utente inserisce nome/cognome, seleziona la categoria e aggiunge dettagli
4. Il messaggio viene inviato al webhook Webex

## File

| File | Descrizione |
|------|-------------|
| `index.html` | Interfaccia grafica (servita da GitHub Pages) |
| `ReportIssue_WebDialog.js` | Macro da caricare sul dispositivo Cisco |
| `ReportIssue_Panel.xml` | Pannello UI (pulsante home) |

## Deploy

1. Abilita **GitHub Pages** in: Settings → Pages → Branch: main
2. Carica `ReportIssue_WebDialog.js` nel **Macro Editor** del dispositivo
3. Carica `ReportIssue_Panel.xml` nell'**UI Extensions Editor**
4. Attiva la macro

## URL GitHub Pages

https://hunterwood01.github.io/report-issue-webex/
