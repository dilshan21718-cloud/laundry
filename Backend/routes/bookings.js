const express = require('express');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');
const { sendBookingConfirmation, sendStaffAssignedEmail, sendDeliveryCompletedEmail } = require('../utils/emailService');

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
    
    // Send confirmation email
    try {
      const user = await User.findById(req.user.id);
      if (user && user.email) {
        await sendBookingConfirmation(user.email, {
          id: booking.id,
          service: booking.service,
          quantity: booking.quantity,
          totalAmount: booking.totalAmount,
          pickupTime: booking.pickupTime,
          deliveryTime: booking.deliveryTime,
          estimatedDelivery: booking.estimatedDelivery,
          paymentStatus: booking.paymentStatus || 'pending'
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }
    
    return res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Failed to create booking' });
  }
});

// Public: recent feedback for homepage testimonials
router.get('/public/feedback', async (req, res) => {
  try {
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isNaN(rawLimit) ? 6 : Math.min(Math.max(rawLimit, 1), 30);

    const bookings = await Booking.find({
      feedbackRating: { $gte: 1 },
      feedbackMessage: { $ne: '' },
      status: 'delivered',
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('userId', 'username');

    const feedback = bookings.map((b) => ({
      id: b.id,
      name: (b.userId && b.userId.username) || 'Verified Customer',
      rating: b.feedbackRating,
      comment: b.feedbackMessage,
      service: b.service,
    }));

    return res.json(feedback);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Staff: list bookings assigned to the logged-in staff member
router.get('/staff/my-orders', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'staff') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const me = await Staff.findById(req.user.id);
    if (!me) {
      return res.status(404).json({ message: 'User not found' });
    }

    const orConditions = [];
    if (me.phone) orConditions.push({ 'assignedStaff.phone': me.phone });
    if (me.name) orConditions.push({ 'assignedStaff.name': me.name });

    if (!orConditions.length) {
      return res.json([]);
    }

    const bookings = await Booking.find({ $or: orConditions }).sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
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
    const { status, paymentStatus, assignedStaff } = req.body || {};

    const existingBooking = await Booking.findOne({ id: req.params.id });
    if (!existingBooking) return res.status(404).json({ message: 'Order not found' });

    const isAdmin = req.user.userType === 'admin';
    const isStaff = req.user.userType === 'staff';

    if (!isAdmin && !isStaff) {
      if (!existingBooking.userId || existingBooking.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({ message: 'Only cancellation is allowed' });
      }
      const cancellableStatuses = ['accepted', 'picked'];
      if (!cancellableStatuses.includes(existingBooking.status)) {
        return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
      }

      existingBooking.status = 'cancelled';
      await existingBooking.save();
      return res.json(existingBooking);
    }

    let update = {};

    if (isAdmin) {
      update = {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(assignedStaff && { assignedStaff }),
      };
    } else if (isStaff) {
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      const me = await Staff.findById(req.user.id);
      if (!me) {
        return res.status(404).json({ message: 'User not found' });
      }

      const as = existingBooking.assignedStaff || {};
      const isAssignedToStaff =
        (as.phone && me.phone && as.phone === me.phone) ||
        (as.name && me.name && as.name === me.name);
      if (!isAssignedToStaff) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const currentStatus = existingBooking.status;
      const requestedStatus = String(status);

      if (requestedStatus === 'picked' && currentStatus === 'accepted') {
        update = { status: 'picked' };
      } else if (requestedStatus === 'delivered' && currentStatus === 'delivery') {
        update = { status: 'delivered' };
      } else {
        return res.status(400).json({ message: 'Invalid status transition' });
      }
    }

    const booking = await Booking.findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { new: true }
    );
    
    // Send emails for specific events
    try {
      const user = await User.findById(booking.userId);
      console.log('Checking email conditions - User:', user?.email);
      
      // Email when staff is assigned or updated
      if (assignedStaff && user && user.email) {
        console.log('Sending staff assignment email to:', user.email);
        console.log('Staff details:', assignedStaff);
        await sendStaffAssignedEmail(user.email, {
          id: booking.id,
          service: booking.service
        }, {
          name: assignedStaff.name,
          phone: assignedStaff.phone
        });
      } else if (assignedStaff) {
        console.log('Cannot send email - User or email not found');
      }
      
      // Email when order is delivered
      if (status === 'delivered' && existingBooking.status !== 'delivered' && user && user.email) {
        console.log('Sending delivery completed email to:', user.email);
        await sendDeliveryCompletedEmail(user.email, {
          id: booking.id,
          service: booking.service,
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus || 'pending'
        });
      } else if (status === 'delivered') {
        console.log('Delivery email conditions:', {
          newStatus: status,
          oldStatus: existingBooking.status,
          hasUser: !!user,
          hasEmail: !!user?.email
        });
      }
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
      // Don't fail the status update if email fails
    }
    
    return res.json(booking);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Add feedback for a booking (requires auth)
router.post('/:id/feedback', auth, async (req, res) => {
  try {
    const { rating, message } = req.body || {};

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await Booking.findOne({ id: req.params.id, userId: req.user.id });
    if (!booking) {
      return res.status(404).json({ message: 'Order not found' });
    }

    booking.feedbackRating = rating;
    booking.feedbackMessage = typeof message === 'string' ? message : '';
    await booking.save();

    return res.json(booking);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to save feedback' });
  }
});

module.exports = router;
