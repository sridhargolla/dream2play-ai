const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { analyzeDream, fuseDreams } = require('./utils/analyzer');
const { generateAndSaveAssets } = require('./utils/imageGenerator');
const { testAIConnection } = require('./utils/aiProvider');
const {
  findUserByEmail,
  findUserById,
  createUser,
  getDreamsByUser,
  saveDream,
  deleteDream,
  getDreamById,
  getScores,
  saveScore,
} = require('./utils/localdb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dream2play_secret_key_12345';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- SERVE FRONTEND STATIC FILES IN PRODUCTION ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
}

// --- TRANSLATION HELPER ---
const ERROR_TRANSLATIONS = {
  hi: {
    'Access token missing': 'एक्सेस टोकन गायब है',
    'Token is invalid or expired': 'टोकन अमान्य या समाप्त हो गया है',
    'Please provide all fields': 'कृपया सभी फ़ील्ड प्रदान करें',
    'User already exists with this email': 'इस ईमेल के साथ उपयोगकर्ता पहले से मौजूद है',
    'Registration failed': 'पंजीकरण विफल रहा',
    'Please fill in all fields': 'कृपया सभी फ़ील्ड भरें',
    'Invalid credentials': 'अमान्य क्रेडेंशियल',
    'Login failed': 'लॉगिन विफल रहा',
    'User not found': 'उपयोगकर्ता नहीं मिला',
    'Failed to retrieve dreams': 'सपने पुनर्प्राप्त करने में विफल',
    'Please provide dream title and description': 'कृपया सपने का शीर्षक और विवरण प्रदान करें',
    'Failed to generate game blueprint': 'गेम ब्लूप्रिंट उत्पन्न करने में विफल',
    'Please select two dreams to fuse': 'कृपया फ्यूज करने के लिए दो सपनों का चयन करें',
    'One or both dreams not found': 'एक या दोनों सपने नहीं मिले',
    'Unauthorized to fuse these dreams': 'इन सपनों को फ्यूज करने के लिए अनधिकृत',
    'Failed to fuse dreams': 'सपनों को फ्यूज करने में विफल',
    'Unauthorized to delete this dream': 'इस सपने को हटाने के लिए अनधिकृत',
    'Dream not found or unauthorized': 'सपना नहीं मिला या अनधिकृत',
    'Failed to delete dream': 'सपना हटाने में विफल',
    'Failed to retrieve scores': 'स्कोर पुनर्प्राप्त करने में विफल',
    'Please provide all score details': 'कृपया सभी स्कोर विवरण प्रदान करें',
    'Failed to save score': 'स्कोर सहेजने में विफल',
    'Dream deleted successfully': 'सपना सफलतापूर्वक हटा दिया गया',
  },
  te: {
    'Access token missing': 'యాక్సెస్ టోకెన్ లేదు',
    'Token is invalid or expired': 'టోకెన్ చెల్లదు లేదా గడువు ముగిసింది',
    'Please provide all fields': 'దయచేసి అన్ని వివరాలను అందించండి',
    'User already exists with this email': 'ఈ ఈమెయిల్‌తో వినియోగదారు ఇప్పటికే ఉన్నారు',
    'Registration failed': 'నమోదు విఫలమైంది',
    'Please fill in all fields': 'దయచేసి అన్ని వివరాలను పూరించండి',
    'Invalid credentials': 'చెల్లని ఆధారాలు',
    'Login failed': 'లాగిన్ విఫలమైంది',
    'User not found': 'వినియోగదారు కనుగొనబడలేదు',
    'Failed to retrieve dreams': 'కలలను పొందడంలో విఫలమైంది',
    'Please provide dream title and description': 'దయచేసి కల శీర్షిక మరియు వివరణను అందించండి',
    'Failed to generate game blueprint': 'గేమ్ బ్లూప్రింట్ సృష్టించడంలో విఫలమైంది',
    'Please select two dreams to fuse': 'దయచేసి ఫ్యూజ్ చేయడానికి రెండు కలలను ఎంచుకోండి',
    'One or both dreams not found': 'ఒకటి లేదా రెండు కలలు కనుగొనబడలేదు',
    'Unauthorized to fuse these dreams': 'ఈ కలలను ఫ్యూజ్ చేయడానికి మీకు అధికారం లేదు',
    'Failed to fuse dreams': 'కలలను ఫ్యూజ్ చేయడంలో విఫలమైంది',
    'Unauthorized to delete this dream': 'ఈ కలను తొలగించడానికి మీకు అధికారం లేదు',
    'Dream not found or unauthorized': 'కల కనుగొనబడలేదు లేదా అనధికారికమైనది',
    'Failed to delete dream': 'కలను తొలగించడంలో విఫలమైంది',
    'Failed to retrieve scores': 'స్కోర్‌లను పొందడంలో విఫలమైంది',
    'Please provide all score details': 'దయచేసి అన్ని స్కోర్ వివరాలను అందించండి',
    'Failed to save score': 'స్కోరును సేవ్ చేయడంలో విఫలమైంది',
    'Dream deleted successfully': 'కల విజయవంతంగా తొలగించబడింది',
  },
};

