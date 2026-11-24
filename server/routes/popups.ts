// Public popup endpoints: the live popup for the bottom of the site, and poll voting.
import express from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth } from '../middleware/auth.js';
import { getClientIp } from '../utils/getIpAddress.js';
import { hashIp } from '../utils/encryption.js';
import {
  getLivePopup,
  getLivePopupById,
  pollResults,
  votePopup,
} from '../popups/popups.js';

const router = express.Router();

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many votes. Try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET: /api/popups/live
router.get('/live', optionalAuth, async (req, res) => {
  try {
    const popup = await getLivePopup(!!req.user);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ popup });
  } catch (error) {
    console.error('Error loading live popup:', error);
    res.json({ popup: null });
  }
});

// POST: /api/popups/:id/vote { option }
router.post('/:id/vote', voteLimiter, optionalAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const option = Number(req.body?.option);
    const popup = Number.isInteger(id) ? await getLivePopupById(id) : null;
    if (!popup || popup.kind !== 'poll')
      return res.status(404).json({ error: 'This poll is closed' });
    if (popup.audience === 'signed_in' && !req.user)
      return res.status(401).json({ error: 'Sign in to vote' });
    if (
      !Number.isInteger(option) ||
      option < 0 ||
      option >= popup.options.length
    )
      return res.status(400).json({ error: 'Pick one of the answers' });
    const voter = req.user?.userId
      ? `user:${req.user.userId}`
      : `ip:${hashIp(getClientIp(req))}`;
    await votePopup(id, voter, option);
    res.json({ results: await pollResults(id, popup.options.length) });
  } catch (error) {
    console.error('Error voting on popup:', error);
    res.status(500).json({ error: 'Vote failed' });
  }
});

export default router;
