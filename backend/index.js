import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './api/auth.js';
import userRoutes from './api/users.js';
import progressRoutes from './api/progress.js';
import shopRoutes from './api/shop.js';
import instructorRoutes from './api/instructor.js';
import leaderboardRoutes from './api/leaderboard.js';
import battlesRoutes from './api/battles.js';
import achievementsRoutes from './api/achievements.js';
import certificatesRoutes from './api/certificates.js';
import aiRoutes from './api/ai.js';
import coursesRoutes from './api/courses.js';
import algorithmRoutes from './api/algorithm.js';
import paymongoRoutes from './api/paymongo.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/battles', battlesRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/algorithm', algorithmRoutes);
app.use('/api/paymongo', paymongoRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Code Siege Backend API v3' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
