// StripLink: the Apps Script a session owner pastes into their Google Form.
// Generated with the session's webhook URL and secret already filled in.
// Keep in sync with google/apps-script.gs (the commented reference copy).

export function buildAppsScript(
  webhookUrl: string,
  secret: string,
  airports: string[] = []
) {
  const airportList = airports.length
    ? airports.map((a) => `  '${a.replace(/'/g, '')}',`).join('\n')
    : "  'EGKK',";
  return `/**
 * StripLink: send every response from this form to your StripLink board.
 *
 * 1. Run installTrigger once (approve the permissions Google asks for).
 * 2. Run sendTestFlight to check a strip shows up on the board.
 * Optional: on an empty form, run buildFlightPlanForm first to add the questions.
 */
const STRIPLINK_URL = '${webhookUrl}';
const STRIPLINK_SECRET = '${secret}';

function onFormSubmit(e) {
  if (!e || !e.response) {
    throw new Error('onFormSubmit runs by itself when someone submits the form. Run the setup function from the dropdown instead.');
  }
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
  if (code >= 300) console.error('StripLink ' + code + ': ' + res.getContentText());
  else console.log('StripLink: ' + res.getContentText());
}

/** Run once. Replaces any earlier copy so responses are never sent twice. */
function installTrigger() {
  const form = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'onFormSubmit'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
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
${airportList}
];

/** Optional: adds StripLink's flight plan questions to the form. */
function buildFlightPlanForm() {
  const form = FormApp.getActiveForm();
  form.addTextItem().setTitle('Roblox username').setRequired(true);
  form.addTextItem().setTitle('Callsign').setHelpText('e.g. BAW123').setRequired(true);
  form.addTextItem().setTitle('Aircraft').setHelpText('ICAO type, e.g. A320, B738').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Flight rules').setChoiceValues(['IFR', 'VFR']).setRequired(true);
  form.addListItem().setTitle('Departure').setChoiceValues(PF_AIRPORTS).setRequired(true);
  form.addListItem().setTitle('Arrival').setChoiceValues(PF_AIRPORTS).setRequired(true);
  form.addTextItem().setTitle('Cruising level').setHelpText('e.g. 350 for FL350').setRequired(true);
  form.addParagraphTextItem().setTitle('Route').setHelpText('DCT if direct');
  form.addTextItem().setTitle('Stand');
  form.addParagraphTextItem().setTitle('Remarks');
  console.log('Questions added to "' + form.getTitle() + '"');
}
`;
}

