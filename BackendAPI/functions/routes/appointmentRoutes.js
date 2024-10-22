const express = require('express');
const {
    bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  approveAppointment,
  getPatientNotifications,
  getStaffNotifications,
  getConfirmedAppointmentsForPatient,
  getAllAppointmentsForPatient,
  getAllAppointments,
  getConfirmedAppointments,
} = require('../controller/appointmentController'); // Ensure these are correctly imported
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Middleware to protect routes

// Route to book an appointment
router.post('/book', protect, bookAppointment); 

// Route to reschedule an appointment
router.put('/:appointmentId', protect, rescheduleAppointment);

// Route to cancel an appointment
router.delete('/:appointmentId', protect, cancelAppointment);

// Route to approve/confirm an appointment
router.put('/:appointmentId/approve', protect, approveAppointment);

// Route for patient notifications
router.get('/notifications/patient', protect, getPatientNotifications); 

// Route for staff notifications
router.get('/notifications/staff', protect, getStaffNotifications); 

// Route to get all confirmed appointments for logged-in patient
router.get('/myappointments/confirmed', protect, getConfirmedAppointmentsForPatient);

// Route to get all confirmed appointments
router.get('/myappointments/allconfirmed', protect, getConfirmedAppointments);

// Route to get all appointments for logged-in patient
router.get('/myappointments', protect, getAllAppointmentsForPatient);

// Route to get all appointments for all patients (any status)
router.get('/allappointments', protect, getAllAppointments);

module.exports = router; 
