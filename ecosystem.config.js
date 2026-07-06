module.exports = {
  apps: [
    {
      name:         'medistore-api',
      script:       'backend/cluster.js',
      instances:    'max',           // use all CPU cores
      exec_mode:    'cluster',
      max_memory_restart: '500M',    // restart if memory > 500MB

      env: {
        NODE_ENV: 'development',
        PORT:     5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT:     5000,
      },

      // Logs
      error_file:   'logs/pm2-error.log',
      out_file:     'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Graceful restart
      wait_ready:    true,
      listen_timeout:3000,
      kill_timeout:  5000,
    },
  ],
};