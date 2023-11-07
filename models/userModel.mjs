import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: { type: String, unique: true },
  });
  

export default mongoose.model('User', userSchema);
