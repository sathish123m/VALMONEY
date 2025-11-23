const mongoose = require('mongoose');

const DebtSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  balance: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  minPayment: { type: Number, required: true }
});

module.exports = mongoose.model('Debt', DebtSchema);