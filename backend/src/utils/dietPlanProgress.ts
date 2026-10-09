import { dietPlansContainer, foodLogsContainer } from "../config/cosmos";

// Computes adherence for a single diet plan by comparing its planned meals
// against the patient's food-log entries tagged with this plan's id
// (see POST /api/wellness/food-log, which accepts an optional dietPlanId).
export async function computeDietPlanProgress(patientId: string, planId: string) {
  const { resource: plan } = await dietPlansContainer.item(planId, patientId).read();
  if (!plan) {
    return { plan: null, loggedDays: 0, totalMealsPlanned: 0, totalMealsLogged: 0, adherencePercent: 0, days: [] as any[] };
  }

  const { resources: logs } = await foodLogsContainer.items.query(
    {
      query: "SELECT * FROM c WHERE c.patientId = @pid AND c.dietPlanId = @planId ORDER BY c.date ASC",
      parameters: [
        { name: "@pid", value: patientId },
        { name: "@planId", value: planId },
      ],
    },
    { partitionKey: patientId }
  ).fetchAll();

  const mealsPerDay = Array.isArray(plan.meals) ? plan.meals.length : 0;

  // Day-wise plans (phases[].dayPlans) prescribe a different number of meals
  // on each day: look a logged date up by its day number, counted from when
  // the plan was shared (Day 1 = activatedAt's date). Dates past the last
  // prescribed day fall back to the final day's count.
  const dayMealCounts: number[] = Array.isArray(plan.phases)
    ? plan.phases.flatMap((p: any) => (Array.isArray(p.dayPlans) ? p.dayPlans : [{ meals: p.meals }]).map((d: any) => d.meals?.length ?? 0))
    : [];
  const day1 = (plan.activatedAt ?? plan.startDate ?? "").slice(0, 10);
  const mealsPlannedOn = (date: string) => {
    if (dayMealCounts.length === 0 || !day1) return mealsPerDay;
    const index = Math.round((Date.parse(date) - Date.parse(day1)) / 86_400_000);
    return dayMealCounts[Math.min(Math.max(index, 0), dayMealCounts.length - 1)];
  };

  const byDate = new Map<string, any[]>();
  for (const entry of logs) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }

  // A meal counts as logged once, however many foods were logged for it
  // (Appam + Banana for Breakfast is one meal), and never beyond what the
  // plan prescribes for that day.
  const mealsLoggedOn = (date: string) => {
    const meals = new Set((byDate.get(date) ?? []).map((e) => String(e.meal ?? "").toLowerCase()));
    return Math.min(meals.size, mealsPlannedOn(date));
  };

  const days = Array.from(byDate.entries()).map(([date, entries]) => ({
    date,
    mealsLogged: mealsLoggedOn(date),
    mealsPlanned: mealsPlannedOn(date),
    calories: entries.reduce((sum, e) => sum + (e.calories ?? 0), 0),
  }));

  // Planned meals run from Day 1 through today (or the latest logged date,
  // in case the server's UTC day lags the patient's), capped at the plan's
  // length for day-wise plans — so unlogged days count against adherence.
  const DAY_MS = 86_400_000;
  const today = new Date().toISOString().slice(0, 10);
  const lastLogged = logs.length > 0 ? String(logs[logs.length - 1].date) : "";
  const end = lastLogged > today ? lastLogged : today;
  let elapsedDays = day1 ? Math.floor((Date.parse(end) - Date.parse(day1)) / DAY_MS) + 1 : 1;
  if (!Number.isFinite(elapsedDays) || elapsedDays < 1) elapsedDays = 1;
  if (dayMealCounts.length > 0) elapsedDays = Math.min(elapsedDays, dayMealCounts.length);

  let totalMealsPlanned = 0;
  let totalMealsLogged = 0;
  for (let i = 0; i < elapsedDays; i++) {
    const date = day1
      ? new Date(Date.parse(day1) + i * DAY_MS).toISOString().slice(0, 10)
      : today;
    totalMealsPlanned += mealsPlannedOn(date);
    totalMealsLogged += mealsLoggedOn(date);
  }
  const adherencePercent = totalMealsPlanned > 0
    ? Math.min(100, Math.round((totalMealsLogged / totalMealsPlanned) * 100))
    : 0;

  return {
    plan,
    loggedDays: days.length,
    totalMealsPlanned,
    totalMealsLogged,
    adherencePercent,
    days,
  };
}
