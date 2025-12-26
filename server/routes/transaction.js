const router = require("express").Router();
const verify = require("./verifyToken"); // Your existing middleware
const {
  addTransaction,
  getTransactions,
} = require("../controllers/transactionController");

// Route to Add (POST)
router.post("/add", verify, addTransaction);

// Route to View (GET)
router.get("/", verify, getTransactions);

module.exports = router;
