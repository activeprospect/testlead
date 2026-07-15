#!/usr/bin/env node

const program = require('commander');
const { submitFeedback } = require('./submitfeedback');

program
  .requiredOption('-a, --apiKey <api-key>', 'LeadConduit API key (required)')
  .requiredOption('-i, --recipientId <recipient-id>', 'ID of LeadConduit recipient providing feedback (required)')
  .option('-t, --feedbackType <type>', 'One of "conversion" or "return"', 'return')
  .option('-r, --feedbackReason <reason>', 'Text reason for this feedback')
  .option('-p, --probability <percentage>', 'Probability % of sending anything', 100)
  .option('-s, --staging', 'Post feedback to staging', false)
  .option('-v, --verbose', 'Output verbose details', false)
  .parse(process.argv);

// commander exposes options in camelCase (feedbackType/feedbackReason); the
// reason default depends on the type, so it is applied here rather than as a
// static option default.
if (program.feedbackType === 'return') {
  program.feedbackReason = program.feedbackReason || 'bad lead, boo';
} else if (program.feedbackType === 'conversion') {
  program.feedbackReason = program.feedbackReason || 'good lead, yay';
} else {
  console.log(`Error: unknown feedback type '${program.feedbackType}'`);
  process.exit(3);
}

submitFeedback(program).catch((err) => {
  console.error('Error submitting feedback', err);
  process.exit(1);
});
