import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/authAPI';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

// create a user schema with mongoose and use crypto for accessToken
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
});

const User = mongoose.model('User', userSchema);

const Secret = mongoose.model('Secret', {
  message: String
});

const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// Function for checking if user is logged in
const authenticateUser = async (req, res, next) => {
  const accessToken = req.header('Authorization');

  try {
    const user = await User.findOne({ accessToken });
    if (user) {
      next();
    } else {
      res.status(401).json({ response: 'Please log in', success: false });
    }
  } catch (error) {
    res.status(400).json({ response: error, success: false });
  }
};

// Start defining routes here
app.get('/', (req, res) => {
  res.send(
    'This is the backend of Project-auth by Isabel González and Ida Aspen. Please visit <a href="https://ida-and-isabel-secrets.netlify.app/login">frontend</a> for the main page!'
  );
});

// What you see when you are logged in added here
app.get('/secrets', authenticateUser);
app.get('/secrets', async (req, res) => {
  const secrets = await Secret.find({});
  res.status(201).json({ response: secrets, success: true });
});

// POST request for creating a user
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    const salt = bcrypt.genSaltSync(); // Create a randomizer to prevent to unhash it
    const strongPassword =
      /^(?!.*\s)(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[~`!@#$%^&*()--+={}\[\]|\\:;"'<>,.?/_₹]).{8,20}$/;

    // checking if password match strongPassword = regex
    if (password.match(strongPassword)) {
      const newUser = await new User({
        username,
        password: bcrypt.hashSync(password, salt)
      }).save();
      res.status(201).json({
        response: {
          userId: newUser._id,
          username: newUser.username,
          accessToken: newUser.accessToken
        },
        success: true
      });
    } else {
      throw 'Password must contain at least 8 characters, at least one letter, one number and one special character';
    }
  } catch (error) {
    res.status(400).json({ response: error, success: false });
  }
});

// POST request for signing in, match username and password
// if you include accessToken in your request = you are logged in
app.post('/signin', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        response: {
          userId: user._id,
          username: user.username,
          accessToken: user.accessToken
        },
        success: true
      });
    } else {
      res.status(404).json({
        response: "Username or password doesn't match.",
        success: false
      });
    }
  } catch (error) {
    res.status(400).json({ response: error, success: false });
  }
});

// Start the server
app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`Server running on http://localhost:${port}`);
});
