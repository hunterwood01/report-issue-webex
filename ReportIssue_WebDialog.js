/**
 * ============================================================
 *  Report Issue -> Webex Webhook
 *  Flusso: Panel click -> TextInput nome -> Prompt categoria
 *          -> TextInput dettagli -> WebView OSD autosubmit
 *
 *  - Tastiera nativa sul Touch panel
 *  - WebView di conferma sulla TV (OSD)
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

// Apre WebView di conferma sulla TV (OSD) con i dati nell'URL
async function openConfirmWebView(details) {
  const room = await getRoomName();
  const params = new URLSearchParams({
    name: session.name,
    room: room,
    category: session.category,
    details: details || '',
    webhook: CONFIG.WEBHOOK_URL,
    autosubmit: '1',
  });
  const url = CONFIG.PAGE_URL + '?' + params.toString();

  // Target: OSD -> apre sulla TV/schermo principale
  // Il Touch panel rimane libero e mostra il pannello normale
  xapi.Command.UserInterface.WebView.Display({
    Url: url,
    Target: 'OSD',
  });
}

// Chiude WebView OSD (es. dopo 5s dal success, gestito dalla pagina)
function closeWebView() {
  xapi.Command.UserInterface.WebView.Clear({ Target: 'OSD' });
}

// --- Listener pannello ---
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(event => {
  if (event.PanelId !== 'report_issue') return;
  askName();
});

// --- Listener TextInput ---
xapi.Event.UserInterface.Message.TextInput.Response.on(event => {
  if (event.FeedbackId !== 'ri_input') return;
  if (session.step === 'name') {
    session.name = event.Text.trim() || 'Anonimo';
    askCategory();
  } else if (session.step === 'details') {
    openConfirmWebView(event.Text.trim());
  }
});

xapi.Event.UserInterface.Message.TextInput.Clear.on(event => {
  if (event.FeedbackId !== 'ri_input') return;
  if (session.step === 'name') {
    session.step = null;
  } else if (session.step === 'details') {
    // Premiuto Annulla: invia senza dettagli
    openConfirmWebView('');
  }
});

// --- Listener Prompt categoria ---
xapi.Event.UserInterface.Message.Prompt.Response.on(event => {
  if (event.FeedbackId !== 'ri_category') return;
  const cats = {
    '1': 'Audio / Video',
    '2': 'Qualcosa nella sala',
    '3': 'Rete / Connettivita',
    '4': 'Altro',
  };
  session.category = cats[event.OptionId] || 'Altro';
  askDetails();
});

xapi.Event.UserInterface.Message.Prompt.Cleared.on(event => {
  if (event.FeedbackId !== 'ri_category') return;
  session.step = null;
});

console.log('[Report Issue] Macro avviata - OSD attivo');
