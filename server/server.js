require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import Routes
const authRoute = require("./routes/auth");
const debtRoute = require("./routes/debt");
// make sure this file exists in your routes folder!
const transactionRoute = require("./routes/transaction"); // or "./routes/transactions" if you renamed it

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

// Connect to DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// Route Middlewares
app.use("/api/user", authRoute);
app.use("/api/debts", debtRoute);
app.use("/api/transactions", transactionRoute); // <--- FIXED: Added 's' to match Frontend

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server Up and Running on port ${PORT}`));
