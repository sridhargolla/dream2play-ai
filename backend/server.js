const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { analyzeDream, fuseDreams } = require('./utils/analyzer');
const { generateAndSaveAssets } = require('./utils/imageGenerator');
const localDb = require('./utils/localdb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dream2play_secret_key_12345';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- JWT AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token is invalid or expired' });
    }
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION ROUTES ---

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    const existingUser = localDb.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = localDb.createUser({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    const user = localDb.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Get Current User Info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = localDb.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ id: user.id, username: user.username, email: user.email });
});

// --- DREAM ENGINE ROUTES ---

// Get all dreams for the logged-in user
app.get('/api/dreams', authenticateToken, (req, res) => {
  try {
    const dreams = localDb.getDreamsByUser(req.user.id);
    res.json(dreams);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve dreams', error: err.message });
  }
});

// Generate and save a new dream game
app.post('/api/dreams/generate', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Please provide dream title and description' });
    }

    // Call analyzer to build structured JSON blueprint
    const apiKey = req.headers['x-openai-key'];
    const blueprint = await analyzeDream(title, description, apiKey);

    // Pre-generate a unique ID to link with local assets
    const dreamId = Date.now().toString();

    // Generate realistic visual assets
    const assets = await generateAndSaveAssets(blueprint, dreamId, apiKey, { title, description });
    blueprint.assets = assets;

    const newDream = localDb.saveDream({
      id: dreamId,
      userId: req.user.id,
      title,
      description,
      blueprint,
    });

    res.status(201).json(newDream);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate game blueprint', error: err.message });
  }
});

// Fuse two dreams
app.post('/api/dreams/fuse', authenticateToken, async (req, res) => {
  try {
    const { dreamId1, dreamId2 } = req.body;

    if (!dreamId1 || !dreamId2) {
      return res.status(400).json({ message: 'Please select two dreams to fuse' });
    }

    const dream1 = localDb.getDreamById(dreamId1);
    const dream2 = localDb.getDreamById(dreamId2);

    if (!dream1 || !dream2) {
      return res.status(404).json({ message: 'One or both dreams not found' });
    }

    if (dream1.userId !== req.user.id || dream2.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to fuse these dreams' });
    }

    const apiKey = req.headers['x-openai-key'];
    const fusedBlueprint = await fuseDreams(dream1, dream2, apiKey);

    // Pre-generate unique ID for the fused dream
    const dreamId = Date.now().toString();

    const fusedTitle = `Fused: ${dream1.title.slice(0, 15)} + ${dream2.title.slice(0, 15)}`;
    const fusedDescription = `A hybrid dream fusing "${dream1.title}" and "${dream2.title}". Description: ${dream1.description.slice(0, 50)}... and ${dream2.description.slice(0, 50)}...`;

    // Generate realistic fused assets
    const assets = await generateAndSaveAssets(fusedBlueprint, dreamId, apiKey, {
      title: fusedTitle,
      description: fusedDescription,
    });
    fusedBlueprint.assets = assets;

    const newDream = localDb.saveDream({
      id: dreamId,
      userId: req.user.id,
      title: fusedTitle,
      description: fusedDescription,
      blueprint: fusedBlueprint,
      isFused: true,
      parentDreams: [dreamId1, dreamId2],
    });

    res.status(201).json(newDream);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fuse dreams', error: err.message });
  }
});

// Delete a dream
app.delete('/api/dreams/:id', authenticateToken, (req, res) => {
  try {
    const success = localDb.deleteDream(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ message: 'Dream not found or unauthorized' });
    }
    res.json({ message: 'Dream deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete dream', error: err.message });
  }
});

// --- LEADERBOARD ROUTES ---

// Get high scores
app.get('/api/scores', (req, res) => {
  try {
    const scores = localDb.getScores();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve scores', error: err.message });
  }
});

// Submit a high score
app.post('/api/scores', authenticateToken, (req, res) => {
  try {
    const { score, completionTime, difficulty, dreamTitle } = req.body;

    if (score === undefined || completionTime === undefined || !difficulty || !dreamTitle) {
      return res.status(400).json({ message: 'Please provide all score details' });
    }

    const newScore = localDb.saveScore({
      userId: req.user.id,
      username: req.user.username,
      dreamTitle,
      score: parseInt(score, 10),
      completionTime: parseFloat(completionTime),
      difficulty,
    });

    res.status(201).json(newScore);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save score', error: err.message });
  }
});

// --- SERVER INITIALIZATION ---
app.listen(PORT, () => {
  console.log(`Dream2Play AI backend running on http://localhost:${PORT}`);
});
