const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

// Send booking confirmation email
const sendBookingConfirmation = async (userEmail, bookingDetails) => {
  try {
    const transporter = createTransporter();
    
    const { id, service, quantity, totalAmount, pickupTime, deliveryTime, estimatedDelivery, paymentStatus } = bookingDetails;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'CleanWave Laundry <noreply@cleanwave.com>',
      to: userEmail,
      subject: '✅ Booking Confirmed - CleanWave Laundry',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .amount { font-size: 24px; font-weight: bold; color: #7c3aed; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-pending { background: #fed7aa; color: #9a3412; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Booking Confirmed!</h1>
              <p>Thank you for choosing CleanWave Laundry</p>
            </div>
            <div class="content">
              <p>Dear Customer,</p>
              <p>Your laundry service has been successfully booked. Here are your booking details:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Booking ID:</span>
                  <span class="detail-value"><strong>${id}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">${service}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Quantity:</span>
                  <span class="detail-value">${quantity}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Pickup Time:</span>
                  <span class="detail-value">${pickupTime || 'To be confirmed'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Delivery Time:</span>
                  <span class="detail-value">${deliveryTime || estimatedDelivery || 'To be confirmed'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment Status:</span>
                  <span class="detail-value">
                    <span class="status-badge ${paymentStatus === 'paid' ? 'status-paid' : 'status-pending'}">
                      ${paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
                    </span>
                  </span>
                </div>
                <div class="detail-row" style="border-bottom: none; margin-top: 20px;">
                  <span class="detail-label">Total Amount:</span>
                  <span class="amount">₹${totalAmount}</span>
                </div>
              </div>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>Our delivery staff will pick up your laundry at the scheduled time</li>
                <li>Your clothes will be processed with care</li>
                <li>We'll deliver them fresh and clean to your doorstep</li>
                ${paymentStatus === 'pending' ? '<li>Payment will be collected upon delivery</li>' : ''}
              </ul>
              
              <p>You can track your order status anytime using your Booking ID: <strong>${id}</strong></p>
              
              <div class="footer">
                <p>Thank you for choosing CleanWave Laundry!</p>
                <p>For any queries, contact us at support@cleanwave.com</p>
                <p style="font-size: 12px; color: #9ca3af;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send welcome email after registration
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'CleanWave Laundry <noreply@cleanwave.com>',
      to: userEmail,
      subject: '🎉 Welcome to CleanWave Laundry!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature-item { padding: 15px 0; border-bottom: 1px solid #e5e7eb; }
            .feature-item:last-child { border-bottom: none; }
            .cta-button { display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to CleanWave!</h1>
              <p>Your laundry, our priority</p>
            </div>
            <div class="content">
              <p>Dear ${userName},</p>
              <p>Thank you for registering with CleanWave Laundry! We're excited to have you on board.</p>
              
              <div class="features">
                <h3 style="color: #7c3aed; margin-top: 0;">What You Can Do:</h3>
                <div class="feature-item">
                  <strong>🧺 Book Services</strong><br>
                  Choose from Wash & Fold, Wash & Iron, Dry Clean, and Eco Wash
                </div>
                <div class="feature-item">
                  <strong>📱 Track Orders</strong><br>
                  Real-time tracking of your laundry orders
                </div>
                <div class="feature-item">
                  <strong>🎁 Earn Loyalty Points</strong><br>
                  Get 1 point for every ₹10 spent and redeem for discounts
                </div>
                <div class="feature-item">
                  <strong>🚪 Doorstep Service</strong><br>
                  Free pickup and delivery at your convenience
                </div>
                <div class="feature-item">
                  <strong>💳 Flexible Payment</strong><br>
                  Pay now or after delivery - your choice!
                </div>
              </div>
              
              <p style="text-align: center;">
                <a href="#" class="cta-button">Start Your First Order</a>
              </p>
              
              <p><strong>Need Help?</strong></p>
              <p>Our support team is always ready to assist you. Contact us at support@cleanwave.com</p>
              
              <div class="footer">
                <p>Thank you for choosing CleanWave Laundry!</p>
                <p>Fresh clothes, happy you! 😊</p>
                <p style="font-size: 12px; color: #9ca3af;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

// Send email when staff is assigned
const sendStaffAssignedEmail = async (userEmail, orderDetails, staffDetails) => {
  try {
    const transporter = createTransporter();
    
    const { id, service } = orderDetails;
    const { name, phone } = staffDetails;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'CleanWave Laundry <noreply@cleanwave.com>',
      to: userEmail,
      subject: '👤 Delivery Staff Assigned - CleanWave Laundry',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .staff-card { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
            .staff-info { display: flex; align-items: center; gap: 20px; }
            .staff-avatar { width: 60px; height: 60px; background: #7c3aed; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; }
            .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👤 Staff Assigned!</h1>
              <p>Your order is being processed</p>
            </div>
            <div class="content">
              <p>Dear Customer,</p>
              <p>Great news! A delivery staff member has been assigned to your order.</p>
              
              <div class="detail-row">
                <strong>Order ID:</strong> ${id}<br>
                <strong>Service:</strong> ${service}
              </div>
              
              <div class="staff-card">
                <h3 style="color: #7c3aed; margin-top: 0;">Your Delivery Staff</h3>
                <div class="staff-info">
                  <div class="staff-avatar">${name.charAt(0).toUpperCase()}</div>
                  <div>
                    <p style="margin: 5px 0;"><strong style="font-size: 18px;">${name}</strong></p>
                    <p style="margin: 5px 0; color: #6b7280;">📞 ${phone}</p>
                  </div>
                </div>
                <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                  Your assigned staff will handle the pickup and delivery of your order. Feel free to contact them if you have any questions.
                </p>
              </div>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>Our staff will contact you for pickup coordination</li>
                <li>Your laundry will be picked up at the scheduled time</li>
                <li>You'll receive updates as your order progresses</li>
                <li>Fresh clothes will be delivered back to you</li>
              </ul>
              
              <div class="footer">
                <p>Thank you for choosing CleanWave Laundry!</p>
                <p>Track your order: <strong>${id}</strong></p>
                <p style="font-size: 12px; color: #9ca3af;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('Staff assignment email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('Error sending staff assignment email:', error);
    return false;
  }
};

// Send email when order is delivered
const sendDeliveryCompletedEmail = async (userEmail, orderDetails) => {
  try {
    const transporter = createTransporter();
    
    const { id, service, totalAmount, paymentStatus } = orderDetails;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'CleanWave Laundry <noreply@cleanwave.com>',
      to: userEmail,
      subject: '✅ Order Delivered - CleanWave Laundry',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-icon { font-size: 60px; margin-bottom: 10px; }
            .order-summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .rating-section { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .stars { font-size: 30px; color: #f59e0b; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1>Order Delivered!</h1>
              <p>Your fresh laundry has arrived</p>
            </div>
            <div class="content">
              <p>Dear Customer,</p>
              <p>Your order has been successfully delivered! We hope you're satisfied with our service.</p>
              
              <div class="order-summary">
                <h3 style="color: #16a34a; margin-top: 0;">Order Summary</h3>
                <div class="detail-row">
                  <span><strong>Order ID:</strong></span>
                  <span>${id}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Service:</strong></span>
                  <span>${service}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Amount:</strong></span>
                  <span style="font-size: 18px; font-weight: bold; color: #7c3aed;">₹${totalAmount}</span>
                </div>
                <div class="detail-row" style="border-bottom: none;">
                  <span><strong>Payment Status:</strong></span>
                  <span style="color: ${paymentStatus === 'paid' ? '#16a34a' : '#f59e0b'}; font-weight: bold;">
                    ${paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
                  </span>
                </div>
                ${paymentStatus === 'pending' ? '<p style="margin-top: 15px; color: #f59e0b; font-size: 14px;">⚠️ Please complete the payment if not done already.</p>' : ''}
              </div>
              
              <div class="rating-section">
                <h3 style="margin-top: 0; color: #92400e;">How was your experience?</h3>
                <div class="stars">⭐⭐⭐⭐⭐</div>
                <p style="margin: 15px 0 5px 0; color: #78716c;">We'd love to hear your feedback!</p>
                <p style="margin: 5px 0; font-size: 14px; color: #78716c;">Your rating helps us improve our service</p>
              </div>
              
              <p><strong>🎁 Loyalty Points Earned!</strong></p>
              <p>You've earned loyalty points for this order. Use them on your next booking for discounts!</p>
              
              <p><strong>Thank you for choosing CleanWave!</strong></p>
              <p>We look forward to serving you again. Book your next service anytime! 😊</p>
              
              <div class="footer">
                <p>CleanWave Laundry - Fresh clothes, happy you!</p>
                <p>Need help? Contact us at support@cleanwave.com</p>
                <p style="font-size: 12px; color: #9ca3af;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('Delivery completed email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('Error sending delivery completed email:', error);
    return false;
  }
};

module.exports = {
  sendBookingConfirmation,
  sendWelcomeEmail,
  sendStaffAssignedEmail,
  sendDeliveryCompletedEmail
};
