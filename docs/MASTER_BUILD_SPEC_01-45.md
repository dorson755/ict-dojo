# ICT Dojo — Master Build Specification (Points 1–45)

## 1. PRODUCT VISION
Build ICT Dojo as an adaptive educational platform whose first learning domain is Typing, with architecture designed to expand into Programming, AI Literacy, Computer Science, Cybersecurity, Digital Citizenship, Computational Thinking, and Productivity Software.

Core loop:

**Assess → Diagnose → Practice → Adapt → Challenge → Master → Level Up**

Prioritize skill mastery over raw typing speed.

## 2. INITIAL PRODUCT: TYPING DOJO
Students can create accounts, establish a grade/age profile, complete diagnostic assessment, receive a personalized skill profile, practice adaptively, receive real-time feedback, earn XP, level up, earn belts/badges, complete quests/challenges, track records, and receive recommendations.

## 3. STUDENT ASSESSMENT
Create a multi-stage Typing Dojo Assessment:
- Keyboard familiarity
- Letter combinations
- Words
- Sentences
- Short passage

Use age/grade-appropriate content. The assessment establishes a baseline rather than producing only one score.

## 4. TYPING SKILL PROFILE
Create a multidimensional profile covering keyboard awareness, home row, left/right hand, combinations, words, sentences, capitalization, punctuation, numbers, symbols, accuracy, speed, rhythm, fluency, sustained typing, and shortcuts.

Classify skills as Strong, Developing, Weak, Mastered, with Common Errors and Current Learning Target.

## 5. TYPING DNA
Maintain a continually updating signature learner profile identifying strong combinations, developing areas, common errors, hesitation points, error locations, key-pair errors, corrections, backspace behavior, rhythm, and speed/accuracy relationship.

## 6. PERFORMANCE DATA
For every exercise record:
- Time
- Characters attempted/correct
- Characters incorrect
- Backspaces
- Accuracy
- WPM
- Error locations/types
- Hesitation time
- Corrections
- Key-pair errors
- Potential hand/finger errors where inferable
- Difficulty
- Skill targets
- Passage length
- Completion status

## 7. ADAPTIVE ENGINE
Build a deterministic rules/statistics-based mastery engine first. Do not use an LLM to calculate raw performance metrics. Determine what the learner should practice next using mastery, recent/historical performance, errors, accuracy, speed, hesitation, difficulty, grade, prerequisites, improvement, repeated failures, and inactivity.

## 8. REAL-TIME ADAPTATION
Adjust difficulty during sessions. Increase complexity when performance is strong; isolate weak skills and reduce complexity when performance deteriorates. Difficulty is multidimensional, not merely longer text.

## 9. DIFFICULTY MODEL
Model difficulty through:
- Word length
- Vocabulary
- Sentence length
- Punctuation
- Capitalization
- Numbers
- Symbols
- Uncommon combinations
- Repetition
- Target speed
- Passage length
- Cognitive complexity

Two exercises at the same level may challenge different dimensions.

## 10. AI LAYER
AI complements the deterministic learning engine. Use it for personalized practice generation, themed lessons, explanations, and adaptive passages. Provide structured constraints such as grade, reading level, target skills, required characters/error patterns, length, theme, and vocabulary. AI generates content; the typing engine measures performance.

## 11. GRADE 1–12 CURRICULUM
Create developmental progression:
- Grades 1–2: keyboard familiarity, letters, spacebar, basic words, short sentences, confidence
- Grades 3–5: touch typing, finger positioning, capitalization, punctuation, accuracy, paragraphs, speed
- Grades 6–8: sustained typing, editing, numbers, symbols, shortcuts, productivity
- Grades 9–12: professional typing, high accuracy/sustained speed, research/document typing, coding-related skills, shortcuts, productivity, specialized vocabulary

## 12. DOJO PROGRESSION
Use belts such as White → Yellow → Orange → Green → Blue → Purple → Brown → Black. Belts must not depend solely on WPM. Use accuracy, speed, mastery, technique, punctuation, sustained typing, and challenge completion. Thresholds must be configurable by grade/age.

## 13. GAMIFICATION
Implement XP, virtual currency such as Ki Points, streaks, avatars/cosmetics, badges, and rewards. Do not incentivize reckless speed; accurate improvement should be prioritized.

## 14. QUEST SYSTEM
Use mission-based activities rather than generic lesson numbers. Support daily missions and special themed missions with measurable objectives and rewards. Generate quests dynamically from learner progression.

## 15. BOSS BATTLES
Create mastery challenges such as Accuracy Dragon, Speed Demon, and Code Master. Bosses should test mastery, not simply speed.

## 16. PERSONAL RECORDS
Track WPM, accuracy, longest streak, sustained typing, punctuation, challenge performance, and most-improved skill. Emphasize self-improvement.

## 17. LEADERBOARDS
Avoid a single global WPM leaderboard. Use personal improvement, class improvement, weekly challenges, most improved, accuracy, practice, and consistency categories. Normalize by grade/age where rankings are used.

