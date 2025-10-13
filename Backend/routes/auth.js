const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/emailService');
const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { username, email, phone, password, userType } = req.body;
  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const type = ['user','admin','staff'].includes(userType) ? userType : 'user';
    user = new User({ username, email, phone, password: hashedPassword, userType: type });
    await user.save();
    
    // Send welcome email
    try {
      if (email) {
        console.log('Attempting to send welcome email to:', email);
        await sendWelcomeEmail(email, username);
      } else {
        console.log('No email provided for user registration');
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { identifier, email, username, password, userType } = req.body;
  try {
    const query = identifier
      ? { $or: [{ email: identifier }, { username: identifier }] }
      : email
        ? { email }
        : username
          ? { username }
          : null;
    if (!query) return res.status(400).json({ message: 'Identifier (email or username) is required' });
    const user = await User.findOne(query);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (userType && user.userType !== userType) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, userType: user.userType }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, phone: user.phone, userType: user.userType } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
