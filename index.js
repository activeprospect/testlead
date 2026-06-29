const { submitLead } = require('./lib/submitlead');
const { submitFeedback } = require('./lib/submitfeedback');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});

function demoLeads(config) {
  config.forEach(lead => {
    if(!lead.fields) lead.fields = [ "first_name", "last_name", "email", "phone_1", "address_1", "city", "state", "postal_code", "company.name" ];
    console.log(`Processing lead for ${lead.description} (${lead.probability}%)...`);
    submitLead(lead);
  });
}

function demoFeedbacks(config) {
  const keys = require('./demoConfig/keys.json');
  config.forEach(feedback => {
    feedback.apiKey = keys[feedback.accountname];
    console.log(`Processing feedback for ${feedback.description} (${feedback.probability}%)...`)
    submitFeedback(feedback);
  });
}

function getConfig(bucket, key) {
  return s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    .then((response) => response.Body.transformToString('utf-8'))
    .then((body) => JSON.parse(body));
}

// Intentionally NOT async. Returning a resolved promise would make this an
// async Lambda handler, which completes the moment the promise settles and
// freezes the execution environment before the callback-based HTTP posts in
// submitLead/submitFeedback finish. Leaving the handler synchronous lets the
// default callbackWaitsForEmptyEventLoop drain the event loop (S3 reads plus
// the outbound posts), preserving the original behavior.
function lambda() {
  const bucket = 'sales-and-dev-leads-config';
  const leadConfig = 'leadSubmissions.json';
  const feedbackConfig = 'feedbackSubmissions.json';

  getConfig(bucket, leadConfig)
    .then(demoLeads)
    .catch((e) => console.log(`Error loading lead submission configuration from S3 (${bucket}/${leadConfig})`, e));

  getConfig(bucket, feedbackConfig)
    .then(demoFeedbacks)
    .catch((e) => console.log(`Error loading feedback submission configuration from S3 (${bucket}/${feedbackConfig})`, e));
}

module.exports = {
  lambda,
  demoLeads,
  demoFeedbacks
}
