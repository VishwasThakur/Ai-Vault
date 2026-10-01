const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const User = require('../models/User');
const Folder = require('../models/Folder');
const {
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../config/cloudinary');
const { extractTextFromFile, isDocumentAiSupported } = require('../utils/textExtractor');
const { extractDocumentKeywords, suggestDocumentCategory } = require('../config/ai');

const MAX_USER_STORAGE = 100 * 1024 * 1024;
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file was uploaded',
      });
    }

    const { folderId } = req.body;
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    const size = req.file.size;
    const mimeType = req.file.mimetype;
    const extension = path.extname(originalName).replace('.', '').toLowerCase();

    const user = await User.findById(req.user._id);
    if ((user.storageUsed || 0) + size > MAX_USER_STORAGE) {
      return res.status(400).json({
        success: false,
        message: `Upload exceeds your 100MB vault quota. Current storage used: ${((user.storageUsed || 0) / (1024 * 1024)).toFixed(2)} MB.`,
      });
    }

    let validFolderId = null;
    if (folderId && folderId !== 'null' && folderId !== '') {
      const folderExists = await Folder.findOne({ _id: folderId, userId: req.user._id });
      if (folderExists) {
        validFolderId = folderExists._id;
      }
    }

    let extractedText = '';
    try {
      extractedText = await extractTextFromFile(fileBuffer, originalName, mimeType);
    } catch (parseErr) {
      extractedText = '';
    }

    let storageUrl = '';
    let storageType = 'local';
    let publicId = null;

    if (isCloudinaryConfigured()) {
      try {
        const cloudinaryResult = await uploadToCloudinary(fileBuffer, {
          filename: `${Date.now()}_${originalName}`,
          resource_type: 'auto',
        });
        storageUrl = cloudinaryResult.secure_url;
        storageType = 'cloudinary';
        publicId = cloudinaryResult.public_id;
      } catch (cloudErr) {
        const uniqueName = `${Date.now()}-${originalName.replace(/\s+/g, '_')}`;
        const localPath = path.join(UPLOADS_DIR, uniqueName);
        fs.writeFileSync(localPath, fileBuffer);
        storageUrl = `/uploads/${uniqueName}`;
        storageType = 'local';
        publicId = uniqueName;
      }
    } else {
      const uniqueName = `${Date.now()}-${originalName.replace(/\s+/g, '_')}`;
      const localPath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(localPath, fileBuffer);
      storageUrl = `/uploads/${uniqueName}`;
      storageType = 'local';
      publicId = uniqueName;
    }

    let keywords = [];
    let suggestedCategory = '';
    let suggestedFolderId = null;

    if (extractedText && extractedText.trim().length > 0 && !extractedText.startsWith('This looks like a scanned document')) {
      try {
        const userFolders = await Folder.find({ userId: req.user._id });
        const aiPromises = Promise.allSettled([
          extractDocumentKeywords(extractedText, originalName),
          suggestDocumentCategory(extractedText, originalName, userFolders),
        ]);
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 5000));
        const raceResult = await Promise.race([aiPromises, timeoutPromise]);

        if (raceResult && Array.isArray(raceResult)) {
          if (raceResult[0].status === 'fulfilled' && Array.isArray(raceResult[0].value)) {
            keywords = raceResult[0].value;
          }
          if (raceResult[1].status === 'fulfilled' && raceResult[1].value) {
            const suggestion = raceResult[1].value;
            if (String(suggestion.folderId) !== String(validFolderId)) {
              suggestedCategory = suggestion.folderName;
              suggestedFolderId = suggestion.folderId;
            }
          }
        }
      } catch (aiErr) {}
    }

    const newFile = await File.create({
      userId: req.user._id,
      folderId: validFolderId,
      name: originalName,
      originalName,
      size,
      mimeType,
      extension,
      storageUrl,
      storageType,
      publicId,
      extractedText,
      keywords,
      suggestedCategory,
      suggestedFolderId,
      isCritical: false,
    });

    user.storageUsed = (user.storageUsed || 0) + size;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        _id: newFile._id,
        name: newFile.name,
        size: newFile.size,
        extension: newFile.extension,
        mimeType: newFile.mimeType,
        folderId: newFile.folderId,
        storageUrl: newFile.storageUrl,
        keywords: newFile.keywords,
        suggestedCategory: newFile.suggestedCategory,
        suggestedFolderId: newFile.suggestedFolderId,
        isAiSupported: isDocumentAiSupported(newFile.name),
        hasText: Boolean(newFile.extractedText && newFile.extractedText.length > 0),
        createdAt: newFile.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to upload file',
    });
  }
};

