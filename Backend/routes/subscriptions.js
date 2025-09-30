const express = require('express');
const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

const router = express.Router();

const monthKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const genId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'LB';
  for (let i = 0; i < 12; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

// GET /api/subscriptions/mine - list current month's subscriptions for logged-in user
router.get('/mine', auth, async (req, res) => {
  try {
    const now = new Date();
    const monthKey = monthKeyOf(now);
    const subs = await Subscription.find({ userId: req.user.id, monthKey }).sort({ createdAt: -1 }).lean();
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

const calcMonthlyRuns = (dayOfWeek, startDate) => {
  const d = new Date(startDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // go to first desired weekday on/after start
  let cur = new Date(Math.max(first.getTime(), new Date(startDate).setHours(0,0,0,0)));
  while (cur.getDay() !== dayOfWeek) {
    cur.setDate(cur.getDate() + 1);
  }
  const dates = [];
  while (cur <= last) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return dates;
};

// POST /api/subscriptions/weekly-pickup - create one subscription per month and one booking for this month if not exists
router.post('/weekly-pickup', auth, async (req, res) => {
  try {
    const { dayOfWeek, startDate, pickupAddress, deliveryAddress, notes } = req.body || {};
    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ message: 'dayOfWeek must be 0-6 (0=Sunday)' });
    }
    const start = startDate ? new Date(startDate) : new Date();
    const monthKey = monthKeyOf(start);

    // ensure unique per user-kind-month
    const existing = await Subscription.findOne({ userId: req.user.id, kind: 'weekly_pickup', monthKey });
    if (existing) return res.status(200).json(existing);

    // Create a minimal booking for the month (admin can update later)
    const id = genId();
    const booking = new Booking({
      id,
      userId: req.user.id,
      service: 'Regular clean subscription',
      quantity: 'subscription',
      pricingType: 'kg',
      status: 'accepted',
      estimatedDelivery: '',
      pickupTime: '',
      deliveryTime: '',
      pickupAddress: pickupAddress || req.user?.address || 'Address on file',
      deliveryAddress: deliveryAddress || req.user?.address || 'Address on file',
      items: [],
      instructions: notes || 'Weekly pickup subscription',
      donationPickup: false,
      totalAmount: 0,
      paymentStatus: 'pending',
      assignedStaff: { name: 'Laundry Staff', phone: '', vehicle: '' },
    });
    await booking.save();

    const runs = calcMonthlyRuns(dayOfWeek, start);
    const runStates = runs.map((dt) => ({ date: dt, status: 'scheduled' }));
    const sub = await Subscription.create({
      userId: req.user.id,
      kind: 'weekly_pickup',
      dayOfWeek,
      startDate: start,
      monthKey,
      createdBookingId: id,
      notes: notes || '',
      runs,
      nextRun: runs && runs.length ? runs[0] : null,
      runStates,
    });

    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
// Update run status
router.patch('/:id/runs/:index', auth, async (req, res) => {
  try {
    const { id, index } = req.params;
    const { status } = req.body || {};
    if (!['scheduled','completed','skipped'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const sub = await Subscription.findOne({ _id: id, userId: req.user.id });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    const idx = Number(index);
    if (!sub.runStates || idx < 0 || idx >= sub.runStates.length) return res.status(400).json({ message: 'Invalid run index' });
    sub.runStates[idx].status = status;
    // recalc nextRun
    const next = (sub.runStates || []).find(rs => rs.status === 'scheduled');
    sub.nextRun = next ? next.date : null;
    await sub.save();
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate next month subscription from current settings
router.post('/:id/generate-next', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const base = await Subscription.findOne({ _id: id, userId: req.user.id });
    if (!base) return res.status(404).json({ message: 'Subscription not found' });
    const nextMonth = new Date(base.startDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthKey = monthKeyOf(nextMonth);
    // If exists, return existing
    const exists = await Subscription.findOne({ userId: base.userId, kind: base.kind, monthKey });
    if (exists) return res.status(200).json(exists);

    // Create booking + sub using same logic as weekly-pickup
    const idCode = genId();
    const booking = new Booking({
      id: idCode,
      userId: base.userId,
      service: 'Regular clean subscription',
      quantity: 'subscription',
      pricingType: 'kg',
      status: 'accepted',
      estimatedDelivery: '',
      pickupTime: '',
      deliveryTime: '',
      pickupAddress: 'Address on file',
      deliveryAddress: 'Address on file',
      items: [],
      instructions: base.notes || 'Weekly pickup subscription',
      donationPickup: false,
      totalAmount: 0,
      paymentStatus: 'pending',
      assignedStaff: { name: 'Laundry Staff', phone: '', vehicle: '' },
    });
    await booking.save();

    const runs = calcMonthlyRuns(base.dayOfWeek, nextMonth);
    const runStates = runs.map((dt) => ({ date: dt, status: 'scheduled' }));
    const sub = await Subscription.create({
      userId: base.userId,
      kind: base.kind,
      dayOfWeek: base.dayOfWeek,
      startDate: nextMonth,
      monthKey,
      createdBookingId: idCode,
      notes: base.notes || '',
      runs,
      runStates,
      nextRun: runs && runs.length ? runs[0] : null,
    });
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
