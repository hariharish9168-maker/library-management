import app from './app';
import { config } from './config';
import { db } from './database/db';
import { setupDatabase } from './database/setup';

async function startServer() {
  try {
    await db.initialize();
    await setupDatabase(false);

    app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🚀 Smart Library Management Server running on port ${config.port}`);
      console.log(`📡 Environment: ${config.env}`);
      console.log(`🗄️ Database Driver: ${db.activeDriver.toUpperCase()}`);
      console.log(`🌐 API Base URL: http://localhost:${config.port}/api`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
