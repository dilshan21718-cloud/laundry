const express = require('express');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// GET /api/reports/revenue?scope=daily|monthly|yearly
router.get('/revenue', auth, adminOnly, async (req, res) => {
  try {
    const scope = (req.query.scope || 'daily').toString();
    let service = req.query.service ? req.query.service.toString() : '';
    const serviceMap = {
      'wash-fold': 'Wash & Fold',
      'wash-iron': 'Wash & Iron',
      'dry-clean': 'Dry Clean',
      'eco-wash': 'Eco Wash',
    };
    if (service && serviceMap[service]) service = serviceMap[service];
    const status = req.query.status ? req.query.status.toString() : '';

    let groupId = {};
    let projectDate = {};
    let rangeMatch = {};

    const now = new Date();
    if (scope === 'daily') {
      // last 7 days
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0,0,0,0);
      rangeMatch = { createdAt: { $gte: start } };
      projectDate = { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } };
      groupId = { y: '$y', m: '$m', d: '$d' };
    } else if (scope === 'monthly') {
      // last 12 months
      const start = new Date(now);
      start.setMonth(start.getMonth() - 11);
      start.setDate(1); start.setHours(0,0,0,0);
      rangeMatch = { createdAt: { $gte: start } };
      projectDate = { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } };
      groupId = { y: '$y', m: '$m' };
    } else {
      // yearly - last 5 years
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 4);
      start.setMonth(0); start.setDate(1); start.setHours(0,0,0,0);
      rangeMatch = { createdAt: { $gte: start } };
      projectDate = { y: { $year: '$createdAt' } };
      groupId = { y: '$y' };
    }

    const match = { ...rangeMatch };
    if (service) match.service = service;
    if (status) match.status = status;

    const pipeline = [
      { $match: match },
      { $project: { totalAmount: { $ifNull: ['$totalAmount', 0] }, createdAt: 1 } },
      { $addFields: projectDate },
      { $group: { _id: groupId, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
    ];

    const rows = await Booking.aggregate(pipeline);

    // Map to labels/values
    const toLabel = (id) => {
      if (scope === 'daily') return `${id.d}/${id.m}`;
      if (scope === 'monthly') return `${id.m}/${id.y}`;
      return `${id.y}`;
    };
    const data = rows.map(r => ({ label: toLabel(r._id), value: r.revenue, count: r.count }));
    res.json({ scope, data });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
