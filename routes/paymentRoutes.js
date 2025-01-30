const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay with the correct keys
const razorpay = new Razorpay({
  key_id: 'rzp_test_KJEDkOerVm97es',
  key_secret: 'OrotecMCOl7Nskq4ARbiF1bi'
});

// Create order
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Amount must be at least 100 paise (₹1)'
      });
    }

    const options = {
      amount: parseInt(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      payment_capture: 1,
      notes: {
        type: 'book_purchase'
      }
    };

    const order = await razorpay.orders.create(options);

    if (!order || !order.id) {
      throw new Error('Failed to create Razorpay order');
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Order creation failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
});

// Verify payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId, paymentId, signature, bookId, amount } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Create the signature verification string
    const body = orderId + "|" + paymentId;
    
    // Use the actual secret key for verification
    const expectedSignature = crypto
      .createHmac('sha256', 'OrotecMCOl7Nskq4ARbiF1bi')
      .update(body.toString())
      .digest('hex');

    // Verify signature
    const isAuthentic = expectedSignature === signature;

    if (isAuthentic) {
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      res.json({
        success: true,
        message: 'Payment verified successfully',
        transactionId,
        orderId,
        paymentId
      });
    } else {
      console.log('Signature mismatch:', {
        expected: expectedSignature,
        received: signature
      });
      
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

module.exports = router; 



// const express = require('express');
// const router = express.Router();
// const Razorpay = require('razorpay');
// const crypto = require('crypto');
// const mongoose = require('mongoose');
// require('dotenv').config();

// // Initialize Razorpay with environment variables
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_SECRET
// });

// // Define Payment Schema (MongoDB)
// const PaymentSchema = new mongoose.Schema({
//   order_id: String,
//   payment_id: String,
//   amount: Number,
//   status: String,
//   bookId: String,
//   transactionId: String,
//   createdAt: { type: Date, default: Date.now }
// });

// const Payment = mongoose.model('Payment', PaymentSchema);

// // Create order
// router.post('/create-order', async (req, res) => {
//   try {
//     const { amount } = req.body;

//     if (!amount || isNaN(amount) || amount < 100) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid amount. Amount must be at least 100 paise (₹1)'
//       });
//     }

//     const options = {
//       amount: parseInt(amount * 100), // Convert to paise
//       currency: 'INR',
//       receipt: `order_${Date.now()}`,
//       payment_capture: 1,
//       notes: {
//         type: 'book_purchase'
//       }
//     };

//     const order = await razorpay.orders.create(options);

//     if (!order || !order.id) {
//       throw new Error('Failed to create Razorpay order');
//     }

//     res.json({
//       success: true,
//       order
//     });
//   } catch (error) {
//     console.error('Order creation failed:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to create order'
//     });
//   }
// });

// // Verify payment and store in DB
// router.post('/verify-payment', async (req, res) => {
//   try {
//     const { orderId, paymentId, signature, bookId, amount } = req.body;

//     if (!orderId || !paymentId || !signature) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required parameters'
//       });
//     }

//     // Create the signature verification string
//     const body = orderId + "|" + paymentId;
    
//     // Use the actual secret key for verification
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_SECRET)
//       .update(body.toString())
//       .digest('hex');

//     // Verify signature
//     const isAuthentic = expectedSignature === signature;

//     if (isAuthentic) {
//       const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//       // Save payment details in MongoDB
//       const paymentRecord = new Payment({
//         order_id: orderId,
//         payment_id: paymentId,
//         amount: amount,
//         status: 'Paid',
//         bookId: bookId,
//         transactionId: transactionId
//       });

//       await paymentRecord.save();

//       res.json({
//         success: true,
//         message: 'Payment verified successfully',
//         transactionId,
//         orderId,
//         paymentId
//       });
//     } else {
//       console.log('Signature mismatch:', {
//         expected: expectedSignature,
//         received: signature
//       });
      
//       res.status(400).json({
//         success: false,
//         message: 'Invalid payment signature'
//       });
//     }
//   } catch (error) {
//     console.error('Payment verification error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Payment verification failed',
//       error: error.message
//     });
//   }
// });

// module.exports = router;
