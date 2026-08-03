/**
 * ============================================================
 *  Report Issue -> Webex Webhook
 *
 *  Approccio: WebView aperta subito sul Touch (Controller) e TV (OSD)
 *  La pagina web usa jsxapi nativo (WebSocket locale) per aprire
 *  la tastiera nativa RoomOS direttamente dalla pagina.
 *
 *  Prerequisiti sul device (una tantum):
 *    xConfiguration Security Xapi WebSocket ApiKey Allowed: True
 *    xConfiguration WebEngine Features Xapi Peripherals AllowedHosts Hosts: hunterwood01.github.io
 *
 *  Pulsanti Home Screen:
 *    report_issue       -> apre WebView
 *    report_issue_close -> chiude WebView e resetta
 * ============================================================ */

import xapi from 'xapi';

const CONFIG = {
  PAGE_URL: 'https://hunterwood01.github.io/report-issue-webex/',
  WEBHOOK_URL: 'https://webexapis.com/v1/webhooks/incoming/Y2lzY29zcGFyazovL3VzL1dFQkhPT0svZGZiMmUxY2QtOGY4Ny00MmU0LWFlMDUtM2VkOWIzZTAyOGZk',
};

var closeTimer = null;

async function getRoomName() {
  try { return await xapi.Status.UserInterface.ContactInfo.Name.get(); }
  catch(e) { return 'Sala sconosciuta'; }
}

function buildQueryString(obj) {
  return Object.keys(obj)
    .map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
    })
    .join('&');
}

// Chiude WebView su OSD e Controller
function closeAndReset() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  try { xapi.Command.UserInterface.WebView.Clear({ Target: 'OSD' }); } catch(e) {}
  try { xapi.Command.UserInterface.WebView.Clear({ Target: 'Controller' }); } catch(e) {}
  console.log('[Report Issue] WebView chiusa');
}

// Apre WebView su TV e Touch passando room name e webhook nell'URL
async function openWebView() {
  var room = await getRoomName();
  var qs = buildQueryString({
    room: room,
    webhook: CONFIG.WEBHOOK_URL,
  });
  var url = CONFIG.PAGE_URL + '?' + qs;

  xapi.Command.UserInterface.WebView.Display({ Url: url, Target: 'OSD' });
  xapi.Command.UserInterface.WebView.Display({ Url: url, Target: 'Controller' });
  console.log('[Report Issue] WebView aperta su OSD + Controller');
}

// --- Listener pannello ---
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(function(event) {
  if (event.PanelId === 'report_issue') {
    openWebView();
    return;
  }
  if (event.PanelId === 'report_issue_close') {
    closeAndReset();
    return;
  }
});

// --- Listener chiusura da WebView (via xapi.Command.UserInterface.WebView.Clear dalla pagina) ---
// La pagina usa jsxapi nativo, non ha bisogno della macro per aprire la tastiera.
// La macro rimane in ascolto solo per i pulsanti fisici del pannello.

console.log('[Report Issue] Macro avviata - WebView con jsxapi nativo');
