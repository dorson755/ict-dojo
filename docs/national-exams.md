# National-exam expansion: BJC and BGCSE intake

Public **Bahamas BGCSE** and **Bahamas BJC** collections live at `/past-papers`.
The qualification selector uses `?exam=bgcse` (default) and `?exam=bjc`.
BGCSE lists the 26 supplied subjects in seven categories; BJC lists the 11
supplied subjects in three categories. Both cover 1999 through the current UTC
year. Subject lists, coverage, review queues, and files stay separate even for
shared names such as Mathematics. The new platform name remains undecided.

## Current scope

- Public catalog; signed-in dojo accounts can contribute PDFs.
- Separate question-paper, mark-scheme, and syllabus components, with a free-text
  component name for paper number, session, variant, or syllabus edition.
- 20 MB per PDF, one component per file, 15 attempts per account per UTC day.
- Private superadmin queue at `/past-papers/review`.
- Accepting a component does **not** complete the year. A superadmin must verify
  the official component requirements, then explicitly mark that subject/year
  collected within its qualification. They can reopen it. At least one accepted question paper is required;
  a syllabus or mark scheme alone cannot make a year complete.
- No public file downloads, extraction, AI processing, question bank, or marking.
  The dashboard and archive describe future exam practice as coming soon.

Status precedence: collected, partly collected (some accepted), under review
(pending only), needed. Pending counts remain visible on partly collected or
collected years. Public records contain only coverage and accepted component
names/types, not account IDs, filenames, notes, storage keys, or review notes.

## Deployment is deliberately disabled

No AWS resource, Cognito user, IAM policy, or environment setting is created by
this change. The catalog is usable without S3; file controls say “intake opens
soon” until configured. Ask the owner before provisioning or changing access.

After approval:

1. Resolve the existing production dependency advisories reported by
   `npm audit --omit=dev`. This feature does not silently upgrade the framework.
2. Deploy `infrastructure/exam-papers.yaml` with the exact production HTTPS
   origin. Keep S3 Block Public Access on, encryption on, versioning enabled,
   and the bucket private. For local integration tests, add only the exact
   local development origin to CORS temporarily, with owner approval.
3. Grant the runtime principal `s3:PutObject`, `s3:GetObject`, and
   `s3:GetObjectVersion` scoped to the outputs `RuntimeObjectResource` (BGCSE)
   and `BjcRuntimeObjectResource` (BJC). It does
   not need bucket listing, deletion, ACLs, or public access.
4. Confirm DynamoDB permissions include GetItem, Query (including GSI1),
   PutItem, and UpdateItem on the existing table and underlying transactional
   use. No new DynamoDB table/index is needed.
5. Set server-only variables:
   - `EXAM_PAPERS_BUCKET`: bucket output.
   - `EXAM_SUPERADMIN_IDS`: comma-separated Cognito **sub IDs**, explicitly
     designated by the owner. No student, teacher, or existing admin role
     automatically gains exam-review authority.
   - `EXAM_INTAKE_ENABLED=true`: only after storage, permissions, and review
     responsibilities have been verified.
6. Deploy, then test one authorized upload and review with the owner's
   permission. Verify unauthorized reads/reviews fail, pending submissions never
   complete a year, and explicit completion/reopening updates the public catalog.

Amplify exports `EXAM_` variables to the server environment during builds.
Do not use `NEXT_PUBLIC_` for these settings. The existing Cognito public
client/pool settings are required for identity verification.

## Safety and storage

New exam actions validate ID token signature, issuer, audience, and token use.
Superadmin membership is checked server-side on every review/download/coverage
action. Contributor ownership is checked on confirmation. Normal Next.js
Server Action origin checks remain enabled.

The server allocates the upload ID and object key; clients cannot choose a bucket
or storage path. A 5-minute S3 POST policy fixes key, type, encryption, and exact
file size. An attempt is budgeted in an atomic transaction **before** the policy
is returned. The server confirms type, size, and `%PDF-` signature, and pins the
object's immutable S3 version. A reused POST cannot replace the bytes associated
with a submitted paper. Confirmation expires after 15 minutes.

These checks are **not a malware scan or a complete PDF parser**. Unreviewed
PDFs are untrusted. The review UI requires an explicit safety/permission/content
attestation before acceptance and offers short-lived attachment-only downloads,
not embedded previews. Reviewers must scan files and use a safe PDF viewer.
Before expanding access substantially, add automated malware scanning and
operational monitoring. This release does not run uploaded scripts, parse
attachments, or send their contents to an AI provider.

Drafts and rejected uploads remain private. There is deliberately no automatic
S3 noncurrent-version expiration: a submitted file can refer to an older version,
so a general expiration rule would silently break accepted papers. Establish an
owner-approved retention/cleanup policy for abandoned and rejected records/files
before large-scale intake. The daily limit bounds account-level abuse, not
distributed sign-up abuse; consider WAF/account controls before a broad campaign.

Data:

- Coverage: `PK=EXAM#BGCSE#CATALOG`, `SK=<subject>#<year>`.
- Private submission: `PK=EXAM#BGCSE#SUBMISSION#<uuid>`, `SK=META`.
- Pending index: `GSI1PK=EXAM#BGCSE#STATUS#pending`, `GSI1SK=<uuid>`.
- BJC uses the same structure with `EXAM#BJC` instead of `EXAM#BGCSE`.
  Object prefixes are `intake/bgcse/` and `intake/bjc/`. New records carry an
  explicit `qualification`; legacy BGCSE records retain their original keys and
  are interpreted as BGCSE on read. No migration or live-data writes are needed.
- Budget: `PK=USER#<sub>`, `SK=EXAM_UPLOAD_BUDGET#<UTC-date>`.
  The 15-attempt daily allowance is shared across both qualifications.

Confirmation and reviews atomically update submission status and version-checked
coverage. Concurrent conflicts retry three times. Confirmation retries are
idempotent; repeated reviews cannot duplicate accepted components. Accepted
components are capped at 100 per subject/year to bound coverage size. The
review queue is paginated at 30 records; public catalog reads handle pagination.
Expected errors are returned as safe structured action results; storage/SDK
details are not exposed.

## Future exam engine

Keep the future assessment system separate from this intake boundary:

1. Curate accepted papers, marking schemes, and syllabus versions. Preserve
   provenance, page/question references, rights, effective dates, and topic maps.
2. Extract text/diagrams in an isolated worker; human-review the question bank
   and syllabus coverage. Historical syllabuses must not define current scope.
3. Serve past questions and reviewed, newly generated questions separately.
   Every generated question needs a syllabus objective, worked solution,
   marking rubric, and validation, not merely a model's claim that it is correct.
4. Score multiple-choice deterministically. Use a symbolic/numeric math checker
   with explicit equivalence, tolerance, units, and domain restrictions, not
   unrestricted execution of student expressions.
5. Use bounded AI assistance for short/long responses against approved rubrics,
   with uncertainty and human-review paths. Avoid presenting AI grading as
   official exam-board marking. Do not send student PII to a model provider.

AI retrieval, generation, mathematics checking, and grading are design direction,
not shipped functionality. Rights to publish/use the papers and syllabus must be
verified independently; uploading does not grant a license.
