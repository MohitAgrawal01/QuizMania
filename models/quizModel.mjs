// quizModel.js
import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  quizId: String,
  createdBy: String,
  questions: [
    {
      question: String,
      options: [String],
      answer: String,
    },
  ],
});

export default mongoose.model('Quiz', quizSchema);