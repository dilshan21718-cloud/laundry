const express = require('express');
const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

const router = express.Router();
const adminOnly = require('../middleware/admin');

const monthKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const genId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'LB';
  for (let i = 0; i < 12; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};
const genSubCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'SUB-';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
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

// GET /api/subscriptions/history - list all subscriptions for the user (all months)
router.get('/history', auth, async (req, res) => {
  try {
    const subs = await Subscription.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/subscriptions/admin/all - list all subscriptions (admin only)
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const subs = await Subscription.find({}).sort({ createdAt: -1 }).lean();
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

const calcDailyRuns = (startDate) => {
  // Generate daily dates from startDate inclusive up to one month ahead
  const start = new Date(new Date(startDate).setHours(0,0,0,0));
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1); // one month window
  const dates = [];
  let cur = new Date(start);
  while (cur < end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

const calcMonthlyRuns = (dayOfWeek, startDate) => {
  // Generate weekly dates from startDate inclusive up to one month ahead (spanning month boundary)
  const start = new Date(new Date(startDate).setHours(0,0,0,0));
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1); // one month window
  // move cur to the first desired weekday on/after start
  let cur = new Date(start);
  while (cur.getDay() !== dayOfWeek) {
    cur.setDate(cur.getDate() + 1);
  }
  const dates = [];
  while (cur < end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return dates;
};

// POST /api/subscriptions/daily-pickup - create daily subscription
router.post('/daily-pickup', auth, async (req, res) => {
  try {
    const { startDate, pickupTime, pickupAddress, deliveryAddress, notes } = req.body || {};
    const start = startDate ? new Date(startDate) : new Date();
    const monthKey = monthKeyOf(start);

    // ensure unique per user-kind-month
    const existing = await Subscription.findOne({ userId: req.user.id, kind: 'daily_pickup', monthKey });
    if (existing) {
      // Update existing daily subscription
      existing.startDate = start;
      existing.notes = notes || '';
      existing.pickupTime = pickupTime || '';
      const runsUpd = calcDailyRuns(start);
      existing.runs = runsUpd;
      existing.runStates = runsUpd.map((dt) => ({ date: dt, status: 'scheduled' }));
      const nextUpd = (existing.runStates || []).find(rs => rs.status === 'scheduled');
      existing.nextRun = nextUpd ? nextUpd.date : null;
      await existing.save();
      return res.status(200).json(existing);
    }

    // Create a minimal booking for the month
    const id = genId();
    const booking = new Booking({
      id,
      userId: req.user.id,
      service: 'Daily clean subscription',
      quantity: 'subscription',
      pricingType: 'kg',
      status: 'accepted',
      estimatedDelivery: '',
      pickupTime: '',
      deliveryTime: '',
      pickupAddress: pickupAddress || req.user?.address || 'Address on file',
      deliveryAddress: deliveryAddress || req.user?.address || 'Address on file',
      items: [],
      instructions: notes || 'Daily pickup subscription',
      donationPickup: false,
      totalAmount: 0,
      paymentStatus: 'pending',
    });
    await booking.save();

    const runs = calcDailyRuns(start);
    const runStates = runs.map((dt) => ({ date: dt, status: 'scheduled' }));
    const sub = await Subscription.create({
      code: genSubCode(),
      userId: req.user.id,
      kind: 'daily_pickup',
      dayOfWeek: 0, // not used for daily
      startDate: start,
      monthKey,
      createdBookingId: id,
      notes: notes || '',
      pickupTime: pickupTime || '',
      runs,
      nextRun: runs && runs.length ? runs[0] : null,
      runStates,
    });

    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/subscriptions/weekly-pickup - create one subscription per month and one booking for this month if not exists
router.post('/weekly-pickup', auth, async (req, res) => {
  try {
    const { dayOfWeek, startDate, pickupTime, pickupAddress, deliveryAddress, notes } = req.body || {};
    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ message: 'dayOfWeek must be 0-6 (0=Sunday)' });
    }
    const start = startDate ? new Date(startDate) : new Date();
    const monthKey = monthKeyOf(start);

    // ensure unique per user-kind-month
    const existing = await Subscription.findOne({ userId: req.user.id, kind: 'weekly_pickup', monthKey });
    if (existing) {
      // Update existing subscription when user clicks Update
      existing.dayOfWeek = dayOfWeek;
      existing.startDate = start;
      existing.notes = notes || '';
      existing.pickupTime = pickupTime || '';
      const runsUpd = calcMonthlyRuns(dayOfWeek, start);
      existing.runs = runsUpd;
      existing.runStates = runsUpd.map((dt) => ({ date: dt, status: 'scheduled' }));
      const nextUpd = (existing.runStates || []).find(rs => rs.status === 'scheduled');
      existing.nextRun = nextUpd ? nextUpd.date : null;
      await existing.save();
      return res.status(200).json(existing);
    }

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
      // leave unassigned by default
    });
    await booking.save();

    const runs = calcMonthlyRuns(dayOfWeek, start);
    const runStates = runs.map((dt) => ({ date: dt, status: 'scheduled' }));
    const sub = await Subscription.create({
      code: genSubCode(),
      userId: req.user.id,
      kind: 'weekly_pickup',
      dayOfWeek,
      startDate: start,
      monthKey,
      createdBookingId: id,
      notes: notes || '',
      pickupTime: pickupTime || '',
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
      // leave unassigned by default
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
      pickupTime: base.pickupTime || '',
      runs,
      runStates,
      nextRun: runs && runs.length ? runs[0] : null,
    });
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a subscription
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Subscription.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ message: 'Subscription not found' });
    res.json({ message: 'Subscription deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
