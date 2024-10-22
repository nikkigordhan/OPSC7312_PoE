const express = require('express');
const cors = require('cors');
const functions = require('firebase-functions');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Access the JWT secret from Firebase config
const jwtSecret = functions.config().jwt.secret;

// Register your routes after Firebase is initialized
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
