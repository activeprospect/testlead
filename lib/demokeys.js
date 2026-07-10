const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = 'demoConfig/keys.json';
const DEFAULT_SECRET_ID = 'leadconduit-lambdas/staging/test-sales-and-dev-leads';

function parseJson (raw, origin) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`DEMO_KEYS from ${origin} is not valid JSON: ${e.message}`);
  }
}

// Inline JSON in DEMO_KEYS. This is the `doppler run` / explicit-env path used
// locally and in CI; the deployed Lambda leaves it unset so the value comes
// from Secrets Manager.
function fromEnv () {
  const raw = process.env.DEMO_KEYS;
  if (raw == null || raw === '') return undefined;
  return parseJson(raw, 'the DEMO_KEYS environment variable');
}

// Local JSON file (default demoConfig/keys.json). Preserves the existing
// local-dev workflow for anyone who already has the file.
function fromFile () {
  const file = process.env.DEMO_KEYS_FILE || DEFAULT_FILE;
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) return undefined;
  return parseJson(fs.readFileSync(resolved, 'utf-8'), `file ${resolved}`);
}

function isCredentialError (e) {
  const name = (e && (e.name || e.Code)) || '';
  const msg = (e && e.message) || '';
  return /Credentials|AccessDenied|UnrecognizedClient|ExpiredToken|InvalidSignature/i.test(name) ||
    /credential/i.test(msg);
}

// The runtime source: read the demo keys from AWS Secrets Manager using the
// default AWS credential provider chain (honors AWS_PROFILE / SSO / AWS_REGION).
// On the deployed Lambda (no DEMO_KEYS env, no local file) this is the operative
// path. The SDK is lazy-required so the env/file paths never load it.
async function fromSecretsManager () {
  const secretId = process.env.DEMO_KEYS_SECRET_ID || DEFAULT_SECRET_ID;
  const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({});
  try {
    const out = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    return parseJson(out.SecretString, `Secrets Manager secret ${secretId}`);
  } catch (e) {
    if (isCredentialError(e)) {
      const file = process.env.DEMO_KEYS_FILE || DEFAULT_FILE;
      console.error(
        `No AWS credentials for fetching DEMO_KEYS from Secrets Manager (${secretId}). ` +
        'Run `aws sso login --profile <profile>` (or `aws_auth`), set AWS_PROFILE ' +
        `to select your role, then retry - or set DEMO_KEYS / provide ${file}.`
      );
    }
    throw e;
  }
}

function isAwsDisabled () {
  const v = process.env.DEMO_KEYS_DISABLE_AWS;
  return v === '1' || v === 'true';
}

function required (value, sourceLabel) {
  if (value === undefined) {
    throw new Error(`DEMO_KEYS_SOURCE=${sourceLabel} was forced but no value was found there.`);
  }
  return value;
}

function noSourceError () {
  const file = process.env.DEMO_KEYS_FILE || DEFAULT_FILE;
  const secretId = process.env.DEMO_KEYS_SECRET_ID || DEFAULT_SECRET_ID;
  return new Error(
    'Could not resolve DEMO_KEYS. Provide one of: ' +
    '(1) the DEMO_KEYS env var (inline JSON), ' +
    `(2) a JSON file at ${file} (override with DEMO_KEYS_FILE), or ` +
    `(3) AWS credentials to read Secrets Manager secret ${secretId} (skipped when DEMO_KEYS_DISABLE_AWS is set).`
  );
}

// Resolve the demo keys map (account name -> LeadConduit API key). Precedence:
// DEMO_KEYS env -> local file -> Secrets Manager. Override with DEMO_KEYS_SOURCE
// (env|file|secretsmanager) to force a single source, or DEMO_KEYS_DISABLE_AWS to
// skip the Secrets Manager fallback (e.g. offline/CI).
async function getDemoKeys () {
  const forced = process.env.DEMO_KEYS_SOURCE;
  if (forced === 'env') return required(fromEnv(), 'env');
  if (forced === 'file') return required(fromFile(), 'file');
  if (forced === 'secretsmanager') return fromSecretsManager();
  if (forced) throw new Error(`Unknown DEMO_KEYS_SOURCE '${forced}'; expected env|file|secretsmanager.`);

  const env = fromEnv();
  if (env !== undefined) return env;

  const file = fromFile();
  if (file !== undefined) return file;

  if (isAwsDisabled()) throw noSourceError();
  return fromSecretsManager();
}

module.exports = {
  getDemoKeys
};
