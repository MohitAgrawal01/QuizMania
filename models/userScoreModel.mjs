// userScoreModel.js
import mongoose from "mongoose";
const userScoreSchema = new mongoose.Schema({
  quizId: String,
  userId: String,
  score: Number,
});

export default mongoose.model('UserScore', userScoreSchema);