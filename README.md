# VALMONEY

### The Enterprise-Grade Debt Payoff Engine.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-MERN-green.svg)
![Status](https://img.shields.io/badge/status-Production-orange.svg)

**Valmoney** is a high-fidelity financial dashboard designed to eliminate debt using advanced algorithmic strategies (Avalanche vs. Snowball). Built with a "Lux-Fintech" aesthetic, it features real-time analytics, secure JWT authentication, and a persistent MongoDB architecture.

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


**🏗 Architecture**

The application utilizes a decoupled Client-Server architecture:

Frontend: React.js (Vite), Tailwind CSS, Framer Motion, Recharts.

Backend: Node.js, Express.js (REST API).

Database: MongoDB (Mongoose ODM).

Security: BCrypt hashing, JWT (JSON Web Tokens), HttpOnly Cookies.

**🚀 Key Features**

Algorithmic Engine: Toggles between Avalanche (Highest Interest) and Snowball (Lowest Balance) strategies to calculate exact payoff dates and interest saved.

Secure Identity: Full authentication flow with password hashing and session management.

Receipt Vault: Drag-and-drop interface for document management (simulated AI processing).

Ledger System: Transaction tracking with export-to-CSV functionality.

Lux UI: A "Glass & Steel" design system with dark/light mode persistence.

**🔧 Environment Variables**

To run this project, you will need to add the following environment variables to your .env file in the server folder:

MONGO_URI - Your MongoDB connection string. JWT_SECRET - A secret key for signing tokens. PORT - (Optional) Defaults to 5001.

**📂 Project Structure**

Valmoney/
├── client/             # React Frontend
│   ├── src/
│   │   ├── components/ # Reusable UI Cards, Sidebar
│   │   ├── pages/      # Dashboard, Ledger, Profile
│   │   └── context/    # Theme & Auth Context
│   └── ...
├── server/             # Node Backend
│   ├── models/         # Mongoose Schemas (User, Debt)
│   ├── routes/         # API Endpoints
│   ├── controllers/    # Business Logic & Algorithms
│   └── ...
└── ...

**🤝 Contributing**

Contributions are always welcome!

Fork the repository.

Create a feature branch (git checkout -b feature/amazing-feature).

Commit your changes.

Open a Pull Request.

**Built with ❤️ by Sathish.**
