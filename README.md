# testlead

This LeadConduit test script takes a posting URL, and an optional list of standard field names. It generates fake but legitimate-looking data and posts it to the given URL.

## Installation

Suitable for global installation:

`npm install -g @activeprospect/testlead`

## Usage

Usage is: `testlead [ -d "key1=val1,key2=val2" ] [ -o [ -b browsername ]] [ -p n ] url [ fields...]`

`$ testlead https://next.staging.leadconduit.com/flows/549093d1600f56d6475fa79f/sources/541887ea14251b0336f9dba1/submit email first_name city postal_code`

> `Lead posted for Cesar.Kulas@gmail.com to https://next.staging.leadconduit.com/flows/549093d1600f56d6475fa79f/sources/541887ea14251b0336f9dba1/submit ({"outcome":"success","lead":{"id":"5ab0239c1438145681fbc025"}})`

### -d - define data to not fake

The data sent for the _fields_ listed at the end of the command string (or the default field set, if none listed) is random, fake data. Use the `-d` option to include set, non-fake data in your test lead. For example, if your flow has a filter to reject juveniles and anyone outside of Texas, you could force those values with `-d "age=19&state=TX&foo=bar bip bap"` (note that if you provide more than value, or a value with spaces, you'll need to quote the value or escape those characters).

### -o & -b - open leads in your browser

Specify this flag to open the posted lead's detail in LeadConduit in your
default browser (or in the browser you specify with `-b`).

### -p - set probability to randomize repeated runs

This option adds some randomness, and is most useful in `crontab`-scripted scenarios. Using this, you can schedule the script to run on a simple every-minute schedule, but control the overall rate of posts to something less than one per minute.

If `-p` (or `--probability`) is given, with a number between 0 and 100, the script will generate a number in that range, and only post a lead if the value is _less_ than this optional value.

For example, with `-p 10`, a lead will only be posted about 10% of the time, whereas with `-p 95`, a post will usually happen.

The output will state when the probability isn't met:

> `Skipping post to https://next.staging.leadconduit.com/flows/549093d1600f56d6475fa79f/sources/541887ea14251b0336f9dba1/submit`

### _fields_ - specify what fields to fake

The final parameter supported is a list of LeadConduit-standard fields. If not specified, the test lead will be made up of `email`, `first_name`, and `last_name`.

The first parameter listed (or `email` if none are given) is used in the log output.
