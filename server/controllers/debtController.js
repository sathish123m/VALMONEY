const Debt = require("../models/Debt");

exports.addDebt = async (req, res) => {
  try {
    // --- DEBUG LOGS START ---
    console.log("1. Request Body Received:", req.body);
    console.log("2. User Object from Token:", req.user);
    // --- DEBUG LOGS END ---

    const { name, balance, interestRate, minPayment } = req.body;

    // Check if user exists before crashing
    if (!req.user || !req.user._id) {
      console.log("❌ Error: User ID is missing from request.");
      return res
        .status(401)
        .json({ message: "User authentication failed. No ID found." });
    }

    const newDebt = new Debt({
      user: req.user._id,
      name,
      balance: Number(balance),
      interestRate: Number(interestRate),
      minPayment: Number(minPayment),
    });

    const savedDebt = await newDebt.save();
    console.log("✅ Debt Saved Successfully:", savedDebt);
    res.json(savedDebt);
  } catch (err) {
    console.log("❌ Save Error:", err.message); // Print the exact error
    res.status(400).json({ message: err.message });
  }
};

exports.getStrategyProjection = async (req, res) => {
  try {
    const debts = await Debt.find({ user: req.user._id });
    const extraBudget = 1000; // Default extra monthly payment

    // 1. HELPER: Payoff Algorithm
    const calculatePayoff = (debtsData, strategy) => {
      let currentDebts = debtsData.map((d) => ({
        name: d.name,
        currentBalance: d.balance,
        interestRate: d.interestRate,
        minPayment: d.minPayment,
      }));

      let timeline = [];
      let months = 0;
      let totalInterest = 0;

      // Snapshot 0
      let startBal = currentDebts.reduce((acc, d) => acc + d.currentBalance, 0);
      timeline.push({ name: "Start", val: Math.round(startBal) });

      while (months < 120 && startBal > 0) {
        months++;
        let monthlyBudget = extraBudget;

        // Sort Strategy
        if (strategy === "avalanche")
          currentDebts.sort((a, b) => b.interestRate - a.interestRate);
        else currentDebts.sort((a, b) => a.currentBalance - b.currentBalance);

        // Pay Minimums
        currentDebts.forEach((d) => {
          if (d.currentBalance > 0) {
            let interest = d.currentBalance * (d.interestRate / 100 / 12);
            d.currentBalance += interest;
            totalInterest += interest;
            let pay = Math.min(d.currentBalance, d.minPayment);
            d.currentBalance -= pay;
            monthlyBudget -= pay;
          }
        });

        // Pay Extra (The Snowball/Avalanche Effect)
        for (let d of currentDebts) {
          if (d.currentBalance > 0 && monthlyBudget > 0) {
            let pay = Math.min(d.currentBalance, monthlyBudget);
            d.currentBalance -= pay;
            monthlyBudget -= pay;
          }
        }

        let totalBal = currentDebts.reduce(
          (acc, d) => acc + d.currentBalance,
          0
        );
        timeline.push({
          name: `Month ${months}`,
          val: Math.max(0, Math.round(totalBal)),
        });
        if (totalBal <= 1) break;
      }
      return { timeline, totalInterest: Math.round(totalInterest), months };
    };

    const avalanche = calculatePayoff(debts, "avalanche");
    const snowball = calculatePayoff(debts, "snowball");

    res.json({ debts, avalanche, snowball });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
