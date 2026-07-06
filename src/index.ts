import { createApp } from './app';
import { connectDB } from './config/database';
import { config } from './config';

async function start() {
  await connectDB();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

start();
