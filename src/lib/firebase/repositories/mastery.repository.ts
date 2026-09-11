import { adminDb } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface SkillMastery {
  student_id: string;
  skill_id: string;
  mastery_score: number;
  mastery_level: string;
  practice_count: number;
  last_practiced_at?: string;
  skills?: { name: string };
}

export class MasteryRepository {
  static async getMastery(userId: string, skillId: string): Promise<SkillMastery | null> {
    const docSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('mastery')
      .doc(skillId)
      .get();

    if (!docSnap.exists) return null;
    return docSnap.data() as SkillMastery;
  }

  static async getTopMasteredSkills(userId: string, limit: number = 5): Promise<SkillMastery[]> {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('mastery')
      .orderBy('mastery_score', 'desc')
      .limit(limit)
      .get();

    const items = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    // Fetch skill names
    for (const item of items) {
      if (item.skill_id) {
        const skillSnap = await adminDb.collection('skills').doc(item.skill_id).get();
        if (skillSnap.exists) {
          item.skills = { name: skillSnap.data()?.name || 'Unknown Skill' };
        }
      }
    }

    return items;
  }

  static async upsertMastery(userId: string, mastery: SkillMastery): Promise<void> {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('mastery')
      .doc(mastery.skill_id)
      .set({
        ...mastery,
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });
  }

  static async logMasteryHistory(userId: string, history: any): Promise<void> {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('mastery_history')
      .add({
        ...history,
        created_at: new Date().toISOString(),
        timestamp: FieldValue.serverTimestamp(),
      });
  }
}
