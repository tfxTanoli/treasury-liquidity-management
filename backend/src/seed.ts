/**
 * Seed script — populates Firestore with sample data.
 * Run: ts-node src/seed.ts
 * Requires FIREBASE_* env vars to be set in .env
 */
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function seed() {
  console.log('Seeding Firestore...');

  // Clear existing data
  const collections = ['accounts', 'pools', 'poolAccounts', 'sweepRules', 'approvals', 'executions'];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`Cleared ${col}`);
  }

  // Accounts
  const accountData = [
    { name: 'APAC Header Account', number: 'ACC-001', currency: 'USD', balance: 1000000, region: 'Asia Pacific', status: 'active', isHeaderAllowed: true },
    { name: 'Singapore Operations', number: 'ACC-002', currency: 'USD', balance: 250000, region: 'Asia Pacific', status: 'active', isHeaderAllowed: false },
    { name: 'Hong Kong Operations', number: 'ACC-003', currency: 'USD', balance: 180000, region: 'Asia Pacific', status: 'active', isHeaderAllowed: false },
    { name: 'Tokyo Operations', number: 'ACC-004', currency: 'USD', balance: 95000, region: 'Asia Pacific', status: 'active', isHeaderAllowed: false },
    { name: 'EMEA Header Account', number: 'ACC-005', currency: 'EUR', balance: 800000, region: 'Europe', status: 'active', isHeaderAllowed: true },
    { name: 'London Operations', number: 'ACC-006', currency: 'EUR', balance: 320000, region: 'Europe', status: 'active', isHeaderAllowed: false },
    { name: 'Frankfurt Operations', number: 'ACC-007', currency: 'EUR', balance: 145000, region: 'Europe', status: 'active', isHeaderAllowed: false },
    { name: 'Americas Treasury', number: 'ACC-008', currency: 'USD', balance: 2500000, region: 'North America', status: 'active', isHeaderAllowed: true },
    { name: 'New York Operations', number: 'ACC-009', currency: 'USD', balance: 420000, region: 'North America', status: 'active', isHeaderAllowed: false },
    { name: 'Toronto Operations', number: 'ACC-010', currency: 'USD', balance: 88000, region: 'North America', status: 'inactive', isHeaderAllowed: false },
  ];

  const accountRefs: Record<string, string> = {};
  for (const acc of accountData) {
    const ref = db.collection('accounts').doc();
    await ref.set({ ...acc, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    accountRefs[acc.number] = ref.id;
    console.log(`Created account: ${acc.name}`);
  }

  // APAC Pool
  const apacPoolRef = db.collection('pools').doc();
  await apacPoolRef.set({
    name: 'APAC Liquidity Pool',
    headerAccountId: accountRefs['ACC-001'],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Pool accounts for APAC
  const apacMembers = [
    { accountId: accountRefs['ACC-001'], role: 'header' },
    { accountId: accountRefs['ACC-002'], role: 'child' },
    { accountId: accountRefs['ACC-003'], role: 'child' },
    { accountId: accountRefs['ACC-004'], role: 'child' },
  ];
  for (const pa of apacMembers) {
    await db.collection('poolAccounts').doc().set({ poolId: apacPoolRef.id, ...pa });
  }
  console.log('Created APAC pool with members');

  // EMEA Pool
  const emeaPoolRef = db.collection('pools').doc();
  await emeaPoolRef.set({
    name: 'EMEA Liquidity Pool',
    headerAccountId: accountRefs['ACC-005'],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const emeaMembers = [
    { accountId: accountRefs['ACC-005'], role: 'header' },
    { accountId: accountRefs['ACC-006'], role: 'child' },
    { accountId: accountRefs['ACC-007'], role: 'child' },
  ];
  for (const pa of emeaMembers) {
    await db.collection('poolAccounts').doc().set({ poolId: emeaPoolRef.id, ...pa });
  }
  console.log('Created EMEA pool with members');

  // Sweep rules (seed user uid placeholder)
  const SEED_USER = 'seed-admin-user';

  const ruleData = [
    {
      name: 'Singapore Zero Sweep',
      type: 'zero',
      sourceAccountId: accountRefs['ACC-002'],
      targetAccountId: accountRefs['ACC-001'],
      status: 'active',
      createdBy: SEED_USER,
    },
    {
      name: 'London Target Balance Sweep',
      type: 'target',
      sourceAccountId: accountRefs['ACC-006'],
      targetAccountId: accountRefs['ACC-005'],
      targetBalance: 50000,
      status: 'approved',
      createdBy: SEED_USER,
    },
    {
      name: 'NY Threshold Sweep',
      type: 'threshold',
      sourceAccountId: accountRefs['ACC-009'],
      targetAccountId: accountRefs['ACC-008'],
      thresholdValue: 100000,
      status: 'pending',
      createdBy: SEED_USER,
    },
    {
      name: 'Frankfurt Deficit Funding',
      type: 'deficit',
      sourceAccountId: accountRefs['ACC-007'],
      targetAccountId: accountRefs['ACC-005'],
      targetBalance: 200000,
      status: 'draft',
      createdBy: SEED_USER,
    },
  ];

  for (const rule of ruleData) {
    const ref = db.collection('sweepRules').doc();
    await ref.set({ ...rule, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`Created rule: ${rule.name}`);
  }

  // Bootstrap admin user profile in Firestore (if ADMIN_EMAIL is set)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      const adminUser = await admin.auth().getUserByEmail(adminEmail);
      await admin.auth().setCustomUserClaims(adminUser.uid, { role: 'admin' });
      await db.collection('users').doc(adminUser.uid).set(
        {
          uid: adminUser.uid,
          email: adminEmail,
          displayName: adminUser.displayName || 'Admin',
          role: 'admin',
          disabled: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`\nAdmin profile created for ${adminEmail} (uid: ${adminUser.uid})`);
    } catch (err: any) {
      console.warn(`Could not bootstrap admin user: ${err.message}`);
    }
  } else {
    console.log('\nTip: set ADMIN_EMAIL in .env to auto-provision your Firebase user as admin.');
  }

  console.log('\nSeed complete!');
  console.log('Accounts created:', Object.keys(accountRefs).length);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
