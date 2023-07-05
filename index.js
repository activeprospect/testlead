const { submitLead } = require('./lib/submitlead');
const { submitFeedback } = require('./lib/submitfeedback');
const AWS = require('aws-sdk');

AWS.config.update({region: 'us-west-1'});
s3 = new AWS.S3({apiVersion: '2006-03-01'});

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

function lambda() {
  const bucket = 'sales-and-dev-leads-config';
  const leadConfig = 'leadSubmissions.json';
  const feedbackConfig = 'feedbackSubmissions.json';

  try {
    s3.getObject({Bucket: bucket, Key: leadConfig}, function(err, data) {
      if (err) {
        console.log(`Error from s3.getObject (${bucket}/${leadConfig})`, err);
      } else {
        demoLeads(JSON.parse(data.Body.toString('utf-8')));
      }
    });
  } catch (e) {
    console.log(`Unable to load lead submission configuration from S3 (${bucket}/${leadConfig})`, e);
  }

  try {
    s3.getObject({Bucket: bucket, Key: feedbackConfig}, function(err, data) {
      if (err) {
        console.log(`Error from s3.getObject (${bucket}/${feedbackConfig})`, err);
      } else {
        demoFeedbacks(JSON.parse(data.Body.toString('utf-8')));
      }
    });
  } catch (e) {
    console.log(`Unable to load lead submission configuration from S3 (${bucket}/${feedbackConfig})`, e);
  }
}

module.exports = {
  lambda,
  demoLeads,
  demoFeedbacks
}
