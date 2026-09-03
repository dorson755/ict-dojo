-- ============================================================
-- Seed: Typing Domain — Learning Domain + Full K-12 Skill Taxonomy
-- ============================================================

-- Insert Typing learning domain
INSERT INTO public.learning_domains (id, slug, name, description, sort_order)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'typing',
  'Typing Dojo',
  'Keyboard familiarity, touch typing, speed, accuracy, and typing fluency across all grade levels.',
  1
);

-- ============================================================
-- ROOT SKILLS (top-level categories — no parent)
-- ============================================================

INSERT INTO public.skills (id, domain_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  -- Root categories
  ('aa000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'keyboard-familiarity', 'Keyboard Familiarity', 'Understanding and locating keys on the keyboard.', 1, 12, 1.0),
  ('aa000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'letter-combinations', 'Letter Combinations', 'Common digraphs, trigraphs, and letter pair patterns.', 2, 12, 1.5),
  ('aa000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'word-typing', 'Word Typing', 'Typing individual words with accuracy and fluency.', 1, 12, 1.5),
  ('aa000004-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'sentence-typing', 'Sentence Typing', 'Typing full sentences including capitalization and punctuation.', 2, 12, 2.0),
  ('aa000005-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'passage-typing', 'Passage Typing', 'Sustained typing of multi-sentence and multi-paragraph content.', 3, 12, 2.5),
  ('aa000006-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'speed-and-fluency', 'Speed & Fluency', 'Typing rhythm, consistency, and speed targets by grade.', 3, 12, 2.0),
  ('aa000007-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'numbers-and-symbols', 'Numbers & Symbols', 'Number row, symbol keys, and special characters.', 5, 12, 3.0),
  ('aa000008-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'keyboard-shortcuts', 'Keyboard Shortcuts', 'Common productivity and editing keyboard shortcuts.', 6, 12, 2.5),
  ('aa000009-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'technique-and-ergonomics', 'Technique & Ergonomics', 'Proper posture, hand position, and touch-typing technique.', 3, 12, 1.5),
  ('aa000010-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'coding-adjacent-typing', 'Coding-Adjacent Typing', 'Brackets, braces, pipes, slashes, and code-style typing patterns.', 9, 12, 4.0);

-- ============================================================
-- GRADES 1–2: Keyboard Familiarity subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  ('ab000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000001-0000-0000-0000-000000000001', 'home-row', 'Home Row Keys', 'ASDF and JKL; — the anchor keys for touch typing.', 1, 12, 1.0),
  ('ab000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000001-0000-0000-0000-000000000001', 'left-hand-keys', 'Left Hand Keys', 'Keys typed with the left hand: QWERT, ASDFG, ZXCVB.', 1, 12, 1.2),
  ('ab000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000001-0000-0000-0000-000000000001', 'right-hand-keys', 'Right Hand Keys', 'Keys typed with the right hand: YUIOP, HJKL;, NM,./', 1, 12, 1.2),
  ('ab000004-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000001-0000-0000-0000-000000000001', 'top-row', 'Top Row (QWERTYUIOP)', 'All keys in the top letter row.', 2, 12, 1.3),
  ('ab000005-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000001-0000-0000-0000-000000000001', 'bottom-row', 'Bottom Row (ZXCVBNM)', 'All keys in the bottom letter row.', 2, 12, 1.3),
  ('ab000006-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000001-0000-0000-0000-000000000001', 'spacebar', 'Spacebar & Enter', 'Spacebar rhythm and Enter/Return key usage.', 1, 12, 1.0),
  ('ab000007-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000001-0000-0000-0000-000000000001', 'shift-key', 'Shift Key (Capitalization)', 'Using Shift for uppercase letters — left and right Shift.', 2, 12, 1.4),
  ('ab000008-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000001-0000-0000-0000-000000000001', 'backspace-key', 'Backspace Key', 'Correcting mistakes with backspace without losing rhythm.', 1, 12, 1.1);

-- ============================================================
-- GRADES 1–2: Word Typing subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  ('ac000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000003-0000-0000-0000-000000000001', 'simple-words-gr1-2', 'Simple Words (Gr. 1–2)', 'Short 2–4 letter common words: cat, dog, run, the, and.', 1, 2, 1.0),
  ('ac000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000003-0000-0000-0000-000000000001', 'high-frequency-words-gr3-5', 'High-Frequency Words (Gr. 3–5)', 'Dolch/Fry sight word lists — grades 3–5.', 3, 5, 1.5),
  ('ac000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000003-0000-0000-0000-000000000001', 'multisyllable-words', 'Multi-Syllable Words', 'Two and three syllable words with varied letter patterns.', 3, 8, 2.0),
  ('ac000004-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000003-0000-0000-0000-000000000001', 'academic-vocabulary', 'Academic Vocabulary', 'Subject-specific and academic words — grades 6–12.', 6, 12, 2.5),
  ('ac000005-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000003-0000-0000-0000-000000000001', 'technical-vocabulary', 'Technical & Scientific Words', 'Technical, scientific, and specialized vocabulary.', 9, 12, 3.5);

-- ============================================================
-- GRADES 2–5: Letter Combinations subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  ('ad000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000002-0000-0000-0000-000000000001', 'common-digraphs', 'Common Digraphs', 'th, he, in, er, an, re, on, en, at, es, or, ou, sh, ch, wh.', 2, 8, 1.5),
  ('ad000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000002-0000-0000-0000-000000000001', 'common-trigraphs', 'Common Trigraphs', 'the, and, ing, ion, ent, for, her, his, was, all.', 3, 8, 1.7),
  ('ad000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000002-0000-0000-0000-000000000001', 'lr-alternation', 'Left–Right Hand Alternation', 'Patterns that naturally alternate between left and right hands.', 3, 10, 2.0),
  ('ad000004-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000002-0000-0000-0000-000000000001', 'awkward-combinations', 'Awkward Key Combinations', 'Combinations requiring unusual finger stretches or same-hand patterns.', 5, 12, 2.8);

-- ============================================================
-- GRADES 2–8: Sentence Typing subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  ('ae000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000004-0000-0000-0000-000000000001', 'simple-sentences', 'Simple Sentences', 'Short declarative sentences — subject + verb + object.', 2, 5, 1.5),
  ('ae000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000004-0000-0000-0000-000000000001', 'basic-punctuation', 'Basic Punctuation', 'Period, comma, question mark, exclamation mark in context.', 2, 6, 1.8),
  ('ae000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000004-0000-0000-0000-000000000001', 'advanced-punctuation', 'Advanced Punctuation', 'Colon, semicolon, apostrophe, quotation marks, dash, ellipsis.', 6, 12, 2.8),
  ('ae000004-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000004-0000-0000-0000-000000000001', 'complex-sentences', 'Complex Sentences', 'Multi-clause sentences with varied structure.', 5, 12, 2.5);

-- ============================================================
-- GRADES 3–12: Passage Typing subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  ('af000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000005-0000-0000-0000-000000000001', 'short-passages', 'Short Passages (50–100 words)', 'Typing short focused paragraphs.', 3, 6, 2.0),
  ('af000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000005-0000-0000-0000-000000000001', 'medium-passages', 'Medium Passages (100–200 words)', 'Sustained typing for moderate length passages.', 5, 9, 2.8),
  ('af000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000005-0000-0000-0000-000000000001', 'long-passages', 'Long Passages (200–500 words)', 'Extended sustained typing — essays, reports, documents.', 8, 12, 3.5);

-- ============================================================
-- GRADES 3–12: Speed & Fluency subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline, metadata) VALUES
  ('ag000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000006-0000-0000-0000-000000000001', 'wpm-tier-1', 'WPM Tier 1 (10–20 WPM)', 'Foundational speed — early learners.', 1, 3, 1.0, '{"target_wpm_min": 10, "target_wpm_max": 20}'),
  ('ag000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000006-0000-0000-0000-000000000001', 'wpm-tier-2', 'WPM Tier 2 (20–35 WPM)', 'Developing speed — grades 3–5 target.', 3, 5, 1.5, '{"target_wpm_min": 20, "target_wpm_max": 35}'),
  ('ag000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000006-0000-0000-0000-000000000001', 'wpm-tier-3', 'WPM Tier 3 (35–55 WPM)', 'Fluent speed — grades 6–8 target.', 6, 8, 2.0, '{"target_wpm_min": 35, "target_wpm_max": 55}'),
  ('ag000004-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000006-0000-0000-0000-000000000001', 'wpm-tier-4', 'WPM Tier 4 (55–80 WPM)', 'Proficient speed — grades 9–12 target.', 9, 12, 3.0, '{"target_wpm_min": 55, "target_wpm_max": 80}'),
  ('ag000005-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000006-0000-0000-0000-000000000001', 'wpm-tier-5', 'WPM Tier 5 (80+ WPM)', 'Expert speed.', 10, 12, 4.0, '{"target_wpm_min": 80, "target_wpm_max": 999}'),
  ('ag000006-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000006-0000-0000-0000-000000000001', 'typing-rhythm', 'Typing Rhythm & Consistency', 'Even keystroke cadence — avoiding burst-then-pause patterns.', 3, 12, 2.0, NULL),
  ('ag000007-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000006-0000-0000-0000-000000000001', 'hesitation-reduction', 'Hesitation Reduction', 'Minimizing mid-word and between-word pauses.', 4, 12, 2.2, NULL);

-- ============================================================
-- GRADES 5–12: Numbers & Symbols subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  ('ah000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000007-0000-0000-0000-000000000001', 'number-row', 'Number Row (0–9)', 'Typing digits 0–9 with the top row.', 5, 12, 2.5),
  ('ah000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000007-0000-0000-0000-000000000001', 'common-symbols', 'Common Symbols', '@, #, $, %, &, *, (, ), -, _, +, =, [, ]', 6, 12, 3.0),
  ('ah000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000007-0000-0000-0000-000000000001', 'advanced-symbols', 'Advanced Symbols', 'Full symbol row mastery including ^, ~, |, \, `, {, }', 9, 12, 3.5);

-- ============================================================
-- GRADES 6–12: Keyboard Shortcuts subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  ('ai000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000008-0000-0000-0000-000000000001', 'basic-shortcuts', 'Basic Shortcuts', 'Copy, Cut, Paste, Undo, Redo, Select All, Save.', 6, 12, 2.0),
  ('ai000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000008-0000-0000-0000-000000000001', 'editing-shortcuts', 'Editing & Navigation Shortcuts', 'Home, End, Page Up/Down, word navigation (Ctrl+Arrow).', 7, 12, 2.5),
  ('ai000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000008-0000-0000-0000-000000000001', 'ide-shortcuts', 'IDE & Advanced Shortcuts', 'Shortcuts for coding environments and productivity apps.', 10, 12, 3.5);

-- ============================================================
-- GRADES 9–12: Coding-Adjacent subskills
-- ============================================================

INSERT INTO public.skills (id, domain_id, parent_skill_id, slug, name, description, grade_level_min, grade_level_max, difficulty_baseline) VALUES
  ('aj000001-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000010-0000-0000-0000-000000000001', 'brackets-and-braces', 'Brackets, Braces & Parentheses', '[], {}, () — common in all programming languages.', 9, 12, 3.5),
  ('aj000002-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000010-0000-0000-0000-000000000001', 'code-snippet-typing', 'Code Snippet Typing', 'Short code fragments: indentation, semicolons, operators.', 10, 12, 4.0),
  ('aj000003-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'aa000010-0000-0000-0000-000000000001', 'url-email-typing', 'URL & Email Typing', 'Typing URLs, email addresses, and web path patterns.', 9, 12, 3.0);

-- ============================================================
-- SKILL DEPENDENCIES (prerequisite graph)
-- ============================================================

INSERT INTO public.skill_dependencies (from_skill_id, to_skill_id, relationship) VALUES
  -- Home row is prerequisite for all other keyboard skills
  ('ab000001-0000-0000-0000-000000000001', 'ab000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ab000001-0000-0000-0000-000000000001', 'ab000003-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ab000002-0000-0000-0000-000000000001', 'ab000004-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ab000003-0000-0000-0000-000000000001', 'ab000004-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ab000002-0000-0000-0000-000000000001', 'ab000005-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ab000003-0000-0000-0000-000000000001', 'ab000005-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Shift requires home row
  ('ab000001-0000-0000-0000-000000000001', 'ab000007-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Simple words require home row
  ('ab000001-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Simple words require spacebar
  ('ab000006-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- High-frequency words build on simple words
  ('ac000001-0000-0000-0000-000000000001', 'ac000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ac000002-0000-0000-0000-000000000001', 'ac000003-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ac000003-0000-0000-0000-000000000001', 'ac000004-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Digraphs require home row + all rows
  ('ab000004-0000-0000-0000-000000000001', 'ad000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ab000005-0000-0000-0000-000000000001', 'ad000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ad000001-0000-0000-0000-000000000001', 'ad000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ad000002-0000-0000-0000-000000000001', 'ad000003-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Sentences require words + shift + basic punctuation
  ('ac000001-0000-0000-0000-000000000001', 'ae000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ab000007-0000-0000-0000-000000000001', 'ae000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ae000001-0000-0000-0000-000000000001', 'ae000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ae000002-0000-0000-0000-000000000001', 'ae000003-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ae000002-0000-0000-0000-000000000001', 'ae000004-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Passages require sentences
  ('ae000002-0000-0000-0000-000000000001', 'af000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('af000001-0000-0000-0000-000000000001', 'af000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('af000002-0000-0000-0000-000000000001', 'af000003-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- WPM tiers build on each other
  ('ag000001-0000-0000-0000-000000000001', 'ag000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ag000002-0000-0000-0000-000000000001', 'ag000003-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ag000003-0000-0000-0000-000000000001', 'ag000004-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ag000004-0000-0000-0000-000000000001', 'ag000005-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Numbers require full keyboard familiarity
  ('ab000004-0000-0000-0000-000000000001', 'ah000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ah000001-0000-0000-0000-000000000001', 'ah000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ah000002-0000-0000-0000-000000000001', 'ah000003-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Shortcuts require words + full keyboard
  ('ac000002-0000-0000-0000-000000000001', 'ai000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ai000001-0000-0000-0000-000000000001', 'ai000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ai000002-0000-0000-0000-000000000001', 'ai000003-0000-0000-0000-000000000001', 'prerequisite_of'),
  -- Coding adjacent requires symbols + shortcuts
  ('ah000003-0000-0000-0000-000000000001', 'aj000001-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('aj000001-0000-0000-0000-000000000001', 'aj000002-0000-0000-0000-000000000001', 'prerequisite_of'),
  ('ah000002-0000-0000-0000-000000000001', 'aj000003-0000-0000-0000-000000000001', 'prerequisite_of');
