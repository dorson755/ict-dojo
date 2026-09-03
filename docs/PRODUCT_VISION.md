# ICT Dojo — Product Vision & Architecture Direction

## Vision

ICT Dojo is an adaptive digital learning platform. Typing is the first learning domain, not the final product.

The long-term platform should teach students how to use, understand, create with, and think about technology across domains such as:

- Typing
- Programming
- Computer Science
- Computational Thinking
- AI Literacy
- Cybersecurity
- Digital Citizenship
- Productivity Software

## Core Learning Loop

**Assess → Diagnose → Practice → Adapt → Challenge → Master → Level Up**

The system should determine what a learner needs to learn next from demonstrated skills, errors, mastery, accuracy, speed, and progression.

## Architectural Principle

Build the platform around **learning domains and skills**, not around typing.

Shared platform concepts should remain domain-agnostic:

- Student
- LearningDomain
- Skill
- SkillDependency
- Assessment
- Exercise
- Attempt
- Mastery
- Recommendation
- Achievement
- Quest
- Challenge
- Progress

Domain-specific behavior belongs inside its domain.

## Domain Model

### Typing
Keyboard familiarity, touch typing, finger placement, accuracy, speed, fluency, punctuation, numbers, symbols, shortcuts, specialized typing.

### Programming
Computational thinking, variables, data types, operators, conditions, loops, functions, collections, objects, debugging, testing, algorithms, code reading/writing, and software-development concepts.

Potential languages include Scratch, Python, JavaScript, HTML/CSS, SQL, and additional languages later.

### Computer Science
Computer fundamentals, hardware/software, operating systems, data representation, binary, algorithms, data structures, computer architecture, networking, databases, cybersecurity, AI concepts, and digital citizenship.

## Skill Graph

Skills are nodes with relationships such as:

- prerequisite_of
- depends_on
- related_to
- builds_upon
- reinforces
- advanced_version_of

The adaptive engine should use the graph to determine readiness rather than relying on sequential lesson completion.

## Cross-Domain Student Profile

A student should eventually have one ICT Dojo profile containing separate mastery/progression for each domain while sharing platform-wide XP, achievements, and identity.

Example:

- Typing — Blue Belt
- Programming — Green Belt
- Computer Science — Yellow Belt
- AI Literacy — Orange Belt

## Adaptive Engine

The initial engine should be deterministic/statistical rather than LLM-dependent for measurement.

It should consider:

- Current and historical mastery
- Recent performance
- Error frequency/patterns
- Accuracy
- Speed
- Hesitation
- Exercise difficulty
- Grade level
- Skill dependencies
- Improvement
- Repeated failures
- Inactivity/possible skill decay

AI may generate content and explanations, but deterministic systems should calculate performance metrics and evaluate learning outcomes where possible.

## Development Direction

Build incrementally:

1. Typing MVP
2. Dojo progression and gamification
3. Skill intelligence and adaptive recommendations
4. Teacher/parent/school platform
5. Additional learning domains, beginning with programming and computer science

The architecture must make adding a new domain possible without redesigning the core learning platform.
