-- ============================================================
-- Seed: Typing Domain — Static Exercise Library (Grades 1-12)
-- ============================================================

-- Variables (PostgreSQL DO block used to resolve UUIDs dynamically)
DO $$
DECLARE
  typing_domain_id UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  
  -- Root Skills
  kbd_fam UUID := 'aa000001-0000-0000-0000-000000000001';
  let_comb UUID := 'aa000002-0000-0000-0000-000000000001';
  word_typ UUID := 'aa000003-0000-0000-0000-000000000001';
  sent_typ UUID := 'aa000004-0000-0000-0000-000000000001';
  pass_typ UUID := 'aa000005-0000-0000-0000-000000000001';

  -- Sub Skills
  home_row UUID := 'ab000001-0000-0000-0000-000000000001';
  top_row UUID := 'ab000004-0000-0000-0000-000000000001';
  bot_row UUID := 'ab000005-0000-0000-0000-000000000001';
  shift_key UUID := 'ab000007-0000-0000-0000-000000000001';
  
  smpl_wrd UUID := 'ac000001-0000-0000-0000-000000000001';
  hifq_wrd UUID := 'ac000002-0000-0000-0000-000000000001';
  acad_wrd UUID := 'ac000004-0000-0000-0000-000000000001';
  
  smpl_snt UUID := 'ae000001-0000-0000-0000-000000000001';
  adv_punct UUID := 'ae000003-0000-0000-0000-000000000001';
  
  shrt_pas UUID := 'af000001-0000-0000-0000-000000000001';
  long_pas UUID := 'af000003-0000-0000-0000-000000000001';

  num_row UUID := 'ah000001-0000-0000-0000-000000000001';
  com_sym UUID := 'ah000002-0000-0000-0000-000000000001';
  
  code_char UUID := 'aj000001-0000-0000-0000-000000000001';

