import { Router, Request, Response } from "express";
import { SUPPORTED_LANGUAGES } from "../utils/languages";

const router = Router();

// GET /api/meta/languages
// Public — the shared vocabulary every client (mobile app, doctor-portal)
// should pick spoken languages from, so a doctor's `languages` and a
// patient's `language` can be compared with a plain string match instead of
// fuzzy free-text.
router.get("/languages", (_req: Request, res: Response) => {
  res.json({ languages: SUPPORTED_LANGUAGES.map((l) => l.name) });
});

export default router;
