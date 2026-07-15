# testlead / testfeedback

This LeadConduit test utility includes two scripts: `testlead` and `testfeedback`.

The first, `testlead`, takes a posting URL, and an optional list of standard field names. It generates fake but legitimate-looking data and posts it to the given URL.

The second, `testfeedback`, takes an ActiveProspect account API key and the BSON ID of a recipient step in a flow belonging to that account. It queries the API for a recent successful delivery to that recipient, and then posts a conversion or return to it.

## Installation

Suitable for global installation:

`npm install -g @activeprospect/testlead`

## Testlead Usage

Usage is: `testlead [ -d "key1=val1,key2=val2" ] [ -v ] [ -o [ -b browsername ]] [ -p n ] url [ fields...]`

`$ testlead https://next.staging.leadconduit.com/flows/549093d1600f56d6475fa79f/sources/541887ea14251b0336f9dba1/submit email first_name city postal_code`

> `Lead posted for Cesar.Kulas@gmail.com to https://next.staging.leadconduit.com/flows/549093d1600f56d6475fa79f/sources/541887ea14251b0336f9dba1/submit ({"outcome":"success","lead":{"id":"5ab0239c1438145681fbc025"}})`

### -d - define data to not fake

The data sent for the _fields_ listed at the end of the command string (or the default field set, if none listed) is random, fake data. Use the `-d` option to include set, non-fake data in your test lead. For example, if your flow has a filter to reject juveniles and anyone outside of Texas, you could force those values with `-d "age=19&state=TX&foo=bar bip bap"` (note that if you provide more than one value, or a value with spaces, you'll need to quote the value or escape those characters).

### -o & -b - open leads in your browser

Specify this flag to open the posted lead's detail in LeadConduit in your
default browser (or in the browser you specify with `-b`).

### -v - verbose

Output verbose details about the request (URL and body) and response (status, body, headers, and err).

### -p - set probability to randomize repeated runs

This option adds some randomness, and is most useful in `crontab`-scripted scenarios. Using this, you can schedule the script to run on a simple every-minute schedule, but control the overall rate of posts to something less than one per minute.

If `-p` (or `--probability`) is given, with a number between 0 and 100, the script will generate a number in that range, and only post a lead if the value is _less_ than this optional value.

For example, with `-p 10`, a lead will only be posted about 10% of the time, whereas with `-p 95`, a post will usually happen.

The output will state when the probability isn't met:

> `Skipping post to https://next.staging.leadconduit.com/flows/549093d1600f56d6475fa79f/sources/541887ea14251b0336f9dba1/submit`

### _fields_ - specify what fields to fake

The final parameter supported is a list of LeadConduit-standard fields. If not specified, the test lead will be made up of `email`, `first_name`, and `last_name`.

The first parameter listed (or `email` if none are given) is used in the log output.

## Testfeedback Usage

Usage is `testfeedback -a api_key -i recipient_id [ -v ] [ -s ] [ -t type ] [ -r reason ]`

`$ lib/testfeedback.js -a 123458c380987654321b9f696de00000 -i 5d5aaadf6c445f078efaf138 -t conversion -r "Closed won"`

> `conversion of lead 5e441d293e8c493d5e30b946, with reason: 'Closed won': success`

### -a - set API key

This is the ActiveProspect API key for the account in which you're providing feedback, needed to query events from the API.

### -i - ID of recipient

This is the BSON ID of the recipient step which you're providing feedback for. To find this, you have to dig it out of the flow JSON, as queried from the API (i.e., in the browser dev-tools, an API query of the flow, or the database).

### -t - specify feedback type

Must be one of `conversion` or `return`; default is `return`.

### -r - specify feedback reason

Any string to be used as the conversion or return reason text; defaults to "bad lead, boo" for returns, or "good lead, yay" for conversions.

### -p - set probability to randomize repeated runs

See `testlead`, above.

### -v - verbose

See `testlead`, above.

## Lambda execution

In addition to being an interactive tool to send test leads and feedback, this tool is also used internally to automate sending test data into a [developer test flow](https://next.leadconduit-staging.com/flows/541afb8db91da1ce20fc6a5f) and some sales demo flows in the "ActiveProspect, Inc. Demo" account. This code is run from AWS (in the **LeadConduit staging** account), where CloudWatch/EventBridge triggers execution of the Lambda [test-sales-and-dev-leads](https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/test-sales-and-dev-leads?tab=monitoring) every minute (the `lambda()` function is defined in `index.js`).

Configuration for these submissions is controlled by two JSON files, read from the S3 bucket [`sales-and-dev-leads-config`](https://s3.console.aws.amazon.com/s3/buckets/sales-and-dev-leads-config?region=us-east-1&tab=objects) (also in the **LeadConduit staging** account): `leadSubmissions.json` and `feedbackSubmissions.json`. Examples of the format expected can be found in the manual/test invocation script `lib/manualdemo.js`.

Automated **feedback** also needs the demo API keys: a JSON map of account name to LeadConduit API key, matching the `accountname` values in `feedbackSubmissions.json`:

```
{
  "ActiveProspect, Inc.": "your_lc_api_key_here",
  "ActiveProspect, Inc. Demo": "another_lc_api_key"
}
```

These keys are not bundled into the deploy artifact and are never placed in the Lambda's environment. They live in an AWS Secrets Manager secret (`leadconduit-lambdas-staging-testlead-doppler`) in the **LeadConduit staging** account. Doppler is the source of truth and syncs into Secrets Manager via a single-secret sync of the `leadconduit-lambdas` project's `staging_testlead` config, so the secret's value is a JSON object of that config's keys — the map above is stored (as a JSON string) under the `DEMO_KEYS` key, alongside Doppler's `DOPPLER_*` metadata keys. At runtime the Lambda calls `GetSecretValue` (via `lib/demokeys.js`) using its function role, unwraps the `DEMO_KEYS` entry, and parses it; only the non-sensitive secret id is exposed as the `DEMO_KEYS_SECRET_ID` environment variable.

#### Local key resolution

When you run the keys-dependent code locally (e.g. `lib/manualdemo.js`), `getDemoKeys()` resolves the map with this precedence:

1. `DEMO_KEYS` — inline JSON in the environment (e.g. via `doppler run`). Highest priority.
2. A local JSON file — `DEMO_KEYS_FILE` if set, otherwise `demoConfig/keys.json` (the previous local-dev workflow).
3. AWS Secrets Manager — reads the `DEMO_KEYS_SECRET_ID` secret (default `leadconduit-lambdas-staging-testlead-doppler`) using your default AWS credentials, unwrapping the `DEMO_KEYS` key from the Doppler-synced payload. This is the source the deployed Lambda uses. If you are not logged in, it prints guidance: run `aws sso login --profile <profile>` (or `aws_auth`) and set `AWS_PROFILE` to select your role, then retry.

Configuration knobs (all optional): `DEMO_KEYS`, `DEMO_KEYS_FILE`, `DEMO_KEYS_SECRET_ID` (default `leadconduit-lambdas-staging-testlead-doppler`), `DEMO_KEYS_SOURCE` (force `env` | `file` | `secretsmanager`), and `DEMO_KEYS_DISABLE_AWS` (skip the Secrets Manager fallback, e.g. offline/CI). Standard AWS env (`AWS_PROFILE`, `AWS_REGION`) governs which role/region the Secrets Manager read uses.

### Deployment

Updates are deployed by the **Deploy test-sales-and-dev-leads to Staging AWS Account** GitHub Action (`.github/workflows/deploy-staging.yml`), triggered manually via `workflow_dispatch`. It packages and deploys the Lambda with [`osls`](https://github.com/oss-serverless/serverless) from `serverless.yml`, which codifies the runtime (`nodejs24.x`), the S3 read permission, the `secretsmanager:GetSecretValue` permission on the demo-keys secret, the every-minute schedule, and the `DEMO_KEYS_SECRET_ID` environment variable (the secret id only — never the keys). No secret is resolved at deploy time; the Lambda reads the demo keys from Secrets Manager at runtime. The workflow authenticates to AWS via GitHub OIDC, assuming the dedicated least-privilege `testlead-deployer` role — there are no long-lived AWS keys stored as secrets. The only repository secret it needs is `NPM_TOKEN` (to install the private dependency).

If you ever need to deploy outside CI (break-glass), authenticate to the **LeadConduit staging** account locally (`aws sso login` / `aws_auth`) and run `osls deploy --stage staging` from a checkout. The retired `deploy.sh` script (which only ran `update-function-code`) has been removed in favor of this path.

#### One-time cutover to `osls`

The original function and its every-minute trigger were created outside CloudFormation, so the first `osls deploy` cannot adopt them. Before the first deploy, perform this one-time cutover in the **LeadConduit staging** account (`us-east-1`):

1. Delete the manually-created EventBridge rule `test-sales-and-staging-leads` (its only target is this Lambda, so nothing else depends on it).
2. Delete the existing `test-sales-and-dev-leads` Lambda function.
3. Run the deploy workflow. CloudFormation then creates the function and its own schedule rule fresh, fully stack-managed.

This causes a brief gap (a couple of skipped synthetic submissions) while the function is recreated, which is harmless for this staging test-data generator. After the cutover, the schedule is owned by the stack — do not recreate the manual rule.
