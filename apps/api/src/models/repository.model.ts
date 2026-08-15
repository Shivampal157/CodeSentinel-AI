import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const repositorySchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    githubId: { type: Number, required: true, unique: true },
    fullName: { type: String, required: true, index: true },
    name: { type: String, required: true },
    ownerLogin: { type: String, required: true },
    defaultBranch: { type: String, required: true, default: 'main' },
    htmlUrl: { type: String, required: true },
    private: { type: Boolean, default: false },
    indexedCommitSha: { type: String },
    indexStatus: {
      type: String,
      enum: ['pending', 'indexing', 'ready', 'failed'],
      default: 'pending',
      index: true,
    },
    indexError: { type: String },
    chunkCount: { type: Number, default: 0 },
    lastIndexedAt: { type: Date },
  },
  { timestamps: true },
);

repositorySchema.index({ ownerId: 1, fullName: 1 });

export type RepositoryDocument = InferSchemaType<typeof repositorySchema> & {
  _id: Types.ObjectId;
};

export const RepositoryModel = model('Repository', repositorySchema);
