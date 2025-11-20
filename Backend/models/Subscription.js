const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, unique: true },
  kind: { type: String, enum: ['weekly_pickup', 'daily_pickup'], required: true },
  dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0=Sun
  startDate: { type: Date, required: true },
  monthKey: { type: String, required: true }, // e.g., 2025-09
  createdBookingId: { type: String }, // booking id created for this month
  notes: { type: String },
  pickupAddress: { type: String },
  pickupTime: { type: String },
  runs: [{ type: Date }], // all planned pickup dates for the month
  nextRun: { type: Date },
  runStates: [{
    date: { type: Date, required: true },
    status: { type: String, enum: ['scheduled','completed','skipped'], default: 'scheduled' }
  }],
}, { timestamps: true, indexes: [{ userId: 1, kind: 1, monthKey: 1, unique: true }] });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
