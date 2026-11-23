import express from 'express';
import requireAuth from '../middleware/auth.js';
import { updateSession } from '../db/sessions.js';
import { encrypt } from '../utils/encryption.js';
import { capture } from '../utils/posthog.js';
import { generateAtis } from '../utils/atisGenerator.js';
import { generateRadarAtis } from '../utils/radarAtis.js';
import { getSessionById } from '../db/sessions.js';

const router = express.Router();

interface ATISGenerateRequest {
  sessionId: string;
  ident: string;
  icao: string;
  remarks1?: string;
  landing_runways: string[];
  departing_runways: string[];
  metar?: string;
}

// POST: /api/atis/generate
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const body: ATISGenerateRequest = req.body;

    const {
      sessionId,
      ident,
      icao,
      remarks1,
      landing_runways,
      departing_runways,
      metar,
    } = body;

    if (!sessionId || !icao || !ident) {
      return res
        .status(400)
        .json({ error: 'Session ID, ICAO, and Ident are required' });
    }
    if (!Array.isArray(landing_runways) || !Array.isArray(departing_runways)) {
      return res
        .status(400)
        .json({ error: 'Landing and departing runways must be arrays' });
    }

    const generatedAtis = await generateAtis({
      icao,
      ident,
      landingRunways: landing_runways,
      departingRunways: departing_runways,
      remarks: remarks1,
      metar,
    });

    const atisTimestamp = new Date().toISOString();

    const atisData = {
      letter: ident,
      text: generatedAtis,
      timestamp: atisTimestamp,
    };

    const newDepartureRunway = departing_runways[0] ?? landing_runways[0];
    const newArrivalRunway = landing_runways[0] ?? departing_runways[0];

    const encryptedAtis = encrypt(atisData);
    const updatedSession = await updateSession(sessionId, {
      atis: JSON.stringify(encryptedAtis),
      ...(newDepartureRunway ? { active_runway: newDepartureRunway } : {}),
      ...(newArrivalRunway ? { arrival_runway: newArrivalRunway } : {}),
    });
    if (!updatedSession) {
      throw new Error('Failed to update session with ATIS data');
    }

    if (req.user?.userId)
      capture(req, {
        distinctId: req.user.userId,
        event: 'atis_generated',
        properties: { session_id: sessionId, icao, ident },
      });

    res.json({
      text: generatedAtis,
      letter: ident,
      timestamp: atisTimestamp,
      atisText: generatedAtis,
      ident: ident,
    });
  } catch (error) {
    console.error('Error generating ATIS:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to generate ATIS';
    res.status(500).json({ error: errorMessage });
  }
});

// POST: /api/atis/generate-radar - PF Radar: one ATIS per airport (session owner only)
router.post('/generate-radar', requireAuth, async (req, res) => {
  try {
    const { sessionId, ident } = req.body ?? {};
    if (
      typeof sessionId !== 'string' ||
      typeof ident !== 'string' ||
      !/^[A-Za-z]$/.test(ident)
    ) {
      return res
        .status(400)
        .json({ error: 'Session ID and a one-letter ident are required' });
    }
    const session = await getSessionById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.is_radar)
      return res.status(400).json({ error: 'Not a PF Radar session' });
    if (session.created_by !== req.user?.userId) {
      return res
        .status(403)
        .json({ error: 'Only the session owner can update its ATIS' });
    }

    const letter = ident.toUpperCase();
    const airports = await generateRadarAtis(letter);
    const timestamp = new Date().toISOString();
    const text = airports
      .filter((a) => a.text)
      .map((a) => a.text)
      .join('\n\n');

    await updateSession(sessionId, {
      atis: JSON.stringify(encrypt({ letter, text, timestamp, airports })),
    });
    res.json({
      letter,
      timestamp,
      airports,
      text,
      atisText: text,
      ident: letter,
    });
  } catch (error) {
    console.error('Error generating radar ATIS:', error);
    res.status(500).json({ error: 'Failed to generate the PF Radar ATIS' });
  }
});

export default router;
