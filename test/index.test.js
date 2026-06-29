const { expect } = require('chai');
const { S3Client } = require('@aws-sdk/client-s3');

const s3Response = (config) => ({
  Body: { transformToString: () => Promise.resolve(JSON.stringify(config)) }
});

describe('index lambda', () => {
  let originalSend;
  let originalLog;
  let logged;
  let demoRunner;

  beforeEach(() => {
    originalSend = S3Client.prototype.send;
    originalLog = console.log;
    logged = [];
    console.log = (...args) => logged.push(args.join(' '));
    delete require.cache[require.resolve('../index')];
    demoRunner = require('../index');
  });

  afterEach(() => {
    S3Client.prototype.send = originalSend;
    console.log = originalLog;
  });

  it('reads both config objects from the correct S3 bucket and keys', async () => {
    const calls = [];
    S3Client.prototype.send = function (command) {
      const { Bucket, Key } = command.input;
      calls.push({ Bucket, Key });
      if (Key === 'leadSubmissions.json') {
        return Promise.resolve(s3Response([{ description: 'test', url: 'http://example.com/submit', probability: 0 }]));
      }
      return Promise.reject(new Error('feedback read skipped for test'));
    };

    await demoRunner.lambda();

    expect(calls).to.have.lengthOf(2);
    calls.forEach((c) => expect(c.Bucket).to.equal('sales-and-dev-leads-config'));
    const keys = calls.map((c) => c.Key);
    expect(keys).to.include('leadSubmissions.json');
    expect(keys).to.include('feedbackSubmissions.json');
  });

  it('processes the lead config returned from S3', async () => {
    S3Client.prototype.send = function (command) {
      if (command.input.Key === 'leadSubmissions.json') {
        return Promise.resolve(s3Response([{ description: 'Staging Dev-Test', url: 'http://example.com/submit', probability: 0 }]));
      }
      return Promise.reject(new Error('feedback read skipped for test'));
    };

    await demoRunner.lambda();

    expect(logged.some((line) => line.includes('Processing lead for Staging Dev-Test'))).to.equal(true);
  });
});
