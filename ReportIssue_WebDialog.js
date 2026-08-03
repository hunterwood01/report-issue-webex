/**
 * ============================================================
 *  Report Issue -> Webex Webhook
 *  Flusso: Panel click -> TextInput nome -> Prompt categoria
 *          -> TextInput dettagli -> WebView su TV + Touch
 * ============================================================ */

import xapi from 'xapi';

const CONFIG = {
  PAGE_URL: 'https://hunterwood01.github.io/report-issue-webex/',
  WEBHOOK_URL: 'https://webexapis.com/v1/webhooks/incoming/Y2lzY29zcGFyazovL3VzL1dFQkhPT0svZGZiMmUxY2QtOGY4Ny00MmU0LWFlMDUtM2VkOWIzZTAyOGZk',
};

let session = {
  step: null,
  name: '',
  category: '',
};

async function getRoomName() {
  try { return await xapi.Status.UserInterface.ContactInfo.Name.get(); }
  catch(e) { return 'Sala sconosciuta'; }
}

// Costruisce query string senza URLSearchParams (non supportato da QuickJS)
function buildQueryString(obj) {
  return Object.keys(obj)
    .map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
    })
    .join('&');
}

// Step 1 - nome
function askName() {
  session = { step: 'name', name: '', category: '' };
  xapi.Command.UserInterface.Message.TextInput.Display({
    FeedbackId: 'ri_input',
    Title: 'Segnala un problema',
    Text: 'Inserisci il tuo nome e cognome',
    Placeholder: 'Es. Mario Rossi',
    InputType: 'SingleLine',
    KeyboardState: 'Open',
    SubmitText: 'Continua',
    Duration: 0,
  });
}

// Step 2 - categoria
function askCategory() {
  session.step = 'category';
  xapi.Command.UserInterface.Message.Prompt.Display({
    FeedbackId: 'ri_category',
    Title: 'Cosa non va?',
    Text: 'Seleziona la categoria del problema',
    'Option.1': 'Audio / Video',
    'Option.2': 'Qualcosa nella sala',
    'Option.3': 'Rete / Connettivita',
    'Option.4': 'Altro',
  });
}

// Step 3 - dettagli
function askDetails() {
  session.step = 'details';
  xapi.Command.UserInterface.Message.TextInput.Display({
    FeedbackId: 'ri_input',
    Title: 'Dettagli aggiuntivi (opzionale)',
    Text: 'Aggiungi ulteriori informazioni sul problema',
    Placeholder: 'Es. Il microfono non funziona durante le chiamate',
    InputType: 'SingleLine',
    KeyboardState: 'Open',
    SubmitText: 'Invia segnalazione',
    Duration: 0,
  });
}

// Apre WebView su TV (OSD) e Touch panel (Controller)
async function openConfirmWebView(details) {
  const room = await getRoomName();
  const qs = buildQueryString({
    name: session.name,
    room: room,
    category: session.category,
    details: details || '',
    webhook: CONFIG.WEBHOOK_URL,
    autosubmit: '1',
  });
  const url = CONFIG.PAGE_URL + '?' + qs;

  // Apre sulla TV
  xapi.Command.UserInterface.WebView.Display({
    Url: url,
    Target: 'OSD',
  });

  // Apre anche sul Touch panel
  xapi.Command.UserInterface.WebView.Display({
    Url: url,
    Target: 'Controller',
  });
}

// Chiude WebView su entrambi i target
function closeWebView() {
  xapi.Command.UserInterface.WebView.Clear({ Target: 'OSD' });
  xapi.Command.UserInterface.WebView.Clear({ Target: 'Controller' });
}

// --- Listener pannello ---
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(function(event) {
  if (event.PanelId !== 'report_issue') return;
  askName();
});

// --- Listener TextInput ---
xapi.Event.UserInterface.Message.TextInput.Response.on(function(event) {
  if (event.FeedbackId !== 'ri_input') return;
  if (session.step === 'name') {
    session.name = event.Text.trim() || 'Anonimo';
    askCategory();
  } else if (session.step === 'details') {
    openConfirmWebView(event.Text.trim());
  }
});

xapi.Event.UserInterface.Message.TextInput.Clear.on(function(event) {
  if (event.FeedbackId !== 'ri_input') return;
  if (session.step === 'name') {
    session.step = null;
  } else if (session.step === 'details') {
    openConfirmWebView('');
  }
});

// --- Listener Prompt categoria ---
xapi.Event.UserInterface.Message.Prompt.Response.on(function(event) {
  if (event.FeedbackId !== 'ri_category') return;
  var cats = {
    '1': 'Audio / Video',
    '2': 'Qualcosa nella sala',
    '3': 'Rete / Connettivita',
    '4': 'Altro',
  };
  session.category = cats[event.OptionId] || 'Altro';
  askDetails();
});

xapi.Event.UserInterface.Message.Prompt.Cleared.on(function(event) {
  if (event.FeedbackId !== 'ri_category') return;
  session.step = null;
});

console.log('[Report Issue] Macro avviata - OSD + Controller attivi');
