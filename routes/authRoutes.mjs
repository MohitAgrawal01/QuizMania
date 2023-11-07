// authRoutes.mjs
import express from 'express';
const router = express.Router();
import User from '../models/userModel.mjs';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'; // Import bcrypt
dotenv.config();


// Function to validate user input
function validateInput(input) {
    return input && input.trim() !== '';
}

router.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;

    if (!validateInput(username) || !validateInput(password) || !validateInput(email)) {
        return res.status(400).json({ success: false, message: 'Please provide valid input for all fields' });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email already exists' });
        } else {
            const saltRounds = 10; 

            bcrypt.hash(password, saltRounds, async (err, hashedPassword) => {
                if (err) {
                    console.error(err);
                    res.status(500).json({ success: false, message: 'Signup failed' });
                } else {
                    const user = await User.create({ username, password: hashedPassword, email });
                    res.json({ success: true, message: 'Signup successful', user });
                }
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!validateInput(email) || !validateInput(password)) {
        return res.status(400).json({ success: false, message: 'Please provide valid email and password' });
    }

    try {
        const user = await User.findOne({ email });

        if (user) {
            bcrypt.compare(password, user.password, (err, passwordMatch) => {
                if (err || !passwordMatch) {
                    res.status(401).json({ success: false, message: 'Login failed' });
                } else {
                    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
                        expiresIn: '7d',
                    });

                    const maxAge = 604800000;

                    res.setHeader('Set-Cookie', `jwt=${token}; HttpOnly; Max-Age=${maxAge}; Path=/`);

                    res.json({ success: true, message: 'Login successful', user });
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Login failed' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/login');
});

export default router;
