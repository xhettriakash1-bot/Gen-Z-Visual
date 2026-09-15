# Gen-Z Visual - Python Entry Point
import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app import app as application
    print("✅ Backend Loaded - Firewall Active")
except:
    print("Run from backend folder")

if __name__ == "__main__":
    from backend.app import app
    app.run(host='0.0.0.0', port=3000, debug=True)
