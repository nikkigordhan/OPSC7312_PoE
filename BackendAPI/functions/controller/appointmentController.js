const admin = require('../config/db.js'); 

// Book an appointment
const bookAppointment = async (req, res) => {
    const { date, dentist, dentistId, description, slot } = req.body;
    const userId = req.user.id; // Get userId from the authenticated user

    try {
        // Generate a new appointment ID
        const appointmentId = admin.database().ref('appointments').push().key; 
        
        const appointment = {
            appointmentId,      // Generated ID for appointment
            date,               // Date of appointment
            dentist,           // Dentist's name
            dentistId,         // Dentist's ID
            description,       // Description of appointment
            slot,              // Time slot for appointment
            userId,            // User ID of the patient from token
            status: 'pending',  // Initial status
            createdAt: admin.database.ServerValue.TIMESTAMP, // Add timestamp
        };

        // Set the appointment data in the database
        await admin.database().ref(`appointments/${appointmentId}`).set(appointment);
        
        // Respond with a success message and appointment ID
        res.status(201).json({
            message: 'Appointment booked successfully',
            appointmentId, // Return the appointment ID
        });
    } catch (error) {
        console.error("Error booking appointment:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reschedule an appointment
const rescheduleAppointment = async (req, res) => {
    const appointmentId = req.params.appointmentId.trim();
    const { date, description, slot} = req.body;

    try {
        const appointmentRef = admin.database().ref(`appointments/${appointmentId}`);
        const appointmentSnapshot = await appointmentRef.once('value');

        if (!appointmentSnapshot.exists()) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const appointment = appointmentSnapshot.val();

        // Check if the logged-in user is allowed to reschedule this appointment
        if (appointment.userId !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to reschedule this appointment' });
        }

        // Update the appointment details and mark it as rescheduled
        await appointmentRef.update({
            date: date || appointment.date,
            slot: slot || appointment.slot,
            description: description || appointment.description,
            status: 'rescheduled', // Change status to rescheduled
            updatedAt: admin.database.ServerValue.TIMESTAMP, // Add timestamp
        });

        res.status(200).json({
            message: 'Appointment rescheduled successfully',
            appointmentId,
        });
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Cancel an appointment
const cancelAppointment = async (req, res) => {
    const appointmentId = req.params.appointmentId.trim();

    try {
        const appointmentRef = admin.database().ref(`appointments/${appointmentId}`);
        const appointmentSnapshot = await appointmentRef.once('value');

        if (!appointmentSnapshot.exists()) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const appointment = appointmentSnapshot.val();

        // Check if the logged-in user is the patient or a staff member
        if (appointment.userId !== req.user.id && req.user.role !== 'staff') {
            return res.status(403).json({ message: 'You do not have permission to cancel this appointment' });
        }

        // Mark the appointment as canceled instead of deleting it
        await appointmentRef.update({
            status: 'canceled',
            updatedAt: admin.database.ServerValue.TIMESTAMP, // Add timestamp
        });

        res.status(200).json({ message: 'Appointment canceled successfully' });
    } catch (error) {
        console.error('Error canceling appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Approve an appointment
const approveAppointment = async (req, res) => {
    const appointmentId = req.params.appointmentId.trim();

    try {
        const appointmentRef = admin.database().ref(`appointments/${appointmentId}`);
        const appointmentSnapshot = await appointmentRef.once('value');

        if (!appointmentSnapshot.exists()) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const appointment = appointmentSnapshot.val();

        // Check if the appointment is already approved
        if (appointment.status === 'approved') {
            return res.status(400).json({ message: 'This appointment is already confirmed' });
        }

        // Check if the appointment is canceled
        if (appointment.status === 'canceled') {
            return res.status(400).json({ message: 'This appointment has been canceled and cannot be approved' });
        }

        // Verify if the logged-in user is a staff member
        if (req.user.role !== 'staff') {
            return res.status(403).json({ message: 'You do not have permission to approve this appointment' });
        }

        // Update the appointment status to 'approved'
        await appointmentRef.update({
            status: 'approved',
            updatedAt: admin.database.ServerValue.TIMESTAMP, // Add timestamp
        });

        res.status(200).json({
            message: 'Appointment approved successfully',
            appointmentId,
        });
    } catch (error) {
        console.error('Error approving appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get patient notifications
const getPatientNotifications = async (req, res) => {
    try {
        const now = Date.now();
        const oneDayLater = now + 24 * 60 * 60 * 1000; // 24 hours later

        const notifications = [];

        // Fetch all appointments for the logged-in patient within the next 24 hours
        const upcomingAppointmentsSnapshot = await admin.database().ref('appointments')
            .orderByChild('userId')
            .equalTo(req.user.id)
            .once('value');

        upcomingAppointmentsSnapshot.forEach(doc => {
            const appointment = doc.val();
            if (appointment.date >= now && appointment.date < oneDayLater && appointment.status === 'approved') {
                notifications.push({
                    appointmentId: doc.key,
                    message: `Reminder: You have a confirmed appointment tomorrow at ${appointment.time}.`,
                    date: appointment.date,
                    time: appointment.time,
                    description: appointment.description,
                    status: appointment.status
                });
            }
        });

        // Fetch all appointments with status changes (rescheduled, canceled, approved)
        const statusChangedAppointmentsSnapshot = await admin.database().ref('appointments')
            .orderByChild('userId')
            .equalTo(req.user.id)
            .once('value');

        statusChangedAppointmentsSnapshot.forEach(doc => {
            const appointment = doc.val();
            if (['rescheduled', 'canceled', 'approved'].includes(appointment.status)) {
                let message;

                if (appointment.status === 'rescheduled') {
                    message = `Your appointment has been rescheduled.`;
                } else if (appointment.status === 'canceled') {
                    message = `Your appointment has been canceled.`;
                } else if (appointment.status === 'approved') {
                    message = `Your appointment has been confirmed.`;
                }

                notifications.push({
                    appointmentId: doc.key,
                    message,
                    date: appointment.date,
                    time: appointment.time,
                    description: appointment.description,
                    status: appointment.status
                });
            }
        });

        const notificationCount = notifications.length;

        if (notificationCount === 0) {
            return res.status(404).json({ message: 'No notifications found for this patient' });
        }

        res.status(200).json({ count: notificationCount, notifications });
    } catch (error) {
        console.error('Error fetching patient notifications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get staff notifications
const getStaffNotifications = async (req, res) => {
    try {
        const now = Date.now();
        const oneDayLater = now + 24 * 60 * 60 * 1000; // 24 hours later

        const notifications = [];

        // Fetch all upcoming appointments within the next 24 hours with confirmed status
        const upcomingAppointmentsSnapshot = await admin.database().ref('appointments')
            .orderByChild('status')
            .equalTo('approved') // Change to 'confirmed' if needed
            .once('value');

        upcomingAppointmentsSnapshot.forEach(doc => {
            const appointment = doc.val();
            if (appointment.date >= now && appointment.date < oneDayLater) {
                notifications.push({
                    appointmentId: doc.key,
                    patientId: appointment.userId,
                    message: `Reminder: ${appointment.userId} has a confirmed appointment tomorrow at ${appointment.time}.`,
                    date: appointment.date,
                    time: appointment.time,
                    description: appointment.description,
                    status: appointment.status
                });
            }
        });

        // Fetch appointments with status changes (pending, rescheduled, canceled)
        const statusChangedAppointmentsSnapshot = await admin.database().ref('appointments')
            .orderByChild('status')
            .once('value');

        statusChangedAppointmentsSnapshot.forEach(doc => {
            const appointment = doc.val();
            if (['pending', 'rescheduled', 'canceled'].includes(appointment.status)) {
                let message;

                if (appointment.status === 'pending') {
                    message = `New appointment for ${appointment.userId} is pending confirmation.`;
                } else if (appointment.status === 'rescheduled') {
                    message = `An appointment has been rescheduled.`;
                } else if (appointment.status === 'canceled') {
                    message = `An appointment has been canceled.`;
                }

                notifications.push({
                    appointmentId: doc.key,
                    message,
                    date: appointment.date,
                    time: appointment.time,
                    description: appointment.description,
                    status: appointment.status
                });
            }
        });

        const notificationCount = notifications.length;

        if (notificationCount === 0) {
            return res.status(404).json({ message: 'No notifications found for this staff member' });
        }

        res.status(200).json({ count: notificationCount, notifications });
    } catch (error) {
        console.error('Error fetching staff notifications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get confirmed appointments for the logged-in patient
const getConfirmedAppointmentsForPatient = async (req, res) => {
    try {
        const appointmentsRef = admin.database().ref('appointments'); // Reference to the appointments node
        const appointmentsSnapshot = await appointmentsRef
            .orderByChild('userId') // Query by the user's ID
            .equalTo(req.user.id) // Logged-in patient's ID
            .once('value'); // Get the value

        const appointments = [];
        appointmentsSnapshot.forEach(doc => {
            const appointment = doc.val();
            if (['pending', 'approved'].includes(appointment.status)) { // Only pending and approved appointments
                appointments.push({
                    id: doc.key, // Firebase key as the ID
                    ...appointment
                });
            }
        });

        if (!appointments.length) {
            return res.status(404).json({ message: 'No confirmed appointments found for this patient' });
        }

        res.status(200).json(appointments); // Send the response including the appointment ID
    } catch (error) {
        console.error('Error fetching confirmed appointments for patient:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all appointments for the logged-in patient
const getAllAppointmentsForPatient = async (req, res) => {
    try {
        const appointmentsRef = admin.database().ref('appointments'); // Reference to the appointments node
        const appointmentsSnapshot = await appointmentsRef
            .orderByChild('userId') // Query by the user's ID
            .equalTo(req.user.id) // Logged-in patient's ID
            .once('value'); // Get the value

        const appointments = [];
        appointmentsSnapshot.forEach(doc => {
            appointments.push({
                id: doc.key, // Firebase key as the ID
                ...doc.val()
            });
        });

        if (!appointments.length) {
            return res.status(404).json({ message: 'No appointments found for this patient' });
        }

        res.status(200).json(appointments); // Send the response including the appointment ID
    } catch (error) {
        console.error('Error fetching all appointments for patient:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// View all appointments for all patients regardless of status
const getAllAppointments = async (req, res) => {
    try {
        const appointmentsRef = admin.database().ref('appointments'); // Reference to the appointments node
        const appointmentsSnapshot = await appointmentsRef.once('value'); // Get all appointments

        const appointments = [];
        appointmentsSnapshot.forEach(doc => {
            appointments.push({
                id: doc.key, // Firebase key as the ID
                ...doc.val()
            });
        });

        if (!appointments.length) {
            return res.status(404).json({ message: 'No appointments found' });
        }

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error fetching all appointments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get confirmed appointments
const getConfirmedAppointments = async (req, res) => {
    try {
        const appointmentsRef = admin.database().ref('appointments'); // Reference to the appointments node
        const appointmentsSnapshot = await appointmentsRef
            .orderByChild('status') // Query by status
            .equalTo('approved') // Only confirmed appointments
            .once('value'); // Get the value

        const appointments = [];
        appointmentsSnapshot.forEach(doc => {
            appointments.push({
                id: doc.key, // Firebase key as the ID
                ...doc.val()
            });
        });

        if (!appointments.length) {
            return res.status(404).json({ message: 'No confirmed appointments found' });
        }

        res.status(200).json(appointments); // Send the response including the appointment ID
    } catch (error) {
        console.error('Error fetching confirmed appointments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
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
};


