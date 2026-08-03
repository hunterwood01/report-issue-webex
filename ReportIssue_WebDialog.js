/**
 * ============================================================
 *  Report Issue -> Webex Webhook  (RoomOS Macro)
 *
 *  Flusso:
 *    1. Pulsante "Segnala Problema" -> apre WebView su OSD + Controller
 *    2. L'utente compila il form HTML (tastiera HTML nativa)
 *    3. La pagina invia il webhook autonomamente
 *    4. La pagina chiude tramite CustomEvent Signal 'close_webview'
 *       oppure la macro chiude dopo CLOSE_DELAY_MS dal segnale
 *    5. Pulsante "Chiudi Pagina" -> closeAndReset() immediato
 * ============================================================ */

import xapi from 'xapi';

const CONFIG = {
  PAGE_URL:     'https://hunterwood01.github.io/report-issue-webex/',
  WEBHOOK_URL:  'https://webexapis.com/v1/webhooks/incoming/Y2lzY29zcGFyazovL3VzL1dFQkhPT0svZGZiMmUxY2QtOGY4Ny00MmU0LWFlMDUtM2VkOWIzZTAyOGZk',
  CLOSE_DELAY_MS: 7000,
};

var closeTimer = null;

async function getRoomName() {
  try { return await xapi.Status.UserInterface.ContactInfo.Name.get(); }
  catch(e) { return 'Sala sconosciuta'; }
}

function buildQS(obj) {
  return Object.keys(obj)
    .map(function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); })
    .join('&');
}

function closeAndReset() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  try { xapi.Command.UserInterface.WebView.Clear({ Target: 'OSD' }); } catch(e) {}
  try { xapi.Command.UserInterface.WebView.Clear({ Target: 'Controller' }); } catch(e) {}
  console.log('[ReportIssue] Chiuso');
}

async function openWebView() {
  var room = await getRoomName();
  var url = CONFIG.PAGE_URL + '?' + buildQS({ room: room, webhook: CONFIG.WEBHOOK_URL });
  xapi.Command.UserInterface.WebView.Display({ Url: url, Target: 'OSD' });
  xapi.Command.UserInterface.WebView.Display({ Url: url, Target: 'Controller' });
  console.log('[ReportIssue] WebView aperta');
}

// --- Pulsanti pannello ---
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(function(e) {
  if (e.PanelId === 'report_issue')       { openWebView(); }
  if (e.PanelId === 'report_issue_close') { closeAndReset(); }
});

// --- Segnale di chiusura dalla pagina HTML ---
// La pagina tenta window.xapi.Command.UserInterface.Extensions.Event.Send
// ma non avendo jsxapi connesso, come fallback usiamo un timer dal momento
// in cui la WebView viene aperta: se dopo CLOSE_DELAY_MS e' ancora aperta, la chiudiamo.
// Per la chiusura immediata dopo l'invio la pagina usa window.close() (funziona su RoomOS WebEngine).
//
// In alternativa, la macro fa polling sullo stato WebView ogni 2s dopo l'apertura.
xapi.Event.UserInterface.Extensions.Event.Received.on(function(e) {
  if (e.Signal === 'close_webview') {
    console.log('[ReportIssue] Segnale chiusura ricevuto dalla pagina');
    closeAndReset();
  }
});

console.log('[ReportIssue] Macro pronta');
