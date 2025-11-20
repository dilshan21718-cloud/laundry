const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  role: { type: String, default: 'Delivery Staff' },
  password: { type: String },
  status: { type: String, enum: ['active', 'break', 'offline'], default: 'active' },
  ordersToday: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Staff', StaffSchema);
