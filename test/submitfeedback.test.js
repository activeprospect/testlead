const { expect } = require('chai');
const nock = require('nock');
const { submitFeedback } = require('../lib/submitfeedback');

const PROD_BASE = 'https://app.leadconduit.com';

describe('submitfeedback', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('skips when the probability is not met', (done) => {
    const scope = nock(PROD_BASE).get(/\/events/).query(true).reply(200, '[]');
    submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 0 });
    setTimeout(() => {
      expect(scope.isDone()).to.equal(false);
      done();
    }, 50);
  });

  it('queries events then posts feedback for a returned event', (done) => {
    const events = nock(PROD_BASE)
      .get('/events')
      .query(true)
      .reply(200, JSON.stringify([{ id: 'evt-1' }]));

    const feedback = nock(PROD_BASE)
      .post('/feedback')
      .query({ event_id: 'evt-1' })
      .reply(201, () => {
        return JSON.stringify({ outcome: 'success', lead: { id: 'lead-1' } });
      });

    submitFeedback({
      apiKey: 'key',
      recipientId: 'r1',
      feedbackType: 'return',
      feedbackReason: 'bad lead',
      probability: 100
    });

    const check = () => {
      if (events.isDone() && feedback.isDone()) {
        done();
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });

  it('does not post feedback when no events are found', (done) => {
    const events = nock(PROD_BASE).get('/events').query(true).reply(200, '[]');
    const feedback = nock(PROD_BASE).post('/feedback').query(true).reply(201, '{}');

    submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 100 });

    setTimeout(() => {
      expect(events.isDone()).to.equal(true);
      expect(feedback.isDone()).to.equal(false);
      done();
    }, 50);
  });

  it('targets the staging host when staging is set', (done) => {
    const events = nock('https://app.leadconduit-staging.com')
      .get('/events')
      .query(true)
      .reply(200, '[]');

    submitFeedback({ apiKey: 'key', recipientId: 'r1', probability: 100, staging: true });

    setTimeout(() => {
      expect(events.isDone()).to.equal(true);
      done();
    }, 50);
  });
});
