const router = require('express').Router();
const verify = require('./verifyToken'); // Middleware
const { getStrategyProjection, addDebt } = require('../controllers/debtController');

router.get('/strategy', verify, getStrategyProjection);
router.post('/add', verify, addDebt);

module.exports = router;