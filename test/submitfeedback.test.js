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

    const feedback = nock(PROD_BASE)
      .post('/feedback')
      .query({ event_id: 'evt-1' })
      .reply(201, JSON.stringify({ outcome: 'success', lead: { id: 'lead-1' } }));

    await submitFeedback({
      apiKey: 'key',
      recipientId: 'r1',
      feedbackType: 'return',
      feedbackReason: 'bad lead',
      probability: 100
    });

    expect(events.isDone()).to.equal(true);
    expect(feedback.isDone()).to.equal(true);
  });

  it('does not post feedback when no events are found', async () => {
    const events = nock(PROD_BASE).get('/events').query(true).reply(200, '[]');
    const feedback = nock(PROD_BASE).post('/feedback').query(true).reply(201, '{}');

    await submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 100 });

    expect(events.isDone()).to.equal(true);
    expect(feedback.isDone()).to.equal(false);
  });

  it('targets the staging host when staging is set', async () => {
    const events = nock('https://app.leadconduit-staging.com')
      .get('/events')
      .query(true)
      .reply(200, '[]');

    await submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 100, staging: true });

    expect(events.isDone()).to.equal(true);
  });
});
