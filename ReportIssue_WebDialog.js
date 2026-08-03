/**
 * ============================================================
 *  Report Issue -> Webex Webhook  (RoomOS Macro)
 *
 *  ARCHITETTURA IBRIDA:
 *  - La macro usa TextInput e Prompt NATIVI per raccogliere i dati
 *    (funziona su qualsiasi device: Room Bar, Codec, Board...)
 *  - La WebView viene aperta SOLO alla fine come pagina di conferma
 *    su TV (OSD) e Touch (Controller), poi si chiude automaticamente
 *
 *  Flusso:
 *    Panel click -> TextInput nome -> Prompt categoria
 *    -> TextInput dettagli -> POST webhook -> WebView conferma
 *    -> chiusura automatica dopo CLOSE_DELAY_MS
 *
 *  Pulsante "Chiudi Pagina" -> chiude in qualsiasi momento
 * ============================================================ */

import xapi from 'xapi';

const CONFIG = {
  PAGE_URL:       'https://hunterwood01.github.io/report-issue-webex/',
  WEBHOOK_URL:    'https://webexapis.com/v1/webhooks/incoming/Y2lzY29zcGFyazovL3VzL1dFQkhPT0svZGZiMmUxY2QtOGY4Ny00MmU0LWFlMDUtM2VkOWIzZTAyOGZk',
  CLOSE_DELAY_MS: 7000,
};

var session = { step: null, name: '', category: '' };
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

// --- Chiusura ---
function closeAndReset() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  try { xapi.Command.UserInterface.WebView.Clear({ Target: 'OSD' }); }        catch(e) {}
  try { xapi.Command.UserInterface.WebView.Clear({ Target: 'Controller' }); } catch(e) {}
  try { xapi.Command.UserInterface.Message.TextInput.Clear({ FeedbackId: 'ri_input' }); }    catch(e) {}
  try { xapi.Command.UserInterface.Message.Prompt.Clear({ FeedbackId: 'ri_category' }); }    catch(e) {}
  session = { step: null, name: '', category: '' };
  console.log('[ReportIssue] Reset');
}

// --- Step 1: chiede il nome ---
function askName() {
  session = { step: 'name', name: '', category: '' };
  xapi.Command.UserInterface.Message.TextInput.Display({
    FeedbackId:    'ri_input',
    Title:         'Segnala un problema',
    Text:          'Inserisci il tuo nome e cognome',
    Placeholder:   'Es. Mario Rossi',
    InputType:     'SingleLine',
    KeyboardState: 'Open',
    SubmitText:    'Continua',
    Duration:      0,
  });
}

// --- Step 2: chiede la categoria ---
function askCategory() {
  session.step = 'category';
  xapi.Command.UserInterface.Message.Prompt.Display({
    FeedbackId: 'ri_category',
    Title:      'Cosa non va?',
    Text:       'Seleziona la categoria del problema',
    'Option.1': 'Audio / Video',
    'Option.2': 'Qualcosa nella sala',
    'Option.3': 'Rete / Connettivita',
    'Option.4': 'Altro',
  });
}

// --- Step 3: chiede i dettagli ---
function askDetails() {
  session.step = 'details';
  xapi.Command.UserInterface.Message.TextInput.Display({
    FeedbackId:    'ri_input',
    Title:         'Dettagli aggiuntivi (opzionale)',
    Text:          'Aggiungi informazioni sul problema. Premi Invia per saltare.',
    Placeholder:   'Es. il microfono non funziona...',
    InputType:     'SingleLine',
    KeyboardState: 'Open',
    SubmitText:    'Invia segnalazione',
    Duration:      0,
  });
}

// --- Step 4: invia webhook e apre la WebView di conferma ---
async function sendAndConfirm(details) {
  var room = await getRoomName();
  var now  = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  var md   =
    '## Nuova Segnalazione\n\n' +
    '| Campo | Valore |\n|-------|--------|\n' +
    '| **Da** | ' + session.name + ' |\n' +
    '| **Sala** | ' + room + ' |\n' +
    '| **Categoria** | ' + session.category + ' |\n' +
    '| **Dettagli** | ' + (details || 'Nessun dettaglio') + ' |\n' +
    '| **Quando** | ' + now + ' |';

  // Invia webhook
  try {
    await xapi.Command.HttpClient.Post(
      { Url: CONFIG.WEBHOOK_URL, Header: ['Content-Type: application/json'], AllowInsecureHTTPS: 'True' },
      JSON.stringify({ markdown: md })
    );
    console.log('[ReportIssue] Webhook inviato');
  } catch(e) {
    console.error('[ReportIssue] Errore webhook: ' + e.message);
  }

  // Apre WebView di conferma (solo display, nessun input)
  var qs  = buildQS({
    name:     session.name,
    room:     room,
    category: session.category,
    details:  details || '',
    status:   'ok',
  });
  var url = CONFIG.PAGE_URL + '?' + qs;
  xapi.Command.UserInterface.WebView.Display({ Url: url, Target: 'OSD' });
  xapi.Command.UserInterface.WebView.Display({ Url: url, Target: 'Controller' });

  // Chiude automaticamente
  closeTimer = setTimeout(function() { closeAndReset(); }, CONFIG.CLOSE_DELAY_MS);
}

// --- Listener pulsanti pannello ---
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(function(e) {
  if (e.PanelId === 'report_issue')       { askName(); }
  if (e.PanelId === 'report_issue_close') { closeAndReset(); }
});

// --- Listener TextInput ---
xapi.Event.UserInterface.Message.TextInput.Response.on(function(e) {
  if (e.FeedbackId !== 'ri_input') return;
  if (session.step === 'name') {
    session.name = (e.Text || '').trim() || 'Anonimo';
    askCategory();
  } else if (session.step === 'details') {
    sendAndConfirm((e.Text || '').trim());
  }
});

xapi.Event.UserInterface.Message.TextInput.Clear.on(function(e) {
  if (e.FeedbackId !== 'ri_input') return;
  if (session.step === 'name') { session.step = null; }
  else if (session.step === 'details') { sendAndConfirm(''); }
});

// --- Listener Prompt categoria ---
xapi.Event.UserInterface.Message.Prompt.Response.on(function(e) {
  if (e.FeedbackId !== 'ri_category') return;
  var cats = { '1': 'Audio / Video', '2': 'Qualcosa nella sala', '3': 'Rete / Connettivita', '4': 'Altro' };
  session.category = cats[e.OptionId] || 'Altro';
  askDetails();
});

xapi.Event.UserInterface.Message.Prompt.Cleared.on(function(e) {
  if (e.FeedbackId !== 'ri_category') return;
  session.step = null;
});

// Abilita HttpClient se non attivo
xapi.Config.HttpClient.Mode.set('On').catch(function(){});

console.log('[ReportIssue] Macro avviata - approccio ibrido TextInput + WebView conferma');
