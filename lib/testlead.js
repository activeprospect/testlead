#!/usr/bin/env node

const program = require('commander');
const {spawn} = require('child_process');
const { submitLead } = require('./submitlead');

let openInBrowser = function (postingUrl, postResponse, browser) {
  let preMessage = 'lead ID not found in JSON at `lead.id`; ';
  try {
    // assume LC standard response, e.g.:
    // {"outcome":"success","lead":{"id":"5ab5191934e97719cf221ba5"}}
    let parsed = JSON.parse(postResponse);

    let leadId = '';
    if(parsed.lead && parsed.lead.id) {
      leadId = parsed.lead.id;
      preMessage = '';
    }
    let url = postingUrl
        .replace(/\/flows.*$/, '')  // chop off from `/flows' on
        .replace('/app.', '/next.') // for production, post to app.leadconduit.com but UI is next.leadconduit.com
        .replace('/leads.', '/')    // for local dev, post to leads.leadconduit.test but UI is leadconduit.test
      + `/events/${leadId}`;

    console.log(`${preMessage}opening ${url}`);
    spawn('open', ['-a', browser, url]);
  }
  catch (err) {
    console.error("Error:", err);
  }
};

let url, fields, data, browser;

program
  .arguments('testlead <posting-url> [fields...]')
  .option('-d, --data <parameters>', 'Defined data to send as-is. Provide in curl -d style ("a=42&foo=bar")', '')
  .option('-p, --probability <percentage>', 'Probability % of sending anything', 100)
  .option('-v, --verbose', 'Output verbose details', false)
  .option('-o, --open', 'Open posted lead in browser (system default, or specify with -b)', false)
  .option('-b, --browser [browser]', 'Use given browser. Values: "Google Chrome", "Firefox", or "Safari"', 'Google Chrome')
  .action(function (postingUrl, fieldList) {
    program.url = postingUrl;
    program.fields = fieldList;
  })
  .parse(process.argv);


submitLead(program, function(body) {
  if (program.open && program.browser) {
    openInBrowser(program.url, body, program.browser);
  }
})
