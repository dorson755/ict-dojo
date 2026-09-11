import { adminDb } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface StudentProfile {
  id: string;
  grade_level?: number;
  display_name?: string;
  xp_total?: number;
  platform_level?: number;
  streak_count?: number;
  last_practice_date?: string;
}

export interface TypingDNA {
  student_id: string;
  baseline_wpm?: number;
  avg_wpm?: number;
  avg_accuracy?: number;
  last_assessed_at?: string;
  sessions_analyzed?: number;
  weak_keys?: Record<string, number>;
}

export class UserRepository {
  static async getProfile(userId: string): Promise<StudentProfile | null> {
    const docSnap = await adminDb.collection('users').doc(userId).get();
    if (!docSnap.exists) return null;
    
    const data = docSnap.data();
    return {
      id: userId,
      grade_level: data?.grade_level,
      display_name: data?.display_name,
      xp_total: data?.xp_total ?? 0,
      platform_level: data?.platform_level ?? 1,
      streak_count: data?.streak_count ?? 0,
      last_practice_date: data?.last_practice_date,
    };
  }

  static async updateProfile(userId: string, gradeLevel: number): Promise<void> {
    await adminDb.collection('users').doc(userId).set({
      grade_level: gradeLevel,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  static async awardXp(userId: string, xpGained: number, newLevel: number): Promise<void> {
    await adminDb.collection('users').doc(userId).set({
      xp_total: FieldValue.increment(xpGained),
      platform_level: newLevel,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  static async updateStreak(userId: string, streak: number, practiceDate: string): Promise<void> {
    await adminDb.collection('users').doc(userId).set({
      streak_count: streak,
      last_practice_date: practiceDate,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  static async getTypingDNA(userId: string): Promise<TypingDNA | null> {
    const docSnap = await adminDb.collection('users').doc(userId).collection('metrics').doc('typingDNA').get();
    if (!docSnap.exists) return null;
    
    const data = docSnap.data() as TypingDNA;
    return {
      ...data,
      student_id: userId,
    };
  }

  static async upsertTypingDNA(userId: string, dna: Partial<TypingDNA>): Promise<void> {
    await adminDb.collection('users').doc(userId).collection('metrics').doc('typingDNA').set({
      ...dna,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}
