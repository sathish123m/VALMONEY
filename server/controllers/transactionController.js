const Transaction = require("../models/Transaction");

// 1. Add a New Transaction
exports.addTransaction = async (req, res) => {
  try {
    const { description, amount, category } = req.body;

    // Validation: Ensure fields exist
    if (!description || !amount || !category) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    const newTransaction = new Transaction({
      user: req.user._id, // Gets ID from the token
      description,
      amount: Number(amount),
      category,
    });

    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Get All Transactions for the User
exports.getTransactions = async (req, res) => {
  try {
    // Find transactions belonging to this specific user & sort by newest first
    const transactions = await Transaction.find({ user: req.user._id }).sort({
      date: -1,
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
