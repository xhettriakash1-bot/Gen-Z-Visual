// GEN-Z VISUAL - v700 FINAL BACKEND - FIXED FOR ALL FRONTENDS
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
.then(() => { console.log("✅ Mongo Connected v700 SUCCESS"); ensureAdmins(); })
.catch(e => console.log("❌ Mongo Fail v700:", e.message));

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['reader', 'creator', 'admin'], default: 'reader' },
  name: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

// FLEXIBLE SCHEMA - accepts everything frontend sends
const novelSchema = new mongoose.Schema({
  title: String,
  author: String,
  genre: String,
  description: String,
  cover: String,
  coverImage: String,
  coverUrl: String,
  content: String,
  pdfLink: String,
  type: String,
  creatorEmail: String,
  creatorName: String,
  chapters: Array,
  authorEmail: String,
}, { strict: false, timestamps: true });
const Novel = mongoose.models.Novel || mongoose.model('Novel', novelSchema);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(mongoSanitize());
app.use(hpp());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

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
  ok: true, v: "v700 FINAL FIXED", firewall: "Active",
  mongo: mongoose.connection.readyState === 1? "connected" : "disconnected",
  admins: DEFAULT_ADMINS.map(a => a.email),
  endpoints: ["/api/login", "/api/auth/login", "/api/novels"]
}));
app.get('/', (req, res) => res.send("🟢 v700 FINAL LIVE - All Endpoints Ready"));

// AUTH - FIXED: support BOTH routes
async function loginHandler(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "User Not Found", message: "User Not Found" });
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Wrong Password", message: "Wrong Password" });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token, user: { email: user.email, role: user.role, name: user.name, id: user._id } });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
app.post('/api/login', loginHandler);
app.post('/api/auth/login', loginHandler); // FIXED: added this!
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
app.post('/api/register', (req, res) => { req.url = '/api/auth/register'; app.handle(req, res); });

// ADMIN
app.post('/api/admin/change-password', protect, isAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!(await bcrypt.compare(oldPassword, user.password))) return res.json({ ok: false, msg: "Old wrong" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true, msg: "Changed!" });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});
app.get('/api/users', protect, isAdmin, async (req, res) => {
  res.json(await User.find().select('-password').sort({ createdAt: -1 }));
});

// NOVELS - FIXED: open for creator + admin
app.get('/api/novels', async (req, res) => {
  let filter = {};
  if (req.query.email) filter.creatorEmail = req.query.email;
  res.json(await Novel.find(filter).sort({ createdAt: -1 }));
});
app.get('/api/books', async (req, res) => {
  res.json(await Novel.find().sort({ createdAt: -1 }));
});
app.post('/api/novels', protect, async (req, res) => {
  if (req.user.role!== 'admin' && req.user.role!== 'creator') return res.status(403).json({ error: "Creator only" });
  const novel = await Novel.create(req.body);
  res.json({ ok: true, novel, _id: novel._id });
});
app.post('/api/books', protect, async (req, res) => {
  const novel = await Novel.create(req.body);
  res.json({ ok: true, novel });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ v700 FINAL FIXED LIVE on ${PORT} - BOTH login routes ready`));
