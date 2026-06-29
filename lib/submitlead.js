const request = require('@activeprospect/request-capture/request');
const { faker } = require('@faker-js/faker');

const defaultFields = ['email', 'first_name', 'last_name'];

const fakeByLCName = function(lcName) {
  let ageMagicNumber = 86;
  switch(lcName) {
    case 'address_1':    return faker.location.streetAddress();
    case 'address_2':    return faker.location.secondaryAddress();
    case 'age':          return Math.floor(Math.random() * ageMagicNumber);
    case 'city':         return faker.location.city();
    case 'dob':          return faker.date.past({ years: ageMagicNumber });
    case 'comments':     return faker.lorem.sentence();
    case 'company.name': return faker.company.name();
    case 'country':      return faker.location.country();
    case 'email':        return faker.internet.email();
    case 'first_name':   return faker.person.firstName();
    case 'gender':       return faker.helpers.arrayElement(['female', 'male', 'other']);
    case 'ip_address':   return faker.internet.ip();
    case 'last_name':    return faker.person.lastName();
    case 'phone_1':
    case 'phone_2':
    case 'phone_3':      return faker.phone.number();
    case 'reference':    return faker.string.alphanumeric(10);
    case 'postal_code':  return faker.location.zipCode();
    case 'state':        return faker.location.state();
    case 'title':        return faker.person.prefix();

    default: return `unknown_field_${lcName}`;
  }
};

const generateLead = function (data, fieldList) {
  let lead = {};

  if(data) {
    // e.g., "age=42&state=TX&loan.collateral=100000"
    data.split("&").forEach((parameter) => {
      let kv = parameter.split("=");
      lead[kv[0]] = kv[1];
    });
  }

  fields = fieldList && fieldList.length ? fieldList : defaultFields;

  fields.forEach((element) => {
    // don't override specified data with random values
    if(!lead[element]) {
      lead[element] = fakeByLCName(element);
    }
  });
  return (lead);
};

const submitLead = function ({ url, fields, data, probability, verbose }, callback) {
  if (!url || url.length === 0) {
    console.error(`Posting URL is required`);
    return;
  }

  if ((Math.random() * 100) < probability) {
    let lead = generateLead(data, fields);

    if (verbose) {
      console.log(`POST\n\tURL: ${url}\n\tbody: ${JSON.stringify(lead)}`);
    }

    request({
      uri: url,
      method: "POST",
      form: lead
    }, (err, response, body) => {
      if (verbose) {
        console.log(`response\n\tstatus: ${response.statusCode}\n\tbody: ${response.body}\n\theaders: ${JSON.stringify(response.headers)}\n\terr: ${err ? err.toString() : '(none)'}`)
      }
      const field0 = Object.keys(lead)[0];
      if (err || (response.statusCode !== 201 && response.statusCode !== 200)) {
        let code = response ? ` (${response.statusCode})` : '';
        console.error(`Error; expected 200/201 when posting lead for ${lead[field0]} to '${url}'${code}`, err);
      }
      else {
        console.log(`Lead posted for ${lead[field0]} to ${url}\n(${body})`);
        if(callback) {
          callback(body);
        }
      }
    });
  }
  else {
    console.log(`Skipping post to ${url}`);
  }
}

module.exports = {
  submitLead,
  generateLead,
  fakeByLCName
}
