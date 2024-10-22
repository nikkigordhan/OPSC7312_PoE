const express = require('express');
const cors = require('cors');
const functions = require('firebase-functions');
require('dotenv').config(); // Load environment variables from .env file

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
}));
app.use(express.json());
// Access the JWT secret from .env file
const jwtSecret = process.env.JWT_SECRET || 'default_secret'; // Fallback to a default secret if not set

// Register your routes
const authRoutes = require('./routes/authRoutes.js');
const appointmentRoutes = require('./routes/appointmentRoutes.js');

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error("Error encountered:", err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Firebase function export
exports.api = functions.https.onRequest(app);
