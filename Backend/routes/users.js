const express = require('express');
const User = require('../models/User');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// GET /api/users - list users with basic profile and activity summary
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    // Only regular users should appear in customers list
    const users = await User.find({ userType: 'user' }, '-password').sort({ createdAt: -1 }).lean();
    const userIds = users.map(u => u._id);
    const bookings = await Booking.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $sort: { createdAt: -1 } },
      { $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $ifNull: ['$totalAmount', 0] } },
          recentOrder: { $first: {
            id: '$id', service: '$service', status: '$status', totalAmount: '$totalAmount', createdAt: '$createdAt'
          } }
        }
      }
    ]);
    const byUser = new Map(bookings.map(b => [String(b._id), b]));
    const result = users.map(u => {
      const act = byUser.get(String(u._id));
      return {
        id: u._id,
        username: u.username,
        email: u.email,
        phone: u.phone,
        userType: u.userType,
        subscribed: !!u.subscribed,
        createdAt: u.createdAt,
        activity: act ? {
          totalOrders: act.totalOrders,
          totalSpent: act.totalSpent,
          recentOrder: act.recentOrder,
        } : { totalOrders: 0, totalSpent: 0, recentOrder: null }
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id - delete a user (and optionally their bookings)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.userType === 'admin') return res.status(400).json({ message: 'Cannot delete admin accounts' });
    await Booking.deleteMany({ userId: id });
    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
