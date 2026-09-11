import { adminDb } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';

export class ExerciseRepository {
  static async getExercisesByDomain(domainId: string): Promise<any[]> {
    const snapshot = await adminDb
      .collection('exercises')
      .where('domain_id', '==', domainId)
      .get();
    
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }

  static async getActiveDomainBySlug(slug: string): Promise<any | null> {
    const snapshot = await adminDb
      .collection('domains')
      .where('slug', '==', slug)
      .where('is_active', '==', true)
      .limit(1)
      .get();
      
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  static async logSession(userId: string, sessionData: any): Promise<void> {
    await adminDb.collection('users').doc(userId).collection('sessions').add({
      ...sessionData,
      created_at: new Date().toISOString(),
      timestamp: FieldValue.serverTimestamp(),
    });
  }

  static async getRecentSessions(userId: string, limit: number = 10): Promise<any[]> {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
      
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }
}
