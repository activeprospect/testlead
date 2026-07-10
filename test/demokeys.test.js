const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');

const { getDemoKeys } = require('../lib/demokeys');

const DEMO_KEYS_ENV_VARS = [
  'DEMO_KEYS',
  'DEMO_KEYS_FILE',
  'DEMO_KEYS_SECRET_ID',
  'DEMO_KEYS_SOURCE',
  'DEMO_KEYS_DISABLE_AWS'
];

const DEFAULT_SECRET_ID = 'leadconduit-lambdas/staging/test-sales-and-dev-leads';

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

    originalSend = SecretsManagerClient.prototype.send;
    originalError = console.error;
    errors = [];
    console.error = (...args) => errors.push(args.join(' '));
  });

  afterEach(() => {
    DEMO_KEYS_ENV_VARS.forEach((k) => {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    });
    SecretsManagerClient.prototype.send = originalSend;
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

  it('falls back to Secrets Manager when neither env nor file resolve', async () => {
    let sentCommand;
    SecretsManagerClient.prototype.send = async function (command) {
      sentCommand = command;
      return { SecretString: JSON.stringify({ 'SM Acct': 'key-sm' }) };
    };
    const keys = await getDemoKeys();
    expect(keys).to.deep.equal({ 'SM Acct': 'key-sm' });
    expect(sentCommand.input.SecretId).to.equal(DEFAULT_SECRET_ID);
  });

  it('honors DEMO_KEYS_SECRET_ID for the Secrets Manager fetch', async () => {
    process.env.DEMO_KEYS_SECRET_ID = 'custom/secret';
    let sentCommand;
    SecretsManagerClient.prototype.send = async function (command) {
      sentCommand = command;
      return { SecretString: '{}' };
    };
    await getDemoKeys();
    expect(sentCommand.input.SecretId).to.equal('custom/secret');
  });

  it('prints actionable guidance and rethrows on a credentials error', async () => {
    SecretsManagerClient.prototype.send = async function () {
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

  it('skips Secrets Manager and fails fast when DEMO_KEYS_DISABLE_AWS is set', async () => {
    process.env.DEMO_KEYS_DISABLE_AWS = '1';
    SecretsManagerClient.prototype.send = async function () {
      throw new Error('Secrets Manager should not be called when disabled');
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

    it('forces the secretsmanager source even when DEMO_KEYS is present', async () => {
      process.env.DEMO_KEYS_SOURCE = 'secretsmanager';
      process.env.DEMO_KEYS = JSON.stringify({ ignored: 'env' });
      SecretsManagerClient.prototype.send = async function () {
        return { SecretString: JSON.stringify({ from: 'sm' }) };
      };
      const keys = await getDemoKeys();
      expect(keys).to.deep.equal({ from: 'sm' });
    });

    it('rejects an unknown forced source', async () => {
      process.env.DEMO_KEYS_SOURCE = 'bogus';
      let thrown;
      try { await getDemoKeys(); } catch (e) { thrown = e; }
      expect(thrown.message).to.match(/Unknown DEMO_KEYS_SOURCE 'bogus'/);
    });
  });
});
