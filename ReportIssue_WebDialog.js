/**
 * ============================================================
 *  Report Issue → Webex Webhook
 *  Approccio: tastiera nativa RoomOS PRIMA della WebView
 *  Flusso: Panel click → TextInput nome → TextInput dettagli
 *          → WebView di conferma con tutti i dati nell'URL
 * ============================================================ */

import xapi from 'xapi';

const CONFIG = {
  PAGE_URL: 'https://hunterwood01.github.io/report-issue-webex/',
  WEBHOOK_URL: 'https://webexapis.com/v1/webhooks/incoming/Y2lzY29zcGFyazovL3VzL1dFQkhPT0svZGZiMmUxY2QtOGY4Ny00MmU0LWFlMDUtM2VkOWIzZTAyOGZk',
};

// Stato sessione
let session = {
  step: null,  // 'name' | 'category' | 'details'
  name: '',
  category: '',
};

async function getRoomName() {
  try { return await xapi.Status.UserInterface.ContactInfo.Name.get(); }
  catch(e) { return 'Sala sconosciuta'; }
}

// Step 1: chiede il nome
async function askName() {
  session = { step: 'name', name: '', category: '' };
  xapi.Command.UserInterface.Message.TextInput.Display({
    FeedbackId: 'ri_input',
    Title: 'Segnala un problema',
    Text: 'Inserisci il tuo nome e cognome',
    Placeholder: 'Es. Mario Rossi',
    InputType: 'SingleLine',
    KeyboardState: 'Open',
    SubmitText: 'Continua →',
    Duration: 0,
  });
}

// Step 2: chiede la categoria via prompt
function askCategory() {
  session.step = 'category';
  xapi.Command.UserInterface.Message.Prompt.Display({
    FeedbackId: 'ri_category',
    Title: 'Cosa non va?',
    Text: 'Seleziona la categoria del problema',
    'Option.1': '🔊 Audio / Video',
    'Option.2': '💡 Qualcosa nella sala',
    'Option.3': '🌐 Rete / Connettività',
    'Option.4': '❓ Altro',
  });
}

// Step 3: chiede i dettagli
function askDetails() {
  session.step = 'details';
  xapi.Command.UserInterface.Message.TextInput.Display({
    FeedbackId: 'ri_input',
    Title: 'Dettagli aggiuntivi',
    Text: `Problema: ${session.category}\nAggiungi dettagli (opzionale)`,
    Placeholder: 'Es. Il microfono non funziona durante le chiamate...',
    InputType: 'MultiLine',
    KeyboardState: 'Open',
    SubmitText: 'Invia segnalazione',
    Duration: 0,
  });
}

// Apre la WebView di conferma passando i dati nell'URL
async function openConfirmWebView(details) {
  const room = await getRoomName();
  const params = new URLSearchParams({
    name: session.name,
    room,
    category: session.category,
    details: details || '',
    webhook: CONFIG.WEBHOOK_URL,
    autosubmit: '1',
  });
  const url = `${CONFIG.PAGE_URL}?${params.toString()}`;
  xapi.Command.UserInterface.WebView.Display({
    Url: url,
    Mode: 'Modal',
  });
}

// Chiude la WebView
function closeWebView() {
  try {
    xapi.Command.UserInterface.WebView.Clear({ Target: 'Modal' });
  } catch(e) {
    xapi.Command.UserInterface.WebView.Clear();
  }
}

// --- Listener pulsante pannello ---
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
    // Annullato al primo step: non fare nulla
    session.step = null;
  } else if (session.step === 'details') {
    // Salta i dettagli e invia senza
    openConfirmWebView('');
  }
});

// --- Listener Prompt (categoria) ---
xapi.Event.UserInterface.Message.Prompt.Response.on(event => {
  if (event.FeedbackId !== 'ri_category') return;
  const cats = {
    '1': 'Audio / Video',
    '2': 'Qualcosa nella sala',
    '3': 'Rete / Connettività',
    '4': 'Altro',
  };
  session.category = cats[event.OptionId] || 'Altro';
  askDetails();
});

xapi.Event.UserInterface.Message.Prompt.Cleared.on(event => {
  if (event.FeedbackId !== 'ri_category') return;
  session.step = null; // annullato
});

// --- Listener chiusura WebView dal pulsante X nella pagina ---
// La pagina usa HttpClient per segnalare la chiusura (vedi sotto)
// oppure si auto-chiude dopo 5s dal success
console.log('[Report Issue] Macro avviata — flusso tastiera nativa attivo');
