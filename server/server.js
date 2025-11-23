require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoute = require('./routes/auth');
const debtRoute = require('./routes/debt');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to DB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Connection Error:', err));

// Route Middlewares
app.use('/api/user', authRoute);
app.use('/api/debts', debtRoute);

const PORT = 5001;
app.listen(PORT, () => console.log(`Server Up and Running on port ${PORT}`));