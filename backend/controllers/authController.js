const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Folder = require('../models/Folder');
const { getJwtSecret } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  });
};

const generateVaultId = () => {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `VX-${randomHex}`;
};

const register = async (req, res) => {
  try {
    const { name, email, password, pin } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanedPin = String(pin || '').trim();
    if (!/^\d{6}$/.test(cleanedPin)) {
      return res.status(400).json({
        success: false,
        message: 'Vault PIN must be exactly 6 numeric digits (e.g. 123456)',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    let vaultId = generateVaultId();
    let isUnique = false;
    while (!isUnique) {
      const existingVault = await User.findOne({ vaultId });
      if (!existingVault) {
        isUnique = true;
      } else {
        vaultId = generateVaultId();
      }
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      vaultId,
      vaultPin: cleanedPin,
    });

    const defaultFolders = ['College', 'Projects', 'Personal'];
    await Promise.all(
      defaultFolders.map((folderName) =>
        Folder.create({
          userId: user._id,
          name: folderName,
          isDefault: true,
        })
      )
    );

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      vaultId: user.vaultId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        vaultId: user.vaultId,
        storageUsed: user.storageUsed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email and password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      vaultId: user.vaultId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        vaultId: user.vaultId,
        storageUsed: user.storageUsed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -vaultPin -pinAttempts -pinLockUntil');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        vaultId: user.vaultId,
        storageUsed: user.storageUsed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user profile',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
