import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import userRoutes from './routes/users.js';
import specializationRoutes from './routes/specializations.js';
import issueTypeRoutes from './routes/issueTypes.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';
import suggestionRoutes from './routes/suggestions.js';
import presenceRoutes from './routes/presence.js';
import { setupPresenceWebSocket } from './services/wsPresence.js';
import { runPresenceSweeper } from './services/presenceService.js';
import schedulingRoutes from './features/scheduling/scheduling.routes.js';
import { startSchedulingWorker } from './features/scheduling/scheduling.worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

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
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/scheduling-tickets', schedulingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'IT Ticketing System API' });
});

setupPresenceWebSocket(server);
setInterval(async () => {
  try {
    await runPresenceSweeper();
  } catch (error) {
    console.error('Presence sweeper error:', error.message);
  }
}, Number(process.env.PRESENCE_SWEEPER_MS || 15000));
startSchedulingWorker();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

