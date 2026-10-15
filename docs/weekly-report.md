# Weekly report email

Every Friday at 11:00 PM GMT-5, EventBridge Scheduler calls the app, and the app emails a summary of all learners to `info@theheuristicacademy.com` with the full table attached as CSV.

```
EventBridge Scheduler  ->  POST /api/reports/weekly  ->  getTeacherReport  ->  SES
   (Fri 23:00 Bogota)        (bearer secret)
```

The schedule uses the `America/Bogota` time zone. It is a fixed UTC-5 zone with no daylight saving, so the hour never shifts.

## What the email contains

- Learners who practiced this week, with total sessions and minutes
- Counts by status (struggling, inactive, on track, not started)
- Who needs attention and why
- Who is ready for a belt exam
- Who did not practice this week
- `ict-dojo-weekly-YYYY-MM-DD.csv`, the same table as the Export CSV button

Teacher and admin accounts are not counted as learners.

## One-time setup

### 1. Add the SES permission to the runtime user

The deployed app signs requests as the IAM user `ict-dojo-runtime`, which cannot send mail yet. `infrastructure/runtime-ses-policy.json` allows `ses:SendEmail` from `reports@aldion.life` only.

```bash
aws iam put-user-policy \
  --user-name ict-dojo-runtime \
  --policy-name ict-dojo-runtime-ses \
  --policy-document file://infrastructure/runtime-ses-policy.json
```

### 2. Set the environment variables in Amplify

In the Amplify console, open the `ict-dojo` app, then Environment variables, and add:

| Variable | Value |
| --- | --- |
| `WEEKLY_REPORT_SECRET` | A random string of at least 24 characters, for example `openssl rand -hex 32` |
| `WEEKLY_REPORT_TO` | `info@theheuristicacademy.com` |
| `WEEKLY_REPORT_FROM` | `reports@aldion.life` |

`amplify.yml` copies only some variables into the build, so add the three names to the `grep` pattern on the `env | grep -E` line, then redeploy:

```
env | grep -E "RUNTIME_AWS|NEXT_PUBLIC|APP_REGION|GROQ|WEEKLY_REPORT" >> .env.production
```

Until the secret is set, the route answers 503 and sends nothing.

### 3. Deploy the schedule

Use the same secret as in step 2.

```bash
aws cloudformation deploy \
  --region us-east-2 \
  --stack-name ict-dojo-weekly-report \
  --template-file infrastructure/weekly-report.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides WeeklyReportSecret='<the same secret>'
```

## Testing

A dry run builds the real report and returns a preview without sending anything:

```bash
curl -X POST -H "Authorization: Bearer $WEEKLY_REPORT_SECRET" \
  "https://main.d1tba7l6rvz1gn.amplifyapp.com/api/reports/weekly?dryRun=1"
```

Drop `?dryRun=1` to send one real email now. To trigger the schedule itself without waiting for Friday, run it from the EventBridge Scheduler console.

## Behavior to know about

- The route is reachable from the internet, but every request needs the bearer secret. It checks the secret in constant time, and it refuses all requests when no secret is configured.
- The recipient and sender come from environment variables, never from the request, so a caller cannot redirect the report.
- The schedule retries twice within an hour on failure. If SES accepted the mail but the response was lost, that could send the report twice.
- The report is built from live data when it runs, so there is nothing to keep in sync.