const getFiles = async (req, res) => {
  try {
    const { folderId, search, type } = req.query;

    const query = {
      userId: req.user._id,
      isCritical: { $ne: true },
    };

    if (folderId && folderId !== 'all') {
      if (folderId === 'root' || folderId === 'null') {
        query.folderId = null;
      } else {
        query.folderId = folderId;
      }
    }

    if (search && search.trim() !== '') {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    if (type && type !== 'all') {
      if (type === 'pdf') {
        query.extension = 'pdf';
      } else if (type === 'doc') {
        query.extension = { $in: ['txt', 'md', 'docx', 'doc', 'rtf'] };
      } else if (type === 'data') {
        query.extension = { $in: ['csv', 'json', 'xls', 'xlsx'] };
      } else if (type === 'image') {
        query.extension = { $in: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] };
      }
    }

    const files = await File.find(query)
      .populate('folderId', 'name')
      .sort({ createdAt: -1 });

    const formattedFiles = files.map((f) => ({
      _id: f._id,
      name: f.name,
      size: f.size,
      mimeType: f.mimeType,
      extension: f.extension,
      folder: f.folderId ? f.folderId.name : 'Unassigned',
      folderId: f.folderId ? f.folderId._id : null,
      storageUrl: f.storageUrl,
      keywords: f.keywords || [],
      suggestedCategory: f.suggestedCategory || '',
      suggestedFolderId: f.suggestedFolderId || null,
      hasText: Boolean(f.extractedText && f.extractedText.length > 0 && !f.extractedText.startsWith('This looks like a scanned document')),
      isAiSupported: isDocumentAiSupported(f.name),
      createdAt: f.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: formattedFiles.length,
      files: formattedFiles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve files',
    });
  }
};

const downloadFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isCritical: { $ne: true },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    if (file.storageType === 'cloudinary') {
      return res.redirect(file.storageUrl);
    } else {
      const localFilePath = path.join(UPLOADS_DIR, file.publicId);
      if (fs.existsSync(localFilePath)) {
        return res.download(localFilePath, file.name);
      } else {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }
    }
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }
};

const deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isCritical: { $ne: true },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    if (file.storageType === 'cloudinary' && file.publicId) {
      try {
        await deleteFromCloudinary(file.publicId);
      } catch (cloudErr) {}
    } else if (file.storageType === 'local' && file.publicId) {
      const localFilePath = path.join(UPLOADS_DIR, file.publicId);
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (fsErr) {}
      }
    }

    const user = await User.findById(req.user._id);
    if (user) {
      user.storageUsed = Math.max(0, (user.storageUsed || 0) - file.size);
      await user.save();
    }

    await File.findByIdAndDelete(file._id);

    return res.status(200).json({
      success: true,
      message: `File "${file.name}" permanently deleted`,
      freedBytes: file.size,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }
};

const updateFileFolder = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isCritical: { $ne: true },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const { folderId } = req.body;
    let targetFolderId = null;

    if (folderId && folderId !== 'all' && folderId !== 'null' && folderId !== '') {
      const folder = await Folder.findOne({ _id: folderId, userId: req.user._id });
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Target folder not found',
        });
      }
      targetFolderId = folder._id;
    }

    file.folderId = targetFolderId;
    file.suggestedCategory = '';
    file.suggestedFolderId = null;
    await file.save();

    return res.status(200).json({
      success: true,
      message: 'File moved successfully',
      file: {
        _id: file._id,
        folderId: file.folderId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update file folder',
    });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile,
  updateFileFolder,
};
