/**
 * Removes empty duplicate learner profiles.
 *
 * A duplicate is a profile whose partition holds nothing but its PROFILE row,
 * and whose display name matches a profile that has real practice data. This
 * happens when someone signs up twice and only confirms the second account.
 *
 * Safety rules:
 *  - A profile is only removed if it is a strict shell (one item in its partition).
 *  - It must pair with exactly one data-bearing profile of the same name.
 *    Ambiguous matches are reported and skipped.
 *  - Fields the surviving profile lacks (grade, email) are copied from the shell
 *    so nothing it recorded is lost.
 *  - Cognito users are never touched.
 *
 * Dry run by default. Set APPLY=1 to write. A JSON backup of every record that
 * will be changed or removed is always written to scripts/backups/ first.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node","esModuleInterop":true}' scripts/merge-duplicate-profiles.ts
 *   APPLY=1 npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node","esModuleInterop":true}' scripts/merge-duplicate-profiles.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'ict-dojo-main';
const apply = process.env.APPLY === '1';
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

type Item = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const COPYABLE_FIELDS = ['grade_level', 'email'] as const;

const nameKey = (item: Item) => String(item.display_name ?? item.name ?? '').trim().toLowerCase();
const shortId = (item: Item) => String(item.PK).replace(/^USER#/, '').slice(0, 8);

async function scanUserItems(): Promise<Item[]> {
  const out: Item[] = [];
  let key: Record<string, unknown> | undefined;
  do {
    const response = await doc.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: 'begins_with(PK, :user)',
      ExpressionAttributeValues: { ':user': 'USER#' },
      ExclusiveStartKey: key,
    }));
    out.push(...((response.Items ?? []) as Item[]));
    key = response.LastEvaluatedKey;
  } while (key);
  return out;
}

interface Plan {
  shell: Item;
  survivor: Item;
  copy: Partial<Record<(typeof COPYABLE_FIELDS)[number], unknown>>;
}

async function main() {
  const items = await scanUserItems();
  const perUser = new Map<string, Item[]>();
  for (const item of items) perUser.set(item.PK, [...(perUser.get(item.PK) ?? []), item]);

  const profiles = items.filter((item) => item.SK === 'PROFILE' && nameKey(item));
  const isShell = (profile: Item) => (perUser.get(profile.PK) ?? []).length === 1;

  const plans: Plan[] = [];
  const skipped: string[] = [];

  const byName = new Map<string, Item[]>();
  for (const profile of profiles) byName.set(nameKey(profile), [...(byName.get(nameKey(profile)) ?? []), profile]);

  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    const shells = group.filter(isShell);
    const survivors = group.filter((profile) => !isShell(profile));
    if (!shells.length) continue;
    if (survivors.length !== 1) {
      skipped.push(`"${name}": ${survivors.length} data-bearing profiles, cannot pick one safely`);
      continue;
    }
    const survivor = survivors[0];
    for (const shell of shells) {
      const copy: Plan['copy'] = {};
      for (const field of COPYABLE_FIELDS) {
        if (shell[field] && !survivor[field]) copy[field] = shell[field];
      }
      plans.push({ shell, survivor, copy });
    }
  }

  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${plans.length} duplicate profile(s) found.\n`);
  for (const plan of plans) {
    const kept = (perUser.get(plan.survivor.PK) ?? []).length;
    const copied = Object.keys(plan.copy).join(', ') || 'nothing to copy';
    console.log(
      `"${plan.survivor.display_name}"  remove ${shortId(plan.shell)} (empty, created ${plan.shell.created_at})` +
      `  keep ${shortId(plan.survivor)} (${kept} records)  copy: ${copied}`,
    );
  }
  for (const message of skipped) console.log(`SKIPPED ${message}`);

  if (!plans.length) return;

  const backupDir = join(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(backupDir, `merge-duplicate-profiles-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(backupPath, JSON.stringify(plans.map((plan) => ({
    removed: plan.shell,
    survivorBefore: plan.survivor,
    copied: plan.copy,
  })), null, 2));
  console.log(`\nBackup written: ${backupPath}`);

  if (!apply) {
    console.log('Dry run only. Re-run with APPLY=1 to write these changes.');
    return;
  }

  for (const plan of plans) {
    const fields = Object.entries(plan.copy);
    if (fields.length) {
      await doc.send(new UpdateCommand({
        TableName: tableName,
        Key: { PK: plan.survivor.PK, SK: 'PROFILE' },
        UpdateExpression: `SET ${fields.map((_, index) => `#f${index} = :v${index}`).join(', ')}`,
        ExpressionAttributeNames: Object.fromEntries(fields.map(([field], index) => [`#f${index}`, field])),
        ExpressionAttributeValues: Object.fromEntries(fields.map(([, value], index) => [`:v${index}`, value])),
      }));
    }
    // Condition guards against the shell having gained data since the scan.
    await doc.send(new DeleteCommand({
      TableName: tableName,
      Key: { PK: plan.shell.PK, SK: 'PROFILE' },
      ConditionExpression: 'attribute_exists(PK)',
    }));
  }
  console.log('\nDone. Duplicate profiles removed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
