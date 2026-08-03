/**
 * ============================================================
 *  Report Issue → Web Dialog → Webex Webhook
 *  Macro RoomOS — apre il web dialog ospitato su GitHub Pages
 * ============================================================ */

import xapi from 'xapi';

// URL della pagina GitHub Pages
const DIALOG_URL = 'https://hunterwood01.github.io/report-issue-webex/';

async function getRoomName() {
  try {
    return await xapi.Status.UserInterface.ContactInfo.Name.get();
  } catch(e) {
    return 'Sala sconosciuta';
  }
}

xapi.Event.UserInterface.Extensions.Panel.Clicked.on(async event => {
  if (event.PanelId !== 'report_issue') return;
  const room = await getRoomName();
  const url = `${DIALOG_URL}?roomname=${encodeURIComponent(room)}`;
  xapi.Command.UserInterface.WebView.Display({
    Url: url,
    Mode: 'Modal',
  });
});

console.log('[Report Issue] Macro avviata — Web Dialog su GitHub Pages');
