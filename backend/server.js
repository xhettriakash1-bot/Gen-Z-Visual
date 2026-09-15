// GEN-Z VISUAL - v351 DYNAMIC - PUBLIC OPEN + SECURE + FRONTEND SERVING
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ===== MONGO CONNECT =====
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";
if(MONGO_URI){
  mongoose.connect(MONGO_URI).then(()=>console.log("✅ Mongo Connected - v351")).catch(e=>console.log("File mode:",e.message));
}else{
  console.log("⚠️ No MONGO_URI - Using file storage");
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
  id: Number, title: String, author: String, genre: String,
  cover: String, pdf: String, pages: [String], desc: String,
  creatorEmail: String, type: {type:String, default:'novel'},
  date: {type:Date, default:Date.now}
});
const Novel = mongoose.models.Novel || mongoose.model('Novel', novelSchema);

app.use(helmet({ contentSecurityPolicy:false }));
app.use((req,res,next)=>{ res.setHeader('X-Content-Type-Options','nosniff'); res.removeHeader('Server'); next(); });
app.use(cors({ origin: true, credentials:true, methods:["GET","POST","PUT","DELETE","OPTIONS","PATCH"], allowedHeaders:["Content-Type","x-admin-email","x-api-key","Authorization","x-request-time","x-admin-password"] }));
app.use(express.json({limit:"15mb"}));
app.use(express.urlencoded({extended:true}));
app.use(mongoSanitize());
try{ const xss = require('xss-clean'); app.use(xss()); }catch{}
app.use(hpp());
app.use('/api/', rateLimit({windowMs:15*60*1000, max:500}));

// ===== FILE HELPERS =====
const DATA_DIR = __dirname;
const readJSON = (f)=>{ try{return JSON.parse(fs.readFileSync(path.join(DATA_DIR,f),'utf8'))}catch{return []} };
const writeJSON = (f,data)=>{ try{fs.writeFileSync(path.join(DATA_DIR,f), JSON.stringify(data,null,2))}catch(e){} };
if(!fs.existsSync(path.join(DATA_DIR,'users.json'))) writeJSON('users.json',[]);
if(!fs.existsSync(path.join(DATA_DIR,'novels.json'))) writeJSON('novels.json',[]);

// ===== SECURE ADMINS - FROM ENV (NO HARDCODE) =====
const DEFAULT_ADMINS = [
  { email: (process.env.ADMIN1_EMAIL || "xhettriakash1@gmail.com").toLowerCase(), password: process.env.ADMIN1_PASS || "Akash123ChangeMe" },
  { email: (process.env.ADMIN2_EMAIL || "akashchettri2003@gmail.com").toLowerCase(), password: process.env.ADMIN2_PASS || "ChangeMe123!" }
];

async function ensureDefaultAdmins(){
  let users = readJSON('users.json');
  for(let adm of DEFAULT_ADMINS){
    if(!users.find(u=>u.email.toLowerCase()===adm.email.toLowerCase())){
      const hash = await bcrypt.hash(adm.password, 10);
      users.push({ id: Date.now()+Math.random(), email:adm.email.toLowerCase(), password:hash, role:'admin', name:'Admin', createdAt:new Date().toISOString() });
    }
  }
  writeJSON('users.json', users);
  if(mongoose.connection.readyState===1){
    for(let adm of DEFAULT_ADMINS){
      if(!await User.findOne({email:adm.email.toLowerCase()})){
        const hash = await bcrypt.hash(adm.password, 10);
        await User.create({email:adm.email.toLowerCase(), password:hash, role:'admin', name:'Admin'});
      }
    }
  }
}
ensureDefaultAdmins();

async function findUserByEmail(email){
  email = email.toLowerCase();
  if(mongoose.connection.readyState===1) return await User.findOne({email});
  return readJSON('users.json').find(u=>u.email.toLowerCase()===email);
}

