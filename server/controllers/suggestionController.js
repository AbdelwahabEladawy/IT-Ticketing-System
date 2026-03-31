import { body, validationResult } from 'express-validator';
import {
  createSuggestion,
  listSuggestions,
  countUnseenSuggestions,
  getSuggestionById,
  markSuggestionSeen
} from '../services/suggestionService.js';

export const validateCreateSuggestion = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
];

export async function postSuggestion(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'USER') {
      return res.status(403).json({ error: 'Only regular users can submit suggestions' });
    }

    const { title, description } = req.body;
    const suggestion = await createSuggestion({
      createdById: req.user.id,
      title,
      description
    });

    res.status(201).json({ suggestion });
  } catch (error) {
    console.error('postSuggestion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getSuggestions(req, res) {
  try {
    const suggestions = await listSuggestions();
    res.json({ suggestions });
  } catch (error) {
    console.error('getSuggestions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getUnseenCount(req, res) {
  try {
    const count = await countUnseenSuggestions();
    res.json({ count });
  } catch (error) {
    console.error('getUnseenCount error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getSuggestion(req, res) {
  try {
    const suggestion = await getSuggestionById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    res.json({ suggestion });
  } catch (error) {
    console.error('getSuggestion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function patchMarkSeen(req, res) {
  try {
    const updated = await markSuggestionSeen(req.params.id);
    res.json({ suggestion: updated });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    console.error('patchMarkSeen error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