// The site admin's script for the one shared StripLink form. It builds the form,
// installs the submit trigger and registers the form's pre-filled link with
// StripLink, so every session can hand pilots its own link.
export function buildSharedAppsScript(
  webhookUrl: string,
  registerUrl: string,
  secret: string,
  airports: string[] = []
) {
  const airportList = airports.length
    ? airports.map((a) => `  '${a.replace(/'/g, '')}',`).join('\n')
    : "  'EGKK',";
  return `/**
 * StripLink shared flight plan form (site admin only).
 *
 * 1. Create a new, empty Google Form, open ⋮ → Apps Script and paste this.
 * 2. Run setupStripLinkForm once and approve Google's permission prompt.
 *    It adds the questions, installs the trigger and registers the form with StripLink.
 * Every session's Google Form panel then shows its own link to this form.
 * Keep this script private: the secret lets anyone file flights.
 */
const STRIPLINK_URL = '${webhookUrl}';
const STRIPLINK_REGISTER_URL = '${registerUrl}';
const STRIPLINK_SECRET = '${secret}';
const SESSION_QUESTION = 'StripLink session';
const PLACEHOLDER = '__STRIPLINK_SESSION__';
const SESSION_HELP = 'Filled in by your controller\\'s link. Empty is fine: it then goes to PF Radar.';

function onFormSubmit(e) {
  if (!e || !e.response) {
    throw new Error('onFormSubmit runs by itself when someone submits the form. Run the setup function from the dropdown instead.');
  }
  const response = e.response;
  const answers = {};
  response.getItemResponses().forEach(function (item) {
    answers[item.getItem().getTitle()] = item.getResponse();
  });
  post_(STRIPLINK_URL, { responseId: response.getId(), answers: answers });
}

function post_(url, payload) {
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-StripLink-Secret': STRIPLINK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code >= 300) console.error('StripLink ' + code + ': ' + res.getContentText());
  else console.log('StripLink: ' + res.getContentText());
  return code;
}

// Airports for the dropdowns. Only the first 4 letters are used.
const PF_AIRPORTS = [
${airportList}
];

/** Run once on an empty form. Safe to run again: it only adds missing questions. */
function setupStripLinkForm() {
  const form = FormApp.getActiveForm();
  if (form.getItems().length === 0) {
    form.setTitle('StripLink flight plan');
    form.setDescription(formDescription_());
    form.addTextItem().setTitle(SESSION_QUESTION)
      .setHelpText(SESSION_HELP).setRequired(false);
    form.addTextItem().setTitle('Roblox username').setRequired(true);
    form.addTextItem().setTitle('Callsign').setHelpText('e.g. BAW123').setRequired(true);
    form.addTextItem().setTitle('Aircraft').setHelpText('ICAO type, e.g. A320, B738').setRequired(true);
    form.addMultipleChoiceItem().setTitle('Flight rules').setChoiceValues(['IFR', 'VFR']).setRequired(true);
    form.addListItem().setTitle('Departure').setChoiceValues(PF_AIRPORTS).setRequired(true);
    form.addListItem().setTitle('Arrival').setChoiceValues(PF_AIRPORTS).setRequired(true);
    form.addTextItem().setTitle('Cruising level').setHelpText('e.g. 350 for FL350').setRequired(true);
    form.addParagraphTextItem().setTitle('Route').setHelpText('DCT if direct');
    form.addTextItem().setTitle('Stand');
    form.addParagraphTextItem().setTitle('Remarks');
  }
  form.setCollectEmail(false);
  form.setConfirmationMessage(confirmationMessage_());
  form.setAllowResponseEdits(false);

  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'onFormSubmit'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();

  registerWithStripLink();
}

/** Form intro: what it is, plus the PFTracker shortcut (the form is the only link pilots get). */
function formDescription_() {
  const site = STRIPLINK_URL.replace(/\\/api\\/.*$/, '');
  return 'File your flight plan. It goes straight onto your controller\\'s StripLink board.\\n\\n' +
    'Already filed on PFTracker? Get the one-click "Import Flight Plan" button at ' + site + '/pftracker ' +
    'and it fills this form in for you.';
}

/** Shown after a pilot submits: where to get their squawk and PDC. */
function confirmationMessage_() {
  const site = STRIPLINK_URL.replace(/\\/api\\/.*$/, '');
  return 'Flight plan sent to your controller.\\n\\nOpen your pilot panel for your squawk, PDC and controller messages: ' +
    site + '/pilot (use the same callsign and Roblox username).';
}

/** Updates the intro text on an existing form, and lets the session answer be empty (PF Radar). */
function updateFormDescription() {
  const form = FormApp.getActiveForm();
  form.setDescription(formDescription_());
  form.setConfirmationMessage(confirmationMessage_());
  form.getItems(FormApp.ItemType.TEXT).forEach(function (i) {
    if (i.getTitle() === SESSION_QUESTION) i.asTextItem().setRequired(false).setHelpText(SESSION_HELP);
  });
  console.log('Form description updated.');
}

/** Every question's entry ID (and choices), so StripLink can pre-fill the whole form. */
function formFields_() {
  const form = FormApp.getActiveForm();
  return form.getItems().map(function (item) {
    const type = item.getType();
    let response = null;
    let choices = null;
    if (type === FormApp.ItemType.TEXT) response = item.asTextItem().createResponse('x');
    else if (type === FormApp.ItemType.PARAGRAPH_TEXT) response = item.asParagraphTextItem().createResponse('x');
    else if (type === FormApp.ItemType.LIST) {
      choices = item.asListItem().getChoices().map(function (c) { return c.getValue(); });
      if (choices.length) response = item.asListItem().createResponse(choices[0]);
    } else if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
      choices = item.asMultipleChoiceItem().getChoices().map(function (c) { return c.getValue(); });
      if (choices.length) response = item.asMultipleChoiceItem().createResponse(choices[0]);
    }
    if (!response) return null;
    const url = form.createResponse().withItemResponse(response).toPrefilledUrl();
    const m = url.match(/[?&](entry\\.\\d+)=/);
    return m ? { title: item.getTitle(), entry: m[1], type: String(type), choices: choices } : null;
  }).filter(function (f) { return f; });
}

/**
 * NOT USED: Project Flight's API refuses server requests (Cloudflare challenge), so the
 * import can't fetch plans. Kept for if PF ever offers official access.
 * Adds the opt-in "Import my PFTracker flight plan?" question after the Roblox username.
 * Yes: the form submits straight away and StripLink copies the pilot's own PFTracker plan.
 * No: the pilot continues to the flight plan page as usual. Safe to run again.
 */
function addPfTrackerImport() {
  const form = FormApp.getActiveForm();
  const items = form.getItems();
  if (items.some(function (i) { return /pftracker/i.test(i.getTitle()); })) {
    console.log('PFTracker import question is already there.');
    return;
  }
  const user = items.filter(function (i) { return i.getTitle() === 'Roblox username'; })[0];
  if (!user) throw new Error('Add a "Roblox username" question first.');
  const question = form.addMultipleChoiceItem()
    .setTitle('Import my PFTracker flight plan?')
    .setHelpText('Filed your plan on PFTracker? Pick Yes and StripLink copies it from there using your Roblox username. Nothing is imported unless you pick Yes.')
    .setRequired(true);
  const page = form.addPageBreakItem().setTitle('Flight plan');
  question.setChoices([
    question.createChoice('Yes, use my PFTracker flight plan', FormApp.PageNavigationType.SUBMIT),
    question.createChoice('No, I will fill it in here', FormApp.PageNavigationType.CONTINUE),
  ]);
  form.moveItem(question, user.getIndex() + 1);
  form.moveItem(page, user.getIndex() + 2);
  console.log('Added the PFTracker import question.');
}

/** Tells StripLink this form's pre-filled link. Run again if you rename the session question. */
function registerWithStripLink() {
  const form = FormApp.getActiveForm();
  const item = form.getItems(FormApp.ItemType.TEXT).filter(function (i) {
    return i.getTitle() === SESSION_QUESTION;
  })[0];
  if (!item) throw new Error('Add a short-answer question titled "' + SESSION_QUESTION + '" first.');
  const prefill = form.createResponse()
    .withItemResponse(item.asTextItem().createResponse(PLACEHOLDER))
    .toPrefilledUrl();
  const code = post_(STRIPLINK_REGISTER_URL, {
    prefillTemplate: prefill,
    editUrl: form.getEditUrl(),
    title: form.getTitle(),
    fields: formFields_(),
  });
  if (code < 300) console.log('Registered "' + form.getTitle() + '" with StripLink. Pilot link: ' + form.getPublishedUrl());
}
`;
}
