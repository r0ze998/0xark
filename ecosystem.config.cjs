/**
 * 0xARK PM2 Ecosystem Config
 *
 * Manages both backend servers as persistent processes:
 *   - x402 information broker  (port 3402)
 *   - WebSocket multiplayer    (port 3000)
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs   # start both servers
 *   pm2 stop all                      # stop both
 *   pm2 restart all                   # restart both
 *   pm2 logs                          # tail logs
 *   pm2 save                          # persist across reboots
 *   pm2 startup                       # install OS startup hook
 */

module.exports = {
  apps: [
    {
      name: '0xark-broker',
      cwd: './x402',
      script: 'agent-broker.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      env: {
        NODE_ENV: 'production',
        BROKER_WALLET: 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      log_file: './logs/broker.log',
      error_file: './logs/broker-err.log',
      time: true,
    },
    {
      name: '0xark-multiplayer',
      cwd: './multiplayer',
      script: 'server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      log_file: '../logs/multiplayer.log',
      error_file: '../logs/multiplayer-err.log',
      time: true,
    },
  ],
};
