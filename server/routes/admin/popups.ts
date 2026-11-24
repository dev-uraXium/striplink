// Admin: publish popups at the bottom of the site.
import express from 'express';
import { createAuditLogger } from '../../middleware/auditLogger.js';
import { requirePermission } from '../../middleware/rolePermissions.js';
import {
  createPopup,
  deletePopup,
  getPopup,
  listPopups,
  setPopupActive,
  updatePopup,
  validatePopupInput,
} from '../../popups/popups.js';

const router = express.Router();

router.use(requirePermission('admin'));

const idParam = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// GET: /api/admin/popups
router.get('/', async (_req, res) => {
  try {
    res.json({ popups: await listPopups() });
  } catch (error) {
    console.error('Error listing popups:', error);
    res.status(500).json({ error: 'Failed to list popups' });
  }
});

// POST: /api/admin/popups
router.post('/', createAuditLogger('POPUP_CREATED'), async (req, res) => {
  try {
    const parsed = validatePopupInput(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const popup = await createPopup(parsed.value, req.user?.userId ?? null);
    if (req.body?.publish === true) await setPopupActive(popup.id, true);
    res.status(201).json({ popup: await getPopup(popup.id) });
  } catch (error) {
    console.error('Error creating popup:', error);
    res.status(500).json({ error: 'Failed to create popup' });
  }
});

// PUT: /api/admin/popups/:id
router.put('/:id', createAuditLogger('POPUP_UPDATED'), async (req, res) => {
  try {
    const id = idParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Bad popup id' });
    const parsed = validatePopupInput(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const popup = await updatePopup(id, parsed.value);
    if (!popup) return res.status(404).json({ error: 'Popup not found' });
    res.json({ popup });
  } catch (error) {
    console.error('Error updating popup:', error);
    res.status(500).json({ error: 'Failed to update popup' });
  }
});

// PUT: /api/admin/popups/:id/active { active }
router.put(
  '/:id/active',
  createAuditLogger('POPUP_TOGGLED'),
  async (req, res) => {
    try {
      const id = idParam(req.params.id);
      if (!id) return res.status(400).json({ error: 'Bad popup id' });
      await setPopupActive(id, req.body?.active === true);
      res.json({ ok: true });
    } catch (error) {
      console.error('Error toggling popup:', error);
      res.status(500).json({ error: 'Failed to update popup' });
    }
  }
);

// DELETE: /api/admin/popups/:id
router.delete('/:id', createAuditLogger('POPUP_DELETED'), async (req, res) => {
  try {
    const id = idParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Bad popup id' });
    await deletePopup(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting popup:', error);
    res.status(500).json({ error: 'Failed to delete popup' });
  }
});

export default router;
