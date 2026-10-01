const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    storageUrl: {
      type: String,
      required: true,
    },
    storageType: {
      type: String,
      enum: ['cloudinary', 'local'],
      default: 'local',
    },
    publicId: {
      type: String,
      default: null,
    },
    extractedText: {
      type: String,
      default: '',
    },
    isCritical: {
      type: Boolean,
      default: false,
      index: true,
    },
    summary: {
      type: String,
      default: '',
    },
    keywords: {
      type: [String],
      default: [],
    },
    suggestedCategory: {
      type: String,
      default: '',
    },
    suggestedFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ userId: 1, isCritical: 1 });
fileSchema.index({ userId: 1, folderId: 1 });
fileSchema.index({ userId: 1, name: 'text' });

module.exports = mongoose.model('File', fileSchema);
