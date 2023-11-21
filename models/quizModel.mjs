import mongoose from "mongoose";
import moment from "moment-timezone";

const quizSchema = new mongoose.Schema({
  quizId: String,
  isRandom: String,
  singleTime: String,
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
      imageUrl: {
        type: String,
        default: null,
      },
    },
  ],
  creationTime: {
    type: Date,
    default: moment().tz("Asia/Kolkata").format(),
  },
});

export default mongoose.model('Quiz', quizSchema);
