const nodemailer = require('nodemailer');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL,
    pass: process.env.PASSWORD
  }
});

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Log the received data
    console.log('Signup attempt:', { name, email });

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otp);
    
    // Store OTP with email (expires in 10 minutes)
    otpStore.set(email, {
      otp,
      name,
      password,
      timestamp: Date.now()
    });

    // Send OTP email
    const mailOptions = {
      from: process.env.GMAIL,
      to: email,
      subject: 'Email Verification OTP',
      html: `
      <h1>Welcome To BookHive</h1>
        <h1>Email Verification</h1>
        <p>Your OTP for email verification is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully to:', email);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: 'OTP expired or invalid' });
    }

    // Check if OTP is expired (10 minutes)
    if (Date.now() - storedData.timestamp > 600000) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(storedData.password, 10);

    // Create new user
    const newUser = new User({
      name: storedData.name,
      email,
      password: hashedPassword,
      isVerified: true
    });

    await newUser.save();
    otpStore.delete(email);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}; 