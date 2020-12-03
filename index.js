const { submitLead } = require('./lib/submitlead');

const testSubmissions = [
  {
    description: 'Staging Dev-Test',
    url: 'https://next.leadconduit-staging.com/flows/541afb8db91da1ce20fc6a5f/sources/550c3c06c5f57a407f5b68bb/submit',
    probability: 45
  },
  {
    description: 'AP Demo: All Web Leads',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/5329b168df597ffadc000003/submit',
    probability: 20
  },
  {
    description: 'AP Demo: Everquote',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/5e20ab53e30a747076bbfbf7/submit',
    probability: 20
  },
  {
    description: 'AP Demo: Education Dynamics',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/56fd71e18f9d7310decb76e2/submit',
    probability: 20
  },
  {
    description: 'AP Demo: HomeAdvisor',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/56fd71e18f9d7310decb76fb/submit',
    probability: 20
  },
  {
    description: 'AP Demo: SuitedConnector',
    url: 'https://app.leadconduit.com/flows/541c67415fc1e8567ac27304/sources/56fd71e18f9d7310decb774f/submit',
    probability: 20
  }
];

function lambda() {
  const fields = [ "first_name", "last_name", "email", "phone_1", "address_1", "city", "state", "postal_code", "company.name" ];

  testSubmissions.forEach(submission => {
    console.log(`Processing test for ${submission.description} (${submission.probability}%)...`)
    submitLead(submission.probability, submission.url, fields);
  })
}

module.exports = {
  lambda
}
