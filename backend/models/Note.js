const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: 100,
    },
    body: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
