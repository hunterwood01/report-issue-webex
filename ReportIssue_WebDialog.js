/**
 * ============================================================
 *  Report Issue -> Webex Webhook
 *  Flusso: Panel click -> TextInput nome -> Prompt categoria
 *          -> TextInput dettagli -> WebView su TV + Touch
 *          -> chiusura automatica dopo CLOSE_DELAY_MS
 *
 *  Pulsanti Home Screen:
 *    report_issue       -> avvia il flusso
 *    report_issue_close -> chiude la WebView e torna alla home
 * ============================================================ */

import xapi from 'xapi';

const CONFIG = {
  PAGE_URL: 'https://hunterwood01.github.io/report-issue-webex/',
  WEBHOOK_URL: 'https://webexapis.com/v1/webhooks/incoming/Y2lzY29zcGFyazovL3VzL1dFQkhPT0svZGZiMmUxY2QtOGY4Ny00MmU0LWFlMDUtM2VkOWIzZTAyOGZk',
  CLOSE_DELAY_MS: 6000,
};

var session = {
  step: null,
  name: '',
  category: '',
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

// Chiude WebView su OSD e Controller e resetta la sessione
function closeAndReset() {
  // Cancella il timer automatico se attivo
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  // Chiudi WebView su entrambi i target
  try { xapi.Command.UserInterface.WebView.Clear({ Target: 'OSD' }); } catch(e) {}
  try { xapi.Command.UserInterface.WebView.Clear({ Target: 'Controller' }); } catch(e) {}
  // Chiudi eventuali dialog nativi aperti
  try { xapi.Command.UserInterface.Message.TextInput.Clear({ FeedbackId: 'ri_input' }); } catch(e) {}
  try { xapi.Command.UserInterface.Message.Prompt.Clear({ FeedbackId: 'ri_category' }); } catch(e) {}
  // Reset sessione
  session = { step: null, name: '', category: '' };
  console.log('[Report Issue] Sessione chiusa - tornato alla home');
}

// Step 1 - nome
function askName() {
  session = { step: 'name', name: '', category: '' };
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
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

// Apre WebView su TV e Touch, poi chiude automaticamente
async function openConfirmWebView(details) {
  var room = await getRoomName();
  var qs = buildQueryString({
    name: session.name,
    room: room,
    category: session.category,
    details: details || '',
    webhook: CONFIG.WEBHOOK_URL,
    autosubmit: '1',
  });
  var url = CONFIG.PAGE_URL + '?' + qs;

  xapi.Command.UserInterface.WebView.Display({ Url: url, Target: 'OSD' });
  xapi.Command.UserInterface.WebView.Display({ Url: url, Target: 'Controller' });

  console.log('[Report Issue] WebView aperta, chiusura automatica tra ' + (CONFIG.CLOSE_DELAY_MS / 1000) + 's');

  closeTimer = setTimeout(function() {
    closeAndReset();
  }, CONFIG.CLOSE_DELAY_MS);
}

// --- Listener pannello ---
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(function(event) {
  // Avvia flusso
  if (event.PanelId === 'report_issue') {
    askName();
    return;
  }
  // Chiude e torna alla home
  if (event.PanelId === 'report_issue_close') {
    closeAndReset();
    return;
  }
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

console.log('[Report Issue] Macro avviata - pulsante Chiudi Pagina attivo');
