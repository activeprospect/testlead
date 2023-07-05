const demoRunner = require('../index');

const testSubmissions = [
  {
    "description": "Staging Dev-Test",
    "url": "https://next.leadconduit-staging.com/flows/541afb8db91da1ce20fc6a5f/sources/550c3c06c5f57a407f5b68bb/submit",
    "probability": 45
  }
];

demoRunner.demoLeads(testSubmissions);

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
    "description": "convert Batch File Delivery in AP Inc.",
    "accountname": "ActiveProspect, Inc.",
    "recipientId": "5877e76b53987ebbd23bafd7",
    "feedbackType": "conversion",
    "feedbackReason": "Closed won",
    "probability": 1
  }
];

demoRunner.demoFeedbacks(testFeedbacks);
