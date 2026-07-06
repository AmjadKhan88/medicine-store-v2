const winston           = require('winston');
const rfs               = require('rotating-file-stream');
const path              = require('path');
const fs                = require('fs');

// Create logs directory
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logger = winston.createLogger({
  level:  process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console — colorized in dev
    new winston.transports.Console({
      format: process.env.NODE_ENV !== 'production'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) =>
              `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
            )
          )
        : winston.format.json(),
    }),

    // Error log — rotating daily
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level:    'error',
      maxsize:  10485760,  // 10MB
      maxFiles: 14,        // 14 days
    }),

    // Combined log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize:  10485760,
      maxFiles: 7,
    }),
  ],
});

module.exports = logger;