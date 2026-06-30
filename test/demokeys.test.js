const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SSMClient } = require('@aws-sdk/client-ssm');

const { getDemoKeys } = require('../lib/demokeys');

const DEMO_KEYS_ENV_VARS = [
  'DEMO_KEYS',
  'DEMO_KEYS_FILE',
  'DEMO_KEYS_SSM_PARAM',
  'DEMO_KEYS_SOURCE',
  'DEMO_KEYS_DISABLE_SSM'
];

describe('demokeys getDemoKeys', () => {
  let savedEnv;
  let originalSend;
  let originalError;
  let errors;
  let tmpDir;

  beforeEach(() => {
    // Isolate from any inherited DEMO_KEYS* config and from the developer's real
    // demoConfig/keys.json: point the file source at a path that does not exist.
    savedEnv = {};
    DEMO_KEYS_ENV_VARS.forEach((k) => { savedEnv[k] = process.env[k]; delete process.env[k]; });
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'demokeys-'));
    process.env.DEMO_KEYS_FILE = path.join(tmpDir, 'does-not-exist.json');

    originalSend = SSMClient.prototype.send;
    originalError = console.error;
    errors = [];
    console.error = (...args) => errors.push(args.join(' '));
  });

  afterEach(() => {
    DEMO_KEYS_ENV_VARS.forEach((k) => {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    });
    SSMClient.prototype.send = originalSend;
    console.error = originalError;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses inline JSON from the DEMO_KEYS env var', async () => {
    process.env.DEMO_KEYS = JSON.stringify({ 'Acme Inc.': 'key-123' });
    const keys = await getDemoKeys();
    expect(keys).to.deep.equal({ 'Acme Inc.': 'key-123' });
  });

  it('reads from a local file when DEMO_KEYS is not set', async () => {
    const file = path.join(tmpDir, 'keys.json');
    fs.writeFileSync(file, JSON.stringify({ 'File Acct': 'key-file' }));
    process.env.DEMO_KEYS_FILE = file;
    const keys = await getDemoKeys();
    expect(keys).to.deep.equal({ 'File Acct': 'key-file' });
  });

  it('throws a clear error when DEMO_KEYS is not valid JSON', async () => {
    process.env.DEMO_KEYS = 'not json';
    let thrown;
    try { await getDemoKeys(); } catch (e) { thrown = e; }
    expect(thrown).to.be.an('error');
    expect(thrown.message).to.match(/DEMO_KEYS from the DEMO_KEYS environment variable is not valid JSON/);
  });

  it('falls back to SSM when neither env nor file resolve', async () => {
    let sentCommand;
    SSMClient.prototype.send = async function (command) {
      sentCommand = command;
      return { Parameter: { Value: JSON.stringify({ 'SSM Acct': 'key-ssm' }) } };
    };
    const keys = await getDemoKeys();
    expect(keys).to.deep.equal({ 'SSM Acct': 'key-ssm' });
    expect(sentCommand.input.Name).to.equal('/test-sales-and-dev-leads/DEMO_KEYS');
    expect(sentCommand.input.WithDecryption).to.equal(true);
  });

  it('honors DEMO_KEYS_SSM_PARAM for the SSM fallback', async () => {
    process.env.DEMO_KEYS_SSM_PARAM = '/custom/param';
    let sentCommand;
    SSMClient.prototype.send = async function (command) {
      sentCommand = command;
      return { Parameter: { Value: '{}' } };
    };
    await getDemoKeys();
    expect(sentCommand.input.Name).to.equal('/custom/param');
  });

  it('prints actionable guidance and rethrows on a credentials error', async () => {
    SSMClient.prototype.send = async function () {
      const e = new Error('Could not load credentials from any providers');
      e.name = 'CredentialsProviderError';
      throw e;
    };
    let thrown;
    try { await getDemoKeys(); } catch (e) { thrown = e; }
    expect(thrown).to.be.an('error');
    expect(errors.join('\n')).to.match(/aws sso login/);
    expect(errors.join('\n')).to.match(/AWS_PROFILE/);
  });

  it('skips SSM and fails fast when DEMO_KEYS_DISABLE_SSM is set', async () => {
    process.env.DEMO_KEYS_DISABLE_SSM = '1';
    SSMClient.prototype.send = async function () {
      throw new Error('SSM should not be called when disabled');
    };
    let thrown;
    try { await getDemoKeys(); } catch (e) { thrown = e; }
    expect(thrown).to.be.an('error');
    expect(thrown.message).to.match(/Could not resolve DEMO_KEYS/);
  });

  describe('DEMO_KEYS_SOURCE forcing', () => {
    it('forces the env source', async () => {
      process.env.DEMO_KEYS_SOURCE = 'env';
      process.env.DEMO_KEYS = JSON.stringify({ a: '1' });
      const keys = await getDemoKeys();
      expect(keys).to.deep.equal({ a: '1' });
    });

    it('throws when the forced source has no value', async () => {
      process.env.DEMO_KEYS_SOURCE = 'env';
      let thrown;
      try { await getDemoKeys(); } catch (e) { thrown = e; }
      expect(thrown.message).to.match(/DEMO_KEYS_SOURCE=env was forced/);
    });

    it('forces the ssm source even when DEMO_KEYS is present', async () => {
      process.env.DEMO_KEYS_SOURCE = 'ssm';
      process.env.DEMO_KEYS = JSON.stringify({ ignored: 'env' });
      SSMClient.prototype.send = async function () {
        return { Parameter: { Value: JSON.stringify({ from: 'ssm' }) } };
      };
      const keys = await getDemoKeys();
      expect(keys).to.deep.equal({ from: 'ssm' });
    });

    it('rejects an unknown forced source', async () => {
      process.env.DEMO_KEYS_SOURCE = 'bogus';
      let thrown;
      try { await getDemoKeys(); } catch (e) { thrown = e; }
      expect(thrown.message).to.match(/Unknown DEMO_KEYS_SOURCE 'bogus'/);
    });
  });
});
