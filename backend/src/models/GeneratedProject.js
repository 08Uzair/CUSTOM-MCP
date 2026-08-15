import mongoose from 'mongoose';

/**
 * Points at the ZIP artifacts created for one integration. Only file
 * metadata (names, sizes, checksums) is stored - the zips themselves live in
 * the artifact directory, never in the database.
 */
const generatedProjectSchema = new mongoose.Schema(
  {
    integrationId: { type: String, required: true, index: true },
    jobId: { type: String },
    projectName: { type: String, required: true },
    version: { type: String, default: '1.0.0' },
    status: {
      type: String,
      enum: ['generating', 'ready', 'expired'],
      default: 'generating',
    },
    artifacts: {
      complete: {
        fileName: String,
        sizeBytes: Number,
        sha256: String,
        createdAt: Date,
      },
      parts: {
        aiServer: { fileName: String, sizeBytes: Number, sha256: String, createdAt: Date },
        mcpServer: { fileName: String, sizeBytes: Number, sha256: String, createdAt: Date },
        aiChat: { fileName: String, sizeBytes: Number, sha256: String, createdAt: Date },
      },
    },
  },
  { timestamps: true }
);

export const GeneratedProject = mongoose.model('GeneratedProject', generatedProjectSchema);