BEGIN

  -- ------------------------------------------------------------------
  -- Grades 1-2
  -- ------------------------------------------------------------------
  INSERT INTO public.exercises (domain_id, skill_ids, title, difficulty, difficulty_metadata, content, grade_level_min, grade_level_max) VALUES
  (
    typing_domain_id, ARRAY[home_row], 'Home Row Basics', 1.0, 
    '{"word_length_avg": 4, "sentence_length_avg": 0, "has_punctuation": false, "has_capitalization": false, "has_numbers": false, "has_symbols": false, "has_code_chars": false, "uncommon_combinations": 0, "passage_length": 34, "vocabulary_level": "basic"}',
    '{"passage": "asdf jkl; asdf jkl; fdsa ;lkj", "hint": "Keep your fingers on the home row keys."}', 1, 2
  ),
  (
    typing_domain_id, ARRAY[smpl_wrd], 'Simple Words 1', 1.2,
    '{"word_length_avg": 3, "sentence_length_avg": 0, "has_punctuation": false, "has_capitalization": false, "has_numbers": false, "has_symbols": false, "has_code_chars": false, "uncommon_combinations": 1, "passage_length": 25, "vocabulary_level": "basic"}',
    '{"passage": "cat dog run the and see", "hint": "Type the short words carefully."}', 1, 2
  ),

  -- ------------------------------------------------------------------
  -- Grades 3-5
  -- ------------------------------------------------------------------
  (
    typing_domain_id, ARRAY[hifq_wrd, top_row, bot_row], 'High Frequency Words', 1.5,
    '{"word_length_avg": 4.5, "sentence_length_avg": 0, "has_punctuation": false, "has_capitalization": false, "has_numbers": false, "has_symbols": false, "has_code_chars": false, "uncommon_combinations": 2, "passage_length": 42, "vocabulary_level": "basic"}',
    '{"passage": "there their about which these other people", "hint": "Focus on accurate spelling."}', 3, 5
  ),
  (
    typing_domain_id, ARRAY[smpl_snt, shift_key], 'Basic Sentences', 1.8,
    '{"word_length_avg": 4, "sentence_length_avg": 5, "has_punctuation": true, "has_capitalization": true, "has_numbers": false, "has_symbols": false, "has_code_chars": false, "uncommon_combinations": 1, "passage_length": 55, "vocabulary_level": "basic"}',
    '{"passage": "The quick brown fox jumps over the lazy dog. We like to run.", "hint": "Remember to use the shift key for capital letters."}', 3, 5
  ),
  (
    typing_domain_id, ARRAY[shrt_pas], 'Short Story Passage', 2.2,
    '{"word_length_avg": 4.5, "sentence_length_avg": 6, "has_punctuation": true, "has_capitalization": true, "has_numbers": false, "has_symbols": false, "has_code_chars": false, "uncommon_combinations": 2, "passage_length": 140, "vocabulary_level": "intermediate"}',
    '{"passage": "Once upon a time, a small rabbit lived in a big green forest. The rabbit loved to eat carrots and play with friends every day in the sun.", "hint": "Keep a steady rhythm while typing the story."}', 3, 5
  ),

  -- ------------------------------------------------------------------
  -- Grades 6-8
  -- ------------------------------------------------------------------
  (
    typing_domain_id, ARRAY[adv_punct, num_row], 'Advanced Punctuation & Numbers', 2.8,
    '{"word_length_avg": 5, "sentence_length_avg": 8, "has_punctuation": true, "has_capitalization": true, "has_numbers": true, "has_symbols": false, "has_code_chars": false, "uncommon_combinations": 4, "passage_length": 120, "vocabulary_level": "intermediate"}',
    '{"passage": "It is exactly 12:30 PM; however, we still have 45 miles to go. \"Are we there yet?\" asked the child in the back seat.", "hint": "Practice using quotation marks and semicolons."}', 6, 8
  ),
  (
    typing_domain_id, ARRAY[acad_wrd, com_sym], 'Academic Terms & Symbols', 3.0,
    '{"word_length_avg": 6, "sentence_length_avg": 10, "has_punctuation": true, "has_capitalization": true, "has_numbers": true, "has_symbols": true, "has_code_chars": false, "uncommon_combinations": 5, "passage_length": 150, "vocabulary_level": "advanced"}',
    '{"passage": "The experiment yielded a 25% increase in efficiency, costing $4,500 total. The reaction rate (r) was directly proportional to the temperature.", "hint": "Focus on the numbers and symbols without looking down."}', 6, 8
  ),

  -- ------------------------------------------------------------------
  -- Grades 9-12
  -- ------------------------------------------------------------------
  (
    typing_domain_id, ARRAY[long_pas, acad_wrd], 'Professional Document Typing', 3.5,
    '{"word_length_avg": 6.5, "sentence_length_avg": 15, "has_punctuation": true, "has_capitalization": true, "has_numbers": true, "has_symbols": false, "has_code_chars": false, "uncommon_combinations": 6, "passage_length": 350, "vocabulary_level": "advanced"}',
    '{"passage": "The rapid advancement of artificial intelligence technologies has significantly altered the landscape of modern business operations. Organizations that quickly adopt these tools often see a marked improvement in their operational efficiency, sometimes reporting productivity increases of over 40 percent in the first year of implementation.", "hint": "Maintain a high speed and accuracy for the entire passage."}', 9, 12
  ),
  (
    typing_domain_id, ARRAY[code_char, com_sym, num_row], 'Coding-Adjacent Syntax', 4.0,
    '{"word_length_avg": 5, "sentence_length_avg": 5, "has_punctuation": true, "has_capitalization": true, "has_numbers": true, "has_symbols": true, "has_code_chars": true, "uncommon_combinations": 9, "passage_length": 180, "vocabulary_level": "technical"}',
    '{"passage": "function calculateTotal(price, taxRate) { return price + (price * taxRate); } const result = calculateTotal(50.00, 0.08); console.log(`Total: $${result}`);", "hint": "Type the code snippet carefully, paying attention to brackets and punctuation."}', 9, 12
  );

END $$;
