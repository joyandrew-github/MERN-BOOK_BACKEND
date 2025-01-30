const express = require('express');
const router = express.Router();
const Book = require('../models/Book');

// Get all books
router.get('/all-books', async (req, res) => {
  try {
    const books = await Book.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      books
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching books',
      error: error.message
    });
  }
});

module.exports = router; 