const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // track code
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    service: { type: String, required: true },
    quantity: { type: String, required: true }, // e.g., "3 kg" or "5 pcs"
    pricingType: { type: String, enum: ['kg', 'pcs'], default: 'kg' },
    status: {
      type: String,
      enum: ['accepted', 'picked', 'washing', 'ready', 'delivery', 'delivered'],
      default: 'accepted',
    },
    estimatedDelivery: { type: String },
    pickupTime: { type: String },
    deliveryTime: { type: String },
    pickupAddress: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    items: [
      {
        name: { type: String }, // e.g., shirt, pants
        quantity: { type: Number, default: 0 },
        unitPrice: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    instructions: { type: String, default: '' },
    donationPickup: { type: Boolean, default: false },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    assignedStaff: {
      name: { type: String, default: 'Laundry Staff' },
      phone: { type: String, default: '' },
      vehicle: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', BookingSchema);
