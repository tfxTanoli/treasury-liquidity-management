import { db, auth } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { Role } from '../config/roles';
import { ROLE_LABELS } from '../config/roles';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  createdBy?: string;
  disabled?: boolean;
}

/** Create or update a user profile in Firestore. */
export const upsertUserProfile = async (
  uid: string,
  data: Partial<UserProfile>
): Promise<UserProfile> => {
  const ref = db.collection('users').doc(uid);
  const doc = await ref.get();

  if (doc.exists) {
    await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
  } else {
    await ref.set({
      ...data,
      uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const updated = await ref.get();
  return { uid, ...updated.data() } as UserProfile;
};

/** Get user profile by UID; auto-create with viewer role if missing. */
export const getUserProfile = async (uid: string): Promise<UserProfile> => {
  const ref = db.collection('users').doc(uid);
  const doc = await ref.get();

  if (doc.exists) {
    return { uid, ...doc.data() } as UserProfile;
  }

  // First time sign-in — provision as viewer
  const firebaseUser = await auth.getUser(uid);
  const profile: UserProfile = {
    uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    role: 'viewer',
    disabled: false,
  };
  await upsertUserProfile(uid, profile);
  return profile;
};

/** List all users from Firestore. */
export const listUsers = async (): Promise<UserProfile[]> => {
  const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
};

/** Update a user's role. */
export const updateUserRole = async (
  uid: string,
  role: Role,
  updatedBy: string
): Promise<UserProfile> => {
  const ref = db.collection('users').doc(uid);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('User not found');

  // Also set custom claim so frontend can read it from token
  await auth.setCustomUserClaims(uid, { role });
  await ref.update({ role, updatedAt: FieldValue.serverTimestamp(), updatedBy });

  const updated = await ref.get();
  return { uid, ...updated.data() } as UserProfile;
};

/** Disable / re-enable a user in both Firebase Auth and Firestore. */
export const setUserDisabled = async (uid: string, disabled: boolean): Promise<void> => {
  await auth.updateUser(uid, { disabled });
  await db.collection('users').doc(uid).update({
    disabled,
    updatedAt: FieldValue.serverTimestamp(),
  });
};

/** Create a new user via Admin SDK (admin-initiated invite). */
export const createUser = async (
  data: { email: string; password: string; displayName: string; role: Role },
  createdBy: string
): Promise<UserProfile> => {
  const firebaseUser = await auth.createUser({
    email: data.email,
    password: data.password,
    displayName: data.displayName,
  });

  await auth.setCustomUserClaims(firebaseUser.uid, { role: data.role });

  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    createdBy,
    disabled: false,
  };
  return upsertUserProfile(firebaseUser.uid, profile);
};
