'use strict';

const router = require('express').Router();

const controller = require('../controllers/debtController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const v = require('../validators');

router.use(requireAuth);

// `/strategy` must be registered before `/:id`, or Express will treat the word
// "strategy" as a debt id.
router.get('/strategy', validate(v.strategyQuerySchema, 'query'), controller.getStrategy);

router.get('/', controller.listDebts);
router.post('/', validate(v.createDebtSchema), controller.createDebt);

// Kept so the original client (`POST /api/debts/add`) keeps working.
router.post('/add', validate(v.createDebtSchema), controller.createDebt);

router.get('/:id', controller.getDebt);
router.patch('/:id', validate(v.updateDebtSchema), controller.updateDebt);
router.delete('/:id', controller.deleteDebt);

module.exports = router;
