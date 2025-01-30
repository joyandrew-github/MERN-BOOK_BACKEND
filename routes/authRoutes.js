const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// // Add verification for transporter
// const verifyTransporter = async () => {
//   try {
//     await transporter.verify();
//     console.log('SMTP connection established successfully');
//   } catch (error) {
//     console.error('SMTP connection error:', error);
//     throw new Error('Failed to establish SMTP connection');
//   }
// };

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"BookHive" <${process.env.EMAIL_USER}>`, // Update the from field
      to: email,
      subject: 'Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Welcome to BookHive!</h2>
          <p>Your email verification OTP is:</p>
          <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(otp);
    console.log('Email sent: %s', info.messageId);
    
  } catch (error) {
    console.error('Email sending error:', error);
    // For development, still log the OTP
    console.log('Development OTP:', otp);
    throw new Error('Failed to send verification email');
  }
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate OTP first
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Create user first
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      isVerified: false
    });

    // Then try to send email and save OTP
    try {
      await sendOTPEmail(email, otp);
      
      await OTP.create({
        email,
        otp: hashedOTP
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email for OTP verification.',
        userId: user._id,
        email: email // Add email to response for OTP verification
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Even if email fails, return success but with different message
      res.status(201).json({
        success: true,
        message: 'Registration successful! Your OTP is: ' + otp, // In development, send OTP in response
        userId: user._id,
        email: email
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find the latest OTP for this email
    const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Update user verification status
    await User.findOneAndUpdate({ email }, { isVerified: true });

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
});

// Resend OTP endpoint
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Generate new OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Save new OTP
    await OTP.create({
      email,
      otp: hashedOTP
    });

    // Send new OTP email
    await sendOTPEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'New OTP sent successfully!'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP'
    });
  }
});

// Add login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in',
        needsVerification: true,
        email: email
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send response without password
    const userWithoutPassword = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add this route for creating an admin (you may want to remove this in production)
router.post('/create-admin', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if admin already exists
        const adminExists = await User.findOne({ email, role: 'admin' });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const admin = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin',
            isVerified: true
        });

        await admin.save();
        res.status(201).json({ message: 'Admin created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 