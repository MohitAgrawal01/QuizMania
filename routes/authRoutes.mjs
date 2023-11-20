// authRoutes.mjs
import express from 'express';
const router = express.Router();
import User from '../models/userModel.mjs';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'; // Import bcrypt
import cookieParser from 'cookie-parser';
import sendotp from '../smtp.mjs';
import checkUserLogin from '../middleware/userMiddleware.mjs';
import useragent from 'express-useragent';
import requestIp from 'request-ip';
import LoginAttempt from '../models/logs.mjs';
dotenv.config();

router.use(useragent.express());

router.get("/sendotp/:email", (req, res) => {
    const code = Math.floor(100000 + Math.random() * 900000);
  
    sendotp(req.params.email, code)
      .then(success => {
        // Store code and email in session for verification
        req.session.authCode = code;
        req.session.authemail = req.params.email;
  
        // Send success response as JSON
        res.json({ success: true, message: "OTP sent successfully" });
      })
      .catch(error => {
        // Send error response as JSON
        res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
      });
  });


router.post('/signup', async (req, res) => {
    const { username, password, email, otp } = req.body;

    if (!validateInput(username) || !validateInput(password) || !validateInput(email) || !validateInput(otp)) {
        return res.status(400).json({ success: false, message: 'Please provide valid input for all fields' });
    }

    try {
        if(email==req.session.authemail && otp == req.session.authCode);
        else{
           return res.status(500).json({ success: false, message: 'Invalid OTP' });
        }
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email already exists' });
        } else {
            const saltRounds = 10; 

            bcrypt.hash(password, saltRounds, async (err, hashedPassword) => {
                if (err) {
                  //  console.error(err);
                    res.status(500).json({ success: false, message: 'Signup failed' });
                } else {
                    const user = await User.create({ username, password: hashedPassword, email });
                    res.json({ success: true, message: 'Signup successful', user });
                }
            });
        }
    } catch (error) {
       // console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    const userIp = requestIp.getClientIp(req);
    const userAgent = req.useragent.source;
  
    if (!validateInput(email) || !validateInput(password)) {
      return res.status(400).json({ success: false, message: 'Please provide valid email and password' });
    }
  
    try {
      const user = await User.findOne({ email });
  
      if (user) {
        bcrypt.compare(password, user.password, async (err, passwordMatch) => {
          if (err || !passwordMatch) {
            logLoginAttempt(email, userIp, userAgent, false);
            res.status(401).json({ success: false, message: 'Login failed' });
          } else {
            // Update lastLoggedIn with the current time
            user.lastLoggedIn = new Date();
            user.lastLoginIp = userIp;
            user.lastLoginUserAgent = userAgent;

            await user.save();
  
            const token = jwt.sign({ email: user.email, username: user.username }, process.env.JWT_SECRET, {
              expiresIn: '7d',
            });
  
            const maxAge = 604800000;
  
            logLoginAttempt(email, userIp, userAgent, true);
            res.setHeader('Set-Cookie', `jwt=${token}; HttpOnly; Max-Age=${maxAge}; Path=/`);
            res.json({ success: true, message: 'Login successful', user });
          }
        });
      } else {
        logLoginAttempt(email, userIp, userAgent, false);
        res.status(401).json({ success: false, message: 'Login failed' });
      }
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ success: false, message: 'An error occurred' });
    }
  });
function logLoginAttempt(email, userIp, userAgent, success) {
    const loginAttempt = new LoginAttempt({
        email,
        userIp,
        userAgent,
        success,
        timestamp: new Date(),
    });

    loginAttempt.save()
        .then(result => console.log('New Login attempt logged'))
        .catch(error => console.error('Error logging login attempt:', error));
}
router.get('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/dashboard');
});

// Route to fetch user email and username from MongoDB based on JWT
router.get('/profile', checkUserLogin, async (req, res) => {
    const jwtCookie = req.cookies.jwt;

    if (!jwtCookie) {
        res.status(400).json('{message:"invalid user"}');
    }
      try {
        const decodedToken = jwt.verify(jwtCookie, process.env.JWT_SECRET);
        const email = decodedToken.email;
    
      // Fetch user email and username from MongoDB
      const user = await User.find({ email }, 'email username');
      if (user) {
       
        res.json({ email: user[0].email, username: user[0].username , authenticated: true});
      } else {
        res.status(404).json({ message: 'User not found',authenticated: false });
      }
    } catch (error) {
     // console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  
router.get('/isSessionAuthenticated', (req, res) => {
    const token = req.cookies.jwt;

    if (!token) {
        return res.json({ authenticated: false });
    }

    jwt.verify(token, process.env.JWT_SECRET
        , (err, decoded) => {
        if (err) {
            // JWT is either expired or invalid
            return res.json({ authenticated: false });
        }

        // JWT is valid, user is authenticated
        res.json({ authenticated: true, username: decoded.username });
    });
});


// Function to validate user input
function validateInput(input) {
    return input && input.trim() !== '';
}

export default router;
