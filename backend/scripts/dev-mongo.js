// Local development database, standing in for a real MongoDB Atlas cluster.
// Uses the same mongodb-memory-server binary already cached by the smoke test —
// no separate MongoDB install needed. Stays up independently of `npm run dev`
// restarts (nodemon only restarts the API process, not this one).
// Usage: node scripts/dev-mongo.js
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27117, dbName: 'normi_rms' },
  });
  console.log('READY', mongod.getUri());

  const shutdown = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start local dev MongoDB:', err);
  process.exit(1);
});
