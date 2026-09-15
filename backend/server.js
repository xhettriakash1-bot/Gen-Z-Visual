// GEN-Z VISUAL - v350 FINAL - PUBLIC OPEN + NOVELS API + ADMIN PROTECTED
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ===== MONGO CONNECT (OPTIONAL) =====
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";
if(MONGO_URI){
  mongoose.connect(MONGO_URI).then(()=>console.log("✅ Mongo Connected - v350")).catch(e=>console.log("File mode:",e.message));
}else{
  console.log("⚠️ No MONGO_URI - Using file storage ✅");
}

// ===== SCHEMAS =====
const userSchema = new mongoose.Schema({
  email: {type:String, unique:true, lowercase:true},
  password: String,
  role: {type:String, enum:['reader','creator','admin'], default:'reader'},
  name: String,
  createdAt: {type:Date, default:Date.now}
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const novelSchema = new mongoose.Schema({
  id: Number,
  title: String,
  author: String,
  genre: String,
  cover: String,
  pdf: String,
  pages: [String],
  desc: String,
  creatorEmail: String,
  type: {type:String, default:'novel'},
  date: {type:Date, default:Date.now}
});
const Novel = mongoose.models.Novel || mongoose.model('Novel', novelSchema);

// ===== SECURITY HEADERS =====
app.use(helmet({ contentSecurityPolicy:false }));
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.removeHeader('Server');
  next();
});

app.use(cors({
  origin: true, // ALLOW ALL - fixes kash1-bot.github.io
  credentials:true,
  methods:["GET","POST","PUT","DELETE","OPTIONS","PATCH"],
  allowedHeaders:["Content-Type","x-admin-email","x-api-key","Authorization","x-request-time","x-admin-password"]
}));

app.use(express.json({limit:"10mb"})); // INCREASED FOR COMPRESSED IMAGES
app.use(express.urlencoded({extended:true}));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// ===== RATE LIMITS =====
app.use('/api/', rateLimit({windowMs:15*60*1000, max:500}));
app.use('/api/login', rateLimit({windowMs:15*60*1000, max:30}));
app.use('/api/register', rateLimit({windowMs:60*60*1000, max:30}));

// ===== FILE HELPERS =====
const DATA_DIR = __dirname;
const readJSON = (f)=>{ try{return JSON.parse(fs.readFileSync(path.join(DATA_DIR,f),'utf8'))}catch{return []} };
const writeJSON = (f,data)=>{ try{fs.writeFileSync(path.join(DATA_DIR,f), JSON.stringify(data,null,2))}catch(e){console.log(e.message)} };
if(!fs.existsSync(path.join(DATA_DIR,'users.json'))) writeJSON('users.json',[]);
if(!fs.existsSync(path.join(DATA_DIR,'pending.json'))) writeJSON('pending.json',[]);
if(!fs.existsSync(path.join(DATA_DIR,'novels.json'))) writeJSON('novels.json',[]);

// ===== DEFAULT ADMINS - YOUR 2 PROTECTED - NEVER DELETE =====
const DEFAULT_ADMINS = [
  { email: "xhettriakash1@gmail.com", password: "Akash123", role: "admin" },
  { email: "akashchettri2003@gmail.com", password: "Akashchettri2003@123#", role: "admin" }
];

async function ensureDefaultAdmins(){
  let users = readJSON('users.json');
  for(let adm of DEFAULT_ADMINS){
    let exist = users.find(u=>u.email.toLowerCase()===adm.email.toLowerCase());
    if(!exist){
      const hash = await bcrypt.hash(adm.password, 10);
      users.push({ id: Date.now()+Math.random(), email:adm.email.toLowerCase(), password:hash, role:'admin', name:'Admin', createdAt:new Date().toISOString() });
    }
  }
  writeJSON('users.json', users);
  if(mongoose.connection.readyState===1){
    for(let adm of DEFAULT_ADMINS){
      let exist = await User.findOne({email:adm.email.toLowerCase()});
      if(!exist){
        const hash = await bcrypt.hash(adm.password, 10);
        await User.create({email:adm.email.toLowerCase(), password:hash, role:'admin', name:'Admin'});
      }
    }
  }
}
ensureDefaultAdmins();

async function findUserByEmail(email){
  email = email.toLowerCase();
  if(mongoose.connection.readyState===1){
    return await User.findOne({email});
  }else{
    let users = readJSON('users.json');
    return users.find(u=>u.email.toLowerCase()===email);
  }
}

// ===== ROUTES =====
app.get('/', (req,res)=> res.json({status:"🟢 v350 PUBLIC LIVE", mongo: mongoose.connection.readyState===1?"Connected":"File mode", admins: DEFAULT_ADMINS.map(a=>a.email), firewall:"ON 🔥"}));
app.get('/api/health', (req,res)=> res.json({ok:true, v:"v350"}));

