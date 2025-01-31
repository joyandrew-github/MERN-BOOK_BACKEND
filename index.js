// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// require('dotenv').config();

// const app = express();

// // Middleware
// app.use(cors({
//     origin: 'https://mern-book-frontend-zvy91ilte-joyandrew-githubs-projects.vercel.app', 
//     credentials: true
// }));
// app.use(express.json());

// // Routes
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/', require('./routes/bookRoutes'));
// app.use('/', require('./routes/paymentRoutes'));



// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({
//     success: false,
//     message: 'Something went wrong!',
//     error: process.env.NODE_ENV === 'development' ? err.message : undefined
//   });
// });

// const PORT = process.env.PORT || 5000;

// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => {
//     console.log('Connected to MongoDB');
//     app.listen(PORT, () => {
//       console.log(`Server is running on port ${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error('MongoDB connection error:', err);
// });



const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();


// const allowedOrigins = [
//   'https://mern-book-frontend-zvy91ilte-joyandrew-githubs-projects.vercel.app/', // Your deployed frontend URL
//   'http://localhost:5173', // Your local frontend URL for development
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     // Check if the origin is in the allowedOrigins array
//     if (allowedOrigins.includes(origin) || !origin) {
//       callback(null, true); // Allow the request
//     } else {
//       callback(new Error('Not allowed by CORS')); // Deny the request
//     }
//   },
//   credentials: true
// }));


app.use(cors({
  origin: ['https://your-frontend-vercel-url.vercel.app'],
  credentials: true
})); 
// Middleware - JSON body parser
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/', require('./routes/bookRoutes'));
app.use('/', require('./routes/paymentRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database Connection and Server Start
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
