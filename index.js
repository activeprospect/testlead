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

async function getConfig(bucket, key) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await response.Body.transformToString('utf-8');
  return JSON.parse(body);
}

async function lambda() {
  const bucket = 'sales-and-dev-leads-config';
  const leadConfig = 'leadSubmissions.json';
  const feedbackConfig = 'feedbackSubmissions.json';

  try {
    demoLeads(await getConfig(bucket, leadConfig));
  } catch (e) {
    console.log(`Error loading lead submission configuration from S3 (${bucket}/${leadConfig})`, e);
  }

  try {
    demoFeedbacks(await getConfig(bucket, feedbackConfig));
  } catch (e) {
    console.log(`Error loading feedback submission configuration from S3 (${bucket}/${feedbackConfig})`, e);
  }
}

module.exports = {
  lambda,
  demoLeads,
  demoFeedbacks
}
