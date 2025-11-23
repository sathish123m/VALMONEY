const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. REGISTER (Immediate Login)
router.post('/register', async (req, res) => {
    try {
        // Validation
        const emailExist = await User.findOne({ email: req.body.email });
        if (emailExist) return res.status(400).json({ error: 'Email already exists' });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        // Create User
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        });

        const savedUser = await user.save();

        // Create Token Immediately
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        res.header('auth-token', token).json({ token, username: user.username });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. LOGIN (Strict Checks)
router.post('/login', async (req, res) => {
    try {
        // Check Email
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(400).json({ error: 'User not found. Please Register first.' });

        // Check Password
        const validPass = await bcrypt.compare(req.body.password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Incorrect Password.' });

        // Success
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        res.header('auth-token', token).json({ token, username: user.username });

    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;