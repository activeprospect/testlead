const request = require('@activeprospect/request-capture/request');

const requestAsync = (options) => new Promise((resolve) => {
  request(options, (err, response, body) => resolve({ err, response, body }));
});

// eslint-disable-next-line complexity -- sequential GET-then-POST feedback flow with response guards; clearer inline than split across helpers
const submitFeedback = async function ({ apiKey, recipientId, feedbackType, feedbackReason, probability, staging, verbose }) {
  if ((Math.random() * 100) < probability) {
    const baseUrl = `https://app.leadconduit${staging ? '-staging' : ''}.com`;
    // 7-day lookback, formatted YYYY-MM-DD in local time to match the original
    // moment().subtract(7, 'days').format('YYYY-MM-DD') behavior (the CLI runs
    // in the developer's local timezone; the Lambda runs in UTC either way).
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const options = {
      uri: `${baseUrl}/events?start=${startDate}T00:00:00&type=recipient&outcome=success&recipient_id=${recipientId}&limit=100`,
      method: 'GET',
      auth: { user: 'X', pass: apiKey },
      headers: { Accept: 'application/json' }
    };

    if (verbose) {
      // Redact the API key (auth.pass) so it is never written to logs.
      const redacted = { ...options, auth: { ...options.auth, pass: '[REDACTED]' } };
      console.log(`query options: ${JSON.stringify(redacted)}`);
    }

    // get 100 recent successful recipient events from the given recipient ID
    const { err, response, body } = await requestAsync(options);

    if (err || !response || response.statusCode !== 200) {
      const code = response ? ` (${response.statusCode})` : '';
      console.error(`Error getting event: got ${code} from LeadConduit (expected 200); err: '${err}', body: ${JSON.stringify(body)}`);
      return;
    }

    // pick a random event ID and issue the conversion or return
    const leads = JSON.parse(body);

    if (leads.length === 0) {
      console.error(`No leads found for recipient ID ${recipientId} since ${startDate}`);
      return;
    }

    const random = Math.floor(Math.random() * leads.length);
    const eventId = leads[random].id;

    if (verbose) {
      console.log(`Posting ${feedbackType}, with reason "${feedbackReason}", to event ID ${eventId} (random #${random} of ${leads.length} found)`);
    }

    const { err: feedbackErr, response: feedbackResponse, body: feedbackBody } = await requestAsync({
      uri: `${baseUrl}/feedback?event_id=${eventId}`,
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ type: feedbackType, reason: feedbackReason }).toString()
    });

    if (feedbackErr || !feedbackResponse || feedbackResponse.statusCode !== 201) {
      const code = feedbackResponse ? `(${feedbackResponse.statusCode})` : '';
      console.error(`Error posting feedback: got ${code} from LeadConduit (expected 201): err: '${feedbackErr}', body: '${JSON.stringify(feedbackBody)}'}`);
    } else {
      const parsed = JSON.parse(feedbackBody);
      console.log(`${feedbackType} of lead ${parsed.lead.id}, with reason: '${feedbackReason}': ${parsed.outcome}`);
    }
  } else {
    console.log('Failed probability; skipping feedback');
  }
};

module.exports = {
  submitFeedback
};
