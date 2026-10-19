'use strict';

const router = require('express').Router();

const controller = require('../controllers/transactionController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const v = require('../validators');

router.use(requireAuth);

// Registered before `/:id` so the literal paths win.
router.get('/summary', controller.getSummary);
router.get('/export', controller.exportTransactions);

router.get('/', validate(v.listTransactionsQuerySchema, 'query'), controller.listTransactions);
router.post('/', validate(v.createTransactionSchema), controller.createTransaction);

router.patch('/:id', validate(v.updateTransactionSchema), controller.updateTransaction);
router.delete('/:id', controller.deleteTransaction);

module.exports = router;
