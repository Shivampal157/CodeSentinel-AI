import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const debtScoreSchema = new Schema(
  {
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    pullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest', index: true },
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
    scope: { type: String, enum: ['file', 'pr', 'repo'], required: true },
    filePath: { type: String },
    score: { type: Number, required: true, min: 0, max: 100 },
    findingsCount: { type: Number, default: 0 },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

debtScoreSchema.index({ repositoryId: 1, scope: 1, recordedAt: -1 });
debtScoreSchema.index({ pullRequestId: 1, recordedAt: -1 });

export type DebtScoreDocument = InferSchemaType<typeof debtScoreSchema> & {
  _id: Types.ObjectId;
};

export const DebtScoreModel = model('DebtScore', debtScoreSchema);
