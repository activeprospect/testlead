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
      // Build the log object from only non-sensitive fields so the API key
      // (auth.pass) never flows into the logged value. Destructuring auth out
      // (rather than spreading it and overwriting pass) keeps the key out of
      // the tainted data flow that CodeQL tracks into console.log.
      const { auth, ...safeOptions } = options;
      const redacted = { ...safeOptions, auth: { user: auth.user, pass: '[REDACTED]' } };
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
    let leads;
    try {
      leads = JSON.parse(body);
    } catch (e) {
      // A 200 with a non-JSON payload (gateway error page, truncated response)
      // would otherwise reject this run and abort the rest of the feedback
      // batch; log and skip just this account instead.
      console.error(`Error parsing events response from LeadConduit (expected JSON): ${e.message}`);
      return;
    }

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
      // Post-success logging only (feedback already accepted with a 201). A
      // non-JSON body or unexpected shape here should not fail the run.
      try {
        const parsed = JSON.parse(feedbackBody);
        console.log(`${feedbackType} of lead ${parsed.lead.id}, with reason: '${feedbackReason}': ${parsed.outcome}`);
      } catch (e) {
        console.log(`Feedback posted (${feedbackType}, reason: '${feedbackReason}'), but the response could not be parsed: ${e.message}`);
      }
    }
  } else {
    console.log('Failed probability; skipping feedback');
  }
};

module.exports = {
  submitFeedback
};
