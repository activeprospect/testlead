const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = 'demoConfig/keys.json';
const DEFAULT_SSM_PARAM = '/test-sales-and-dev-leads/DEMO_KEYS';

function parseJson (raw, origin) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`DEMO_KEYS from ${origin} is not valid JSON: ${e.message}`);
  }
}

// Inline JSON in DEMO_KEYS. This is the Lambda path (SSM-injected at deploy
// time) and the `doppler run` / explicit-env path.
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

// "Log in to AWS" fallback: read the SSM SecureString using the default AWS
// credential provider chain (honors AWS_PROFILE / SSO / AWS_REGION). The SDK is
// lazy-required so the env/file paths never load it.
async function fromSsm () {
  const paramName = process.env.DEMO_KEYS_SSM_PARAM || DEFAULT_SSM_PARAM;
  const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
  const client = new SSMClient({});
  try {
    const out = await client.send(new GetParameterCommand({ Name: paramName, WithDecryption: true }));
    return parseJson(out.Parameter.Value, `SSM parameter ${paramName}`);
  } catch (e) {
    if (isCredentialError(e)) {
      const file = process.env.DEMO_KEYS_FILE || DEFAULT_FILE;
      console.error(
        `No AWS credentials for fetching DEMO_KEYS from SSM (${paramName}). ` +
        'Run `aws sso login --profile <profile>` (or `aws_auth`), set AWS_PROFILE ' +
        `to select your role, then retry - or set DEMO_KEYS / provide ${file}.`
      );
    }
    throw e;
  }
}

function isSsmDisabled () {
  const v = process.env.DEMO_KEYS_DISABLE_SSM;
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
  const param = process.env.DEMO_KEYS_SSM_PARAM || DEFAULT_SSM_PARAM;
  return new Error(
    'Could not resolve DEMO_KEYS. Provide one of: ' +
    '(1) the DEMO_KEYS env var (inline JSON), ' +
    `(2) a JSON file at ${file} (override with DEMO_KEYS_FILE), or ` +
    `(3) AWS credentials to read SSM parameter ${param} (skipped when DEMO_KEYS_DISABLE_SSM is set).`
  );
}

// Resolve the demo keys map (account name -> LeadConduit API key). Precedence:
// DEMO_KEYS env -> local file -> SSM. Override with DEMO_KEYS_SOURCE (env|file|ssm)
// to force a single source, or DEMO_KEYS_DISABLE_SSM to skip the SSM fallback.
async function getDemoKeys () {
  const forced = process.env.DEMO_KEYS_SOURCE;
  if (forced === 'env') return required(fromEnv(), 'env');
  if (forced === 'file') return required(fromFile(), 'file');
  if (forced === 'ssm') return fromSsm();
  if (forced) throw new Error(`Unknown DEMO_KEYS_SOURCE '${forced}'; expected env|file|ssm.`);

  const env = fromEnv();
  if (env !== undefined) return env;

  const file = fromFile();
  if (file !== undefined) return file;

  if (isSsmDisabled()) throw noSourceError();
  return fromSsm();
}

module.exports = {
  getDemoKeys
};
