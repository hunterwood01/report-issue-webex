/**
 * ============================================================
 *  Report Issue → Web Dialog → Webex Webhook
 *  Macro RoomOS — gestisce tastiera nativa via xAPI TextInput
 * ============================================================ */

import xapi from 'xapi';

const DIALOG_URL = 'https://hunterwood01.github.io/report-issue-webex/';

// Quale campo è in attesa di input ('name' | 'details' | null)
let pendingField = null;

async function getRoomName() {
  try {
    return await xapi.Status.UserInterface.ContactInfo.Name.get();
  } catch(e) {
    return 'Sala sconosciuta';
  }
}

// Apre il WebView modale
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(async event => {
  if (event.PanelId !== 'report_issue') return;
  const room = await getRoomName();
  const url = `${DIALOG_URL}?roomname=${encodeURIComponent(room)}`;
  xapi.Command.UserInterface.WebView.Display({
    Url: url,
    Mode: 'Modal',
  });
});

// Riceve messaggi dalla pagina web (postMessage)
xapi.Event.UserInterface.Extensions.Widget.Action.on(() => {});
xapi.Event.UserInterface.Message.TextInput.Response.on(event => {
  if (!pendingField) return;
  // Rimanda il testo inserito alla WebView
  xapi.Command.UserInterface.WebView.Send({
    Message: JSON.stringify({ type: 'textInput', field: pendingField, value: event.Text }),
  });
  pendingField = null;
});

xapi.Event.UserInterface.Message.TextInput.Clear.on(() => {
  if (!pendingField) return;
  xapi.Command.UserInterface.WebView.Send({
    Message: JSON.stringify({ type: 'textInput', field: pendingField, value: '' }),
  });
  pendingField = null;
});

// Riceve richieste di tastiera dalla WebView
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(() => {});
try {
  xapi.Event.UserInterface.WebView.Message.on(event => {
    let msg;
    try { msg = JSON.parse(event.Message); } catch(e) { return; }

    if (msg.type === 'openKeyboard') {
      pendingField = msg.field;
      xapi.Command.UserInterface.Message.TextInput.Display({
        FeedbackId: 'report_input',
        Title: msg.title || 'Inserisci testo',
        Text: msg.placeholder || '',
        Placeholder: msg.placeholder || '',
        InputType: 'SingleLine',
        KeyboardState: 'Open',
        SubmitText: 'Conferma',
        Duration: 0,
      });
    }

    if (msg.type === 'openKeyboardMultiline') {
      pendingField = msg.field;
      xapi.Command.UserInterface.Message.TextInput.Display({
        FeedbackId: 'report_input',
        Title: msg.title || 'Inserisci testo',
        Text: msg.placeholder || '',
        Placeholder: msg.placeholder || '',
        InputType: 'MultiLine',
        KeyboardState: 'Open',
        SubmitText: 'Conferma',
        Duration: 0,
      });
    }
  });
} catch(e) {
  console.log('[Report Issue] WebView.Message non disponibile su questa versione RoomOS');
}

console.log('[Report Issue] Macro avviata — tastiera nativa RoomOS attiva');
