import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const commentSchema = new Schema(
  {
    pullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest', required: true, index: true },
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    filePath: { type: String, required: true },
    line: { type: Number, required: true },
    side: { type: String, enum: ['LEFT', 'RIGHT'], default: 'RIGHT' },
    body: { type: String, required: true, maxlength: 8000 },
    resolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    source: { type: String, enum: ['human', 'ai'], default: 'human' },
  },
  { timestamps: true },
);

commentSchema.index({ pullRequestId: 1, filePath: 1, line: 1 });

export type CommentDocument = InferSchemaType<typeof commentSchema> & { _id: Types.ObjectId };

export const CommentModel = model('Comment', commentSchema);
