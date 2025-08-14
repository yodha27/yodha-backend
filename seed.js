require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Content = require('./models/Content');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/yodha27');
  const existing = await User.findOne({ username: 'admin' });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', passwordHash: hash, role: 'admin' });
    console.log('Admin user created: admin / admin123');
  } else {
    console.log('Admin already exists');
  }
  const count = await Content.estimatedDocumentCount();
  if (count === 0) {
    await Content.create([
      { title: 'Welcome', body: 'First published content', status: 'published' },
      { title: 'Draft sample', body: 'Only admins can see', status: 'draft' }
    ]);
    console.log('Seeded sample content');
  }
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); }).then(() => process.exit(0));
