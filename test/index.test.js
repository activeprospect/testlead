const { expect } = require('chai');
const demoRunner = require('../index');

describe('index lambda', () => {
  let originalS3;
  let originalLog;
  let logged;

  beforeEach(() => {
    originalS3 = global.s3;
    originalLog = console.log;
    logged = [];
    console.log = (...args) => logged.push(args.join(' '));
  });

  afterEach(() => {
    global.s3 = originalS3;
    console.log = originalLog;
  });

  it('reads both config objects from the correct S3 bucket and keys', () => {
    const calls = [];
    global.s3 = {
      getObject: (params, cb) => {
        calls.push(params);
        if (params.Key === 'leadSubmissions.json') {
          const config = [{ description: 'test', url: 'http://example.com/submit', probability: 0 }];
          cb(null, { Body: Buffer.from(JSON.stringify(config)) });
        } else {
          cb(new Error('feedback read skipped for test'));
        }
      }
    };

    demoRunner.lambda();

    expect(calls).to.have.lengthOf(2);
    calls.forEach((params) => {
      expect(params.Bucket).to.equal('sales-and-dev-leads-config');
    });
    const keys = calls.map((c) => c.Key);
    expect(keys).to.include('leadSubmissions.json');
    expect(keys).to.include('feedbackSubmissions.json');
  });

  it('processes the lead config returned from S3', () => {
    global.s3 = {
      getObject: (params, cb) => {
        if (params.Key === 'leadSubmissions.json') {
          const config = [{ description: 'Staging Dev-Test', url: 'http://example.com/submit', probability: 0 }];
          cb(null, { Body: Buffer.from(JSON.stringify(config)) });
        } else {
          cb(new Error('feedback read skipped for test'));
        }
      }
    };

    demoRunner.lambda();

    expect(logged.some((line) => line.includes('Processing lead for Staging Dev-Test'))).to.equal(true);
  });
});
