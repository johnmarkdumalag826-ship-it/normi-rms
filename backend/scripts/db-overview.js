// Shows what is in the database: which collections ("tables") exist and how many records each has.
// Add a collection name to see its records.
//
//   npm run db:check                 -> connection check + a count for every collection
//   npm run db:view -- users         -> the records in the "users" collection (first 20)
//   npm run db:view -- researches 50 -> the first 50 records of "researches"
//
// Passwords are never shown. Long text is shortened.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const HIDDEN = new Set(['password', '__v']);

// The address with the secret parts (user name and password) hidden.
const safeAddress = (uri) => String(uri || '').replace(/\/\/[^@/]*@/, '//').split('?')[0];

const short = (value) => {
  if (typeof value === 'string') return value.length > 60 ? `${value.slice(0, 57)}...` : value;
  if (Array.isArray(value)) return value.map(short);
  if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, short(v)]));
  }
  return value && value._bsontype === 'ObjectId' ? String(value) : value;
};

async function main() {
  await connectDB();
  const db = mongoose.connection.db;
  const [, wanted, limitArg] = ['', process.argv[2], process.argv[3]];

  console.log(`\nConnected to: ${safeAddress(process.env.MONGODB_URI)}`);
  console.log(`Database name: ${db.databaseName}`);
  const kind = /mongodb\+srv:|mongodb\.net/.test(process.env.MONGODB_URI || '') ? 'MongoDB Atlas (in the cloud)'
    : /127\.0\.0\.1|localhost/.test(process.env.MONGODB_URI || '') ? 'a database on this computer' : 'a MongoDB server';
  console.log(`Kind: ${kind}`);

  if (!wanted) {
    const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();
    console.log('\nCollection                      Records');
    console.log('------------------------------  -------');
    let total = 0;
    for (const name of collections) {
      const count = await db.collection(name).countDocuments();
      total += count;
      console.log(`${name.padEnd(30)}  ${String(count).padStart(7)}`);
    }
    console.log('------------------------------  -------');
    console.log(`${'Total'.padEnd(30)}  ${String(total).padStart(7)}`);
    console.log('\nTo see the records: npm run db:view -- <collection name>');
  } else {
    const limit = Math.min(Number(limitArg) || 20, 200);
    const docs = await db.collection(wanted).find({}).limit(limit).toArray();
    const total = await db.collection(wanted).countDocuments();
    console.log(`\n"${wanted}": showing ${docs.length} of ${total} records\n`);
    docs.forEach((doc, i) => {
      const clean = Object.fromEntries(Object.entries(doc).filter(([k]) => !HIDDEN.has(k)));
      console.log(`#${i + 1} ${JSON.stringify(short(clean), null, 2)}`);
    });
    if (docs.length === 0) console.log('(no records)');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nCould not read the database:', err.message);
  process.exit(1);
});