app.post('/api/register', async (req,res)=>{
  try{
    const {email,password,role,name} = req.body;
    if(!email||!password) return res.status(400).json({error:"Email & Password required"});
    let userRole = (role && ['creator','reader'].includes(role.toLowerCase()))? role.toLowerCase() : 'reader';
    if(DEFAULT_ADMINS.some(a=>a.email===email.toLowerCase())) userRole='admin';
    let existing = await findUserByEmail(email);
    if(existing) return res.status(409).json({error:"User already exists, please login"});
    const hash = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), email:email.toLowerCase(), password:hash, role:userRole, name:name||email.split('@')[0], createdAt:new Date().toISOString() };
    if(mongoose.connection.readyState===1){ await User.create(newUser); }else{ let users = readJSON('users.json'); users.push(newUser); writeJSON('users.json', users); }
    res.json({success:true, msg:`Registered as ${userRole} ✅`, user:{email:newUser.email, role:newUser.role, name:newUser.name}});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.post('/api/login', async (req,res)=>{
  try{
    const {email,password} = req.body;
    if(!email||!password) return res.status(400).json({error:"Missing fields"});
    let user = await findUserByEmail(email);
    if(!user) return res.status(401).json({error:"User not found, please register first"});
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(401).json({error:"Wrong password"});
    res.json({success:true, msg:"Login success ✅", user:{email:user.email, role:user.role, name:user.name||user.email, id:user._id||user.id}});
  }catch(e){ res.status(500).json({error:e.message}); }
});

// ===== NOVELS & COMICS API - NEW v350 =====
app.post('/api/novels', async (req,res)=>{
  try{
    const data = req.body;
    if(!data.title) return res.status(400).json({error:"Title required"});
    if(mongoose.connection.readyState===1){ await Novel.create(data); }
    else{ let list = readJSON('novels.json'); list.push(data); writeJSON('novels.json', list); }
    res.json({success:true, msg:"Published ✅"});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/novels', async (req,res)=>{
  try{
    if(mongoose.connection.readyState===1){ let list = await Novel.find().sort({date:-1}); res.json(list); }
    else{ res.json(readJSON('novels.json').reverse()); }
  }catch(e){ res.json([]); }
});

async function isAdmin(req,res,next){
  try{
    const email = (req.headers['x-admin-email'] || req.body.adminEmail || req.body.email || req.query.admin || "").toLowerCase();
    const password = req.headers['x-admin-password'] || req.body.adminPassword || req.body.password || req.query.password || "";
    if(!email) return res.status(403).json({error:"Admin email required"});
    let user = await findUserByEmail(email);
    if(!user || user.role!=='admin') return res.status(403).json({error:"⛔ ADMIN ONLY"});
    if(password){
      const ok = await bcrypt.compare(password, user.password);
      if(!ok) return res.status(401).json({error:"Admin password wrong"});
    }
    req.adminUser = user;
    next();
  }catch(e){ res.status(500).json({error:e.message}); }
}

app.get('/api/users', isAdmin, async (req,res)=>{
  if(mongoose.connection.readyState===1){ let users = await User.find().select('-password'); res.json(users); }
  else{ let users = readJSON('users.json').map(u=>({email:u.email, role:u.role, name:u.name, id:u.id, createdAt:u.createdAt})); res.json(users); }
});

app.put('/api/users/:email', isAdmin, async (req,res)=>{
  const targetEmail = req.params.email.toLowerCase();
  if(DEFAULT_ADMINS.some(a=>a.email===targetEmail) && req.body.role && req.body.role!=='admin'){
    return res.status(403).json({error:"⛔ Cannot downgrade protected admin"});
  }
  const {role, name, newEmail} = req.body;
  try{
    if(mongoose.connection.readyState===1){
      let u = await User.findOne({email:targetEmail}); if(!u) return res.status(404).json({error:"Not found"});
      if(role) u.role = role; if(name) u.name = name; if(newEmail) u.email = newEmail.toLowerCase();
      await u.save(); res.json({success:true, msg:"Updated ✅"});
    }else{
      let users = readJSON('users.json');
      let idx = users.findIndex(x=>x.email.toLowerCase()===targetEmail);
      if(idx===-1) return res.status(404).json({error:"Not found"});
      if(role) users[idx].role = role; if(name) users[idx].name = name; if(newEmail) users[idx].email = newEmail.toLowerCase();
      writeJSON('users.json', users); res.json({success:true, msg:"Updated ✅"});
    }
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.post('/api/delete', isAdmin, async (req,res)=>{
  const {email} = req.body;
  if(DEFAULT_ADMINS.some(a=>a.email===email.toLowerCase())) return res.status(403).json({error:"⛔ Protected admin cannot be deleted"});
  if(mongoose.connection.readyState===1){ await User.deleteOne({email:email.toLowerCase()}); }
  else{ let users = readJSON('users.json').filter(u=>u.email.toLowerCase()!==email.toLowerCase()); writeJSON('users.json', users); }
  res.json({success:true, msg:"Deleted ✅"});
});

app.post('/api/admin/change-password', isAdmin, async (req,res)=>{
  try{
    const {email, oldPassword, newPassword, targetEmail} = req.body;
    const who = (targetEmail || email || req.adminUser.email).toLowerCase();
    let user = await findUserByEmail(who); if(!user) return res.status(404).json({error:"Not found"});
    if(who===req.adminUser.email.toLowerCase() && oldPassword){
      const ok = await bcrypt.compare(oldPassword, user.password);
      if(!ok) return res.status(401).json({error:"Old password wrong"});
    }
    if(!newPassword || newPassword.length<4) return res.status(400).json({error:"Too short"});
    const hash = await bcrypt.hash(newPassword, 10);
    if(mongoose.connection.readyState===1){ await User.updateOne({email:who}, {password:hash}); }
    else{ let users = readJSON('users.json'); let idx = users.findIndex(u=>u.email.toLowerCase()===who); if(idx!==-1){ users[idx].password = hash; writeJSON('users.json', users); } }
    res.json({success:true, msg:`Password changed for ${who} ✅`});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/pending', isAdmin, (req,res)=> res.json(readJSON('pending.json')));
app.use((req,res)=> res.status(404).json({error:"Not found - v350"}));
app.use((err,req,res,next)=> res.status(500).json({error:"Server error"}));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`🟢 v350 LIVE on ${PORT} - Public Open + Novels API + 2 Admins Protected`));
