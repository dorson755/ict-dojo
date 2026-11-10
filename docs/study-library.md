# Study library

`/study` is a public subject directory, linked from the main navigation. It reuses
the national-exam catalog: all 26 BGCSE subjects and 11 BJC subjects have a subject
page. Unpublished subjects explicitly say that materials are coming soon.

The first published library is `/study/bgcse/keyboarding`:

- 25 student sessions in the supplied study notes' order.
- A syllabus overview and the supplied 20-page scanned syllabus PDF.
- A public teacher guide with the separate 26-lesson weekly sequence.
- Supplementary YouTube demonstrations, loaded only after the reader selects
  **Load video**, using the privacy-enhanced embed domain. Each has a direct link
  in case embedding is unavailable.

Reading does not write progress, award XP, or require a database operation.
Existing practice and document-production tools still require sign-in.

## Sources and editorial decisions

The user supplied `BGCSE_Keyboarding_Study_Notes.docx`,
`BGCSE_Keyboarding_Weekly_Lesson_Plans_Revised.docx`, and
`keyboarding_syllabus.pdf` (Ministry of Education, **Keyboarding Skills Syllabus
2006**). Text is stored in `src/domains/study/keyboarding.json`; the supplied PDF
is `public/study/bgcse-keyboarding-syllabus-2006.pdf`.

The library identifies the syllabus year and does not claim it is the current
exam specification. Pages 8 and 10 disagree on Paper 1 timing, so readers must
confirm current instructions. Paper 1 is not described as a speed-only test.
Full-paper simulations require separate extended sittings, not a regular
90-minute lesson.

The source classroom NWPM formula is retained with an explicit note that it is
not verified official BGCSE scoring and is not the Dojo's WPM calculation.
Letter-style and punctuation wording distinguishes modified block from indented
paragraphs and refers readers to their task's model. The financial example uses
line amounts rather than presenting a misleading sum of unit prices with
quantities. The proofreading example explicitly requests both initial capitals.
Margin differences, teacher/student sequence differences, and gaps between the
notes and full syllabus coverage are disclosed.

Videos were sourced by topic and their YouTube oEmbed availability checked during
preparation. Availability and regional embedding permissions can change.
They are supplementary software demonstrations, not official exam instruction.

## Extending the library

Add a course's reviewed content under `src/domains/study`, then register it in
`getStudySubject` and `studySubjects` in `catalog.ts`. Keep qualification and subject
validation tied to the existing exam catalog. Add session resources, provenance,
coverage limitations, and tests before changing a subject from coming soon.

Tests cover complete catalog membership, lesson counts, invalid routes, public
access boundaries, rendered content, navigation, and consent-based video loading.
