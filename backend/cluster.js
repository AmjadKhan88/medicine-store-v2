const cluster = require('cluster');
const os      = require('os');
const logger  = require('./utils/logger');

const WORKERS = process.env.WEB_CONCURRENCY || os.cpus().length;

if (cluster.isMaster) {
  logger.info(`🚀 Master process ${process.pid} starting ${WORKERS} workers`);

  // Fork workers
  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  // Restart crashed workers
  cluster.on('exit', (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });

} else {
  // Workers run the actual server
  require('./server');
}