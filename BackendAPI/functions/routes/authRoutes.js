const express = require('express');
const {
  register,
  login,
  forgetPassword,
} = require('../controller/authController.js');
const router = express.Router();

// Route to register a new user (patient or staff)
router.post('/register', register);

// Route to log in an existing user
router.post('/login', login);

// Route for password reset functionality
router.post('/forget-password', forgetPassword);


module.exports = router;
