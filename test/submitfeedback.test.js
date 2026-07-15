const { expect } = require('chai');
const nock = require('nock');
const { submitFeedback } = require('../lib/submitfeedback');

const PROD_BASE = 'https://app.leadconduit.com';

describe('submitfeedback', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('skips when the probability is not met', async () => {
    const scope = nock(PROD_BASE).get(/\/events/).query(true).reply(200, '[]');
    await submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 0 });
    expect(scope.isDone()).to.equal(false);
  });

  it('queries events then posts feedback for a returned event', async () => {
    const events = nock(PROD_BASE)
      .get('/events')
      .query(true)
      .reply(200, JSON.stringify([{ id: 'evt-1' }]));

    let postedBody;
    const feedback = nock(PROD_BASE)
      .post('/feedback', (body) => {
        postedBody = body;
        return true;
      })
      .query({ event_id: 'evt-1' })
      .reply(201, JSON.stringify({ outcome: 'success', lead: { id: 'lead-1' } }));

    await submitFeedback({
      apiKey: 'key',
      recipientId: 'r1',
      feedbackType: 'return',
      feedbackReason: 'bad & wrong',
      probability: 100
    });

    expect(events.isDone()).to.equal(true);
    expect(feedback.isDone()).to.equal(true);
    // the reason contains '&' and a space; if it were not form-url-encoded the
    // body would parse into extra/garbled keys. nock decodes the wire body, so
    // a clean round-trip proves it was encoded correctly.
    expect(postedBody).to.deep.equal({ type: 'return', reason: 'bad & wrong' });
  });

  it('does not post feedback when no events are found', async () => {
    const events = nock(PROD_BASE).get('/events').query(true).reply(200, '[]');
    const feedback = nock(PROD_BASE).post('/feedback').query(true).reply(201, '{}');

    await submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 100 });

    expect(events.isDone()).to.equal(true);
    expect(feedback.isDone()).to.equal(false);
  });

  it('logs and skips (does not throw) when the events response is not valid JSON', async () => {
    const events = nock(PROD_BASE).get('/events').query(true).reply(200, '<html>gateway error</html>');
    const feedback = nock(PROD_BASE).post('/feedback').query(true).reply(201, '{}');

    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    try {
      await submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 100 });
    } finally {
      console.error = originalError;
    }

    expect(events.isDone()).to.equal(true);
    expect(feedback.isDone()).to.equal(false);
    expect(errors.join('\n')).to.match(/Error parsing events response/);
  });

  it('does not throw when the feedback response is not valid JSON', async () => {
    nock(PROD_BASE).get('/events').query(true).reply(200, JSON.stringify([{ id: 'evt-1' }]));
    nock(PROD_BASE).post('/feedback').query(true).reply(201, 'not json');

    const logged = [];
    const originalLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      await submitFeedback({ apiKey: 'key', recipientId: 'r1', feedbackType: 'return', feedbackReason: 'boo', probability: 100 });
    } finally {
      console.log = originalLog;
    }

    expect(logged.join('\n')).to.match(/response could not be parsed/);
  });

  it('targets the staging host when staging is set', async () => {
    const events = nock('https://app.leadconduit-staging.com')
      .get('/events')
      .query(true)
      .reply(200, '[]');

    await submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 100, staging: true });

    expect(events.isDone()).to.equal(true);
  });

  it('does not log the API key in verbose mode', async () => {
    const secret = 'super-secret-api-key';
    nock(PROD_BASE).get('/events').query(true).reply(200, '[]');

    const logged = [];
    const originalLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      await submitFeedback({ apiKey: secret, recipientId: 'r1', probability: 100, verbose: true });
    } finally {
      console.log = originalLog;
    }

    const output = logged.join('\n');
    expect(output).to.contain('query options');
    expect(output).to.not.contain(secret);
    expect(output).to.contain('[REDACTED]');
  });
});
