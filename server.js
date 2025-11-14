const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const tentativeRoutes = require('./routes/tentative');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/tentative', tentativeRoutes);

app.get('/', (req, res) => res.send('🚀 Quiz IA Backend PG OK'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur PostgreSQL lancé sur http://localhost:${PORT}`);
});