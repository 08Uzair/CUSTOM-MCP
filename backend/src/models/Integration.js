import mongoose from 'mongoose';

/**
 * An integration captures everything needed to generate a project for a
 * user's API. Sensitive values (tokens, passwords) are NEVER stored here:
 * authConfig only keeps metadata and a `configured` flag; the real secrets
 * are never persisted by the platform at any point.
 */
const integrationSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    appUrl: { type: String, required: true, trim: true },
    apiBaseUrl: { type: String, required: true, trim: true },

    authType: {
      type: String,
      enum: ['none', 'bearer', 'api-key', 'custom-header', 'basic'],
      default: 'none',
    },
    authConfig: {
      headerName: { type: String, trim: true }, // custom header name, if any
      apiKeyHeader: { type: String, trim: true }, // e.g. x-api-key
      usernameLabel: { type: String, trim: true }, // human label, never the value
      configured: { type: Boolean, default: false },
    },

    aiConfig: {
      provider: { type: String, enum: ['groq'], default: 'groq' },
      model: { type: String, trim: true, default: '' },
    },

    discovery: mongoose.Schema.Types.Mixed,
    endpoints: { type: [mongoose.Schema.Types.Mixed], default: [] },
    tools: { type: [mongoose.Schema.Types.Mixed], default: [] },

    status: {
      type: String,
      enum: ['draft', 'generating', 'ready', 'failed'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

export const Integration = mongoose.model('Integration', integrationSchema);