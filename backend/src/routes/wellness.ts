import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { foodLogsContainer, workoutLogsContainer, weightLogsContainer, routinesContainer, assessmentResultsContainer, patientsContainer } from "../config/cosmos";
import { DISCOVERY_ROUTINES, getDiscoveryRoutineById } from "../data/routines";
import { getAllAssessments, getAssessmentById, computeResult } from "../data/assessments";
import { Food, searchFoods, getFoodById, calcNutrition } from "../data/foods";
import { searchExercises, getExerciseById, calcCaloriesBurned } from "../data/exercises";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

// All wellness routes require a valid patient session
router.use(requireRole("patient"));

// ── POST /api/wellness/analyze-food-image ────────────────────────────────────
// Body: { imageBase64: string, mimeType: string }
// Returns: { foodName, confidence, per100g: { calories, protein, fat, carbs, fiber }, description }
router.post("/analyze-food-image", async (req: SessionRequest, res: Response) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    res.status(503).json({ error: "AI food analysis is not configured. Please set GEMINI_API_KEY in your .env file." });
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-preview" });

    const prompt = `You are a nutrition expert. Analyze this food image and respond ONLY with a valid JSON object in exactly this format (no markdown, no extra text):
{
  "foodName": "Detected food name (be specific, e.g. 'Grilled Chicken Breast' not just 'Chicken')",
  "confidence": "high|medium|low",
  "description": "Short 1-sentence description of the food",
  "per100g": {
    "calories": <number>,
    "protein": <number in grams>,
    "fat": <number in grams>,
    "carbs": <number in grams>,
    "fiber": <number in grams>
  }
}
Rules:
- confidence = "high" if you can clearly identify the specific food
- confidence = "medium" if you can identify the food type but not the exact preparation
- confidence = "low" if the image is unclear or you are guessing
- All nutrition values must be realistic per 100 grams
- If you cannot identify any food in the image, still return the JSON with foodName="Unknown food" and confidence="low"`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
    ]);

    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: {
      foodName: string;
      confidence: "high" | "medium" | "low";
      description: string;
      per100g: { calories: number; protein: number; fat: number; carbs: number; fiber: number };
    };

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("[analyze-food-image] Failed to parse Gemini response:", text);
      res.status(500).json({ error: "AI returned an unexpected response. Please try again." });
      return;
    }

    // Sanitize / validate numeric fields
    const clean = (v: any, fallback: number) => (typeof v === "number" && !isNaN(v) ? Math.round(v * 10) / 10 : fallback);
    const response = {
      foodName: String(parsed.foodName || "Unknown food").trim(),
      confidence: (["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low") as "high" | "medium" | "low",
      description: String(parsed.description || "").trim(),
      per100g: {
        calories: clean(parsed.per100g?.calories, 0),
        protein: clean(parsed.per100g?.protein, 0),
        fat: clean(parsed.per100g?.fat, 0),
        carbs: clean(parsed.per100g?.carbs, 0),
        fiber: clean(parsed.per100g?.fiber, 0),
      },
    };

    res.json(response);
  } catch (err: any) {
    console.error("[analyze-food-image] error:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});



// ── Open Food Facts fallback ─────────────────────────────────────────────────
async function searchOpenFoodFacts(query: string): Promise<Food[]> {
  // No lc= filter — language restriction kills results for most searches.
  // Request both kcal and kJ fields so we can always derive calories.
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&json=1&page_size=15&action=process` +
    `&fields=product_name,nutriments,image_thumb_url,image_url,categories_tags`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(7000),
    headers: { "User-Agent": "WellnessCentral/1.0 (contact@wellnesscentral.app)" },
  });
  if (!res.ok) {
    console.warn(`[OFF] HTTP ${res.status} for query "${query}"`);
    return [];
  }

  const data = await res.json() as { products?: any[] };
  const products = data.products ?? [];

  const mapped: Food[] = [];
  for (const p of products) {
    const name = (p.product_name ?? "").trim();
    if (!name) continue; // only skip nameless products

    const n = p.nutriments ?? {};

    // Fix: resolve calories properly — don't rely on ?? chaining with division
    let calories = 0;
    if (n["energy-kcal_100g"] != null) {
      calories = Math.round(Number(n["energy-kcal_100g"]));
    } else if (n["energy-kj_100g"] != null) {
      calories = Math.round(Number(n["energy-kj_100g"]) / 4.184);
    } else if (n["energy_100g"] != null) {
      // OFF stores energy in kJ by default when the unit field isn't kcal
      calories = Math.round(Number(n["energy_100g"]) / 4.184);
    }

    mapped.push({
      id: `off-${name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40)}`,
      name,
      category: mapOffCategory(p.categories_tags?.[0] ?? ""),
      image: p.image_thumb_url || p.image_url ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100",
      per100g: {
        calories,
        protein: Math.round((Number(n["proteins_100g"]) || 0) * 10) / 10,
        fat: Math.round((Number(n["fat_100g"]) || 0) * 10) / 10,
        carbs: Math.round((Number(n["carbohydrates_100g"]) || 0) * 10) / 10,
        fiber: Math.round((Number(n["fiber_100g"]) || 0) * 10) / 10,
      },
      defaultServing: 100,
    });
  }

  console.log(`[OFF] "${query}" → ${mapped.length} results from ${products.length} products`);
  return mapped.slice(0, 10);
}

function mapOffCategory(tag: string): string {
  if (!tag) return "Other";
  const t = tag.toLowerCase();
  if (t.includes("meat") || t.includes("poultry") || t.includes("fish") || t.includes("seafood")) return "Protein";
  if (t.includes("dairy") || t.includes("milk") || t.includes("cheese") || t.includes("yogurt")) return "Dairy";
  if (t.includes("fruit")) return "Fruits";
  if (t.includes("vegetable") || t.includes("veggie")) return "Vegetables";
  if (t.includes("cereal") || t.includes("grain") || t.includes("bread") || t.includes("pasta") || t.includes("rice")) return "Grains";
  if (t.includes("nut") || t.includes("seed")) return "Nuts";
  if (t.includes("oil")) return "Oils";
  return "Other";
}

// ── GET /api/wellness/foods?q=rice ───────────────────────────────────────────
// 1. Search local DB first.
// 2. If query provided and local results < 5, fall back to Open Food Facts and
//    append unique results (deduped by lowercase name).
router.get("/foods", async (req: SessionRequest, res: Response) => {
  const q = ((req.query.q as string) ?? "").trim();
  const local = searchFoods(q);

  if (!q || local.length >= 5) {
    res.json({ foods: local });
    return;
  }

  try {
    const remote = await searchOpenFoodFacts(q);
    const localNames = new Set(local.map(f => f.name.toLowerCase()));
    const unique = remote.filter(f => !localNames.has(f.name.toLowerCase()));
    res.json({ foods: [...local, ...unique] });
  } catch {
    // OFF unreachable — return local results only
    res.json({ foods: local });
  }
});

// ── POST /api/wellness/food-log ──────────────────────────────────────────────
// Body: { date: "YYYY-MM-DD", meal: "Breakfast"|"Lunch"|"Snacks"|"Dinner",
//         foodId: string, quantity: number, unit?: "grams"|"ml",
//         // For OFF-sourced foods the client also sends the full nutrition snapshot:
//         foodName?: string, image?: string, per100g?: { calories, protein, fat, carbs, fiber } }
router.post("/food-log", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { date, meal, foodId, quantity, unit = "grams",
      foodName: clientFoodName, image: clientImage, per100g: clientPer100g,
      profileId } = req.body;

    if (!date || !meal || !foodId || quantity == null) {
      res.status(400).json({ error: "date, meal, foodId and quantity are required" });
      return;
    }

    // Try local DB first; if not found (OFF food), use client-supplied nutrition snapshot
    let food = getFoodById(foodId);
    if (!food && clientPer100g && clientFoodName) {
      food = {
        id: foodId,
        name: clientFoodName,
        category: "Other",
        image: clientImage ?? "",
        per100g: clientPer100g,
        defaultServing: 100,
      } as Food;
    }
    if (!food) {
      res.status(404).json({ error: "Food not found" });
      return;
    }

    const grams = Number(quantity);
    const nutrition = calcNutrition(food, grams);

    const entry = {
      id: crypto.randomUUID(),
      patientId,
      profileId: profileId ?? patientId,
      date,
      meal,
      foodId,
      foodName: food.name,
      image: food.image,
      quantity: grams,
      unit,
      calories: nutrition.calories,
      protein: nutrition.protein,
      fat: nutrition.fat,
      carbs: nutrition.carbs,
      loggedAt: new Date().toISOString(),
    };

    await foodLogsContainer.items.upsert(entry);
    res.json({ entry });
  } catch (err) {
    console.error("Food log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/food-log?date=YYYY-MM-DD ───────────────────────────────
router.get("/food-log", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    let query = "SELECT * FROM c WHERE c.patientId = @pid AND c.date = @date";
    const parameters = [
      { name: "@pid", value: patientId },
      { name: "@date", value: date },
    ];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.loggedAt ASC";

    const { resources } = await foodLogsContainer.items.query(
      { query, parameters },
      { partitionKey: patientId }
    ).fetchAll();

    res.json({ entries: resources });
  } catch (err) {
    console.error("Food log fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/wellness/food-log/:entryId ───────────────────────────────────
router.delete("/food-log/:entryId", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    await foodLogsContainer.item(req.params.entryId, patientId).delete();
    res.json({ status: "OK" });
  } catch (err: any) {
    if (err?.code === 404) { res.status(404).json({ error: "Entry not found" }); return; }
    console.error("Food log delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/exercises?q=bench ─────────────────────────────────────
router.get("/exercises", (req: SessionRequest, res: Response) => {
  const q = (req.query.q as string) ?? "";
  res.json({ exercises: searchExercises(q) });
});

// ── POST /api/wellness/workout-log ───────────────────────────────────────────
// Body: { date, exerciseId, sets?: [{weight, reps}], durationMinutes?: number }
router.post("/workout-log", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { date, exerciseId, sets, durationMinutes, profileId } = req.body;

    if (!date || !exerciseId) {
      res.status(400).json({ error: "date and exerciseId are required" });
      return;
    }

    const exercise = getExerciseById(exerciseId);
    if (!exercise) {
      res.status(404).json({ error: "Exercise not found" });
      return;
    }

    // Try to get body weight from patient profile for calorie calc
    let bodyWeightKg = 70;
    try {
      const { resource } = await patientsContainer.item(patientId, patientId).read();
      if (resource?.fitnessProfile?.weightKg) bodyWeightKg = resource.fitnessProfile.weightKg;
      else if (resource?.weight) bodyWeightKg = parseFloat(resource.weight) || 70;
    } catch { /* use default */ }

    const caloriesBurned = calcCaloriesBurned(exercise, bodyWeightKg, { sets, durationMinutes });

    // Summarise volume for strength exercises
    let totalVolumeKg: number | undefined;
    if (sets && sets.length > 0) {
      totalVolumeKg = sets.reduce((acc: number, s: { weight: number; reps: number }) => acc + s.weight * s.reps, 0);
    }

    const entry = {
      id: crypto.randomUUID(),
      patientId,
      profileId: profileId ?? patientId,
      date,
      exerciseId,
      exerciseName: exercise.name,
      category: exercise.category,
      type: exercise.type,
      image: exercise.image,
      sets: sets ?? null,
      durationMinutes: durationMinutes ?? null,
      totalVolumeKg: totalVolumeKg ?? null,
      caloriesBurned,
      loggedAt: new Date().toISOString(),
    };

    await workoutLogsContainer.items.upsert(entry);
    res.json({ entry });
  } catch (err) {
    console.error("Workout log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/workout-log?date=YYYY-MM-DD ───────────────────────────
router.get("/workout-log", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    let query = "SELECT * FROM c WHERE c.patientId = @pid AND c.date = @date";
    const parameters = [
      { name: "@pid", value: patientId },
      { name: "@date", value: date },
    ];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.loggedAt ASC";

    const { resources } = await workoutLogsContainer.items.query(
      { query, parameters },
      { partitionKey: patientId }
    ).fetchAll();

    res.json({ entries: resources });
  } catch (err) {
    console.error("Workout log fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/wellness/workout-log/:entryId ────────────────────────────────
router.delete("/workout-log/:entryId", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    await workoutLogsContainer.item(req.params.entryId, patientId).delete();
    res.json({ status: "OK" });
  } catch (err: any) {
    if (err?.code === 404) { res.status(404).json({ error: "Entry not found" }); return; }
    console.error("Workout log delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/daily-summary?date=YYYY-MM-DD&profileId=xxx ───────────
// Returns aggregated food + workout stats for a given date, scoped to the
// active profile. If ?profileId is omitted the full account-owner summary is
// returned (backwards-compatible).
router.get("/daily-summary", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    // Build profile-scoped queries — mirrors the pattern used in /food-log and /workout-log
    const foodQuery = profileId
      ? "SELECT * FROM c WHERE c.patientId = @pid AND c.date = @date AND c.profileId = @profileId"
      : "SELECT * FROM c WHERE c.patientId = @pid AND c.date = @date";
    const workoutQuery = profileId
      ? "SELECT * FROM c WHERE c.patientId = @pid AND c.date = @date AND c.profileId = @profileId"
      : "SELECT * FROM c WHERE c.patientId = @pid AND c.date = @date";

    const baseParams = [
      { name: "@pid", value: patientId },
      { name: "@date", value: date },
    ];
    const profileParams = profileId
      ? [...baseParams, { name: "@profileId", value: profileId }]
      : baseParams;

    const [{ resources: foodEntries }, { resources: workoutEntries }] = await Promise.all([
      foodLogsContainer.items.query(
        { query: foodQuery, parameters: profileParams },
        { partitionKey: patientId }
      ).fetchAll(),
      workoutLogsContainer.items.query(
        { query: workoutQuery, parameters: profileParams },
        { partitionKey: patientId }
      ).fetchAll(),
    ]);

    const totalFoodCalories = foodEntries.reduce((s: number, e: any) => s + (e.calories ?? 0), 0);
    const totalExerciseCalories = workoutEntries.reduce((s: number, e: any) => s + (e.caloriesBurned ?? 0), 0);
    const macros = {
      protein: Math.round(foodEntries.reduce((s: number, e: any) => s + (e.protein ?? 0), 0) * 10) / 10,
      fat: Math.round(foodEntries.reduce((s: number, e: any) => s + (e.fat ?? 0), 0) * 10) / 10,
      carbs: Math.round(foodEntries.reduce((s: number, e: any) => s + (e.carbs ?? 0), 0) * 10) / 10,
    };

    // Group food entries by meal
    const meals: Record<string, any[]> = { Breakfast: [], Lunch: [], Snacks: [], Dinner: [] };
    for (const entry of foodEntries) {
      if (meals[entry.meal]) meals[entry.meal].push(entry);
      else meals[entry.meal] = [entry];
    }

    res.json({
      summary: {
        date,
        totalFoodCalories,
        totalExerciseCalories,
        macros,
        meals,
        workouts: workoutEntries,
      },
    });
  } catch (err) {
    console.error("Daily summary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/assessments ────────────────────────────────────────────
// Returns metadata for all available assessments (no questions, just titles + ids).
router.get("/assessments", (_req: SessionRequest, res: Response) => {
  const list = getAllAssessments().map(({ id, title, category, description }) => ({
    id, title, category, description,
  }));
  res.json({ assessments: list });
});

// ── GET /api/wellness/assessments/:assessmentId ───────────────────────────────
// Returns full assessment definition with questions.
router.get("/assessments/:assessmentId", (req: SessionRequest, res: Response) => {
  const assessment = getAssessmentById(req.params.assessmentId);
  if (!assessment) { res.status(404).json({ error: "Assessment not found" }); return; }
  res.json({ assessment });
});

// ── POST /api/wellness/assessments/submit ────────────────────────────────────
// Body: { assessmentId, answers: { [questionId]: number } }
// Computes result, saves to Cosmos, returns the result.
router.post("/assessments/submit", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { assessmentId, answers, profileId } = req.body;
    if (!assessmentId || !answers) {
      res.status(400).json({ error: "assessmentId and answers are required" }); return;
    }
    const assessment = getAssessmentById(assessmentId);
    if (!assessment) { res.status(404).json({ error: "Assessment not found" }); return; }

    const computed = computeResult(assessment, answers);
    if (!computed) { res.status(400).json({ error: "Could not compute result" }); return; }

    const resultDoc = {
      id: crypto.randomUUID(),
      patientId,
      profileId: profileId ?? patientId,
      assessmentId,
      assessmentTitle: assessment.title,
      category: assessment.category,
      answers,
      ...computed,
      takenAt: new Date().toISOString(),
    };

    await assessmentResultsContainer.items.upsert(resultDoc);
    res.json({ result: resultDoc });
  } catch (err) {
    console.error("Assessment submit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/assessments/history ─────────────────────────────────────
// Returns all past assessment results for the authenticated patient (newest first).
router.get("/assessments/history", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    let query = "SELECT * FROM c WHERE c.patientId = @pid";
    const parameters = [{ name: "@pid", value: patientId }];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.takenAt DESC";

    const { resources } = await assessmentResultsContainer.items.query(
      { query, parameters },
      { partitionKey: patientId }
    ).fetchAll();
    res.json({ history: resources });
  } catch (err) {
    console.error("Assessment history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/assessments/history/:resultId ───────────────────────────
// Returns one specific past assessment result.
router.get("/assessments/history/:resultId", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { resource } = await assessmentResultsContainer.item(req.params.resultId, patientId).read();
    if (!resource) { res.status(404).json({ error: "Result not found" }); return; }
    res.json({ result: resource });
  } catch (err: any) {
    if (err?.code === 404) { res.status(404).json({ error: "Result not found" }); return; }
    console.error("Assessment result fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/routines/discovery ─────────────────────────────────────
// Returns the static list of pre-built discovery routines.
router.get("/routines/discovery", (_req: SessionRequest, res: Response) => {
  res.json({ routines: DISCOVERY_ROUTINES });
});

// ── GET /api/wellness/routines ───────────────────────────────────────────────
// Returns the authenticated patient's saved routines.
router.get("/routines", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { resources } = await routinesContainer.items.query(
      {
        query: "SELECT * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
        parameters: [{ name: "@pid", value: patientId }],
      },
      { partitionKey: patientId }
    ).fetchAll();
    res.json({ routines: resources });
  } catch (err) {
    console.error("Routines fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/wellness/routines ───────────────────────────────────────────────
// Body: { title, exercises: [{ exerciseId, name, image, type, defaultSets }] }
router.post("/routines", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { title, exercises } = req.body;
    if (!title || !Array.isArray(exercises)) {
      res.status(400).json({ error: "title and exercises array are required" });
      return;
    }
    const routine = {
      id: crypto.randomUUID(),
      patientId,
      title,
      exercises,
      createdAt: new Date().toISOString(),
    };
    await routinesContainer.items.upsert(routine);
    res.json({ routine });
  } catch (err) {
    console.error("Routine create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/wellness/routines/:routineId ──────────────────────────────────
router.delete("/routines/:routineId", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    await routinesContainer.item(req.params.routineId, patientId).delete();
    res.json({ status: "OK" });
  } catch (err: any) {
    if (err?.code === 404) { res.status(404).json({ error: "Routine not found" }); return; }
    console.error("Routine delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/wellness/workout-log/bulk ──────────────────────────────────────
// Logs multiple exercises in one shot (used when finishing an active session).
// Body: { date?, sessionTitle?, exercises: [{ exerciseId, sets?, durationMinutes? }] }
// All entries from one call share a generated sessionId (and the optional
// sessionTitle, e.g. a routine name) so the client can group them back into
// a single workout-history card.
router.post("/workout-log/bulk", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { date, exercises, sessionTitle, profileId } = req.body;
    if (!Array.isArray(exercises) || exercises.length === 0) {
      res.status(400).json({ error: "exercises array is required" });
      return;
    }

    let bodyWeightKg = 70;
    try {
      const { resource } = await patientsContainer.item(patientId, patientId).read();
      if (resource?.fitnessProfile?.weightKg) bodyWeightKg = resource.fitnessProfile.weightKg;
      else if (resource?.weight) bodyWeightKg = parseFloat(resource.weight) || 70;
    } catch { /* use default */ }

    const logDate = date ?? new Date().toISOString().slice(0, 10);
    const sessionId = crypto.randomUUID();
    const saved: any[] = [];

    for (const ex of exercises) {
      const exercise = getExerciseById(ex.exerciseId);
      if (!exercise) continue;
      const caloriesBurned = calcCaloriesBurned(exercise, bodyWeightKg, {
        sets: ex.sets,
        durationMinutes: ex.durationMinutes,
      });
      let totalVolumeKg: number | undefined;
      if (ex.sets?.length) {
        totalVolumeKg = ex.sets.reduce((a: number, s: { weight?: number; reps?: number }) =>
          a + (s.weight ?? 0) * (s.reps ?? 0), 0);
      }
      const entry = {
        id: crypto.randomUUID(),
        patientId,
        profileId: profileId ?? patientId,
        date: logDate,
        sessionId,
        sessionTitle: sessionTitle ?? null,
        exerciseId: ex.exerciseId,
        exerciseName: exercise.name,
        category: exercise.category,
        type: exercise.type,
        image: exercise.image,
        sets: ex.sets ?? null,
        durationMinutes: ex.durationMinutes ?? null,
        totalVolumeKg: totalVolumeKg ?? null,
        caloriesBurned,
        loggedAt: new Date().toISOString(),
      };
      await workoutLogsContainer.items.upsert(entry);
      saved.push(entry);
    }

    res.json({ saved, count: saved.length, sessionId });
  } catch (err) {
    console.error("Bulk workout log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/wellness/weight-log ────────────────────────────────────────────
// Body: { date: "YYYY-MM-DD", weightKg: number }
router.post("/weight-log", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { weightKg, date, profileId } = req.body;

    if (!weightKg || isNaN(Number(weightKg))) {
      res.status(400).json({ error: "weightKg is required and must be a number" });
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      patientId,
      profileId: profileId ?? patientId,
      date: date ?? new Date().toISOString().slice(0, 10),
      weightKg: parseFloat(weightKg),
      loggedAt: new Date().toISOString(),
    };

    await weightLogsContainer.items.upsert(entry);

    // Keep patient profile current weight in sync — only for the account
    // owner's own profile; family members' weight isn't tracked on the
    // patient document itself.
    if (!profileId || profileId === patientId) {
      try {
        const { resource } = await patientsContainer.item(patientId, patientId).read();
        if (resource) {
          await patientsContainer.items.upsert({
            ...resource,
            currentWeightKg: parseFloat(weightKg),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch { /* non-fatal */ }
    }

    res.json({ entry });
  } catch (err) {
    console.error("Weight log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/wellness/weight-log?limit=7 ────────────────────────────────────
// Returns the most recent N weight entries, sorted newest-first.
router.get("/weight-log", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const limit = parseInt((req.query.limit as string) ?? "7", 10) || 7;
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    let query = `SELECT TOP ${limit} * FROM c WHERE c.patientId = @pid`;
    const parameters = [{ name: "@pid", value: patientId }];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.date DESC";

    const { resources } = await weightLogsContainer.items.query(
      { query, parameters },
      { partitionKey: patientId }
    ).fetchAll();

    res.json({ entries: resources });
  } catch (err) {
    console.error("Weight log fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
