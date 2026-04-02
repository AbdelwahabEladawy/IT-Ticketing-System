import express from 'express';
import { runOllama } from '../services/ollamaService.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const answer = await runOllama(message);
        return res.json({ answer });
    } catch (error) {
        return res.status(500).json({ error: error?.message || 'Failed to run local model' });
    }
});

export default router;
