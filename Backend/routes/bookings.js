const express = require('express');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

const router = express.Router();

// Create booking (requires auth)
router.post('/', auth, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      userId: req.user.id,
    };
    // Ensure client cannot override userId
    delete payload.user; // no-op safety
    const booking = new Booking(payload);
    await booking.save();
    return res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Failed to create booking' });
  }
});

// Get booking by id (public)
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findOne({ id: req.params.id });
    if (!booking) return res.status(404).json({ message: 'Order not found' });
    return res.json(booking);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's bookings (requires auth)
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin: list all bookings
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin: update booking status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { status, paymentStatus, assignedStaff } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { id: req.params.id },
      { $set: { ...(status && { status }), ...(paymentStatus && { paymentStatus }), ...(assignedStaff && { assignedStaff }) } },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Order not found' });
    return res.json(booking);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
