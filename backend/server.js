const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// ================= FIREWALL 1: SECURITY HEADERS & CORS PROTECTION =================
app.use((req, res, next) => {
  // Block clickjacking, XSS, MIME sniffing
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.removeHeader('X-Powered-By'); // Hide you are using Express
  next();
});

// Only allow your website - block other sites from calling your API
const ALLOWED_ORIGINS = [
  "https://xhettriakash1.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
];
app.use(cors({
  origin: function(origin, callback){
    if(!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))){
      callback(null, true);
    } else {
      console.log(`BLOCKED CORS ATTACK FROM: ${origin}`);
      callback(new Error('Blocked by Firewall 1'));
    }
  }
}));

app.use(express.json({limit: '10kb'})); // Block large payload attack
app.use(express.static(path.join(__dirname, '..')));

// ================= FIREWALL 2: RATE LIMITER + DDOS + IP BLACKLIST =================
const ipRequestCount = new Map();
const BLACKLIST = new Set(); // Add hacker IPs here

// Load blacklist from file if exists
const blacklistFile = path.join(__dirname, 'blacklist.json');
if(fs.existsSync(blacklistFile)){
  try { JSON.parse(fs.readFileSync(blacklistFile)).forEach(ip => BLACKLIST.add(ip)); } catch(e){}
}

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Check if blacklisted
  if(BLACKLIST.has(ip)){
    return res.status(403).json({error: 'Your IP is permanently blocked by Firewall'});
  }

  // Rate limiting: Max 30 requests per minute per IP
  const now = Date.now();
  const record = ipRequestCount.get(ip) || {count: 0, time: now};
  
  if(now - record.time > 60 * 1000){ // 1 minute window
    record.count = 1;
    record.time = now;
  } else {
    record.count++;
  }
  
  ipRequestCount.set(ip, record);

  if(record.count > 30){
    BLACKLIST.add(ip);
    fs.writeFileSync(blacklistFile, JSON.stringify([...BLACKLIST]));
    console.log(`🔥 DDOS BLOCKED - IP BANNED: ${ip}`);
    return res.status(429).json({error: 'Too many requests - You are blocked for 1 hour'});
  }
  
  next();
});

// ================= FIREWALL 3: HACKER INPUT FILTER (SQLi, XSS, Path Traversal) =================
const HACK_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL Injection
  /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i, // XSS <script>
  /((\%3C)|<)((\%2F)|\/)*script/i,
  /(union.*select)/i,
  /(select.*from)/i,
  /\.\.\/|\.\.\\/, // Path Traversal
  /(\%00)/, // Null byte attack
  /(base64_decode|eval\()/i
];

function isAttack(input){
  if(!input) return false;
  const str = JSON.stringify(input).toLowerCase();
  return HACK_PATTERNS.some(pattern => pattern.test(str));
}

app.use((req, res, next) => {
  // Check body, query, params for attack patterns
  if(isAttack(req.body) || isAttack(req.query) || isAttack(req.params)){
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`🚨 HACK ATTEMPT BLOCKED from ${ip}: ${req.url}`);
    return res.status(403).json({error: 'Malicious request blocked by WAF Firewall 3'});
  }
  next();
});

// ================= YOUR NORMAL CODE STARTS HERE =================
const ADMINS = [
 {email:"akashchettri2003@gmail.com", password:"Akashchettri2003@123#"},
 {email:"xhettriakash1@gmail.com", password:"Akash123"}
];
// ... rest of your server.js code below this ...
const ADMINS = [
 {email:"akashchettri2003@gmail.com", password:"Akashchettri2003@123#"},
 {email:"xhettriakash1@gmail.com", password:"Akash123"}
];

const USERS_FILE = path.join(__dirname, 'users.json');
const PENDING_FILE = path.join(__dirname, 'pending.json');

function getUsers(){ if(!fs.existsSync(USERS_FILE)) return []; return JSON.parse(fs.readFileSync(USERS_FILE,'utf8')); }
function saveUsers(d){ fs.writeFileSync(USERS_FILE, JSON.stringify(d,null,2)); }
function getPending(){ if(!fs.existsSync(PENDING_FILE)) return []; return JSON.parse(fs.readFileSync(PENDING_FILE,'utf8')); }
function savePending(d){ fs.writeFileSync(PENDING_FILE, JSON.stringify(d,null,2)); }

app.post('/api/signup', (req,res)=>{
 const {name,email,password,role,code,portfolio,bio} = req.body;
 if(!name||!email||!password) return res.json({ok:false, msg:"Fill all fields"});
 if(ADMINS.find(a=>a.email==email)) return res.json({ok:false, msg:"Admin email reserved"});
 if(role=="creator" && code!=="CREATOR2026") return res.json({ok:false, msg:"Wrong creator code! Use CREATOR2026"});
 let users=getUsers();
 if(users.find(u=>u.email==email)) return res.json({ok:false, msg:"Email already exists"});
 let newUser={name,email,password,role,portfolio:portfolio||"",bio:bio||"",verified:role=="reader",date:new Date().toLocaleString()};
 users.push(newUser); saveUsers(users);
 if(role=="creator"){ let p=getPending(); p.push({name,email,portfolio,bio,date:new Date().toLocaleString()}); savePending(p); }
 res.json({ok:true, msg:"Account created as "+role});
});

app.post('/api/login', (req,res)=>{
 const {email,password}=req.body;
 let admin=ADMINS.find(a=>a.email==email && a.password==password);
 if(admin) return res.json({ok:true, role:"admin", name:"Admin"});
 let users=getUsers();
 let u=users.find(x=>x.email==email && x.password==password);
 if(!u) return res.json({ok:false, msg:"Wrong email/password"});
 res.json({ok:true, role:u.role, name:u.name, email:u.email});
});

app.get('/api/users', (req,res)=> res.json(getUsers()));
app.get('/api/pending', (req,res)=> res.json(getPending()));
app.post('/api/approve', (req,res)=>{
 const {email}=req.body;
 let users=getUsers(); let idx=users.findIndex(u=>u.email==email); if(idx>=0) users[idx].verified=true; saveUsers(users);
 let pending=getPending(); pending=pending.filter(p=>p.email!==email); savePending(pending);
 res.json({ok:true});
});
app.post('/api/delete', (req,res)=>{
 const {email}=req.body;
 let users=getUsers(); users=users.filter(u=>u.email!==email); saveUsers(users);
 let pending=getPending(); pending=pending.filter(p=>p.email!==email); savePending(pending);
 res.json({ok:true});
});

app.listen(3000, ()=> console.log("✅ http://localhost:3000"));
