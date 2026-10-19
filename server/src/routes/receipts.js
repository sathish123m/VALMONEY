'use strict';

const router = require('express').Router();

const controller = require('../controllers/receiptController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const v = require('../validators');

router.use(requireAuth);

router.get('/', validate(v.paginationQuerySchema, 'query'), controller.listReceipts);
router.post('/', controller.upload, controller.uploadReceipt);
router.get('/:id/file', controller.downloadReceipt);
router.patch('/:id', controller.updateReceipt);
router.delete('/:id', controller.deleteReceipt);

module.exports = router;
