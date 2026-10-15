import { Router } from "express";
import { SORT_KEYS, getRepositoryDetails, searchRepositories } from "../services/githubService.js";
import { validateRepoIdentifier, validateSearchQuery } from "../utils/validators.js";

const router = Router();

router.get("/search", async (req, res) => {
  const params = validateSearchQuery(req.query, SORT_KEYS);
  const result = await searchRepositories(params);
  res.set("X-Cache", result.cached ? "HIT" : "MISS");
  res.json(result);
});

router.get("/:owner/:name", async (req, res) => {
  const { owner, name } = validateRepoIdentifier(req.params.owner, req.params.name);
  res.json(await getRepositoryDetails(owner, name));
});

export default router;
