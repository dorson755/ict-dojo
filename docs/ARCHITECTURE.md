# ICT Dojo Foundation Architecture

## Purpose

Define the implementation foundation before UI-heavy feature development.

## Core entities

- Student
- LearningDomain
- Skill
- SkillDependency
- Assessment
- Exercise
- Attempt
- Mastery
- Recommendation
- Progress
- Achievement
- Quest
- Challenge

## Domain boundary

The shared core must not contain typing-only assumptions. Typing-specific concerns such as WPM, keystroke timing, typing error classification, and keyboard-specific exercises belong to the Typing domain.

Future domains own their measurement/evaluation logic. Programming can evaluate code execution/tests; Computer Science can evaluate conceptual/problem-solving activities.

## Learning flow

1. Establish learner profile.
2. Assess skills.
3. Store attempts/evidence.
4. Calculate/update mastery.
5. Inspect prerequisites and weak skills.
6. Select next recommendation.
7. Generate/select an appropriate exercise.
8. Evaluate the attempt.
9. Update mastery and progress.
10. Award progression/rewards.

## Measurement boundary

Deterministic systems own performance metrics, scoring, mastery calculations, and progression rules.

AI may eventually generate content, explanations, themed activities, and constrained exercises. AI must not be authoritative for raw performance measurements.

## Extensibility

A new domain should register domain metadata, skill taxonomy, prerequisite graph, assessment types, exercise types, evaluator/scoring logic, and curriculum mappings without changing the fundamental student/progress model.

## Privacy

Minimize student data. Use role-based access. Avoid unnecessary surveillance features.
