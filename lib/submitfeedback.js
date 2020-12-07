const request = require('request');
const moment = require('moment');

/*
* config:
*   - api_key
*   - recipient_id
*   - feedback_type
*   - feedback_reason
*   - probability
*   - staging
*   - verbose
* */
const submitFeedback = function (config) {

  if ((Math.random() * 100) < config.probability) {

    const baseUrl = `https://next.leadconduit${config.staging ? '-staging' : ''}.com`;
    const startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');

    const uri = `${baseUrl}/events?start=${startDate}T00:00:00&type=recipient&outcome=success&recipient_id=${config.recipient_id}&limit=100`;

    if (config.verbose) {
      console.log(`GET from ${uri}`);
    }

    // get 100 recent successful recipient events from the given recipient ID
    request({
      uri: uri,
      method: "GET",
      auth: {'user': 'X', 'pass': config.api_key},
      headers: {'Accept': 'application/json'}
    }, (err, response, body) => {
      if (err || response.statusCode !== 200) {
        let code = response ? ` (${response.statusCode})` : '';
        console.error(`Error getting event: got ${code} from LeadConduit (expected 200); ${err}`);
      } else {

        // pick a random event ID and issue the conversion or return
        const leads = JSON.parse(body);

        if (leads.length === 0) {
          console.error(`No leads found for recipient ID ${config.recipient_id} since ${startDate}`);
        } else {
          const random = Math.floor(Math.random() * leads.length);
          const eventId = leads[random].id;

          if (config.verbose) {
            console.log(`Posting ${config.feedback_type}, with reason "${config.feedback_reason}", to event ID ${eventId} (random #${random} of ${leads.length} found)`);
          }

          request({
            uri: `${baseUrl}/feedback?event_id=${eventId}`,
            method: "POST",
            headers: {'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'},
            body: `type=${config.feedback_type}&reason=${config.feedback_reason}`
          }, (err, response, body) => {

            if (err || response.statusCode !== 201) {
              let code = response ? `(${response.statusCode})` : '';
              console.error(`Error posting feedback: got ${code} from LeadConduit (expected 201): ${err}`);
            } else {
              const parsed = JSON.parse(body);
              console.log(`${config.feedback_type} of lead ${parsed.lead.id}, with reason: '${config.feedback_reason}': ${parsed.outcome}`);
            }
          });
        }
      }
    });
  } else {
    console.log(`Failed probability; skipping feedback`);
  }
}

module.exports = {
  submitFeedback
}
