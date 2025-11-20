const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/emailService');
const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { username, email, phone, password, userType, address } = req.body;
  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const type = ['user','admin','staff'].includes(userType) ? userType : 'user';
    if (type === 'user' && (!address || !address.trim())) {
      return res.status(400).json({ message: 'Address is required for user accounts' });
    }
    user = new User({
      username,
      email,
      phone,
      password: hashedPassword,
      userType: type,
      ...(type === 'user' && address ? { address } : {}),
    });
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
    const type = userType || 'user';

    // Delivery Staff login: authenticate against Staff collection only
    if (type === 'staff') {
      const query = identifier
        ? { $or: [{ email: identifier }, { phone: identifier }, { name: identifier }] }
        : email
          ? { email }
          : username
            ? { name: username }
            : null;
      if (!query) return res.status(400).json({ message: 'Identifier (email, phone or name) is required' });

      const staff = await Staff.findOne(query);
      if (!staff || !staff.password) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, staff.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ id: staff._id, userType: 'staff' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
      return res.json({
        token,
        user: {
          id: staff._id,
          username: staff.name,
          email: staff.email,
          phone: staff.phone,
          userType: 'staff',
        },
      });
    }

    // User/Admin login: use User collection
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
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        address: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Current user
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.userType === 'staff') {
      const staff = await Staff.findById(req.user.id).select('-password');
      if (!staff) return res.status(404).json({ message: 'User not found' });
      return res.json({
        _id: staff._id,
        username: staff.name,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        userType: 'staff',
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { username, email, phone, address } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (typeof username === 'string') {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        return res.status(400).json({ message: 'Username cannot be empty' });
      }
      const existingUsername = await User.findOne({ username: trimmedUsername, _id: { $ne: user._id } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already in use' });
      }
      user.username = trimmedUsername;
    }

    if (typeof email === 'string') {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        return res.status(400).json({ message: 'Email cannot be empty' });
      }
      const existingEmail = await User.findOne({ email: trimmedEmail, _id: { $ne: user._id } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = trimmedEmail;
    }

    if (typeof phone === 'string') {
      user.phone = phone;
    }
    if (typeof address === 'string') {
      const trimmed = address.trim();
      if (user.userType === 'user' && !trimmed) {
        return res.status(400).json({ message: 'Address is required for user accounts' });
      }
      user.address = trimmed;
    }

    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
