import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import jwt from "jsonwebtoken";
import authRoutes from './routes/authRoutes.mjs';
import quizRoutes from './routes/quizRoutes.mjs'; 
import session from 'express-session';
const app = express();

dotenv.config();

app.use(session({
  secret: process.env.SESSION_SECRET, // Replace with your actual secret key
  resave: false,
  saveUninitialized: true,
}));

const port = process.env.PORT;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.json()); // For JSON parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.resolve() + '/public'));

import './models/userModel.mjs';

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });


app.use('', authRoutes);
