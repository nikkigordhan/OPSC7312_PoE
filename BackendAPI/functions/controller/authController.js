const admin = require('../config/db.js'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// Reference to the database
const db = admin.database();

// Register a new user
const register = async (req, res) => {
    const { role, name, surname, email, phoneNumber, address, username, password } = req.body;

    try {
        console.log("Register request received:", req.body);

        // Check if the username already exists in the clients collection
        console.log("Checking if username exists in clients collection...");
        const userSnapshot = await db.ref('clients').orderByChild('username').equalTo(username).once('value');

        if (userSnapshot.exists()) {
            console.log("User already exists with username:", username);
            return res.status(400).json({ message: 'Username already taken' });
        } else {
            console.log("Username is available:", username);
        }

        // Hash the password
        console.log("Hashing password for:", username);
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Password hashed successfully.");

   
   // Create new user data object
const userData = {
  role, // User role (client or dentist)
  name,
  surname: role === 'client' ? surname : null, // Set surname to null if role is not client
  email,
  phoneNumber,
  address: role === 'dentist' ? address : null, // Set address to null if role is not dentist
  username,
  password: hashedPassword, // Store the hashed password
};


        // Save user to the database
        console.log("Saving new user to the database...");
        const newUserRef = await db.ref('clients').push(userData); // Use push to generate a unique key
        console.log("User registered successfully:", username);
        res.status(201).json({ message: 'User registered successfully', userId: newUserRef.key });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login user
const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log("Login request received for username:", username);

        // Find user by username
        const userSnapshot = await db.ref('clients').orderByChild('username').equalTo(username).once('value');
        if (!userSnapshot.exists()) {
            console.log("No user found with username:", username);
            return res.status(400).json({ message: 'Invalid username' });
        }

        const userId = Object.keys(userSnapshot.val())[0]; // Get the unique key
        const user = userSnapshot.val()[userId];

        // Check if password matches
        console.log("Checking password for user:", username);
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("Invalid password for username:", username);
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Generate token
        console.log("Generating token for user:", username);
        const token = jwt.sign({ id: userId, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        console.log("Login successful for user:", username);

        // Respond with user data and token
        res.json({
            token,
            userId,
            role: user.role,
            message: `Welcome to the ${user.role} portal!`,
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Forget password
const forgetPassword = async (req, res) => {
    const { username, email, newPassword } = req.body;

    try {
        console.log("Forget password request for username:", username);

        // Find user by username and email
        const userSnapshot = await db.ref('clients').orderByChild('username').equalTo(username).once('value');
        if (!userSnapshot.exists()) {
            console.log("No user found with username:", username);
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = Object.keys(userSnapshot.val())[0]; // Get the unique key
        const user = userSnapshot.val()[userId];

        // Check if the email matches
        if (user.email !== email) {
            console.log("Email does not match for username:", username);
            return res.status(400).json({ message: 'Invalid email' });
        }

        // Hash new password
        console.log("Hashing new password for user:", username);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await db.ref(`clients/${userId}`).update({ password: hashedPassword });

        console.log("Password updated successfully for user:", username);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error("Error during forget password:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Export the functions
module.exports = {
    register,
    login,
    forgetPassword,
};
