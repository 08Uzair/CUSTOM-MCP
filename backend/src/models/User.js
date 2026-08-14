import mongoose from 'mongoose';

/**
 * Minimal user model. Authentication is intentionally out of scope for v1,
 * but the schema exists so integrations can be attributed once accounts land.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, index: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);