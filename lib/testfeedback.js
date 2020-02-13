#!/usr/bin/env node

const program = require('commander');
const request = require('request');
const moment = require('moment');

let baseUrl, data;

program
  .arguments('testfeedback <api_key> <recipient_id>')
  .requiredOption('-a, --api_key <api-key>', 'LeadConduit API key (required)')
  .requiredOption('-i, --recipient_id <recipient-id>', 'ID of LeadConduit recipient providing feedback (required)')
  .option('-t, --feedback_type <type>', 'One of "conversion" or "return" (default: "return")')
  .option('-r, --feedback_reason <reason>', 'Text reason for this feedback (default: "bad lead, boo")')
  .option('-s, --staging', 'Post feedback to staging (default: false)')
  .option('-v, --verbose', 'Output verbose details')
  .parse(process.argv);

let feedbackType = program.feedback_type || "return";
let feedbackReason;

if(feedbackType === "return") {
  feedbackReason = program.feedback_reason || "bad lead, boo";
}
else if(feedbackType === "conversion") {
  feedbackReason = program.feedback_reason || "good lead, yay";
}
else {
  console.log(`Error: unknown feedback type '${feedbackType}'`);
  return 3;
}


if (!program.probability || (Math.random() * 100) < program.probability) {

  const baseUrl = `https://next.${program.staging ? 'staging.' : ''}leadconduit.com`;
  const startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');

  const uri = `${baseUrl}/events?start=${startDate}T00:00:00&type=recipient&outcome=success&recipient_id=${program.recipient_id}&limit=100`;

  if (program.verbose) {
    console.log(`GET from ${uri}`);
  }

  // get 100 recent successful recipient events from the given recipient ID
  request({
    uri: uri,
    method: "GET",
    auth: {'user': 'X', 'pass': program.api_key},
    headers: {'Accept': 'application/json'}
  }, (err, response, body) => {
    if (err || response.statusCode !== 200) {
      let code = response ? ` (${response.statusCode})` : '';
      console.error(`Error getting event: got ${code} from LeadConduit (expected 200); ${err}`);
    }
    else {

      // pick a random event ID and issue the conversion or return
      const leads = JSON.parse(body);

      if(leads.length === 0) {
        console.error(`No leads found for recipient ID ${program.recipient_id} since ${startDate}`);
      }
      else {
        const random = Math.floor(Math.random() * leads.length);
        const eventId = leads[random].id;

        if (program.verbose) {
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
} else {
  console.log(`Failed probability; skipping feedback`);
}
