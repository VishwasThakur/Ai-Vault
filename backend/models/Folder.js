const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: [40, 'Folder name cannot exceed 40 characters'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

folderSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Folder', folderSchema);
