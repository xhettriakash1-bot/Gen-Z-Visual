// GEN-Z VISUAL - v700 FINAL BACKEND - FIREWALL + ADMIN PANEL
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

// ====== MONGO DB - FIXED v700 ======
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "";
console.log("MONGO_URI Check:", MONGO_URI? "FOUND ✅" : "NOT FOUND ❌");

if (!MONGO_URI) {
  console.log("❌ CRITICAL: Add MONGO_URI in Render Environment!");
}

mongoose.connect(MONGO_URI, { dbName: "genzvisual" })
 .then(() => {
    console.log("✅ Mongo Connected v700 SUCCESS");
    console.log("🟢 v700 LIVE - Mongo Connected");
    ensureAdmins();
  })
 .catch(e => console.log("❌ Mongo Fail v700:", e.message));

// ====== SCHEMAS ======
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['reader', 'creator', 'admin'], default: 'reader' },
  name: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const novelSchema = new mongoose.Schema({
  title: String,
  author: String,
  genre: String,
  description: String,
  cover: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});
const Novel = mongoose.models.Novel || mongoose.model('Novel', novelSchema);

// ====== FIREWALL PROTECTION - ALL ACTIVE ======
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(mongoSanitize());
app.use(hpp());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: "Too many requests" }));

// ====== ADMIN EMAILS - FIXED - NEVER DELETE ======
const DEFAULT_ADMINS = [
  { email: "xhettriakash1@gmail.com", password: "Akash123", name: "Akash Main Admin" },
  { email: "akashchettri2003@gmail.com", password: "Akashchettri2003", name: "Akash Second Admin" }
];

async function ensureAdmins() {
  try {
    for (let adm of DEFAULT_ADMINS) {
      const exists = await User.findOne({ email: adm.email });
      if (!exists) {
        const hashed = await bcrypt.hash(adm.password, 10);
        await User.create({ email: adm.email.toLowerCase(), password: hashed, role: 'admin', name: adm.name });
        console.log("✅ Admin Created:", adm.email);
      } else {
        console.log("✅ Admin Already Exists:", adm.email);
      }
    }
  } catch (e) {
    console.log("Admin Ensure Error:", e.message);
  }
}

// ====== JWT PROTECTION ======
const JWT_SECRET = process.env.JWT_SECRET || "GENZ_SECRET_2026_SECURE";

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Login required" });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role!== 'admin') return res.status(403).json({ error: "Admin only" });
  next();
};

// ====== API ROUTES ======
app.get('/api/health', (req, res) => res.json({
  ok: true,
  v: "v700 FINAL",
  firewall: "Active",
  mongo: mongoose.connection.readyState === 1? "connected" : "disconnected",
  admins: DEFAULT_ADMINS.map(a => a.email)
}));

app.get('/', (req, res) => res.send("🟢 v700 FINAL LIVE - Firewall Active - Mongo Connected - Admin Panel Ready"));

// AUTH
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email ||!password) return res.status(400).json({ error: "Email and Password Required" });
    const emailL = email.toLowerCase();
    if (await User.findOne({ email: emailL })) return res.status(409).json({ error: "User Already Exists" });

    const isDefaultAdmin = DEFAULT_ADMINS.some(a => a.email === emailL);
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email: emailL, password: hashed, role: isDefaultAdmin? 'admin' : 'reader', name: name || "User" });
    res.json({ success: true, msg: "Registered Successfully" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailL = email.toLowerCase();
    const user = await User.findOne({ email: emailL });
    if (!user) return res.status(401).json({ error: "User Not Found" });
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Wrong Password" });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token, user: { email: user.email, role: user.role, name: user.name, id: user._id } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ADMIN PANEL
app.post('/api/admin/change-password', protect, isAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.json({ ok: false, msg: "Admin not found" });
    if (!(await bcrypt.compare(oldPassword, user.password))) return res.json({ ok: false, msg: "Old password wrong" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true, msg: "Password Changed Successfully!" });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

app.post('/api/admin/make-admin', protect, isAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    const target = await User.findOne({ email: email.toLowerCase() });
    if (!target) return res.json({ ok: false, msg: "User must signup first" });
    target.role = "admin";
    await target.save();
    res.json({ ok: true, msg: `${email} is now ADMIN` });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

app.get('/api/users', protect, isAdmin, async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

app.delete('/api/admin/delete-user/:id', protect, isAdmin, async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (DEFAULT_ADMINS.some(a => a.email === userToDelete.email)) {
      return res.json({ ok: false, msg: "Cannot delete Default Admin" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true, msg: "User Deleted" });
  } catch (e) { res.json({ ok: false, msg: e.message }); }
});

// NOVELS
app.get('/api/novels', async (req, res) => {
  const novels = await Novel.find().sort({ createdAt: -1 });
  res.json(novels);
});

app.post('/api/novels', protect, isAdmin, async (req, res) => {
  const novel = await Novel.create(req.body);
  res.json({ ok: true, novel });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`v700 FINAL LIVE on ${PORT}`));
