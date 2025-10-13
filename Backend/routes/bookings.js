const express = require('express');
const Booking = require('../models/Booking');
const User = require('../models/User');
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
    
    // Get the existing booking
    const existingBooking = await Booking.findOne({ id: req.params.id });
    if (!existingBooking) return res.status(404).json({ message: 'Order not found' });
    
    const booking = await Booking.findOneAndUpdate(
      { id: req.params.id },
      { $set: { ...(status && { status }), ...(paymentStatus && { paymentStatus }), ...(assignedStaff && { assignedStaff }) } },
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

module.exports = router;
