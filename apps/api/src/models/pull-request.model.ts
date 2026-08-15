import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const pullRequestSchema = new Schema(
  {
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    githubPrNumber: { type: Number, required: true },
    githubPrId: { type: Number, required: true },
    title: { type: String, required: true },
    body: { type: String },
    authorLogin: { type: String, required: true },
    baseBranch: { type: String, required: true },
    headBranch: { type: String, required: true },
    baseSha: { type: String, required: true },
    headSha: { type: String, required: true },
    diffHash: { type: String, index: true },
    status: {
      type: String,
      enum: ['open', 'closed', 'merged'],
      default: 'open',
    },
    debtScore: { type: Number, min: 0, max: 100 },
    reviewStatus: {
      type: String,
      enum: ['idle', 'queued', 'running', 'completed', 'failed'],
      default: 'idle',
      index: true,
    },
    lastReviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
  },
  { timestamps: true },
);

pullRequestSchema.index({ repositoryId: 1, githubPrNumber: 1 }, { unique: true });

export type PullRequestDocument = InferSchemaType<typeof pullRequestSchema> & {
  _id: Types.ObjectId;
};

export const PullRequestModel = model('PullRequest', pullRequestSchema);
