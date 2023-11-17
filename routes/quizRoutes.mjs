import express from 'express';
import checkUserLogin from '../middleware/userMiddleware.mjs';
import Quiz from '../models/quizModel.mjs';
import UserScore from '../models/userScoreModel.mjs';
import router from './authRoutes.mjs';
import path, { join } from 'path';
import moment from "moment-timezone";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
// Route to serve the addquiz.html file

const __dirname = path.dirname(new URL(import.meta.url).pathname);


router.post('/addquiz', checkUserLogin, async (req, res) => {
  const { quizTopic, questions } = req.body;

  if (!quizTopic || !Array.isArray(questions) || questions.length === 0 || quizTopic.length<3) {
    return res.status(400).json({ message: 'Invalid quiz data format' });
  }

  for (const question of questions) {
    if (
      !question.question ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      !question.answer
    ) {
      return res.status(400).json({ message: 'Invalid question format' });
    }
  }

  // Generate a random quizId
  const quizId = generateSevenDigitNumericId();

  try {
    const jwtCookie = req.cookies.jwt;

    if (jwtCookie) {
      try {
        const decodedToken = jwt.verify(jwtCookie, process.env.JWT_SECRET);
        const email = decodedToken.email;
        const creationTime = moment().tz("Asia/Kolkata").format();
        console.log("Creation Time:", creationTime);
        const quiz = new Quiz({
          quizId,
          quizTopic,
          questions,
          createdBy: email,
          creationTime, // Adding creationTime field with the current timestamp
        });

        // Save the quiz to the database
        await quiz.save();

        res.status(201).json({ message: 'Quiz added successfully', quizId });
      } catch (jwtError) {
        console.error('JWT verification error:', jwtError);
        res.status(401).json({ message: 'Unauthorized' });
      }
    } else {
      // Handle the case where the JWT cookie is not present or invalid
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    console.error('Error adding quiz:', error);
    res.status(500).json({ message: 'Error adding quiz' });
  }
});

// API endpoint to get quiz questions
router.get('/getQuestion/:quizId', checkUserLogin, async (req, res) => {
  const quizId = req.params.quizId;

  // Check if req.session.quiz is defined
  if (!req.session.quiz) {
    return res.status(401).json({ error: 'Invalid Quiz Session' });
  }

  console.log(quizId)
  console.log(req.session.quiz.joinCode)
  // Verify that the requested quizId matches the joinCode stored in the session
  if (quizId != req.session.quiz.joinCode) {
    return res.status(401).json({ error: 'Invalid Quiz Session2' });
  }

  try {
    const quiz = await Quiz.findOne({ quizId }).exec();

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if(req.session.quiz.isNew==true){
      req.session.quiz.isNew = false;
      req.session.quiz.time = Date.now();
    }
    const questions = quiz.questions;

    // Calculate the timeLeft based on the time elapsed since the user started the quiz
    let timeLeft = 0;

    if (req.session.quiz.currentQuestionIndex === questions.length) {
      return res.status(200).json({ status: 'true', message: 'quiz completed',currentQuestion:req.session.quiz.currentQuestionIndex+1,totalQuestions:questions.length, score:req.session.quiz.userScore });
    }

    if (Date.now() - req.session.quiz.time < 10000) {
      const elapsedTimeInMilliseconds = Date.now() - req.session.quiz.time;
      timeLeft = 10 - Math.floor(elapsedTimeInMilliseconds / 1000); // Convert to seconds and round down
    }

    const firstQuestion = questions[req.session.quiz.currentQuestionIndex]; // Assuming this is the first question
    res.json({ question: firstQuestion.question, options: firstQuestion.options, timeleft: timeLeft, currentQuestion:req.session.quiz.currentQuestionIndex+1,totalQuestions:questions.length, score:req.session.quiz.userScore});
  } catch (err) {
    return res.status(500).json({ error: 'Error while querying the database' });
  }
});



// API endpoint to submit user answers
router.post('/submitQuestion/:quizId', checkUserLogin, async (req, res) => {
  const quizId = req.params.quizId;
  const userAnswer = req.body.answer; // User's answer received in the request body

  // Check if the session, quiz, or join code is invalid
  if (!req.session || !req.session.quiz || req.session.quiz.joinCode != quizId) {
    // Return an Unauthorized response for an invalid quiz session
    return res.status(401).json({ error: 'Invalid quiz session' });
  }

  const userSession = req.session.quiz;

  try {
    const quiz = await Quiz.findOne({ quizId }).exec();

    if (!quiz) {
      // Return a Not Found response if the requested quiz doesn't exist
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questions = quiz.questions;
    if(questions.length==req.session.quiz.currentQuestionIndex){
        return res.json({score:req.session.quiz.userScore,message: 'Quiz finished'})
    }
    const currentQuestion = questions[userSession.currentQuestionIndex];

    // Check if the user's answer matches the correct answer
    const isAnswerCorrect = currentQuestion.answer.toUpperCase() === userAnswer.toUpperCase();

    if (isAnswerCorrect) {
      // Increment the user's score if the answer is correct
      userSession.userScore++;
    }

    // Update current question index
    req.session.quiz.isNew = true;
    userSession.currentQuestionIndex++;

    if (userSession.currentQuestionIndex < questions.length) {
      // Provide the next question if more questions are available
      //const nextQuestion = questions[userSession.currentQuestionIndex];
      res.json({
        currentQuestion:req.session.quiz.currentQuestionIndex,
        totalQuestions:questions.length,
        score:userSession.userScore,
        correctAnswer: currentQuestion.answer.toLowerCase(),
        lastAnswerCorrect: isAnswerCorrect, // Indicate if the last answer was correct
      });
    } else {
      // Quiz finished, save the user's score
      const score = userSession.userScore;
      const userScore = new UserScore({ quizId, userId: userSession.userId, score });
      await userScore.save();

      res.json({
        currentQuestion:req.session.quiz.currentQuestionIndex,
        totalQuestions:questions.length,
        score,
        message: 'Quiz finished',
        correctAnswer: currentQuestion.answer.toLowerCase(),
        lastAnswerCorrect: isAnswerCorrect, // Indicate if the last answer was correct
      });
    }
  } catch (error) {
   // console.log(error)
    // Handle any unexpected errors with an Internal Server Error response
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.get('/myquizes', async (req, res) => {
  const jwtCookie = req.cookies.jwt;

  if (jwtCookie) {
    try {
      const decodedToken = jwt.verify(jwtCookie, process.env.JWT_SECRET);
      const userId = decodedToken.email;

      try {
        // Retrieve quizzes including creationTime
        const userQuizzes = await Quiz.find({ createdBy: userId }, 'quizId createdBy creationTime quizTopic questions');
        console.log(userQuizzes);
        // Map quizzes to include the creationTime in a more readable format
        const quizzesWithFormattedTime = userQuizzes.map((quiz) => ({
          quizId: quiz.quizId,
          createdBy: quiz.createdBy,
          quizTopic: quiz.quizTopic,
          creationTime: moment(quiz.creationTime).tz("Asia/Kolkata").format("MMMM Do YYYY, h:mm:ss a"), // Adjust the format as needed
          numberOfQuestions:quiz.questions.length,
        }));

        // Render the myquizes view with the quizzes
        res.render('myquizes', { quizzes: quizzesWithFormattedTime,title:'Myquizes' ,currentPage:'myquizes'});

        

        // Alternatively, you can send the JSON response
        // res.status(200).json({ quizzes: quizzesWithFormattedTime });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while fetching user quizzes.' });
      }
    } catch (jwtError) {
      res.send('<script> window.location.href = "/login";</script>');
      console.error('JWT verification error:', jwtError);
    }
  } else {
    // Handle the case where the JWT cookie is not present or invalid
    res.status(401).send('<script>  window.location ="/login"; </script>');
  }
});



router.post('/validateJoinCode', checkUserLogin, async (req, res) => {
  const joinCode = req.body.joinCode;

  try {
    // Use Mongoose to find a quiz with the given quizId (assuming join code is the same as quizId)
    const quiz = await Quiz.findOne({ quizId: joinCode }).exec();
    if (!quiz) {
      // No quiz found for the given join code, so it's invalid
      return res.json({ valid: false, message: 'Invalid join code' });
    }

    // Extract the user's email from the JWT token
    const userToken = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET); // Replace with your actual secret key
    const userEmail = userToken.email; // Assuming the email is stored in the JWT payload

    // Initialize req.session if it's not already
    if (!req.session) {
      req.session = {};
    }

    req.session.quiz = {
      currentQuestionIndex: 0,
      userScore: 0,
      joinCode,
      userId: userEmail, // Use the email as the user ID
      time: Date.now(), // Replace with the actual user ID
      isNew: true,
    };
    
    // If a quiz with the given join code is found, it's valid
    // Return the quizId to the client
    res.json({ valid: true, quizId: quiz.quizId });
  } catch (err) {
    // Handle any database error
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Route to view the leaderboard for a quiz
router.get('/:quizId/leaderboard', checkUserLogin, async (req, res) => {
  const quizId = req.params.quizId;
  try {
    // Extract the user's email from the JWT token
    const userToken = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET); // Replace process.env.JWT_SECRET with your actual secret key
    const userEmail = userToken.email; // Assuming the email is stored in the JWT payload

    const leaderboardData = await UserScore.aggregate([
      {
        $match: { quizId: quizId }
      },
      {
        $sort: { userId: 1, score: -1 }
      },
      {
        $group: {
          _id: "$userId",
          highestScore: { $first: "$score" },
          quizId: { $first: "$quizId" }
        }
      },
      {
        $project: {
          _id: 0,
          quizId: 1,
          userId: "$_id",
          score: "$highestScore"
        }
      },
      {
        $sort: { score: -1 } // Sort by score in descending order
      },
      {
        $limit: 10
      }
    ]);
    
    // Find the user's rank based on their email
    const userRank = leaderboardData.findIndex(entry => entry.userId === userEmail);
    
    //res.json({ leaderboardData, userRank });
    res.render('leaderboard', {leaderboardData, userRank,title:'Leaderboard',currentPage:'leaderboard'});

  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred');
  }
});


router.get('/getaiquiz', async (req, res) => {
  try {
    let topic = req.query.topic;
    if (topic.length < 3) {
      res.status(400).json({ error: 'Topic length must be at least 3 characters' });
      return; // Exit the function if the topic length is less than 3
    }

    const apiUrl = process.env.OPENAIAPI;
    const response = await fetch(`${apiUrl}?str=${topic}`);

    if (response.ok) {
      const jsonData = await response.json();
      res.status(200).json(JSON.stringify(jsonData));
    } else {
      console.error('Error making the API request:', response.status, response.statusText);
      res.status(response.status).json({ error: `API request failed with status ${response.status}` });
    }
  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Helper function to generate a random quiz ID
function generateSevenDigitNumericId() {
  const min = 1000000; 
  const max = 9999999; 
  // Generate a random number
  const numericId = Math.floor(Math.random() * (max - min + 1)) + min;
  return numericId.toString(); // Convert the number to a string
}

export default router;