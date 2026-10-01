const Note = require('../models/Note');

const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user._id }).sort({ updatedAt: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notes',
    });
  }
};

const createNote = async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note title is required',
      });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required',
      });
    }

    const note = await Note.create({
      userId: req.user._id,
      title: title.trim(),
      body: body.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Note created successfully',
      note,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create note',
    });
  }
};

const updateNote = async (req, res) => {
  try {
    const { title, body } = req.body;

    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    if (title && title.trim()) {
      note.title = title.trim();
    }
    if (body !== undefined) {
      note.body = body.trim();
    }

    await note.save();

    return res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      note,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update note',
    });
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: 'Note not found',
    });
  }
};

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
};
