const schedule = require('node-schedule');
const Appointment = require('../models/Appointment');

// This function will run every day at midnight to check upcoming appointments
const sendReminders = () => {
    schedule.scheduleJob('0 0 * * *', async function () {
        try {
            const now = new Date();
            const oneDayLater = new Date(now);
            oneDayLater.setDate(now.getDate() + 1);

            // Find appointments scheduled for the next 24 hours
            const upcomingAppointments = await Appointment.find({
                date: { $gte: now, $lt: oneDayLater }
            }).populate('patient', 'name email');

            upcomingAppointments.forEach(async (appointment) => {
                const message = `Reminder: You have an appointment tomorrow at ${appointment.date}.`;

                console.log(`Sending reminder to ${appointment.patient.name}: ${message}`);
            });
        } catch (error) {
            console.error('Error sending appointment reminders:', error);
        }
    });
};

module.exports = {
    sendReminders,
};
