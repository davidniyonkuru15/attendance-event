const express = require('express');
const router = express.Router();
const db = require('../models');

// GET /api/attendance
router.get('/', async (req, res) => {
  try {
    const order = [['createdAt', 'DESC']];
    let items;

    // Try to include User/Event if present; if include fails (no associations), fallback to plain query
    try {
      const include = [];
      if (db.User) include.push({ model: db.User });
      if (db.Event) include.push({ model: db.Event });
      items = await db.Attendance.findAll(include.length ? { order, include } : { order });
    } catch (includeErr) {
      // associations not configured or include failed -> fallback
      items = await db.Attendance.findAll({ order });
    }

    // Convert to plain objects and map createdAt -> date and derive a sensible name
    const plain = items.map(it => (typeof it.get === 'function' ? it.get({ plain: true }) : it));
    const mapped = plain.map(it => {
      const uid = it.userId ?? it.UserId ?? (it.User && it.User.id) ?? null;
      const eid = it.eventId ?? it.EventId ?? (it.Event && it.Event.id) ?? null;

      // Prefer explicit fields from associated models if provided
      const userName = it.User && (it.User.name || it.User.fullName);
      const eventTitle = it.Event && (it.Event.title || it.Event.name);

      const name = it.name || userName || eventTitle || (uid ? `User #${uid}` : null);

      return {
        id: it.id,
        userId: uid,
        eventId: eid,
        status: it.status,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
        date: it.createdAt,
        name: name || null
      };
    });

    return res.json(mapped);
  } catch (err) {
    console.error('Failed to fetch attendance:', err);
    return res.status(500).json({ error: 'Failed to fetch attendance', message: err.message });
  }
});

// POST /api/attendance
// Create a new attendance record. Minimal validation included.
router.post('/', async (req, res) => {
  try {
    const { userId, eventId, status } = req.body;
    if (!userId || !eventId) {
      return res.status(400).json({ error: 'userId and eventId are required' });
    }

    // Create only fields that exist in the table (avoid sending unknown columns)
    const created = await db.Attendance.create({
      userId,
      eventId,
      status: status || 'present'
    });

    const obj = typeof created.toJSON === 'function' ? created.toJSON() : created;
    obj.date = obj.createdAt;
    return res.status(201).json(obj);
  } catch (err) {
    console.error('Failed to create attendance:', err);
    return res.status(500).json({ error: 'Failed to create attendance', message: err.message });
  }
});

module.exports = router;
