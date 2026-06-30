const { expect } = require('chai');
const nock = require('nock');
const { submitLead, generateLead, fakeByLCName } = require('../lib/submitlead');

describe('submitlead', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('fakeByLCName', () => {
    const knownFields = [
      'address_1', 'address_2', 'age', 'city', 'dob', 'comments',
      'company.name', 'country', 'email', 'first_name', 'gender',
      'ip_address', 'last_name', 'phone_1', 'phone_2', 'phone_3',
      'reference', 'postal_code', 'state', 'title'
    ];

    knownFields.forEach((field) => {
      it(`returns a defined value for '${field}'`, () => {
        const value = fakeByLCName(field);
        expect(value).to.not.equal(undefined);
        expect(value).to.not.equal(null);
      });
    });

    it('returns a placeholder for unknown fields', () => {
      expect(fakeByLCName('not_a_real_field')).to.equal('unknown_field_not_a_real_field');
    });
  });

  describe('generateLead', () => {
    it('uses the default fields when no field list is given', () => {
      const lead = generateLead(null, null);
      expect(lead).to.have.all.keys(['email', 'first_name', 'last_name']);
    });

    it('uses the provided field list', () => {
      const lead = generateLead(null, ['email', 'city', 'state']);
      expect(lead).to.have.all.keys(['email', 'city', 'state']);
    });

    it('parses the data query string into the lead', () => {
      const lead = generateLead('age=42&state=TX', ['email']);
      expect(lead.age).to.equal('42');
      expect(lead.state).to.equal('TX');
      expect(lead.email).to.be.a('string');
    });

    it('does not override explicit data with fake values', () => {
      const lead = generateLead('email=set@example.com', ['email', 'first_name']);
      expect(lead.email).to.equal('set@example.com');
      expect(lead.first_name).to.be.a('string');
    });
  });

  describe('submitLead', () => {
    it('skips posting when the probability is not met', async () => {
      const result = await submitLead({ url: 'http://example.com/submit', probability: 0 });
      expect(result).to.equal(undefined);
    });

    it('does not post when the url is missing', async () => {
      const scope = nock('http://example.com').post('/submit').reply(200, '{}');
      const result = await submitLead({ url: '', probability: 100 });
      expect(scope.isDone()).to.equal(false);
      expect(result).to.equal(undefined);
      nock.cleanAll();
    });

    it('posts a form-encoded lead and resolves with the response body on success', async () => {
      let postedBody;
      const scope = nock('http://example.com')
        .post('/submit', (body) => {
          postedBody = body;
          return true;
        })
        .reply(201, '{"outcome":"success","lead":{"id":"abc123"}}');

      const body = await submitLead(
        { url: 'http://example.com/submit', fields: ['email'], probability: 100 }
      );

      expect(scope.isDone()).to.equal(true);
      expect(postedBody).to.have.property('email');
      expect(body).to.contain('success');
    });
  });
});
