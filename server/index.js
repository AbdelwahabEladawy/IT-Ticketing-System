import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import userRoutes from './routes/users.js';
import specializationRoutes from './routes/specializations.js';
import issueTypeRoutes from './routes/issueTypes.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/issue-types', issueTypeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'IT Ticketing System API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

