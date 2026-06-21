const db = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isValidString, isValidEmail, LIMITS } = require("../utils/validators");

const signup = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!isValidString(username, LIMITS.username.min, LIMITS.username.max)) {
    return res
      .status(400)
      .json({ message: "Username must be 3-30 characters." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "A valid email is required." });
  }
  if (!isValidString(password, LIMITS.password.min, LIMITS.password.max)) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  try {
    const existingUser = await db.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Username or email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUserResult = await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING user_id, username, email",
      [username, email, passwordHash]
    );
    const newUser = newUserResult.rows[0];

    const token = jwt.sign(
      { id: newUser.user_id, username: newUser.username, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({ token });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error during user registration." });
  }
};

const signin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  try {
    const userResult = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: user.user_id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (error) {
    console.error("Signin Error:", error);
    res.status(500).json({ message: "Server error during sign in." });
  }
};

module.exports = {
  signup,
  signin,
};
