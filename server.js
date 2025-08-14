require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const contentRoutes = require('./routes/content');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yodha27';
mongoose.connect(MONGO_URI).then(() => {
  console.log('MongoDB connected');
}).catch((e) => {
  console.error('MongoDB connection error', e);
  process.exit(1);
});

app.get('/', (req, res) => res.json({ ok: true, service: 'yodha27-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
