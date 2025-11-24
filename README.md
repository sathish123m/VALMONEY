# VELOX (formerly FinTrack)

### The Enterprise-Grade Debt Payoff Engine.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-MERN-green.svg)
![Status](https://img.shields.io/badge/status-Production-orange.svg)

**Velox** is a high-fidelity financial dashboard designed to eliminate debt using advanced algorithmic strategies (Avalanche vs. Snowball). Built with a "Lux-Fintech" aesthetic, it features real-time analytics, secure JWT authentication, and a persistent MongoDB architecture.

---

## ⚡️ Quick Start (Runnable Code)

If you have Node.js and MongoDB installed, copy and paste this entire block into your terminal to get started immediately:

```bash
# 1. Clone the repository
git clone [https://github.com/sathish123m/VALMONEY.git](https://github.com/sathish123m/VALMONEY.git)
cd VALMONEY

# 2. Setup Backend (Server)
cd server
npm install
# Create local environment variables
echo "MONGO_URI=mongodb://127.0.0.1:27017/fintrack" >> .env
echo "JWT_SECRET=dev_secret_key_123" >> .env
echo "PORT=5001" >> .env

# 3. Setup Frontend (Client)
cd ../client
npm install

# 4. Run the System
echo "Setup Complete! Open two terminals:"
echo "Terminal 1 (Server): cd server && npm start"
echo "Terminal 2 (Client): cd client && npm run dev"
```
