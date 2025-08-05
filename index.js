const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const QUIZZES_FILE = "quizzes.json";
const LEADERBOARD_FILE = "leaderboard.json";
const ADMIN_KEY = "123"; // Your ADMIN PANEL password

// Fixed quizzes list
const FIXED_QUIZZES = [
  "JavaScript Basics",
  "HTML & CSS Master",
  "Node.js Fundamentals",
];

// load & save JSON
function loadData(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
  return JSON.parse(fs.readFileSync(file));
}
function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Get all quizzes
app.get("/quizzes", (req, res) => {
  const quizzes = loadData(QUIZZES_FILE).map((q, idx) => ({
    id: idx + 1,
    ...q,
  }));
  res.json(quizzes);
});

// Get single quiz by ID
app.get("/quiz/:id", (req, res) => {
  const quizzes = loadData(QUIZZES_FILE);
  const id = parseInt(req.params.id);
  if (id > 0 && id <= quizzes.length) {
    res.json({ id, ...quizzes[id - 1] });
  } else {
    res.status(404).json({ error: "Quiz not found" });
  }
});

// Submit answers & save leaderboard
app.post("/submit", (req, res) => {
  const { quizId, answers, username } = req.body;
  const quizzes = loadData(QUIZZES_FILE);
  const leaderboard = loadData(LEADERBOARD_FILE);

  const quizIndex = parseInt(quizId) - 1;
  if (!quizzes[quizIndex])
    return res.status(404).json({ error: "Quiz not found" });

  const quiz = quizzes[quizIndex];
  let score = 0;
  quiz.questions.forEach((q, i) => {
    if (answers[i] && answers[i] === q.answer) score++;
  });

  leaderboard.push({ username, score, total: quiz.questions.length, quizId });
  saveData(LEADERBOARD_FILE, leaderboard);

  res.json({ score, total: quiz.questions.length });
});

// Get leaderboard for a quiz
app.get("/leaderboard/:quizId", (req, res) => {
  const leaderboard = loadData(LEADERBOARD_FILE);
  const quizId = req.params.quizId;
  const filtered = leaderboard
    .filter((e) => e.quizId == quizId)
    .sort((a, b) => b.score - a.score);
  res.json(filtered);
});

// Admin add/append questions to fixed quiz
app.post("/admin/addQuiz", (req, res) => {
  const { adminKey, title, questions } = req.body;
  if (adminKey !== ADMIN_KEY)
    return res.status(403).json({ error: "Unauthorized - Wrong Password" });

  let quizzes = loadData(QUIZZES_FILE);

  // Ensure quizzes array has 3 slots
  while (quizzes.length < FIXED_QUIZZES.length) {
    quizzes.push({ title: FIXED_QUIZZES[quizzes.length], questions: [] });
  }

  // Validate title
  const quizIndex = FIXED_QUIZZES.indexOf(title);
  if (quizIndex === -1) {
    return res.status(400).json({ error: "Invalid quiz title" });
  }

  // Append new questions
  quizzes[quizIndex].questions.push(...questions);
  saveData(QUIZZES_FILE, quizzes);

  res.json({
    message: `✅ Questions added to "${title}"!`,
    totalQuestions: quizzes[quizIndex].questions.length,
  });
});

// Admin delete quiz questions (but keep quiz slot)
app.delete("/admin/deleteQuiz/:id", (req, res) => {
  const { adminKey } = req.body;
  if (adminKey !== ADMIN_KEY)
    return res.status(403).json({ error: "Unauthorized - Wrong Password" });

  const quizzes = loadData(QUIZZES_FILE);
  const id = parseInt(req.params.id);
  if (id <= 0 || id > quizzes.length)
    return res.status(404).json({ error: "Quiz not found" });

  quizzes[id - 1].questions = []; // Clear questions but keep quiz title
  saveData(QUIZZES_FILE, quizzes);

  // Clear leaderboard for that quiz
  let leaderboard = loadData(LEADERBOARD_FILE);
  leaderboard = leaderboard.filter((e) => e.quizId != id);
  saveData(LEADERBOARD_FILE, leaderboard);

  res.json({ message: "✅ Quiz questions and its leaderboard cleared!" });
});

// Admin clear all leaderboard
app.delete("/admin/clearLeaderboard", (req, res) => {
  const { adminKey } = req.body;
  if (adminKey !== ADMIN_KEY)
    return res.status(403).json({ error: "Unauthorized - Wrong Password" });

  saveData(LEADERBOARD_FILE, []);
  res.json({ message: "✅ All leaderboard cleared!" });
});

// Admin verify key route
app.post("/admin/verifyKey", (req, res) => {
  const { adminKey } = req.body;
  if (adminKey === ADMIN_KEY) {
    return res.json({ success: true });
  } else {
    return res.status(403).json({ success: false, error: "Wrong Password" });
  }
});

// Default route
app.get("/", (req, res) => res.send("QuizSprint 🎓 Backend Running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));