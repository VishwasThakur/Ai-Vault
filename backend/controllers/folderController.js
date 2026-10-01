const Folder = require('../models/Folder');
const File = require('../models/File');

const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: 1 });

    const folderStats = await Promise.all(
      folders.map(async (folder) => {
        const fileCount = await File.countDocuments({
          userId: req.user._id,
          folderId: folder._id,
          isCritical: { $ne: true },
        });
        return {
          _id: folder._id,
          name: folder.name,
          isDefault: folder.isDefault,
          fileCount,
          createdAt: folder.createdAt,
        };
      })
    );

    const totalFilesCount = await File.countDocuments({
      userId: req.user._id,
      isCritical: { $ne: true },
    });

    return res.status(200).json({
      success: true,
      totalFiles: totalFilesCount,
      folders: folderStats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve folders',
    });
  }
};

const createFolder = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required',
      });
    }

    const trimmedName = name.trim();

    const existing = await Folder.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A folder with this name already exists',
      });
    }

    const folder = await Folder.create({
      userId: req.user._id,
      name: trimmedName,
      isDefault: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      folder: {
        _id: folder._id,
        name: folder.name,
        isDefault: folder.isDefault,
        fileCount: 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create folder',
    });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }

    if (folder.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Default system folders (College, Projects, Personal) cannot be deleted',
      });
    }

    await File.updateMany(
      { userId: req.user._id, folderId: folder._id },
      { $set: { folderId: null } }
    );

    await Folder.findByIdAndDelete(folder._id);

    return res.status(200).json({
      success: true,
      message: `Folder "${folder.name}" deleted`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete folder',
    });
  }
};

module.exports = {
  getFolders,
  createFolder,
  deleteFolder,
};
