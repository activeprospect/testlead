const { submitLead } = require('./lib/submitlead');
const { submitFeedback } = require('./lib/submitfeedback');
const { apikey } = require('./keys');

const fields = [ "first_name", "last_name", "email", "phone_1", "address_1", "city", "state", "postal_code", "company.name" ];
const testLeadSubmissions = [
  {
    description: 'Staging Dev-Test',
    url: 'https://next.leadconduit-staging.com/flows/541afb8db91da1ce20fc6a5f/sources/550c3c06c5f57a407f5b68bb/submit',
    fields: fields,
    probability: 45
  },
  {
    description: 'AP Demo: All Web Leads',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/5329b168df597ffadc000003/submit',
    fields: fields,
    probability: 20
  },
  {
    description: 'AP Demo: Everquote',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/5e20ab53e30a747076bbfbf7/submit',
    fields: fields,
    probability: 20
  },
  {
    description: 'AP Demo: Education Dynamics',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/56fd71e18f9d7310decb76e2/submit',
    fields: fields,
    probability: 20
  },
  {
    description: 'AP Demo: HomeAdvisor',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/56fd71e18f9d7310decb76fb/submit',
    fields: fields,
    probability: 20
  },
  {
    description: 'AP Demo: SuitedConnector',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/56fd71e18f9d7310decb774f/submit',
    fields: fields,
    probability: 20
  }
];

const testFeedbackSubmissions = [
  {
    description: "AP Demo",
    apiKey: apikey,
    recipientId: "5d5aaadf6c445f078efaf138",
    feedbackType: "conversion",
    feedbackReason: "Closed won",
    probability: 2
  }
];

function lambda() {
  testLeadSubmissions.forEach(lead => {
    console.log(`Processing lead for ${lead.description} (${lead.probability}%)...`)
    submitLead(lead);
  })

  testFeedbackSubmissions.forEach(feedback => {
    console.log(`Processing feedback for ${feedback.description} (${feedback.probability}%)...`)
    submitFeedback(feedback);
  })
}

module.exports = {
  lambda
}
