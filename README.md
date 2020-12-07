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

In addition to being an interactive tool to send test leads and feedback, we also use this tool internally to automate sending test data into some demo or test flows. This code is deployed to AWS Lambda, where regular CloudWatch/EventBridge events trigger the execution of the `lambda()` function defined in `index.js`, which runs the test-data creation tasks formerly scripted via cron on LC staging.

Note that use of feedback in lambda requires the presence of `keys.json` in the root directory of the deployed package, with your LeadConduit API key defined, like this:

```
{
  "apikey": "your_lc_api_key_here"
}
```
