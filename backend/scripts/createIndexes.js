const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const indexes = [
    // Bills — most queried
    { col: 'bills', idx: { storeId: 1, createdAt: -1 } },
    { col: 'bills', idx: { storeId: 1, patient: 1 } },
    { col: 'bills', idx: { storeId: 1, paymentStatus: 1 } },

    // Medicines
    { col: 'medicines', idx: { storeId: 1, isActive: 1, expiryDate: 1 } },
    { col: 'medicines', idx: { storeId: 1, stock: 1, minStock: 1 } },
    { col: 'medicines', idx: { storeId: 1, name: 'text', genericName: 'text' } },

    // Patients
    { col: 'patients', idx: { storeId: 1, isActive: 1 } },
    { col: 'patients', idx: { storeId: 1, name: 'text', patientId: 'text' } },

    // Subscriptions
    { col: 'subscriptions', idx: { storeId: 1 }, opts: { unique: true } },
    { col: 'subscriptions', idx: { status: 1, currentPeriodEnd: 1 } },

    // Audit logs — time-series
    { col: 'auditlogs', idx: { storeId: 1, createdAt: -1 } },
    { col: 'auditlogs', idx: { createdAt: 1 }, opts: { expireAfterSeconds: 60 * 60 * 24 * 90 } }, // auto-delete after 90 days
  ];

  for (const { col, idx, opts = {} } of indexes) {
    try {
      await db.collection(col).createIndex(idx, opts);
      console.log(`✅ Index on ${col}:`, JSON.stringify(idx));
    } catch (err) {
      if (err.code !== 85) console.error(`Index failed on ${col}:`, err.message);
    }
  }

  console.log('\n✅ All indexes created');
  process.exit(0);
}

createIndexes().catch(console.error);