## 18. STUDENT DASHBOARD
Create a game-like dashboard showing avatar, belt, level, XP, WPM, accuracy, Typing DNA, current focus, quests, achievements, records, skill mastery, recommendation, and streak.

## 19. PRACTICE SCREEN
Keep the typing environment clean. Show level, accuracy, speed, passage, progress, timer, and minimal feedback. After completion show WPM, accuracy, XP, skills improved, records, and next recommendation.

## 20. TEACHER DASHBOARD
Teachers can create classes, add students, view class performance, assign exercises/quests, monitor progress, view skill heatmaps, trends, errors, reports, and mastery.

## 21. PARENT DASHBOARD
Provide a simplified view with level, belt, WPM, accuracy, weekly practice, monthly improvement, current goal, and achievements. Use plain language.

## 22. PLATFORM ARCHITECTURE
Separate:
1. Authentication
2. Student Profile
3. Skill Engine
4. Assessment Engine
5. Adaptive Engine
6. Exercise/Content Engine
7. AI Content Layer
8. Mastery System
9. Gamification
10. Analytics
11. Teacher System
12. Parent System
13. Curriculum System

Design reusable platform services rather than typing-only infrastructure.

## 23. FUTURE ICT DOJO DOMAINS
Support future domains:
- Typing
- Programming
- AI Literacy
- Computer Science
- Computational Thinking
- Cybersecurity
- Digital Citizenship
- Productivity Software

Typing is the first domain, not the final product.

## 24. TECHNIQUE AND ERGONOMICS
Where technically feasible, infer typing technique from keystroke behavior: hand imbalance, repeated backspacing, corrections, rhythm, hesitation, and potential finger-placement errors. Do not require camera monitoring for children. Prefer privacy-preserving behavioral analysis.

## 25. DATA MODEL
Design a normalized database for:
Users, Student Profiles, Teachers, Parents, Schools, Classes, Domains, Skills, Skill Dependencies, Assessments, Assessment Attempts, Exercises, Exercise Templates, Typing Sessions, Keystrokes, Errors, Error Patterns, Mastery Scores, Recommendations, Achievements, XP Transactions, Belts, Levels, Quests, Challenges, Boss Battles, Streaks, Personal Records, Assignments, Reports, AI-generated Content, and Curriculum Standards.

## 26. PRIVACY AND CHILD SAFETY
Minimize personal information. Do not require camera monitoring. Separate student/teacher/parent permissions. Implement RBAC. Design for school privacy requirements. Avoid public exposure of children's performance and global speed competition.

## 27. DEVELOPMENT PHASES
Phase 1 — Typing MVP:
Authentication, student accounts, grade/age profile, assessment, WPM, accuracy, errors, basic adaptation, practice, dashboard.

Phase 2 — Dojo:
XP, levels, belts, badges, streaks, quests, records, daily challenges.

Phase 3 — Intelligence:
Skill profiles, Typing DNA, recommendations, error patterns, AI-generated practice, explanations, adaptive passages.

Phase 4 — School Platform:
Teacher accounts, classes, assignments, teacher dashboard, reports, parents, curriculum mapping, administration.

Phase 5 — ICT Dojo:
Programming, computational thinking, AI literacy, digital citizenship, computer science, cybersecurity, productivity software.

## 28. MVP PRIORITY RULE
Prioritize:
1. Accurate measurement
2. Skill diagnosis
3. Adaptive practice
4. Student progression
5. Usability
6. Data integrity
7. Extensibility

Do not prioritize cosmetic gamification over a functioning adaptive learning engine.

## 29. REQUIRED DEVELOPMENT PROCESS
Before substantial coding:
1. Analyze requirements
2. Identify ambiguities/risks
3. Define architecture
4. Define database schema
5. Define skill taxonomy
6. Define assessment algorithm
7. Define mastery model
8. Define adaptive difficulty algorithm
9. Define API contracts
10. Define UI screens
11. Define roles/permissions
12. Define MVP boundary
13. Produce implementation plan

Then implement incrementally. Test, validate edge cases/data integrity/adaptive logic/accessibility/responsiveness after major features. Do not silently remove requirements.

## 30. DEFINITION OF SUCCESS
A student can create an account, complete diagnostics, receive a meaningful profile, begin adaptive practice, experience performance-based difficulty changes, receive accurate metrics and error diagnosis, see measurable progression, earn XP/progress, and return later to receive appropriate practice.

Defining experience:

**“ICT Dojo knows what I need to practice next.”**

## 31. LONG-TERM VISION
ICT Dojo is a multi-domain adaptive learning platform. Typing is Domain 1. The shared assessment, skill, mastery, adaptation, recommendation, gamification, analytics, teacher, and parent infrastructure must support additional domains.

## 32. ICT DOJO LEARNING DOMAINS
Support:
- Typing
- Programming
- Computer Science
- Computational Thinking
- AI Literacy
- Cybersecurity
- Digital Citizenship
- Productivity Software

Programming should eventually cover computational thinking, variables, data types, operators, conditions, loops, functions, collections, objects, debugging, testing, algorithms, code reading/writing, and software-development concepts.

