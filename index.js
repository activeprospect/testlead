#!/usr/bin/env node

const faker = require('faker');
const request = require('request');
const {spawn} = require('child_process');

const defaultFields = ['email', 'first_name', 'last_name'];

let getRandomElement = function (options) {
  return (options[Math.floor(Math.random() * options.length)]);
};

let fakeByLCName = function(lcName) {
  switch(lcName) {
    case 'city':           return faker.address.city();
    case 'company.name':   return faker.company.companyName();
    case 'email':          return faker.internet.email();
    case 'first_name':     return faker.name.firstName();
    case 'last_name':      return faker.name.lastName();
    case 'phone_1':        return faker.phone.phoneNumber();
    case 'postal_code':    return faker.address.zipCode();
    case 'street_address': return faker.address.streetAddress();

    default: return `unknown_field_${lcName}`;
  }
};

let generateLead = function (fields) {
  let lead = {};
  fields.forEach((element) => {
    lead[element] = fakeByLCName(element);
  });
  return (lead);
};


let openInBrowser = function (postingUrl, postResponse, browser) {
  try {
    // {"outcome":"success","lead":{"id":"5ab5191934e97719cf221ba5"}}
    let leadId = JSON.parse(postResponse).lead.id;
    let url = postingUrl
        .replace(/\/flows.*$/, '')  // chop off from `/flows' on
        .replace('/app.', '/next.') // for production, post to app.leadconduit.com but UI is next.leadconduit.com
        .replace('/leads.', '/')    // for local dev, post to leads.leadconduit.test but UI is leadconduit.test
      + `/events/${leadId}`;

    console.log(`opening ${url}`);
    spawn('open', ['-a', browser, url]);
  }
  catch (err) {
    console.error("Error:", err);
  }
};

let program = require('commander');
let url, fields, browser;

program
  .arguments('lead-faker <posting-url> [fields...]')
  .option('-p, --probability <percentage>', 'Probability % of sending anything (default: 100%)')
  .option('-o, --open', 'Open posted lead in browser (system default, or specify with -b)')
  .option('-b, --browser [browser]', 'Use given browser. Values: "Google Chrome", "Firefox", or "Safari"')
  .action(function (postingUrl, fieldList) {
    url = postingUrl;
    if(program.open) {
      browser = program.browser || "Google Chrome";
    }
    fields = fieldList.length ? fieldList : defaultFields;
  })
  .parse(process.argv);


if (!url || url.length === 0) {
  console.error(`Posting URL is required`);
}
else {
  if (!program.probability || (Math.random() * 100) < program.probability) {

    let lead = generateLead(fields);

    request({
      uri: url,
      method: "POST",
      form: lead
    }, (err, response, body) => {
      if (err || response.statusCode !== 201) {
        let code = response ? ` (${response.statusCode})` : '';
        console.error(`Error posting lead for ${lead[fields[0]]} to '${url}'${code}`, err);
      }
      else {
        console.log(`Lead posted for ${lead[fields[0]]} to ${url} (${body})`);
        if (browser) {
          openInBrowser(url, body, browser);
        }
      }
    });
  }
  else {
    console.log(`Skipping post to ${url}`);
  }
}
