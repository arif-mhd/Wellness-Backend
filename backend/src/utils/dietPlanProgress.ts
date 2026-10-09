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

  const days = Array.from(byDate.entries()).map(([date, entries]) => ({
    date,
    mealsLogged: entries.length,
    mealsPlanned: mealsPlannedOn(date),
    calories: entries.reduce((sum, e) => sum + (e.calories ?? 0), 0),
  }));

  const totalMealsLogged = logs.length;
  const totalMealsPlanned = days.length > 0
    ? days.reduce((sum, d) => sum + d.mealsPlanned, 0)
    : mealsPerDay;
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
