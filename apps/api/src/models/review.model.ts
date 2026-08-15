import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const relatedContextSchema = new Schema(
  {
    filePath: { type: String, required: true },
    symbolName: { type: String },
    reason: { type: String, required: true },
    score: { type: Number },
  },
  { _id: false },
);

const findingSchema = new Schema(
  {
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      required: true,
    },
    filePath: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number },
    title: { type: String, required: true },
    body: { type: String, required: true },
    suggestion: { type: String },
    relatedContext: { type: [relatedContextSchema], default: [] },
  },
  { _id: false },
);

const reviewSchema = new Schema(
  {
    pullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    diffHash: { type: String, required: true, index: true },
    headSha: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    cacheHit: { type: Boolean, default: false },
    summary: { type: String },
    debtScore: { type: Number, min: 0, max: 100 },
    findings: { type: [findingSchema], default: [] },
    ragChunkIds: { type: [String], default: [] },
    model: { type: String },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export type ReviewDocument = InferSchemaType<typeof reviewSchema> & { _id: Types.ObjectId };

export const ReviewModel = model('Review', reviewSchema);
