'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const multer = require('multer');

const { env } = require('../config/env');
const { prisma } = require('../lib/prisma');
const { HttpError } = require('../lib/http-error');
const { serializeReceipt } = require('../serializers');
const { parseReceiptName } = require('../services/receiptParser');

const UPLOAD_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR);

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(HttpError.badRequest(`Unsupported file type "${file.mimetype}". Upload a JPEG, PNG, WEBP, HEIC or PDF.`));
      return;
    }
    cb(null, true);
  },
}).single('file');

// ---------------------------------------------------------------------------
// GET /api/receipts
// ---------------------------------------------------------------------------
async function listReceipts(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      prisma.receipt.count({ where: { userId: req.userId } }),
    ]);

    res.json({
      receipts: receipts.map(serializeReceipt),
      pagination: { total, limit, offset, hasMore: offset + receipts.length < total },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/receipts  (multipart/form-data, field name: `file`)
// ---------------------------------------------------------------------------
async function uploadReceipt(req, res, next) {
  try {
    if (!req.file) throw HttpError.badRequest('No file was uploaded. Send a multipart body with a `file` field.');

    const parsed = parseReceiptName(req.file.originalname);

    const receipt = await prisma.receipt.create({
      data: {
        userId: req.userId,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        // Parsing is synchronous and deterministic, so the record is final by
        // the time it is written. FAILED is reserved for genuinely unreadable
        // files, which never reach this point.
        status: 'EXTRACTED',
        vendor: parsed.vendor,
        totalCents: parsed.totalCents,
        notes: req.body?.notes ?? null,
      },
    });

    res.status(201).json({
      receipt: serializeReceipt(receipt),
      extraction: { confidence: parsed.confidence, source: 'filename' },
    });
  } catch (error) {
    next(error);
  }
}

async function findOwnedReceipt(userId, id) {
  const receipt = await prisma.receipt.findFirst({ where: { id, userId } });
  if (!receipt) throw HttpError.notFound('That receipt does not exist.');
  return receipt;
}

// ---------------------------------------------------------------------------
// GET /api/receipts/:id/file
// ---------------------------------------------------------------------------
async function downloadReceipt(req, res, next) {
  try {
    const receipt = await findOwnedReceipt(req.userId, req.params.id);
    const filePath = path.join(UPLOAD_DIR, receipt.storedName);

    try {
      await fs.access(filePath);
    } catch {
      throw HttpError.notFound('The stored file for this receipt is no longer available.');
    }

    res.setHeader('Content-Type', receipt.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(receipt.originalName)}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/receipts/:id
// ---------------------------------------------------------------------------
async function updateReceipt(req, res, next) {
  try {
    await findOwnedReceipt(req.userId, req.params.id);
    const { vendor, total, notes } = req.body ?? {};

    const receipt = await prisma.receipt.update({
      where: { id: req.params.id },
      data: {
        ...(vendor !== undefined ? { vendor } : {}),
        ...(total !== undefined ? { totalCents: total === null ? null : Math.round(Number(total) * 100) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    res.json({ receipt: serializeReceipt(receipt) });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/receipts/:id
// ---------------------------------------------------------------------------
async function deleteReceipt(req, res, next) {
  try {
    const receipt = await findOwnedReceipt(req.userId, req.params.id);

    // Remove the row first: an orphaned file is recoverable, a row pointing at
    // a missing file is not.
    await prisma.receipt.delete({ where: { id: receipt.id } });
    await fs.rm(path.join(UPLOAD_DIR, receipt.storedName), { force: true });

    res.json({ message: 'Receipt deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  upload,
  listReceipts,
  uploadReceipt,
  downloadReceipt,
  updateReceipt,
  deleteReceipt,
};
