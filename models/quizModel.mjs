import mongoose from "mongoose";
import moment  from "moment-timezone";
const quizSchema = new mongoose.Schema({
  quizId: String,
  quizTopic: {
    type: String,
    required: true,
  },
  createdBy: String,
  questions: [
    {
      question: String,
      options: [String],
      answer: String,
    },
  ],
  creationTime: {
    type: Date,
    default: moment().tz("Asia/Kolkata").format(), // Use moment-timezone to format the date in Asia/Kolkata time zone
  },
});

export default mongoose.model('Quiz', quizSchema);
