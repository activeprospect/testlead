const { submitLead } = require('./lib/submitlead');
const { submitFeedback } = require('./lib/submitfeedback');
const { getDemoKeys } = require('./lib/demokeys');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});

function demoLeads (config) {
  return Promise.all(config.map(lead => {
    if (!lead.fields) lead.fields = ['first_name', 'last_name', 'email', 'phone_1', 'address_1', 'city', 'state', 'postal_code', 'company.name'];
    console.log(`Processing lead for ${lead.description} (${lead.probability}%)...`);
    return submitLead(lead);
  }));
}

async function demoFeedbacks (config) {
  const keys = await getDemoKeys();
  return Promise.all(config.map(feedback => {
    feedback.apiKey = keys[feedback.accountname];
    console.log(`Processing feedback for ${feedback.description} (${feedback.probability}%)...`);
    return submitFeedback(feedback);
  }));
}

function getConfig (bucket, key) {
  return s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    .then((response) => response.Body.transformToString('utf-8'))
    .then((body) => JSON.parse(body));
}

// Async handler: awaits both the S3 reads and every downstream post so the
// promise only settles once all work is done. This is important on Lambda,
// where an async handler freezes the execution environment as soon as its
// promise resolves (the event loop is not drained), so any unawaited HTTP
// would otherwise be cut off mid-flight.
async function lambda () {
  const bucket = 'sales-and-dev-leads-config';
  const leadConfig = 'leadSubmissions.json';
  const feedbackConfig = 'feedbackSubmissions.json';

  // The config-load and submission phases are kept in separate try/catch blocks
  // so a failed S3 read is reported distinctly from a failure while processing
  // the (successfully fetched) config.
  let leadCfg;
  try {
    leadCfg = await getConfig(bucket, leadConfig);
  } catch (e) {
    console.log(`Error loading lead submission configuration from S3 (${bucket}/${leadConfig})`, e);
  }
  if (leadCfg) {
    try {
      await demoLeads(leadCfg);
    } catch (e) {
      console.log('Error processing lead submissions', e);
    }
  }

  let feedbackCfg;
  try {
    feedbackCfg = await getConfig(bucket, feedbackConfig);
  } catch (e) {
    console.log(`Error loading feedback submission configuration from S3 (${bucket}/${feedbackConfig})`, e);
  }
  if (feedbackCfg) {
    try {
      await demoFeedbacks(feedbackCfg);
    } catch (e) {
      console.log('Error processing feedback submissions', e);
    }
  }
}

module.exports = {
  lambda,
  demoLeads,
  demoFeedbacks
};