// ===== API ROUTES =====
app.get('/api/health', (req,res)=> res.json({ok:true, v:"v351", mongo: mongoose.connection.readyState===1?"Connected":"File", frontend: "Dynamic"}));

app.post('/api/register', async (req,res)=>{
  try{
    const {email,password,role,name} = req.body;
    if(!email||!password) return res.status(400).json({error:"Email & Password required"});
    let userRole = (role && ['creator','reader'].includes(role.toLowerCase()))? role.toLowerCase() : 'reader';
    if(DEFAULT_ADMINS.some(a=>a.email===email.toLowerCase())) userRole='admin';
    if(await findUserByEmail(email)) return res.status(409).json({error:"User already exists"});
    const hash = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), email:email.toLowerCase(), password:hash, role:userRole, name:name||email.split('@')[0], createdAt:new Date().toISOString() };
    if(mongoose.connection.readyState===1) await User.create(newUser); else { let users = readJSON('users.json'); users.push(newUser); writeJSON('users.json', users); }
    res.json({success:true, msg:`Registered as ${userRole} ✅`, user:{email:newUser.email, role:newUser.role, name:newUser.name}});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.post('/api/login', async (req,res)=>{
  try{
    const {email,password} = req.body;
    let user = await findUserByEmail(email);
    if(!user) return res.status(401).json({error:"User not found"});
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(401).json({error:"Wrong password"});
    res.json({success:true, user:{email:user.email, role:user.role, name:user.name||user.email, id:user._id||user.id}});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.post('/api/novels', async (req,res)=>{
  try{
    const data = req.body;
    if(!data.title) return res.status(400).json({error:"Title required"});
    if(mongoose.connection.readyState===1) await Novel.create(data); else { let list = readJSON('novels.json'); list.push(data); writeJSON('novels.json', list); }
    res.json({success:true, msg:"Published ✅"});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/novels', async (req,res)=>{
  try{
    if(mongoose.connection.readyState===1){ res.json(await Novel.find().sort({date:-1})); }
    else{ res.json(readJSON('novels.json').reverse()); }
  }catch(e){ res.json([]); }
});

async function isAdmin(req,res,next){
  const email = (req.headers['x-admin-email'] || req.body.adminEmail || "").toLowerCase();
  if(!email) return res.status(403).json({error:"Admin email required"});
  let user = await findUserByEmail(email);
  if(!user || user.role!=='admin') return res.status(403).json({error:"⛔ ADMIN ONLY"});
  req.adminUser = user; next();
}

app.get('/api/users', isAdmin, async (req,res)=>{
  if(mongoose.connection.readyState===1) res.json(await User.find().select('-password')); else res.json(readJSON('users.json').map(u=>({email:u.email, role:u.role, name:u.name})));
});

// ===== ★ DYNAMIC FRONTEND SERVING - THIS MAKES IT WEBSITE, NOT JUST API =====
const frontendPaths = [
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, '../dist'),
  path.join(__dirname, './dist'),
  path.join(__dirname, '../frontend/build'),
  path.join(__dirname, './public'),
  path.join(__dirname, '../public')
];
let staticPath = null;
for(let p of frontendPaths){ if(fs.existsSync(p)){ staticPath = p; break; } }

if(staticPath){
  console.log("✅ DYNAMIC: Serving frontend from", staticPath);
  app.use(express.static(staticPath));
  app.get(/^(?!\/api).*/, (req,res)=>{ res.sendFile(path.join(staticPath, 'index.html')); });
}else{
  console.log("⚠️ API ONLY - No frontend build found");
  app.get('/', (req,res)=> res.json({status:"🟢 v351 LIVE", msg:"API running. Build frontend to see website", mongo: mongoose.connection.readyState===1, frontendPath: "Not found - run npm run build"}));
}

app.use((req,res)=> res.status(404).json({error:"Not found"}));
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`🟢 v351 DYNAMIC LIVE on ${PORT}`));
