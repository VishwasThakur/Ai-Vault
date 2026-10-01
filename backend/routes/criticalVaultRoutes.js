const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, protectCriticalVault } = require('../middleware/auth');
const { pinLimiter } = require('../middleware/rateLimiter');
const {
  unlockVault,
  resetVaultPin,
  getCriticalFiles,
  uploadCriticalFile,
  downloadCriticalFile,
  deleteCriticalFile,
} = require('../controllers/criticalVaultController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/unlock', protect, pinLimiter, unlockVault);
router.post('/reset-pin', protect, resetVaultPin);
router.get('/files', protectCriticalVault, getCriticalFiles);
router.post('/upload', protectCriticalVault, upload.single('file'), uploadCriticalFile);
router.get('/files/:id/download', protectCriticalVault, downloadCriticalFile);
router.delete('/files/:id', protectCriticalVault, deleteCriticalFile);

module.exports = router;
