import { db } from '../config/firebase';

export const getExecutions = async (filters?: {
  type?: string;
  status?: string;
  limit?: number;
}): Promise<any[]> => {
  let query: FirebaseFirestore.Query = db.collection('executions').orderBy('timestamp', 'desc');

  if (filters?.type) {
    query = query.where('type', '==', filters.type);
  }
  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
