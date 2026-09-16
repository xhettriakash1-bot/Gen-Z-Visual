// GEN-Z VISUAL - v704.2 FINAL - NOVEL + COMIC + AUTH
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "";
console.log("MONGO_URI Check:", MONGO_URI? "FOUND ✅" : "NOT FOUND ❌");
mongoose.connect(MONGO_URI, { dbName: "genzvisual" })
.then(() => { console.log("✅ Mongo v704.2 Connected"); ensureAdmins(); })
.catch(e => console.log("❌ Mongo Fail:", e.message));

// ===== SCHEMAS =====
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['reader', 'creator', 'admin'], default: 'reader' },
  name: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const novelSchema = new mongoose.Schema({
  title: String, author: String, genre: String,
  description: String, cover: String, coverImage: String, coverUrl: String,
  content: String, pdfLink: String, type: String,
  creatorEmail: String, creatorName: String, chapters: Array, authorEmail: String,
}, { strict: false, timestamps: true });
const Novel = mongoose.models.Novel || mongoose.model('Novel', novelSchema);

// NEW COMIC SCHEMA v704.2
const comicSchema = new mongoose.Schema({
  title: String, author: String, genre: String,
  description: String, cover: String, coverImage: String, coverUrl: String,
  pages: Array, // images array - base64 or URL
  type: { type: String, default: 'comic' },
  creatorEmail: String, creatorName: String,
}, { strict: false, timestamps: true });
const Comic = mongoose.models.Comic || mongoose.model('Comic', comicSchema);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" })); // increased for comic pages
app.use(mongoSanitize());
app.use(hpp());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

const DEFAULT_ADMINS = [
  { email: "xhettriakash1@gmail.com", password: "Akash123", name: "Akash Main Admin" },
  { email: "akashchettri2003@gmail.com", password: "Akashchettri2003", name: "Akash Second Admin" }
];

async function ensureAdmins() {
  for (let adm of DEFAULT_ADMINS) {
    const exists = await User.findOne({ email: adm.email });
    if (!exists) {
      const hashed = await bcrypt.hash(adm.password, 10);
      await User.create({ email: adm.email.toLowerCase(), password: hashed, role: 'admin', name: adm.name });
      console.log("✅ Admin Created:", adm.email);
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "GENZ_SECRET_2026_SECURE";
const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Login required" });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
};
const isAdmin = (req, res, next) => {
  if (req.user.role!== 'admin') return res.status(403).json({ error: "Admin only" });
  next();
};

// HEALTH
app.get('/api/health', (req, res) => res.json({
  ok: true, v: "v704.2 FINAL - NOVEL+COMIC", firewall: "Active",
  mongo: mongoose.connection.readyState === 1? "connected" : "disconnected",
  admins: DEFAULT_ADMINS.map(a => a.email),
  node: process.version,
  endpoints: ["/api/login", "/api/novels", "/api/comics", "/api/books"]
}));
app.get('/', (req, res) => res.send("🟢 v704.2 LIVE - Novel + Comic Ready | Node "+process.version));

// AUTH
async function loginHandler(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "User Not Found" });
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Wrong Password" });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token, user: { email: user.email, role: user.role, name: user.name, id: user._id } });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
app.post('/api/login', loginHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email ||!password) return res.status(400).json({ error: "Required" });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: "Exists" });
    const isDefaultAdmin = DEFAULT_ADMINS.some(a => a.email === email.toLowerCase());
    const hashed = await bcrypt.hash(password, 10);
    const newRole = isDefaultAdmin? 'admin' : (role === 'creator'? 'creator' : 'reader');
    await User.create({ email: email.toLowerCase(), password: hashed, role: newRole, name: name || "User" });
    res.json({ success: true, msg: "Registered" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ADMIN
app.get('/api/users', protect, isAdmin, async (req, res) => {
  res.json(await User.find().select('-password').sort({ createdAt: -1 }));
});

// ===== NOVELS =====
app.get('/api/novels', async (req, res) => {
  let filter = { type: { $ne: 'comic' } };
  if (req.query.email) filter.creatorEmail = req.query.email;
  // show both strict type=novel and old docs without type
  const novels = await Novel.find({
    $or: [{ type: 'novel' }, { type: { $exists: false } }, { type: '' }, filter]
  }).sort({ createdAt: -1 }).limit(200);
  res.json(novels);
});
app.post('/api/novels', protect, async (req, res) => {
  if (req.user.role!== 'admin' && req.user.role!== 'creator') return res.status(403).json({ error: "Creator only" });
  const doc
