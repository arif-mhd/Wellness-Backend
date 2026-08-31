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
  const byDate = new Map<string, any[]>();
  for (const entry of logs) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }

  const days = Array.from(byDate.entries()).map(([date, entries]) => ({
    date,
    mealsLogged: entries.length,
    mealsPlanned: mealsPerDay,
    calories: entries.reduce((sum, e) => sum + (e.calories ?? 0), 0),
  }));

  const totalMealsLogged = logs.length;
  const totalMealsPlanned = mealsPerDay * Math.max(days.length, 1);
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
