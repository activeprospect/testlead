const request = require('request');
const faker = require('faker');

const defaultFields = ['email', 'first_name', 'last_name'];

const fakeByLCName = function(lcName) {
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
  submitLead
}
