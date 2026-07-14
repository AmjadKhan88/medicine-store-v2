const { Server } = require('socket.io');

let io;

const { createAdapter } = require('@socket.io/redis-adapter');
const { getRedis } = require('./config/redis');

/* ── Room naming: each store gets its own room ── */
const storeRoom = (storeId) => `store:${storeId}`;

/* ── Initialize Socket.io with the HTTP server ── */
async function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const redis = getRedis();
  if (redis) {
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io using Redis adapter (multi-instance safe)');
  }

  io.on('connection', (socket) => {
    const { storeId, userId, userName } = socket.handshake.auth;

    if (!storeId) {
      socket.disconnect(true);
      return;
    }

    // Join the store room so only that store gets its events
    socket.join(storeRoom(storeId));
    socket.data.storeId = storeId;
    socket.data.userId = userId;
    socket.data.userName = userName;

    console.log(`[Socket] ${userName || userId} connected — store ${storeId}`);

    // Emit to the joining user: current online count in this store
    const storeMembers = io.sockets.adapter.rooms.get(storeRoom(storeId));
    const onlineCount = storeMembers ? storeMembers.size : 1;

    socket.to(storeRoom(storeId)).emit('user:online', {
      userId,
      userName: userName || 'A team member',
      onlineCount,
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ${userName || userId} disconnected — store ${storeId}`);
      const remaining = io.sockets.adapter.rooms.get(storeRoom(storeId));
      socket.to(storeRoom(storeId)).emit('user:offline', {
        userId,
        userName: userName || 'A team member',
        onlineCount: remaining ? remaining.size : 0,
      });
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
}

/* ════════════════════════════════════════
   Emit helpers — called from controllers
════════════════════════════════════════ */

/* ── Emit to ALL sockets in a store ── */
function emitToStore(storeId, event, data) {
  if (!io) return;
  io.to(storeRoom(String(storeId))).emit(event, data);
}

/* ── BILL events ── */
function emitBillCreated(storeId, bill) {
  emitToStore(storeId, 'bill:created', {
    _id: bill._id,
    billNumber: bill.billNumber,
    patientName: bill.patientName,
    totalAmount: bill.totalAmount,
    amountPaid: bill.amountPaid,
    createdAt: bill.createdAt,
  });
}

function emitPaymentUpdated(storeId, bill) {
  emitToStore(storeId, 'bill:paymentUpdated', {
    _id: bill._id,
    billNumber: bill.billNumber,
    patientName: bill.patientName,
    totalAmount: bill.totalAmount,
    amountPaid: bill.amountPaid,
    paymentStatus: bill.paymentStatus,
  });
}

/* ── STOCK events ── */
function emitStockUpdated(storeId, medicine) {
  emitToStore(storeId, 'stock:updated', {
    _id: medicine._id,
    name: medicine.name,
    stock: medicine.stock,
    minStock: medicine.minStock,
    isLow: medicine.stock <= medicine.minStock,
  });
}

function emitLowStock(storeId, medicine) {
  emitToStore(storeId, 'stock:low', {
    _id: medicine._id,
    name: medicine.name,
    stock: medicine.stock,
    minStock: medicine.minStock,
    message: `Low stock: ${medicine.name} (${medicine.stock} left)`,
  });
}

/* ── MEDICINE events ── */
function emitMedicineCreated(storeId, medicine) {
  emitToStore(storeId, 'medicine:created', {
    _id: medicine._id,
    name: medicine.name,
    category: medicine.category,
    stock: medicine.stock,
  });
}

function emitMedicineUpdated(storeId, medicine) {
  emitToStore(storeId, 'medicine:updated', {
    _id: medicine._id,
    name: medicine.name,
    stock: medicine.stock,
    isLow: medicine.stock <= medicine.minStock,
  });
}

/* ── PATIENT events ── */
function emitPatientCreated(storeId, patient) {
  emitToStore(storeId, 'patient:created', {
    _id: patient._id,
    name: patient.name,
    patientId: patient.patientId,
    createdAt: patient.createdAt,
  });
}

/* ── APPOINTMENT events ── */
function emitAppointmentCreated(storeId, appt) {
  emitToStore(storeId, 'appointment:created', {
    _id: appt._id,
    patientName: appt.patientName,
    doctorName: appt.doctorName,
    date: appt.date,
    timeSlot: appt.timeSlot,
    type: appt.type,
    status: appt.status,
  });
}

function emitAppointmentUpdated(storeId, appt) {
  emitToStore(storeId, 'appointment:updated', {
    _id: appt._id,
    status: appt.status,
    date: appt.date,
  });
}

/* ── NOTIFICATION events ── */
function emitNotification(storeId, notification) {
  emitToStore(storeId, 'notification:new', notification);
}

/* ── DASHBOARD stats refresh ── */
function emitDashboardUpdate(storeId, stats) {
  emitToStore(storeId, 'dashboard:update', stats);
}

/* ── LAB TEST events ── */
function emitLabTestUpdated(storeId, labTest) {
  emitToStore(storeId, 'labTest:updated', {
    _id: labTest._id,
    status: labTest.status,
    result: labTest.result?.interpretation,
  });
}

/* ── OPD Queue events ── */
function emitOPDUpdate(storeId, data) {
  emitToStore(storeId, 'opd:update', data);
}

function emitOPDCalled(storeId, data) {
  emitToStore(storeId, 'opd:called', data);
}

module.exports = {
  initSocket,
  emitToStore,
  emitOPDUpdate,
  emitOPDCalled,
  emitBillCreated,
  emitPaymentUpdated,
  emitStockUpdated,
  emitLowStock,
  emitMedicineCreated,
  emitMedicineUpdated,
  emitPatientCreated,
  emitAppointmentCreated,
  emitAppointmentUpdated,
  emitNotification,
  emitDashboardUpdate,
  emitLabTestUpdated,
};