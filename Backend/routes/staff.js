const express = require('express');
const Staff = require('../models/Staff');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// List staff
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const list = await Staff.find().sort({ createdAt: -1 }).select('-password').lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create staff (stored only in Staff collection)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, phone, email, password, ordersToday } = req.body || {};
    if (!name || !phone || !password || !email) {
      return res.status(400).json({ message: 'Name, phone, email and password are required' });
    }

    // Ensure no duplicate staff entry in Staff collection
    const existingStaff = await Staff.findOne({ $or: [{ email }, { phone }] });
    if (existingStaff) {
      return res.status(400).json({ message: 'Staff already exists with this email or phone' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = new Staff({
      name,
      phone,
      email,
      password: hashedPassword,
      role: 'Delivery Staff',
      status: 'active',
      ordersToday: typeof ordersToday === 'number' ? ordersToday : 0,
    });
    await staff.save();

    const obj = staff.toObject();
    delete obj.password;
    res.status(201).json(obj);
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
