const express = require('express');
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// List staff
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const list = await Staff.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create staff
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const staff = new Staff(req.body || {});
    await staff.save();
    res.status(201).json(staff);
  } catch (err) {
    res.status(400).json({ message: 'Invalid staff payload' });
  }
});

// Update staff
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Staff.findByIdAndUpdate(id, req.body || {}, { new: true });
    if (!updated) return res.status(404).json({ message: 'Staff not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Invalid staff payload' });
  }
});

// Delete staff
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await Staff.findByIdAndDelete(id);
    res.json({ message: 'Staff deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
