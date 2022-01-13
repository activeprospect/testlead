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
  {
    "description": "AP Demo",
    "recipientId": "5d5aaadf6c445f078efaf138",
    "feedbackType": "conversion",
    "feedbackReason": "Closed won",
    "probability": 2
  }
];

demoRunner.demoFeedbacks(testFeedbacks);
