const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    vaultId: {
      type: String,
      unique: true,
      index: true,
    },
    vaultPin: {
      type: String,
      required: [true, 'Please provide a 6-digit Vault PIN'],
    },
    pinAttempts: {
      type: Number,
      default: 0,
    },
    pinLockUntil: {
      type: Date,
      default: null,
    },
    storageUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.vaultPin;
    delete ret.pinAttempts;
    delete ret.pinLockUntil;
    return ret;
  },
});

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    const passwordSalt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, passwordSalt);
  }
  if (this.isModified('vaultPin') && !this.vaultPin.startsWith('$2')) {
    const pinSalt = await bcrypt.genSalt(12);
    this.vaultPin = await bcrypt.hash(this.vaultPin, pinSalt);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.matchVaultPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.vaultPin);
};

module.exports = mongoose.model('User', userSchema);
