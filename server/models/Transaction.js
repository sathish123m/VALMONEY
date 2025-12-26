const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true }, // Matches your UI
  amount: { type: Number, required: true }, // Matches your UI
  category: { type: String, required: true }, // Matches your UI
  date: { type: Date, default: Date.now },
  status: { type: String, default: "Completed" },
});

module.exports = mongoose.model("Transaction", TransactionSchema);