const translateMessage = (msg, lang) => {
  if (!lang || !ERROR_TRANSLATIONS[lang]) return msg;
  return ERROR_TRANSLATIONS[lang][msg] || msg;
};

const sendError = (res, status, message, lang) => {
  return res.status(status).json({ message: translateMessage(message, lang) });
};

const getLang = (req) => {
  return req.body?.lang || req.headers['x-lang'] || req.headers['accept-language'] || 'en';
};

const getAIConfig = (req) => {
  return {
    provider: req.headers['x-ai-provider'] || req.body?.aiConfig?.provider || 'openai',
    apiKey: req.headers['x-ai-key'] || req.headers['x-openai-key'] || req.body?.aiConfig?.apiKey || '',
    model: req.headers['x-ai-model'] || req.body?.aiConfig?.model || '',
    endpoint: req.headers['x-ai-endpoint'] || req.body?.aiConfig?.endpoint || '',
  };
};

// --- JWT AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const lang = getLang(req);

  if (!token) {
    return sendError(res, 401, 'Access token missing', lang);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return sendError(res, 403, 'Token is invalid or expired', lang);
    }
    req.user = user;
    next();
  });
};

// --- HEALTH / ROOT ROUTE ---
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Dream2Play AI backend is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
    frontend: process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:5173/',
    api: {
      auth: ['/api/auth/register', '/api/auth/login', '/api/auth/me'],
      dreams: ['/api/dreams', '/api/dreams/generate', '/api/dreams/fuse', '/api/dreams/:id'],
      scores: ['/api/scores'],
    },
  });
});

// Test connection to AI provider
app.post('/api/ai/test', authenticateToken, async (req, res) => {
  const lang = getLang(req);
  try {
    const aiConfig = getAIConfig(req);
    const result = await testAIConnection(aiConfig);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- AUTHENTICATION ROUTES ---

// Register User
app.post('/api/auth/register', async (req, res) => {
  const lang = getLang(req);
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return sendError(res, 400, 'Please provide all fields', lang);
    }

    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return sendError(res, 400, 'User already exists with this email', lang);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = createUser({
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
    sendError(res, 500, 'Registration failed', lang);
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const lang = getLang(req);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Please fill in all fields', lang);
    }

    const user = findUserByEmail(email);
    if (!user) {
      return sendError(res, 400, 'Invalid credentials', lang);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 400, 'Invalid credentials', lang);
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    sendError(res, 500, 'Login failed', lang);
  }
});

// Get Current User Info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const lang = getLang(req);
  const user = findUserById(req.user.id);
  if (!user) {
    return sendError(res, 404, 'User not found', lang);
  }
  res.json({ id: user.id, username: user.username, email: user.email });
});

// --- DREAM ENGINE ROUTES ---

// Get all dreams for the logged-in user
app.get('/api/dreams', authenticateToken, (req, res) => {
  const lang = getLang(req);
  try {
    const dreams = getDreamsByUser(req.user.id);
    res.json(dreams);
  } catch (err) {
    sendError(res, 500, 'Failed to retrieve dreams', lang);
  }
});

// Generate and save a new dream game
app.post('/api/dreams/generate', authenticateToken, async (req, res) => {
  const lang = getLang(req);
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return sendError(res, 400, 'Please provide dream title and description', lang);
    }

    // Call analyzer to build structured JSON blueprint
    const aiConfig = getAIConfig(req);
    const blueprint = await analyzeDream(title, description, aiConfig, lang);

    // Pre-generate a unique ID to link with local assets
    const dreamId = Date.now().toString();

    // Generate realistic visual assets
    const assetApiKey = aiConfig.provider === 'openai' ? aiConfig.apiKey : '';
    const assets = await generateAndSaveAssets(blueprint, dreamId, assetApiKey, { title, description });
    blueprint.assets = assets;

    const newDream = saveDream({
      id: dreamId,
      userId: req.user.id,
      title,
      description,
      blueprint,
    });

    res.status(201).json(newDream);
  } catch (err) {
    sendError(res, 500, 'Failed to generate game blueprint', lang);
  }
});

