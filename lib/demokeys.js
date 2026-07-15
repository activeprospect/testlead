const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = 'demoConfig/keys.json';
const DEFAULT_SECRET_ID = 'leadconduit-lambdas-staging-testlead-doppler';

function parseJson (raw, origin) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Do not echo the raw value or the JSON.parse detail: for the DEMO_KEYS env
    // path that detail can contain a fragment of the real secret. origin is a
    // static descriptor supplied by the caller (never an env-derived value).
    throw new Error(`DEMO_KEYS from ${origin} is not valid JSON`);
  }
}

// The Doppler -> Secrets Manager single-secret sync stores the whole
// staging_testlead config as one JSON object ({ DEMO_KEYS: "<json>",
// DOPPLER_PROJECT: ..., DOPPLER_CONFIG: ..., DOPPLER_ENVIRONMENT: ... }), and
// every value - including our map - is serialized as a string regardless of the
// Doppler value type. So unwrap the DEMO_KEYS entry and parse it into the
// account -> API key map. Fall back to treating the whole object as the map so a
// hand-created secret (or a unit-test stub) that stores the bare map still works.
function unwrapDemoKeys (secret) {
  if (secret && typeof secret === 'object' && Object.prototype.hasOwnProperty.call(secret, 'DEMO_KEYS')) {
    const inner = secret.DEMO_KEYS;
    return typeof inner === 'string' ? parseJson(inner, 'the Secrets Manager DEMO_KEYS entry') : inner;
  }
  return secret;
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
  return parseJson(fs.readFileSync(resolved, 'utf-8'), 'the local key file');
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
    if (out.SecretString == null) {
      // The demo keys are stored as a JSON SecretString (Doppler -> Secrets
      // Manager sync). A binary or empty payload is a misconfiguration; fail
      // with a clear message rather than a misleading "not valid JSON" error
      // from parsing undefined.
      throw new Error('Secrets Manager secret has no SecretString payload (expected JSON text, not binary)');
    }
    return unwrapDemoKeys(parseJson(out.SecretString, 'Secrets Manager'));
  } catch (e) {
    if (isCredentialError(e)) {
      // Fully static guidance: never interpolate env-derived values (the secret
      // id / file path) so nothing sensitive is logged. Knobs are named in plain
      // literal text rather than by reading process.env.
      console.error(
        'No AWS credentials for fetching DEMO_KEYS from Secrets Manager. ' +
        'Run `aws sso login --profile <profile>` (or `aws_auth`), set AWS_PROFILE ' +
        'to select your role, then retry - or set DEMO_KEYS / provide the local key file.'
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
  // Fully static message: no process.env reads. Knob names are plain literal
  // text so nothing env-derived flows into the thrown (and later logged) error.
  return new Error(
    'Could not resolve DEMO_KEYS. Provide one of: ' +
    '(1) the DEMO_KEYS env var (inline JSON), ' +
    '(2) a JSON key file (default demoConfig/keys.json, override with DEMO_KEYS_FILE), or ' +
    '(3) AWS credentials to read the Secrets Manager secret named by DEMO_KEYS_SECRET_ID ' +
    '(skipped when DEMO_KEYS_DISABLE_AWS is set).'
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
  if (forced) throw new Error('Unknown DEMO_KEYS_SOURCE; expected env|file|secretsmanager.');

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
