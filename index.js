const { submitLead } = require('./lib/submitlead');
const { submitFeedback } = require('./lib/submitfeedback');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});

function demoLeads(config) {
  return Promise.all(config.map(lead => {
    if(!lead.fields) lead.fields = [ "first_name", "last_name", "email", "phone_1", "address_1", "city", "state", "postal_code", "company.name" ];
    console.log(`Processing lead for ${lead.description} (${lead.probability}%)...`);
    return submitLead(lead);
  }));
}

function demoFeedbacks(config) {
  const keys = require('./demoConfig/keys.json');
  return Promise.all(config.map(feedback => {
    feedback.apiKey = keys[feedback.accountname];
    console.log(`Processing feedback for ${feedback.description} (${feedback.probability}%)...`)
    return submitFeedback(feedback);
  }));
}

function getConfig(bucket, key) {
  return s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    .then((response) => response.Body.transformToString('utf-8'))
    .then((body) => JSON.parse(body));
}

// Async handler: awaits both the S3 reads and every downstream post so the
// promise only settles once all work is done. This is important on Lambda,
// where an async handler freezes the execution environment as soon as its
// promise resolves (the event loop is not drained), so any unawaited HTTP
// would otherwise be cut off mid-flight.
async function lambda() {
  const bucket = 'sales-and-dev-leads-config';
  const leadConfig = 'leadSubmissions.json';
  const feedbackConfig = 'feedbackSubmissions.json';

  try {
    await demoLeads(await getConfig(bucket, leadConfig));
  } catch (e) {
    console.log(`Error loading lead submission configuration from S3 (${bucket}/${leadConfig})`, e);
  }

  try {
    await demoFeedbacks(await getConfig(bucket, feedbackConfig));
  } catch (e) {
    console.log(`Error loading feedback submission configuration from S3 (${bucket}/${feedbackConfig})`, e);
  }
}

module.exports = {
  lambda,
  demoLeads,
  demoFeedbacks
}
