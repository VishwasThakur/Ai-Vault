const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { summarizeDocument, askDocumentQuestion } = require('../config/ai');
const { extractTextFromFile, isDocumentAiSupported } = require('../utils/textExtractor');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const ensureFileText = async (file) => {
  if (file.extractedText && file.extractedText.trim().length > 0) {
    return file.extractedText;
  }

  try {
    if (file.storageType === 'local' && file.publicId) {
      const localPath = path.join(UPLOADS_DIR, file.publicId);
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        const text = await extractTextFromFile(buffer, file.name, file.mimeType);
        if (text) {
          file.extractedText = text;
          await file.save();
          return text;
        }
      }
    }
  } catch (err) {
    return '';
  }

  return '';
};

const summarizeFile = async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a document from your vault to summarize.',
      });
    }

    const file = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const documentText = await ensureFileText(file);

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: `File "${file.name}" has no readable text to summarize. Supported document types for AI are PDF, Word (.docx), TXT, Markdown, and CSV.`,
      });
    }

    if (documentText.startsWith('This looks like a scanned document')) {
      return res.status(400).json({
        success: false,
        message: documentText,
      });
    }

    if (file.summary && file.summary.trim().length > 0) {
      return res.status(200).json({
        success: true,
        fileId: file._id,
        fileName: file.name,
        summary: file.summary,
        cached: true,
      });
    }

    const summary = await summarizeDocument(documentText, file.name);

    file.summary = summary;
    await file.save();

    return res.status(200).json({
      success: true,
      fileId: file._id,
      fileName: file.name,
      summary,
      cached: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate summary',
    });
  }
};

const askFile = async (req, res) => {
  try {
    const { fileId, question } = req.body;

    if (!fileId || !question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select a document and enter a question.',
      });
    }

    const file = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const documentText = await ensureFileText(file);

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: `File "${file.name}" contains no readable text to answer questions from.`,
      });
    }

    if (documentText.startsWith('This looks like a scanned document')) {
      return res.status(400).json({
        success: false,
        message: documentText,
      });
    }

    const answer = await askDocumentQuestion(documentText, file.name, question.trim());

    return res.status(200).json({
      success: true,
      fileId: file._id,
      fileName: file.name,
      question: question.trim(),
      answer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to answer question',
    });
  }
};

const extractKeywords = async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required',
      });
    }

    const file = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    if (file.keywords && file.keywords.length > 0) {
      return res.status(200).json({
        success: true,
        fileId: file._id,
        keywords: file.keywords,
        cached: true,
      });
    }

    const documentText = await ensureFileText(file);

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No extractable text in document',
      });
    }

    const { extractDocumentKeywords } = require('../config/ai');
    const keywords = await extractDocumentKeywords(documentText, file.name);

    file.keywords = keywords;
    await file.save();

    return res.status(200).json({
      success: true,
      fileId: file._id,
      keywords,
      cached: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract keywords',
    });
  }
};

const suggestCategory = async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required',
      });
    }

    const file = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const documentText = await ensureFileText(file);

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No extractable text in document',
      });
    }

    const Folder = require('../models/Folder');
    const userFolders = await Folder.find({ userId: req.user._id });
    const { suggestDocumentCategory } = require('../config/ai');
    const suggestion = await suggestDocumentCategory(documentText, file.name, userFolders);

    if (suggestion) {
      file.suggestedCategory = suggestion.folderName;
      file.suggestedFolderId = suggestion.folderId;
      await file.save();
    }

    return res.status(200).json({
      success: true,
      fileId: file._id,
      suggestion,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to suggest category',
    });
  }
};

module.exports = {
  summarizeFile,
  askFile,
  extractKeywords,
  suggestCategory,
};
