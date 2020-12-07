#!/usr/bin/env node

const program = require('commander');
const { submitFeedback } = require('./submitfeedback');

program
  .arguments('testfeedback <api_key> <recipient_id>')
  .requiredOption('-a, --api_key <api-key>', 'LeadConduit API key (required)')
  .requiredOption('-i, --recipient_id <recipient-id>', 'ID of LeadConduit recipient providing feedback (required)')
  .option('-t, --feedback_type <type>', 'One of "conversion" or "return"', 'return')
  .option('-r, --feedback_reason <reason>', 'Text reason for this feedback', 'bad lead, boo')
  .option('-p, --probability <percentage>', 'Probability % of sending anything', 100)
  .option('-s, --staging', 'Post feedback to staging', false)
  .option('-v, --verbose', 'Output verbose details', false)
  .parse(process.argv);

program.feedback_type = program.feedback_type || "return";

if(program.feedback_type === "return") {
  program.feedback_reason = program.feedback_reason || "bad lead, boo";
}
else if(program.feedback_type === "conversion") {
  program.feedback_reason = program.feedback_reason || "good lead, yay";
}
else {
  console.log(`Error: unknown feedback type '${program.feedback_type}'`);
  return 3;
}

submitFeedback(program);
