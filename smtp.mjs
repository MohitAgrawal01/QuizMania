import nodemailer from 'nodemailer';
import dotenv from "dotenv";
dotenv.config();

function isValidEmail(email) {
  // Regular expression for basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default function sendotp(userEmail, otpCode) {
  return new Promise((resolve, reject) => {
    // Validate email format
    if (!isValidEmail(userEmail)) {
      reject("Invalid email format");
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    const mailOptions = {
      from: '"Quiz Mania" <' + process.env.EMAIL + '>',
      to: userEmail,
      subject: 'Account Verification - QuizMania',
      html: `
        <!DOCTYPE html>
        <html lang="en">

        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>OTP Verification</title>
        </head>

        <body style="font-family: Arial, sans-serif; background-color: #f8f9fa; text-align: center; padding: 20px;">

          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">

            <h2 style="color: #007bff;">OTP Verification</h2>

            <p style="color: #495057;">Dear User,</p>

            <p style="color: #495057;">Your OTP for verification is: <strong style="color: #007bff;">${otpCode}</strong></p>

            <p style="color: #495057;">This OTP is valid for a limited time. Please do not share it with anyone.</p>

            <p style="color: #495057;">Thank you for using our service!</p>

            <hr style="border: 1px solid #007bff;">

            <p style="color: #868e96; font-size: 12px;">This email is autogenerated. Please do not reply.</p>

          </div>

        </body>

        </html>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
       // console.error(error);
        reject(false);
      } else {
       // console.log('Email sent: ' + info.response);
        resolve(true);
      }
    });
  });
}
