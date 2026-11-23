// Reference copy of the StripLink Apps Script.
// You normally don't need this file: on a session board open Settings -> Google Form
// and copy the script there, it has your webhook URL and secret filled in.
/**
 * StripLink: send every response from this form to your StripLink board.
 *
 * 1. Run installTrigger once (approve the permissions Google asks for).
 * 2. Run sendTestFlight to check a strip shows up on the board.
 * Optional: on an empty form, run buildFlightPlanForm first to add the questions.
 */
const STRIPLINK_URL = 'https://YOUR-STRIPLINK/api/forms/webhook/SESSIONID';
const STRIPLINK_SECRET = 'PASTE-SECRET-FROM-STRIPLINK';

function onFormSubmit(e) {
  const response = e.response;
  const answers = {};
  response.getItemResponses().forEach(function (item) {
    answers[item.getItem().getTitle()] = item.getResponse();
  });
  send_({ responseId: response.getId(), answers: answers });
}

function send_(payload) {
  const res = UrlFetchApp.fetch(STRIPLINK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-StripLink-Secret': STRIPLINK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code >= 300)
    console.error('StripLink ' + code + ': ' + res.getContentText());
  else console.log('StripLink: ' + res.getContentText());
}

/** Run once. Replaces any earlier copy so responses are never sent twice. */
function installTrigger() {
  const form = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers()
    .filter(function (t) {
      return t.getHandlerFunction() === 'onFormSubmit';
    })
    .forEach(function (t) {
      ScriptApp.deleteTrigger(t);
    });
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();
  console.log('StripLink trigger installed for "' + form.getTitle() + '"');
}

/** Sends a fake response so you can check the connection. */
function sendTestFlight() {
  send_({
    responseId: 'test-' + Date.now(),
    answers: {
      Callsign: 'TEST' + Math.floor(Math.random() * 900 + 100),
      Aircraft: 'A320',
      'Flight rules': 'IFR',
      Departure: PF_AIRPORTS[0],
      Arrival: PF_AIRPORTS[1] || PF_AIRPORTS[0],
      'Cruising level': '350',
      Route: 'DCT',
      Remarks: 'Test flight from Apps Script',
    },
  });
}

// Airports for the dropdowns. Only the first 4 letters are used.
const PF_AIRPORTS = [
  'MDPC - Punta Cana International Airport',
  'EGKK - London Gatwick International Airport',
  'LCLK - Larnaca International Airport',
  'LCPH - Paphos International Airport',
  'LCRA - Akrotiri Airport',
  'MDST - Aeropuerto Internacional del Cibao',
  'MDAB - Arroyo Barril Airport',
  'MTCA - Antoine-Simon Airport ',
  'EGTT - London Control',
  'LCCC - Nicosia Control',
  'MDCS - Santo Domingo Control',
  'EGLC - London City Airport',
  'EGFF - Cardiff Airport',
  'EGHC - Lands End Airport',
  'EGHJ - Bembridge Airport',
  'EGCK - Caernarfon Airport',
  'X2BH - Bolt Head Airfield',
  'LPMA - Madeira Airport',
  'PAFA - Fairbanks International Airport',
];

/** Optional: adds StripLink's flight plan questions to the form. */
function buildFlightPlanForm() {
  const form = FormApp.getActiveForm();
  form.addTextItem().setTitle('Roblox username').setRequired(true);
  form
    .addTextItem()
    .setTitle('Callsign')
    .setHelpText('e.g. BAW123')
    .setRequired(true);
  form
    .addTextItem()
    .setTitle('Aircraft')
    .setHelpText('ICAO type, e.g. A320, B738')
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('Flight rules')
    .setChoiceValues(['IFR', 'VFR'])
    .setRequired(true);
  form
    .addListItem()
    .setTitle('Departure')
    .setChoiceValues(PF_AIRPORTS)
    .setRequired(true);
  form
    .addListItem()
    .setTitle('Arrival')
    .setChoiceValues(PF_AIRPORTS)
    .setRequired(true);
  form
    .addTextItem()
    .setTitle('Cruising level')
    .setHelpText('e.g. 350 for FL350')
    .setRequired(true);
  form.addParagraphTextItem().setTitle('Route').setHelpText('DCT if direct');
  form.addTextItem().setTitle('Stand');
  form.addParagraphTextItem().setTitle('Remarks');
  console.log('Questions added to "' + form.getTitle() + '"');
}
