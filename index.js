#!/usr/bin/env node

const program = require('commander');
const faker = require('faker');
const request = require('request');
const {spawn} = require('child_process');

const defaultFields = ['email', 'first_name', 'last_name'];

let fakeByLCName = function(lcName) {
  let ageMagicNumber = 86;
  switch(lcName) {
    case 'address_1':    return faker.address.streetAddress();
    case 'address_2':    return faker.address.secondaryAddress();
    case 'age':          return Math.floor(Math.random() * ageMagicNumber);
    case 'city':         return faker.address.city();
    case 'dob':          return faker.date.past(ageMagicNumber);
    case 'comments':     return faker.lorem.sentence();
    case 'company.name': return faker.company.companyName();
    case 'country':      return faker.address.country();
    case 'email':        return faker.internet.email();
    case 'first_name':   return faker.name.firstName();
    case 'gender':       return faker.random.arrayElement(['female', 'male', 'other']);
    case 'ip_address':   return faker.internet.ip();
    case 'last_name':    return faker.name.lastName();
    case 'phone_1':
    case 'phone_2':
    case 'phone_3':      return faker.phone.phoneNumber();
    case 'reference':    return faker.random.alphaNumeric(10);
    case 'postal_code':  return faker.address.zipCode();
    case 'state':        return faker.address.state();
    case 'title':        return faker.name.title();

    default: return `unknown_field_${lcName}`;
  }
};

let generateLead = function (data, fields) {
  let lead = {};

  if(data) {
    // e.g., "age=42&state=TX&loan.collateral=100000"
    data.split("&").forEach((parameter) => {
      let kv = parameter.split("=");
      lead[kv[0]] = kv[1];
    });
  }

  fields.forEach((element) => {
    // don't override specified data with random values
    if(!lead[element]) {
      lead[element] = fakeByLCName(element);
    }
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

let url, fields, data, browser;

program
  .arguments('testlead <posting-url> [fields...]')
  .option('-d, --data <parameters>', 'Defined data to send as-is. Provide in curl -d style ("a=42&foo=bar")')
  .option('-p, --probability <percentage>', 'Probability % of sending anything (default: 100%)')
  .option('-v, --verbose', 'Output verbose details')
  .option('-o, --open', 'Open posted lead in browser (system default, or specify with -b)')
  .option('-b, --browser [browser]', 'Use given browser. Values: "Google Chrome", "Firefox", or "Safari"')
  .action(function (postingUrl, fieldList) {
    url = postingUrl;
    if(program.open) {
      browser = program.browser || "Google Chrome";
    }
    data = program.data;
    fields = fieldList.length ? fieldList : defaultFields;
  })
  .parse(process.argv);


if (!url || url.length === 0) {
  console.error(`Posting URL is required`);
}
else {
  if (!program.probability || (Math.random() * 100) < program.probability) {

    let lead = generateLead(data, fields);

    if (program.verbose) {
      console.log(`POST\n\tURL: ${url}\n\tbody: ${JSON.stringify(lead)}`);
    }

    request({
      uri: url,
      method: "POST",
      form: lead
    }, (err, response, body) => {
      if (program.verbose) {
        console.log(`response\n\tstatus: ${response.statusCode}\n\tbody: ${response.body}\n\theaders: ${JSON.stringify(response.headers)}\n\terr: ${err ? err.toString() : '(none)'}`)
      }
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
