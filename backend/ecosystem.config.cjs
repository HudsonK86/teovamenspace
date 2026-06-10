module.exports = {
  apps: [
    {
      name: 'kuteovapemen-backend',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
  ],
};
