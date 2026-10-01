const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const File = require('../models/File');
const { getVaultTokenSecret } = require('../middleware/auth');
const { extractTextFromFile, isDocumentAiSupported } = require('../utils/textExtractor');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const unlockVault = async (req, res) => {
  try {
    const { pin } = req.body;
    const cleanedPin = String(pin || '').trim();

    if (!cleanedPin) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your 6-digit Vault PIN',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.pinLockUntil && user.pinLockUntil.getTime() > Date.now()) {
      const minutesRemaining = Math.max(1, Math.ceil((user.pinLockUntil.getTime() - Date.now()) / 60000));
      return res.status(423).json({
        success: false,
        message: `Too many failed PIN attempts. Critical Vault is temporarily locked. Try again in ${minutesRemaining} minute(s).`,
      });
    }

    const isMatch = await user.matchVaultPin(cleanedPin);

    if (!isMatch) {
      const attempts = (user.pinAttempts || 0) + 1;
      user.pinAttempts = attempts;

      if (attempts >= 5) {
        user.pinLockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        return res.status(423).json({
          success: false,
          message: 'Too many failed PIN attempts. Critical Vault is locked for 15 minutes.',
        });
      }

      await user.save();
      return res.status(401).json({
        success: false,
        message: `Invalid Vault PIN. ${5 - attempts} attempt(s) remaining before temporary lockout.`,
      });
    }

    user.pinAttempts = 0;
    user.pinLockUntil = null;
    await user.save();

    const vaultToken = jwt.sign(
      {
        id: user._id.toString(),
        type: 'critical_vault',
      },
      getVaultTokenSecret(),
      {
        expiresIn: process.env.CRITICAL_VAULT_EXPIRES_IN || '15m',
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Critical Vault unlocked successfully',
      vaultToken,
      expiresIn: '15m',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error unlocking Critical Vault',
    });
  }
};

const resetVaultPin = async (req, res) => {
  try {
    const { password, newPin } = req.body;

    if (!password || !newPin) {
      return res.status(400).json({
        success: false,
        message: 'Account password and a new 6-digit PIN are required',
      });
    }

    const cleanedPin = String(newPin).trim();
    if (!/^\d{6}$/.test(cleanedPin)) {
      return res.status(400).json({
        success: false,
        message: 'New PIN must be exactly 6 numeric digits',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect account password',
      });
    }

    user.vaultPin = cleanedPin;
    user.pinAttempts = 0;
    user.pinLockUntil = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Vault PIN reset successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error resetting Vault PIN',
    });
  }
};

const getCriticalFiles = async (req, res) => {
  try {
    const files = await File.find({
      userId: req.user._id,
      isCritical: true,
    }).sort({ createdAt: -1 });

    const formattedFiles = files.map((file) => ({
      _id: file._id,
      name: file.name,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      extension: file.extension,
      storageType: file.storageType,
      isAiSupported: isDocumentAiSupported(file.name),
      hasText: Boolean(file.extractedText && file.extractedText.length > 0),
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      count: formattedFiles.length,
      files: formattedFiles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving critical files',
    });
  }
};

const uploadCriticalFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a file to upload',
      });
    }

    const rawFile = req.file;
    const originalName = rawFile.originalname;
    const extension = path.extname(originalName).replace('.', '').toLowerCase();

    let extractedText = '';
    try {
      extractedText = await extractTextFromFile(rawFile.buffer, originalName, rawFile.mimetype);
    } catch (err) {
      extractedText = '';
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const uniqueFilename = `${Date.now()}-critical-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destinationPath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(destinationPath, rawFile.buffer);

    const storageUrl = `/uploads/${uniqueFilename}`;

    const newFile = await File.create({
      userId: req.user._id,
      name: originalName,
      originalName,
      size: rawFile.size,
      mimeType: rawFile.mimetype,
      extension,
      storageUrl,
      storageType: 'local',
      publicId: uniqueFilename,
      extractedText,
      isCritical: true,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: rawFile.size },
    });

    return res.status(201).json({
      success: true,
      message: 'Document secured in Critical Vault',
      file: {
        _id: newFile._id,
        name: newFile.name,
        size: newFile.size,
        extension: newFile.extension,
        mimeType: newFile.mimeType,
        isAiSupported: isDocumentAiSupported(newFile.name),
        hasText: Boolean(newFile.extractedText && newFile.extractedText.length > 0),
        createdAt: newFile.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error uploading to Critical Vault',
    });
  }
};

const downloadCriticalFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isCritical: true,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const localPath = path.join(UPLOADS_DIR, file.publicId);
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on storage server',
      });
    }

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    return fs.createReadStream(localPath).pipe(res);
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }
};

const deleteCriticalFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isCritical: true,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    if (file.publicId) {
      const localPath = path.join(UPLOADS_DIR, file.publicId);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch (unlinkErr) {}
      }
    }

    await File.deleteOne({ _id: file._id });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: -Math.min(file.size, req.user.storageUsed || file.size) },
    });

    return res.status(200).json({
      success: true,
      message: 'Document permanently deleted from Critical Vault',
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }
};

module.exports = {
  unlockVault,
  resetVaultPin,
  getCriticalFiles,
  uploadCriticalFile,
  downloadCriticalFile,
  deleteCriticalFile,
};
