const demoRunner = require('../index');

const testSubmissions = [
  {
    description: 'Staging Dev-Test',
    url: 'https://next.leadconduit-staging.com/flows/541afb8db91da1ce20fc6a5f/sources/550c3c06c5f57a407f5b68bb/submit',
    probability: 45
  }
];

const testFeedbacks = [
  // {
  //   "description": "convert Salesforce recipient in AP Demo account",
  //   "accountname": "ActiveProspect, Inc. Demo",
  //   "recipientId": "5d5aaadf6c445f078efaf138",
  //   "feedbackType": "conversion",
  //   "feedbackReason": "Closed won",
  //   "probability": 1
  // },
  {
    description: 'convert Batch File Delivery in AP Inc.',
    accountname: 'ActiveProspect, Inc.',
    recipientId: '5877e76b53987ebbd23bafd7',
    feedbackType: 'conversion',
    feedbackReason: 'Closed won',
    probability: 1
  }
];

(async () => {
  try {
    await demoRunner.demoLeads(testSubmissions);
    await demoRunner.demoFeedbacks(testFeedbacks);
  } catch (e) {
    // getDemoKeys() rejects (e.g. no AWS credentials) surface here with the
    // actionable guidance printed by the resolver, rather than as an
    // unhandled promise rejection.
    console.error('manualdemo failed:', e.message);
    process.exit(1);
  }
})();
