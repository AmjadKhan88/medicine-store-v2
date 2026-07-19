const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Render has no outbound IPv6 route — prevents ENETUNREACH on SMTP/etc.

const express           = require('express');
const http              = require('http');
require('dotenv').config();
const { initSocket }    = require('./socket');
const helmet            = require('helmet');
const compression       = require('compression');
const { connectRedis }  = require('./config/redis');
const connectDB         = require('./config/db');
const cors              = require('cors');
const morgan            = require('morgan');
const { apiLimiter, aiLimiter, speedLimiter } = require('./middleware/rateLimiter');
const timeout           = require('./middleware/timeout');
const logger            = require('./utils/logger');
const mongoosePaginate  = require('mongoose-paginate-v2');


const authRoutes               =   require('./routes/auth');
const auditLogRoutes           =   require('./routes/auditLogs');
const medicineRoutes           =   require('./routes/medicines');
const patientRoutes            =   require('./routes/patients');
const billingRoutes            =   require('./routes/billing');
const dashboardRoutes          =   require('./routes/dashboard');
const saleRoutes               =   require('./routes/sales');
const purchaseOrderRoutes      =   require('./routes/purchaseOrders');
const staffRoutes              =   require('./routes/staff');
const backupRoutes             =   require('./routes/backup');
const subscriptionRoutes       =   require('./routes/subscription');
const prescriptionRoutes       =   require('./routes/prescriptions');
const appointmentRoutes        =   require('./routes/appointments');
const labTestRoutes            =   require('./routes/labTests');
const supplierRoutes           =   require('./routes/suppliers');
const pushRoutes               =   require('./routes/push');
const portalRoutes             =   require('./routes/portal');
const aiRoutes                 =   require('./routes/ai');
const superAdminRoutes         =   require('./routes/superAdmin');
const supportRoutes            =   require('./routes/support');
const invoiceSettingsRoutes    =   require('./routes/invoiceSettings');
const documentRoutes           =   require('./routes/documents');
const wardsRoute               =   require('./routes/wards');
const ipdRoute                 =   require('./routes/ipd');
const opdRoutes                =   require('./routes/opd');
const nurseRoutes              =   require('./routes/nurse');
const otRoutes                 =   require('./routes/ot');
const bloodbankRoutes          =   require('./routes/bloodBank');
const doctorOrdersRoutes       =   require('./routes/doctorOrders');
const radiology                =   require('./routes/radiology');
const vitalsRoutes             =   require('./routes/vitals');
const emrRoutes                =   require('./routes/emr');
const accountingRoutes         =   require('./routes/accounting');
const insuranceRoutes          =   require('./routes/insurance');
const { startExpiryDigestJob } =   require('./jobs/expiryDigest');


const app = express();
app.set('trust proxy', 1); // trust only the first hop (Render's load balancer) — 'true' trusts every hop and breaks express-rate-limit's IP detection
const httpServer = http.createServer(app);
// initSocket(httpServer);

/* ════════════════════════════════
   SECURITY & PERFORMANCE MIDDLEWARE
════════════════════════════════ */

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images
  contentSecurityPolicy:     false,                       // set your own if needed
}));

// Compress all responses (gzip)
app.use(compression({
  level:     6,
  threshold: 1024,   // only compress > 1KB
  filter:    (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// cors
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// Body parsing — with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip:   (req) => req.path === '/api/health', // skip health checks
}));

// Speed limiter — applied globally
app.use('/api', speedLimiter);

// Rate limiter — general API
app.use('/api', apiLimiter);

app.use('/api', timeout(30000)); // 30s max for any request

/* ════════════════════════════════
   HEALTH CHECK (no auth/rate limit)
════════════════════════════════ */
app.get('/api/health', async (req, res) => {
  const { getRedis } = require('./config/redis');
  const redis = getRedis();

  res.json({
    status:   'ok',
    pid:       process.pid,
    uptime:   Math.round(process.uptime()),
    memory:   process.memoryUsage().heapUsed,
    mongodb:  require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    redis:    redis?.isReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

/* ════════════════════════════════
   Mongoose Paginate
════════════════════════════════ */

mongoosePaginate.paginate.options = {
  lean:           true,
  leanWithId:     false,
  customLabels: {
    docs:       'docs',
    totalDocs:  'totalDocs',
    totalPages: 'totalPages',
    page:       'page',
    hasNextPage:'hasNextPage',
    hasPrevPage:'hasPrevPage',
  },
};

/* ════════════════════════════════
   ROUTES
════════════════════════════════ */

app.use('/api/auth',              authRoutes);
app.use('/api/medicines',         medicineRoutes);
app.use('/api/patients',          patientRoutes);
app.use('/api/billing',           billingRoutes);
app.use('/api/dashboard',         dashboardRoutes);
app.use('/api/sales',             saleRoutes);
app.use('/api/purchase-orders',   purchaseOrderRoutes);
app.use('/api/audit-logs',        auditLogRoutes);
app.use('/api/staff',             staffRoutes);
app.use('/api/backup',            backupRoutes);
app.use('/api/subscription',      subscriptionRoutes);
app.use('/api/prescriptions',     prescriptionRoutes);
app.use('/api/appointments',      appointmentRoutes);
app.use('/api/lab-tests',         labTestRoutes);
app.use('/api/suppliers',         supplierRoutes);
app.use('/api/push',              pushRoutes);
app.use('/api/portal',            portalRoutes);
app.use('/api/ai',aiLimiter,      aiRoutes);
app.use('/api/super-admin',       superAdminRoutes);
app.use('/api/support',           supportRoutes);
app.use('/api/invoice-settings',  invoiceSettingsRoutes);
app.use('/api/documents',         documentRoutes);
app.use('/api/wards',             wardsRoute);
app.use('/api/ipd',               ipdRoute);
app.use('/api/opd',               opdRoutes);
app.use('/api/nurse',             nurseRoutes);
app.use('/api/ot',                otRoutes);
app.use('/api/blood-bank',        bloodbankRoutes);
app.use('/api/clinical',          doctorOrdersRoutes) ;
app.use('/api/radiology',         radiology);
app.use('/api/vitals' ,           vitalsRoutes);
app.use('/api/emr',               emrRoutes);
app.use('/api/accounting' ,       accountingRoutes);
app.use('/api/insurance' ,        insuranceRoutes);

/* ════════════════════════════════
   GLOBAL ERROR HANDLER
════════════════════════════════ */

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { message: err.message, stack: err.stack, url: req.originalUrl });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
  }
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

/* ════════════════════════════════
   GRACEFUL SHUTDOWN
════════════════════════════════ */

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);

  httpServer.close(async () => {
    logger.info('HTTP server closed');
    await require('mongoose').connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

/* ════════════════════════════════
   STARTUP
════════════════════════════════ */

const PORT = process.env.PORT || 5000;
const start = async () => {
  await connectDB();
  await connectRedis().catch(err => {
    logger.warn('Redis unavailable — continuing without cache:', err.message);
  });

  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`✅ Worker ${process.pid} listening on port ${PORT}`);
    startExpiryDigestJob();

    // Tell PM2 we're ready
    if (process.send) process.send('ready');
  });
};

start();
