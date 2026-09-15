# ===== GEN-Z VISUAL - PYTHON BACKEND WITH ADVANCE FIREWALL =====
from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, re, time
from datetime import datetime

app = Flask(__name__)
CORS(app, supports_credentials=True)

# ===== YOUR ADMIN ACCOUNTS - NEVER DELETE - SAFE HERE ONLY =====
ADMINS = [
    {"email": "xhettriakash1@gmail.com", "password": "Akash123", "name": "Akash Chettri"},
    {"email": "akashchettri2003@gmail.com", "password": "Akashchettri2003@123#", "name": "Akash Chettri 2"}
]

DATA_FILE = "data/users.json"
PENDING_FILE = "data/pending.json"
RATE_LIMIT = {}

# ===== FIREWALL PATTERNS =====
BLOCK_PATTERNS = [
    r"<script", r"javascript:", r"union.*select",
    r"onerror=", r"onload=", r"eval\(", r"<iframe", r"document\.cookie"
]

def is_attack(s):
    if not s: return False
    for pat in BLOCK_PATTERNS:
        if re.search(pat, s, re.IGNORECASE):
            return True
    return False

def check_rate(ip):
    now = time.time()
    if ip not in RATE_LIMIT:
        RATE_LIMIT[ip] = []
    RATE_LIMIT[ip] = [t for t in RATE_LIMIT[ip] if now - t < 60]
    if len(RATE_LIMIT[ip]) >= 25:
        return False
    RATE_LIMIT[ip].append(now)
    return True

def get_users():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_users(users):
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def get_pending():
    if not os.path.exists(PENDING_FILE):
        return []
    try:
        with open(PENDING_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_pending(data):
    os.makedirs("data", exist_ok=True)
    with open(PENDING_FILE, 'w') as f:
        json.dump(data, f, indent=2)

# ===== GLOBAL FIREWALL =====
@app.before_request
def firewall_check():
    ip = request.remote_addr or "unknown"
    if not check_rate(ip):
        return jsonify({"ok": False, "msg": "⛔ Too many requests - Firewall blocked you"}), 429

    raw = str(request.data.decode('utf-8', errors='ignore')) + str(request.args) + str(request.form)
    if is_attack(raw):
        print(f"🚨 WAF BLOCKED from {ip}: {raw[:100]}")
        return jsonify({"ok": False, "msg": "⛔ WAF blocked malicious request"}), 403

@app.route('/')
def home():
    return jsonify({
        "status": "Gen-Z Visual Python Backend Running 🔥",
        "firewall": "3 Layer Active",
        "admins": ["xhettriakash1@gmail.com", "akashchettri2003@gmail.com"],
        "endpoints": ["/api/login", "/api/signup", "/api/users", "/api/pending", "/api/approve", "/api/delete"]
    })

# ===== LOGIN API =====
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email','').lower().strip()
    password = data.get('password','').strip()

    if not email or not password:
        return jsonify({"ok": False, "msg": "Email and password required"})

    # Check Admins FIRST
    for admin in ADMINS:
        if admin['email'].lower() == email and admin['password'] == password:
            return jsonify({"ok": True, "role": "admin", "name": admin['name'], "email": admin['email']})

    # Check normal users
    users = get_users()
    u = next((x for x in users if x['email'].lower() == email and x['password'] == password), None)
    if not u:
        return jsonify({"ok": False, "msg": "Wrong email or password"})

    if u['role'] == 'creator' and not u.get('verified', False):
        return jsonify({"ok": False, "msg": "Creator account pending admin approval"})

    return jsonify({"ok": True, "role": u['role'], "name": u['name'], "email": u['email']})

# ===== SIGNUP API =====
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name','').strip()
    email = data.get('email','').lower().strip()
    password = data.get('password','').strip()
    role = data.get('role','reader')

    if not name or not email or not password:
        return jsonify({"ok": False, "msg": "All fields required"})

    if len(password) < 6:
        return jsonify({"ok": False, "msg": "Password min 6 chars"})

    users = get_users()
    pending = get_pending()

    if any(x['email'].lower() == email for x in users) or any(x['email'].lower() == email for x in pending):
        return jsonify({"ok": False, "msg": "Email already exists"})

    if email in [a['email'].lower() for a in ADMINS]:
        return jsonify({"ok": False, "msg": "This email is reserved for admin"})

    if role == 'creator':
        # Creator goes to pending
        creator_data = {
            "name": name,
            "email": email,
            "password": password,
            "role": "creator",
            "portfolio": data.get('portfolio',''),
            "bio": data.get('bio',''),
            "code": data.get('code',''),
            "verified": False,
            "date": datetime.now().strftime("%d-%m-%Y %H:%M")
        }
        pending.append(creator_data)
        save_pending(pending)
        return jsonify({"ok": True, "msg": "Creator request sent! Wait for admin approval"})
    else:
        # Reader direct
        new_user = {
            "name": name,
            "email": email,
            "password": password,
            "role": "reader",
            "verified": True,
            "date": datetime.now().strftime("%d-%m-%Y")
        }
        users.append(new_user)
        save_users(users)
        return jsonify({"ok": True, "msg": "Account created! Login now"})

# ===== ADMIN APIs =====
@app.route('/api/users', methods=['GET'])
def all_users():
    users = get_users()
    # Add admins to list for display (without passwords)
    display_admins = [{"name": a['name'], "email": a['email'], "role": "admin", "verified": True, "date": "Admin"} for a in ADMINS]
    return jsonify(display_admins + users)

@app.route('/api/pending', methods=['GET'])
def pending_list():
    return jsonify(get_pending())

@app.route('/api/approve', methods=['POST'])
def approve():
    email = request.json.get('email','').lower()
    pending = get_pending()
    users = get_users()

    user_to_approve = next((x for x in pending if x['email'].lower() == email), None)
    if not user_to_approve:
        return jsonify({"ok": False, "msg": "Not found in pending"})

    user_to_approve['verified'] = True
    users.append(user_to_approve)
    save_users(users)

    # Remove from pending
    pending = [x for x in pending if x['email'].lower()!= email]
    save_pending(pending)

    return jsonify({"ok": True, "msg": "Approved!"})

@app.route('/api/delete', methods=['POST'])
def delete_user():
    email = request.json.get('email','').lower()

    # PROTECTION: Cannot delete admins
    if email in [a['email'].lower() for a in ADMINS]:
        return jsonify({"ok": False, "msg": "⛔ Cannot delete admin account! Protected"}), 403

    users = get_users()
    pending = get_pending()

    users = [u for u in users if u['email'].lower()!= email]
    pending = [p for p in pending if p['email'].lower()!= email]

    save_users(users)
    save_pending(pending)

    return jsonify({"ok": True, "msg": "Deleted"})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3000))
    print(f"🔥 Gen-Z Visual Python Server running on port {port}")
    print(f"🔥 Firewall Active - Admins: {[a['email'] for a in ADMINS]}")
    app.run(host='0.0.0.0', port=port, debug=False)
