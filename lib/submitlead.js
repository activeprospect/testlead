const request = require('@activeprospect/request-capture/request');
const { faker } = require('@faker-js/faker');

const defaultFields = ['email', 'first_name', 'last_name'];

const requestAsync = (options) => new Promise((resolve) => {
  request(options, (err, response, body) => resolve({ err, response, body }));
});

const AGE_MAGIC_NUMBER = 86;

// LeadConduit field name -> fake-value generator. A lookup map keeps the
// per-field complexity flat (vs. a long switch) and is trivial to extend.
const fakeGenerators = {
  address_1: () => faker.location.streetAddress(),
  address_2: () => faker.location.secondaryAddress(),
  age: () => Math.floor(Math.random() * AGE_MAGIC_NUMBER),
  city: () => faker.location.city(),
  dob: () => faker.date.past({ years: AGE_MAGIC_NUMBER }),
  comments: () => faker.lorem.sentence(),
  'company.name': () => faker.company.name(),
  country: () => faker.location.country(),
  email: () => faker.internet.email(),
  first_name: () => faker.person.firstName(),
  gender: () => faker.helpers.arrayElement(['female', 'male', 'other']),
  ip_address: () => faker.internet.ip(),
  last_name: () => faker.person.lastName(),
  phone_1: () => faker.phone.number(),
  phone_2: () => faker.phone.number(),
  phone_3: () => faker.phone.number(),
  reference: () => faker.string.alphanumeric(10),
  postal_code: () => faker.location.zipCode(),
  state: () => faker.location.state(),
  title: () => faker.person.jobTitle()
};

const fakeByLCName = function (lcName) {
  const generator = fakeGenerators[lcName];
  return generator ? generator() : `unknown_field_${lcName}`;
};

const generateLead = function (data, fieldList) {
  const lead = {};

  if (data) {
    // e.g., "age=42&state=TX&loan.collateral=100000"
    data.split('&').forEach((parameter) => {
      const kv = parameter.split('=');
      lead[kv[0]] = kv[1];
    });
  }

  const fields = fieldList && fieldList.length ? fieldList : defaultFields;

  fields.forEach((element) => {
    // don't override specified data with random values
    if (!lead[element]) {
      lead[element] = fakeByLCName(element);
    }
  });
  return (lead);
};

// eslint-disable-next-line complexity -- linear validate/probability/verbose/response flow; clearer inline than split across helpers
const submitLead = async function ({ url, fields, data, probability, verbose }) {
  if (!url || url.length === 0) {
    console.error('Posting URL is required');
    return;
  }

  if ((Math.random() * 100) < probability) {
    const lead = generateLead(data, fields);

    if (verbose) {
      console.log(`POST\n\tURL: ${url}\n\tbody: ${JSON.stringify(lead)}`);
    }

    const { err, response, body } = await requestAsync({
      uri: url,
      method: 'POST',
      form: lead
    });

    if (verbose) {
      const status = response ? response.statusCode : '(no response)';
      const headers = response ? JSON.stringify(response.headers) : '(no response)';
      console.log(`response\n\tstatus: ${status}\n\tbody: ${response ? response.body : '(no response)'}\n\theaders: ${headers}\n\terr: ${err ? err.toString() : '(none)'}`);
    }
    const field0 = Object.keys(lead)[0];
    if (err || !response || (response.statusCode !== 201 && response.statusCode !== 200)) {
      const code = response ? ` (${response.statusCode})` : '';
      console.error(`Error; expected 200/201 when posting lead for ${lead[field0]} to '${url}'${code}`, err);
    } else {
      console.log(`Lead posted for ${lead[field0]} to ${url}\n(${body})`);
      return body;
    }
  } else {
    console.log(`Skipping post to ${url}`);
  }
};

module.exports = {
  submitLead,
  generateLead,
  fakeByLCName
};
