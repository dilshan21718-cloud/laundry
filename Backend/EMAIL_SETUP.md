# Email Configuration Setup Guide

This guide will help you set up email notifications for booking confirmations.

## Prerequisites

1. A Gmail account (or any other email service)
2. Node.js installed

## Setup Steps

### 1. Install Dependencies

Run the following command in the Backend directory:

```bash
npm install
```

This will install `nodemailer` along with other dependencies.

### 2. Configure Gmail App Password

Since Gmail requires app-specific passwords for third-party apps:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security**
3. Enable **2-Step Verification** if not already enabled
4. Go to **App passwords**: https://myaccount.google.com/apppasswords
5. Select **Mail** and your device
6. Click **Generate**
7. Copy the 16-character password

### 3. Create .env File

Create a `.env` file in the Backend directory (copy from `.env.example`):

```bash
cp .env.example .env
```

### 4. Update .env File

Open the `.env` file and add your email credentials:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

Replace:
- `your-email@gmail.com` with your actual Gmail address
- `your-16-character-app-password` with the app password you generated

### 5. Test the Email Feature

1. Start the backend server:
   ```bash
   npm start
   ```

2. Create a booking through the frontend
3. Check the registered user's email inbox for the confirmation email

## Email Features

When a user successfully books a service, they receive an email with:

- ✅ Booking confirmation
- 📋 Booking ID
- 🧺 Service details
- 💰 Total amount
- ⏰ Pickup and delivery times
- 💳 Payment status
- 📱 Tracking information

## Troubleshooting

### Email not sending?

1. **Check credentials**: Ensure EMAIL_USER and EMAIL_PASS are correct in .env
2. **App password**: Make sure you're using the app password, not your regular Gmail password
3. **2FA enabled**: Gmail requires 2-factor authentication to generate app passwords
4. **Check console**: Look for error messages in the backend console
5. **Firewall**: Ensure your firewall allows SMTP connections

### Using Other Email Services

If you prefer to use another email service (Outlook, Yahoo, etc.), update the emailService.js:

```javascript
const transporter = nodemailer.createTransporter({
  service: 'outlook', // or 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

## Security Notes

- ⚠️ **Never commit .env file to Git**
- ⚠️ Keep your app password secure
- ⚠️ Regenerate app passwords if compromised
- ✅ .env is already in .gitignore

## Support

For issues with email setup, please check:
- Gmail App Password documentation
- Nodemailer documentation: https://nodemailer.com/
