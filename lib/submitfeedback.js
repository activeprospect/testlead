const request = require('request');
const moment = require('moment');

const submitFeedback = function ({ apiKey, recipientId, feedbackType, feedbackReason, probability, staging, verbose }) {

  if ((Math.random() * 100) < probability) {
    const baseUrl = `https://next.leadconduit${staging ? '-staging' : ''}.com`;
    const startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');

    const uri = `${baseUrl}/events?start=${startDate}T00:00:00&type=recipient&outcome=success&recipient_id=${recipientId}&limit=100`;

    if (verbose) {
      console.log(`GET from ${uri}`);
    }

    // get 100 recent successful recipient events from the given recipient ID
    request({
      uri: uri,
      method: "GET",
      auth: {'user': 'X', 'pass': apiKey},
      headers: {'Accept': 'application/json'}
    }, (err, response, body) => {
      if (err || response.statusCode !== 200) {
        let code = response ? ` (${response.statusCode})` : '';
        console.error(`Error getting event: got ${code} from LeadConduit (expected 200); ${err}`);
      }
      else {
        // pick a random event ID and issue the conversion or return
        const leads = JSON.parse(body);

        if (leads.length === 0) {
          console.error(`No leads found for recipient ID ${recipientId} since ${startDate}`);
        }
        else {
          const random = Math.floor(Math.random() * leads.length);
          const eventId = leads[random].id;

          if (verbose) {
            console.log(`Posting ${feedbackType}, with reason "${feedbackReason}", to event ID ${eventId} (random #${random} of ${leads.length} found)`);
          }

          request({
            uri: `${baseUrl}/feedback?event_id=${eventId}`,
            method: "POST",
            headers: {'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'},
            body: `type=${feedbackType}&reason=${feedbackReason}`
          }, (err, response, body) => {

            if (err || response.statusCode !== 201) {
              let code = response ? `(${response.statusCode})` : '';
              console.error(`Error posting feedback: got ${code} from LeadConduit (expected 201): ${err}`);
            }
            else {
              const parsed = JSON.parse(body);
              console.log(`${feedbackType} of lead ${parsed.lead.id}, with reason: '${feedbackReason}': ${parsed.outcome}`);
            }
          });
        }
      }
    });
  }
  else {
    console.log(`Failed probability; skipping feedback`);
  }
}

module.exports = {
  submitFeedback
}
