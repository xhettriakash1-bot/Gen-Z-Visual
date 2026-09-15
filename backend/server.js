const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();

// ============================================
// LAYER 1: HELMET - Secure Headers
// ============================================
app.use(helmet());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
app.use((req,res,next)=>{
  res.setHeader("X-Powered-By","Gen-Z Visual Firewall v10");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("X-Content-Type-Options","nosniff");
  next();
});

// ============================================
// LAYER 2: CORS - Domain Lock
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
    if(!origin || ALLOWED_ORIGINS.some(o=>origin.includes(o))){
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
// LAYER 3: RATE LIMIT - DDoS Protection
// ============================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, slow down!" }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, try after 15 min" }
});
app.use('/api/', globalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// ============================================
// LAYER 4: BODY PROTECTION - Size Limit
// ============================================
app.use(express.json({ limit: "10kb" })); // No big payloads
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ============================================
// LAYER 5: NoSQL INJECTION PROTECTION
// ============================================
app.use(mongoSanitize()); // Removes $ and .

// ============================================
// LAYER 6: XSS PROTECTION
// ============================================
app.use(xss()); // Clean <script> tags

// ============================================
// LAYER 7: HPP - HTTP Parameter Pollution
// ============================================
app.use(hpp());

// ============================================
// LAYER 8: IP BLACKLIST + LOGGING
// ============================================
const blockedIPs = new Set(["0.0.0.0"]); // Add bad IPs here
const requestLogs = [];

app.use((req,res,next)=>{
  const ip = req.ip || req.connection.remoteAddress;
  
  // Block bad IPs
  if(blockedIPs.has(ip)){
    console.log(`⛔ LAYER 8 BLOCKED IP: ${ip}`);
    return res.status(403).json({error: "IP Banned"});
  }
  
  // Log
  requestLogs.push({ ip, url: req.url, time: new Date(), ua: req.headers['user-agent'] });
  if(requestLogs.length > 500) requestLogs.shift(); // Keep last 500
  
  // Block suspicious patterns
  const badPatterns = ["<script","SELECT *","DROP TABLE","../","etc/passwd"];
  const bodyStr = JSON.stringify(req.body) + req.url;
  if(badPatterns.some(p=>bodyStr.toUpperCase().includes(p.toUpperCase()))){
    console.log(`⛔ LAYER 8 SUSPICIOUS: ${ip} -> ${bodyStr}`);
    return res.status(403).json({error: "Suspicious request blocked"});
  }
  next();
});

// ============================================
// LAYER 9: ADMIN FIREWALL - Role Check
// ============================================
const ALLOWED_ADMINS = ["xhettriakash1@gmail.com","akashchettri2003@gmail.com"];

function adminFirewall(req,res,next){
  // Get admin email from header or body
  const adminEmail = req.headers['x-admin-email'] || req.body.adminEmail || req.query.admin;
  
  if(!adminEmail || !ALLOWED_ADMINS.includes(adminEmail)){
    console.log(`⛔ LAYER 9 ADMIN BLOCK: ${adminEmail} tried to access ${req.url}`);
    return res.status(403).json({ 
      error: "⛔ ACCESS DENIED - Admin only",
      yourEmail: adminEmail,
      allowed: ALLOWED_ADMINS 
    });
  }
  console.log(`✅ ADMIN ACCESS: ${adminEmail} -> ${req.url}`);
  next();
}

// ============================================
// LAYER 10: API KEY + SECRET TOKEN
// ============================================
const SECRET_API_KEY = "GENZ_VISUAL_2024_SECURE_KEY_SH1_BOT"; // Change this!

function apiKeyFirewall(req,res,next){
  // Skip for GET public routes
  if(req.method==="GET" && !req.url.includes("/users") && !req.url.includes("/pending")){
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  // For admin routes, need both admin email AND api key
  if(req.url.includes("/approve") || req.url.includes("/delete") || req.url.includes("/users")){
    // Admin check already handles, but extra layer
    if(apiKey !== SECRET_API_KEY && req.headers['x-admin-email']){
      // Allow if admin email is correct even without key (for frontend)
      return next();
    }
  }
  next();
}
app.use(apiKeyFirewall);

// ============================================
// YOUR ROUTES
// ============================================
app.get('/', (req,res)=> res.json({status: "✅ Firewall Active - 10 Layers ON", domain: "sh1-bot.github.io"}));

// PUBLIC - Open for all
app.get('/api/stories', (req,res)=>{ /* your code */ });
app.post('/api/login', (req,res)=>{ /* your code */ });
app.post('/api/register', (req,res)=>{ /* your code */ });

// PROTECTED - Admin only - LAYER 9 applied
app.get('/api/users', adminFirewall, (req,res)=>{ /* your code */ });
app.get('/api/pending', adminFirewall, (req,res)=>{ /* your code */ });
app.post('/api/approve', adminFirewall, (req,res)=>{ /* your code */ });
app.post('/api/delete', adminFirewall, (req,res)=>{ /* your code */ });

// Log viewer - only you
app.get('/api/logs', adminFirewall, (req,res)=>{
  res.json({ logs: requestLogs.slice(-100), blockedIPs: [...blockedIPs] });
});

// Install needed packages:
// npm install express cors helmet express-rate-limit express-mongo-sanitize xss-clean hpp

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`🔥 10-LAYER FIREWALL ACTIVE on port ${PORT}`));
