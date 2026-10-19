'use strict';

const router = require('express').Router();

const userRoutes = require('./user');
const debtRoutes = require('./debts');
const transactionRoutes = require('./transactions');
const receiptRoutes = require('./receipts');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// `user` (not `auth`) keeps the original `/api/user/...` namespace stable.
router.use('/user', userRoutes);
router.use('/debts', debtRoutes);
router.use('/transactions', transactionRoutes);
router.use('/receipts', receiptRoutes);

router.get('/dashboard', requireAuth, dashboardController.getDashboard);

module.exports = router;
