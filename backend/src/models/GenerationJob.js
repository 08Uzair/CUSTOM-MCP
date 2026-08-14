import mongoose from 'mongoose';

/**
 * Tracks an asynchronous generation run. `steps` mirror the progress list
 * shown in the wizard UI, one entry per generation stage.
 */
const jobSchema = new mongoose.Schema(
  {
    integrationId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
    },
    steps: [
      {
        label: { type: String, required: true },
        status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
        detail: { type: String },
      },
    ],
    currentStep: { type: Number, default: -1 },
    error: { type: String },
    result: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const GenerationJob = mongoose.model('GenerationJob', jobSchema);