Computer Science should cover foundations, computational thinking, algorithms/data structures, architecture, networking, databases, cybersecurity, AI, and digital citizenship.

## 33. DOMAIN-AGNOSTIC LEARNING ENGINE
Use:
**Learning Domain → Skills → Subskills → Competencies → Assessments → Exercises → Mastery**

Examples:
Typing → Punctuation → Commas → Comma placement → Diagnostic → Targeted exercises → Mastery
Programming → Loops → For loops → Iteration logic → Diagnostic → Coding exercises → Mastery
Computer Science → Algorithms → Searching → Linear search → Diagnostic → Algorithm exercises → Mastery

## 34. SKILL GRAPH
Represent skills as nodes with relationships:
- prerequisite_of
- depends_on
- related_to
- builds_upon
- reinforces
- advanced_version_of

Do not advance students merely because they completed sequential lessons. Determine prerequisite mastery.

## 35. CROSS-DOMAIN STUDENT PROFILE
Maintain one unified ICT Dojo profile with separate mastery/progression per domain and shared platform identity/XP.

Example:
Typing — Blue Belt
Programming — Green Belt
Computer Science — Yellow Belt
AI Literacy — Orange Belt

## 36. DIFFERENT TYPES OF LEARNING ACTIVITIES
Support domain-appropriate activity types.

Typing:
timed typing, word drills, sentence typing, passages, key drills.

Programming:
multiple choice, code prediction, completion, debugging, code writing, output prediction, algorithms, interactive coding, projects.

Computer Science:
multiple choice, matching, classification, simulations, diagrams, problem solving, visualizations, scenarios, interactive exercises.

The adaptive engine selects appropriate activity types.

## 37. PROGRAMMING DOJO
Create a dedicated programming experience using missions such as “Python Quest: The Loop Temple.” Objectives can include understanding loops, completing coding challenges, debugging programs, and achieving mastery. Progress from guided learning to independent problem solving.

## 38. COMPUTER SCIENCE DOJO
Create a dedicated Computer Science experience emphasizing demonstrated understanding and reasoning. Evaluate concepts, problem solving, algorithm selection, and efficiency—not just memorization.

## 39. AGE AND GRADE PROGRESSION ACROSS DOMAINS
Grade level affects complexity, vocabulary, examples, scaffolding, and expectations. The same concept can recur at increasing levels of sophistication from elementary through Grade 12.

## 40. SHARED GAMIFICATION ACROSS DOMAINS
XP is platform-wide, while each domain maintains independent mastery/progression. A student may have one overall ICT Dojo level plus separate domain belts.

## 41. FUTURE PROJECT-BASED LEARNING
Eventually support interdisciplinary projects such as:
- Build a Website
- Build a Game
- Build an AI Project

Projects can combine typing, programming, computer science, design, data, AI, ethics, and digital citizenship. Projects should produce portfolio artifacts.

## 42. LONG-TERM PRODUCT STRUCTURE
Conceptually:

ICT DOJO
→ Typing / Programming / Computer Science / other domains
→ Shared Learning Engine
→ Assessment / Mastery / Adaptation
→ Gamification Engine
→ XP / Levels / Belts / Badges
→ Student ICT Profile

New domains should be addable without fundamentally changing the platform.

## 43. ARCHITECTURAL PRINCIPLE
Build around **learning domains and skills—not typing**.

Avoid deeply embedding typing-specific concepts throughout the codebase. Prefer domain-agnostic concepts such as Student, LearningDomain, Skill, SkillDependency, Assessment, Exercise, Attempt, Mastery, Recommendation, Achievement, Quest, Challenge, and Progress.

Typing-specific behavior belongs in the Typing domain; programming-specific behavior belongs in Programming; computer-science-specific behavior belongs in Computer Science.

## 44. ULTIMATE PRODUCT PROMISE
ICT Dojo should become:

**“An adaptive digital learning dojo that teaches students how to use, understand, create with, and think about technology.”**

The learner should progress from:
**Keyboard → Typing → Digital Skills → Computational Thinking → Programming → Computer Science → AI → Advanced ICT**

while the platform continuously adapts to demonstrated understanding.

Core philosophy:

**“Don't tell the student what lesson comes next. Determine what the student needs to learn next.”**

## 45. BUILDING THE PLATFORM
Treat the entire specification as a product direction, not a mandate to implement every feature immediately. Establish the extensible foundation first, then implement the smallest coherent vertical slice.

The initial implementation must prove the adaptive-learning loop with Typing while preserving the architecture needed for Programming and Computer Science.

When making technical decisions, prefer solutions that:
- Keep domains modular
- Keep the skill/mastery model reusable
- Preserve historical learner data
- Allow new exercise types
- Allow new curriculum structures
- Allow new domains without database redesign
- Keep deterministic measurement separate from generative AI
- Protect student privacy
- Support future school-scale deployment

**North Star:**

> ICT Dojo should become a learning system that understands what a student knows, identifies what they need next, teaches it, measures whether they learned it, and continuously adapts.**
