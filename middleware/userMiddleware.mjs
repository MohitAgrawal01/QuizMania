import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export default function checkUserLogin(req, res, next) {
  // Retrieve the JWT cookie from the request
  const jwtCookie = req.cookies.jwt;

  // Check if the JWT cookie exists
  if (!jwtCookie) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(jwtCookie, process.env.JWT_SECRET); // Replace 'your-secret-key' with your actual secret key

    // You can now access the user's information from the decoded token
    req.user = decoded;
    next();
  } catch (err) {
    // If the JWT verification fails, return an unauthorized response
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
