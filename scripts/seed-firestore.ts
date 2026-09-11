import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize admin app if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

const HOME_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000001';
const TOP_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000002';
const BOTTOM_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000003';
const NUMBERS_SKILL_ID = '00000000-0000-0000-0000-000000000004';
const SHIFT_SKILL_ID = '00000000-0000-0000-0000-000000000005';
const DOMAIN_ID = 'touch-typing-domain';

async function seed() {
  console.log('Seeding Firestore...');

  // 1. Seed Domain
  await db.collection('domains').doc(DOMAIN_ID).set({
    name: 'Touch Typing',
    slug: 'touch-typing',
    is_active: true,
  });

  // 2. Seed Skills
  const skillsRef = db.collection('skills');
  await skillsRef.doc(HOME_ROW_SKILL_ID).set({
    name: 'Home Row',
    domain_id: DOMAIN_ID,
    difficulty_baseline: 1,
  });

  await skillsRef.doc(TOP_ROW_SKILL_ID).set({
    name: 'Top Row',
    domain_id: DOMAIN_ID,
    difficulty_baseline: 2,
  });

  await skillsRef.doc(BOTTOM_ROW_SKILL_ID).set({
    name: 'Bottom Row',
    domain_id: DOMAIN_ID,
    difficulty_baseline: 2,
  });

  await skillsRef.doc(NUMBERS_SKILL_ID).set({
    name: 'Numbers & Symbols',
    domain_id: DOMAIN_ID,
    difficulty_baseline: 3,
  });

  await skillsRef.doc(SHIFT_SKILL_ID).set({
    name: 'Shift Key Mastery',
    domain_id: DOMAIN_ID,
    difficulty_baseline: 3,
  });

  // 3. Seed Exercises
  const exercisesRef = db.collection('exercises');
  await exercisesRef.doc('EXERCISE-100').set({
    domain_id: DOMAIN_ID,
    title: 'Home Row Basics',
    skill_ids: [HOME_ROW_SKILL_ID],
    difficulty: 1,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: 'asdf jkl; asdf jkl; asdf jkl;'
    }
  });

  await exercisesRef.doc('EXERCISE-101').set({
    domain_id: DOMAIN_ID,
    title: 'Top Row Introduction',
    skill_ids: [TOP_ROW_SKILL_ID],
    difficulty: 2,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: 'qwer uiop qwer uiop qwer uiop'
    }
  });

  await exercisesRef.doc('EXERCISE-102').set({
    domain_id: DOMAIN_ID,
    title: 'Bottom Row Basics',
    skill_ids: [BOTTOM_ROW_SKILL_ID],
    difficulty: 2,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: 'zxcv bnm, zxcv bnm, zxcv bnm,'
    }
  });

  await exercisesRef.doc('EXERCISE-103').set({
    domain_id: DOMAIN_ID,
    title: 'Number Row',
    skill_ids: [NUMBERS_SKILL_ID],
    difficulty: 3,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: '12345 67890 12345 67890'
    }
  });

  await exercisesRef.doc('EXERCISE-104').set({
    domain_id: DOMAIN_ID,
    title: 'Shift Key Practice',
    skill_ids: [SHIFT_SKILL_ID],
    difficulty: 3,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: 'The Quick Brown Fox Jumps Over The Lazy Dog'
    }
  });

  console.log('Done seeding Firestore.');
}

seed().catch(console.error);
