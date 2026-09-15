const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// ============================================
// DB CONNECT - YOU MISSED THIS
// ============================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected - Secure"))
  .catch(err => {
    console.error("❌ DB Error:", err.message);
    process.exit(1);
  });

// ============================================
// LAYER 1: HELMET
// ============================================
app.use(helmet());
app.use((req,res,next)=>{
  res.setHeader("X-Powered-By","Gen-Z Visual Firewall v10");
  res.setHeader("X-Frame-Options","DENY");
  next();
});

// ============================================
// LAYER 2: CORS - Domain Lock (Fixed)
// ============================================
const ALLOWED_ORIGINS = [
  "https://sh1-bot.github.io",
  "https://xhettriakash1.github.io",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];
app.use(cors({
  origin: (origin, cb)=>{
    if(!origin) return cb(null, true); // Allow Postman
    if(ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.some(o=>origin.startsWith(o))){
      cb(null, true);
    } else {
      console.log(`⛔ LAYER 2 BLOCKED: ${origin}`);
      cb(new Error(`Domain ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET","POST","PUT","DELETE"]
}));

// ============================================
// LAYER 3: RATE LIMIT
// ============================================
const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: "Too many attempts, wait 15 min" } });
app.use('/api/', globalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// ============================================
// LAYER 4: BODY PROTECTION
// ============================================
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(hpp()); // LAYER 7 moved here

// ============================================
// LAYER 5 & 6: REPLACED (Old packages crash)
// ============================================
// Manual sanitize - replaces mongoSanitize + xss-clean
app.use((req,res,next)=>{
  const sanitize = (obj)=>{
    if(!obj) return;
    for(let k in obj){
      if(k.includes('$') || k.includes('.')) delete obj[k];
      if(typeof obj[k] === 'string'){
        obj[k] = obj[k].replace(/<script.*?>.*?<\/script>/gi, '').replace(/<[^>]*>?/gm, '');
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
});

// ============================================
// LAYER 8: IP + SUSPICIOUS LOG
// ============================================
const blockedIPs = new Set();
const requestLogs = [];
app.use((req,res,next)=>{
  const ip = req.ip;
  if(blockedIPs.has(ip)) return res.status(403).json({error: "IP Banned"});
  
  requestLogs.push({ ip, url: req.url, time: new Date() });
  if(requestLogs.length > 200) requestLogs.shift();

  const bodyStr = JSON.stringify(req.body) + req.url;
  if(["SELECT *","DROP TABLE","../","etc/passwd"].some(p=>bodyStr.toUpperCase().includes(p))){
    console.log(`⛔ SUSPICIOUS: ${ip} -> ${bodyStr}`);
    return res.status(403).json({error: "Blocked"});
  }
  next();
});

// ============================================
// LAYER 9: ADMIN FIREWALL
// ============================================
const ALLOWED_ADMINS = ["xhettriakash1@gmail.com","akashchettri2003@gmail.com"];
function adminFirewall(req,res,next){
  const adminEmail = req.headers['x-admin-email'] || req.body.adminEmail || req.query.admin;
  if(!adminEmail || !ALLOWED_ADMINS.includes(adminEmail)){
    return res.status(403).json({ error: "⛔ ACCESS DENIED - Admin only" });
  }
  next();
}

// ============================================
// YOUR ROUTES - PASTE YOUR REAL CODE HERE
// ============================================
app.get('/', (req,res)=> res.json({status: "✅ Firewall Active - 10 Layers ON - DB Connected"}));

app.get('/api/stories', (req,res)=>{ res.json({msg: "Add your story logic"}); });
app.post('/api/login', (req,res)=>{ res.json({msg: "Add login logic"}); });
app.post('/api/register', (req,res)=>{ res.json({msg: "Add register logic"}); });

app.get('/api/users', adminFirewall, (req,res)=>{ res.json({msg: "Protected users"}); });
app.get('/api/pending', adminFirewall, (req,res)=>{ res.json({msg: "Protected pending"}); });
app.post('/api/approve', adminFirewall, (req,res)=>{ res.json({msg: "Protected approve"}); });
app.post('/api/delete', adminFirewall, (req,res)=>{ res.json({msg: "Protected delete"}); });

app.get('/api/logs', adminFirewall, (req,res)=>{
  res.json({ logs: requestLogs.slice(-100) });
});

// ============================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`🔥 FIREWALL ACTIVE on ${PORT}`));
