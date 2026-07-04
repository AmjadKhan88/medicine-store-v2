const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const auditLogRoutes = require('./routes/auditLogs');
const medicineRoutes = require('./routes/medicines');
const patientRoutes = require('./routes/patients');
const billingRoutes = require('./routes/billing');
const dashboardRoutes = require('./routes/dashboard');
const saleRoutes = require('./routes/sales');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const staffRoutes = require('./routes/staff');
const backupRoutes = require('./routes/backup');
const subscriptionRoutes = require('./routes/subscription');
const { startExpiryDigestJob } = require('./jobs/expiryDigest');
const prescriptionRoutes = require('./routes/prescriptions');
const appointmentRoutes = require('./routes/appointments');
const labTestRoutes = require('./routes/labTests');
const supplierRoutes = require('./routes/suppliers');
const pushRoutes = require('./routes/push');
const portalRoutes = require('./routes/portal');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000','https://medicine-store-v2.vercel.app'],
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/lab-tests', labTestRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/portal', portalRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MediStore API is running', timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medistore')
  .then(() => {
    console.log('✅ MongoDB connected successfully');
     startExpiryDigestJob();
    app.listen(PORT, () => {
      console.log(`🚀 MediStore server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
