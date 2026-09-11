import { adminDb } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface Recommendation {
  id?: string;
  student_id: string;
  skill_id: string;
  reason: string;
  priority: number;
  status: 'ACTIVE' | 'DISMISSED' | 'COMPLETED';
  created_at: string;
  skills?: { name: string };
}

export class RecommendationRepository {
  static async getActiveRecommendation(userId: string): Promise<Recommendation | null> {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('recommendations')
      .where('status', '==', 'ACTIVE')
      .orderBy('priority', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const rec = doc.data() as Recommendation;

    // Fetch the joined skill data for display
    let skillName = 'Unknown Skill';
    if (rec.skill_id) {
      const skillSnap = await adminDb.collection('skills').doc(rec.skill_id).get();
      if (skillSnap.exists) {
        skillName = skillSnap.data()?.name || skillName;
      }
    }

    return {
      ...rec,
      id: doc.id,
      skills: { name: skillName },
    };
  }

  static async dismissRecommendation(userId: string, recId: string): Promise<void> {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('recommendations')
      .doc(recId)
      .update({
        status: 'DISMISSED',
        updated_at: FieldValue.serverTimestamp(),
      });
  }

  static async completeRecommendation(userId: string, recId: string): Promise<void> {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('recommendations')
      .doc(recId)
      .update({
        status: 'COMPLETED',
        updated_at: FieldValue.serverTimestamp(),
      });
  }

  static async addRecommendations(userId: string, recommendations: Partial<Recommendation>[]): Promise<void> {
    const batch = adminDb.batch();
    const recsRef = adminDb.collection('users').doc(userId).collection('recommendations');

    for (const rec of recommendations) {
      const newRecRef = recsRef.doc();
      batch.set(newRecRef, {
        ...rec,
        created_at: new Date().toISOString(),
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }
}
