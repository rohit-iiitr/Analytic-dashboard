import mongoose from "mongoose";

const savedRepositorySchema = new mongoose.Schema(
  {
    githubId: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    owner: {
      login: { type: String, required: true },
      avatarUrl: { type: String, default: "" },
    },
    description: { type: String, default: "" },
    htmlUrl: { type: String, required: true },
    language: { type: String, default: null },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: "savedAt", updatedAt: true },
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

export const SavedRepository = mongoose.model("SavedRepository", savedRepositorySchema);