// Fuse two dreams
app.post('/api/dreams/fuse', authenticateToken, async (req, res) => {
  const lang = getLang(req);
  try {
    const { dreamId1, dreamId2 } = req.body;

    if (!dreamId1 || !dreamId2) {
      return sendError(res, 400, 'Please select two dreams to fuse', lang);
    }

    const dream1 = getDreamById(dreamId1);
    const dream2 = getDreamById(dreamId2);

    if (!dream1 || !dream2) {
      return sendError(res, 404, 'One or both dreams not found', lang);
    }

    if (dream1.userId !== req.user.id || dream2.userId !== req.user.id) {
      return sendError(res, 403, 'Unauthorized to fuse these dreams', lang);
    }

    const aiConfig = getAIConfig(req);
    const fusedBlueprint = await fuseDreams(dream1, dream2, aiConfig, lang);

    // Pre-generate unique ID for the fused dream
    const dreamId = Date.now().toString();

    const fusedTitle = `Fused: ${dream1.title.slice(0, 15)} + ${dream2.title.slice(0, 15)}`;
    const fusedDescription = `A hybrid dream fusing "${dream1.title}" and "${dream2.title}". Description: ${dream1.description.slice(0, 50)}... and ${dream2.description.slice(0, 50)}...`;

    // Generate realistic fused assets
    const assetApiKey = aiConfig.provider === 'openai' ? aiConfig.apiKey : '';
    const assets = await generateAndSaveAssets(fusedBlueprint, dreamId, assetApiKey, {
      title: fusedTitle,
      description: fusedDescription,
    });
    fusedBlueprint.assets = assets;

    const newDream = saveDream({
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
    sendError(res, 500, 'Failed to fuse dreams', lang);
  }
});

// Delete a dream
app.delete('/api/dreams/:id', authenticateToken, (req, res) => {
  const lang = getLang(req);
  try {
    const dream = getDreamById(req.params.id);
    if (dream && dream.userId !== req.user.id) {
      return sendError(res, 403, 'Unauthorized to delete this dream', lang);
    }

    const success = deleteDream(req.params.id, req.user.id);
    if (!success) {
      return sendError(res, 404, 'Dream not found or unauthorized', lang);
    }

    // Remove generated asset files for this dream
    const uploadsDir = path.join(__dirname, 'uploads');
    const assetTypes = ['hero', 'enemy', 'boss', 'background', 'collectible'];
    assetTypes.forEach((type) => {
      const filePath = path.join(uploadsDir, `${req.params.id}_${type}.svg`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    res.json({ message: translateMessage('Dream deleted successfully', lang) });
  } catch (err) {
    sendError(res, 500, 'Failed to delete dream', lang);
  }
});

// --- LEADERBOARD ROUTES ---

// Get high scores
app.get('/api/scores', (req, res) => {
  const lang = getLang(req);
  try {
    const scores = getScores();
    res.json(scores);
  } catch (err) {
    sendError(res, 500, 'Failed to retrieve scores', lang);
  }
});

// Submit a high score
app.post('/api/scores', authenticateToken, (req, res) => {
  const lang = getLang(req);
  try {
    const { score, completionTime, difficulty, dreamTitle } = req.body;

    if (score === undefined || completionTime === undefined || !difficulty || !dreamTitle) {
      return sendError(res, 400, 'Please provide all score details', lang);
    }

    const newScore = saveScore({
      userId: req.user.id,
      username: req.user.username,
      dreamTitle,
      score: parseInt(score, 10),
      completionTime: parseFloat(completionTime),
      difficulty,
    });

    res.status(201).json(newScore);
  } catch (err) {
    sendError(res, 500, 'Failed to save score', lang);
  }
});

// --- SERVE FRONTEND STATIC FILES IN PRODUCTION (FALLBACK) ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.get('*', (req, res, next) => {
    // Only fallback for non-API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- SERVER INITIALIZATION ---
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET must be set in production.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: Using default JWT secret. Set JWT_SECRET in .env for production.');
}

app.listen(PORT, () => {
  console.log(`Dream2Play AI backend running on http://localhost:${PORT}`);
});
