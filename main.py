# Gen-Z Visual - Python Entry Point - FIXED FOR RENDER
import os, sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app import app as application
    print("✅ Backend Loaded - Firewall Active - Gen-Z Visual v350")
except Exception as e:
    print(f"Import warning: {e} - Run from backend folder")

if __name__ == "__main__":
    from backend.app import app
    port = int(os.environ.get("PORT", 10000))  # FIXED: Render auto PORT
    print(f"🚀 Starting on port {port}")
    print(f"🛡️ Firewall v350 Active")
    print(f"👑 Protected Admins: xhettriakash1@gmail.com, akashchettri2003@gmail.com")
    app.run(host='0.0.0.0', port=port, debug=False)
