import { Router } from "express";
import { isDbConnected } from "../config/db.js";
import { SavedRepository } from "../models/SavedRepository.js";
import { getRepository } from "../services/githubService.js";
import { AppError } from "../utils/AppError.js";
import { validateObjectId, validateRepoIdentifier } from "../utils/validators.js";

const router = Router();

router.use((_req, _res, next) => {
  if (!isDbConnected()) {
    throw new AppError(503, "Database is not available right now. Please try again shortly.", "DB_UNAVAILABLE");
  }
  next();
});

const alreadySavedError = (fullName) =>
  new AppError(409, `"${fullName}" is already in your saved repositories.`, "ALREADY_SAVED");

router.get("/", async (_req, res) => {
  const items = await SavedRepository.find().sort({ savedAt: -1 });
  res.json({ items, total: items.length });
});

router.post("/", async (req, res) => {
  const { owner, name } = validateRepoIdentifier(req.body?.owner, req.body?.name);
  const repo = await getRepository(owner, name);

  const existing = await SavedRepository.exists({ githubId: repo.id });
  if (existing) throw alreadySavedError(repo.fullName);

  try {
    const saved = await SavedRepository.create({
      githubId: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      owner: { login: repo.owner.login, avatarUrl: repo.owner.avatarUrl },
      description: repo.description,
      htmlUrl: repo.htmlUrl,
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
    });
    res.status(201).json(saved);
  } catch (error) {
    if (error?.code === 11000) throw alreadySavedError(repo.fullName);
    throw error;
  }
});

router.delete("/:id", async (req, res) => {
  const id = validateObjectId(req.params.id);
  const deleted = await SavedRepository.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError(404, "Saved repository not found. It may have already been removed.", "SAVED_NOT_FOUND");
  }
  res.json({ id, removed: true });
});

export default router;
