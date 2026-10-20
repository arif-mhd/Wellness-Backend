"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface DietMealItem {
  foodName: string;
  quantity: string;
  notes?: string;
  // True when the doctor typed a food that isn't in the org's catalogue.
  custom?: boolean;
}

export interface DietMeal {
  id: string;
  mealType: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  items: DietMealItem[];
}

// One stage of a diet-type plan, e.g. the Snehapanam part of a
// "Snehapanam → Purgation" plan. Single-diet types have exactly one phase.
// dayPlans holds each day's meals (Day 1, Day 2…), so the foods can differ
// from day to day.
export interface DietPhase {
  diet: string;
  dayPlans: DietMeal[][];
}

export interface DietPlanDraft {
  title: string;
  notes: string;
  meals: DietMeal[];
  targetCalories: string;
  restrictions: string;
  // Only used by orgs with a diet food catalogue (e.g. Ayurveda). Empty for
  // everyone else, who build a single list of meals as before.
  dietType: string;
  dietTypeLabel: string;
  phases: DietPhase[];
}

export const EMPTY_DIET_PLAN: DietPlanDraft = {
  title: "",
  notes: "",
  meals: [],
  targetCalories: "",
  restrictions: "",
  dietType: "",
  dietTypeLabel: "",
  phases: [],
};

// True when the doctor has entered anything worth saving.
export function hasDietPlanContent(plan: DietPlanDraft): boolean {
  return !!plan.title.trim() || plan.meals.length > 0 || plan.phases.some(phaseHasMeals);
}

function phaseHasMeals(phase: DietPhase): boolean {
  return phase.dayPlans.some((meals) => meals.length > 0);
}

// Request body for PUT /api/appointments/:id/diet-plan. For a phased plan,
// `meals` mirrors the first phase's Day 1 so older readers still see a
// usable plan.
export function toDietPlanPayload(plan: DietPlanDraft, visibleToPatient: boolean) {
  const phased = plan.phases.length > 0;
  return {
    // Not defaulted to the diet type's name — the title is shown to the
    // patient, who only sees the prescribed foods, not the diet type.
    title: plan.title || "Diet Plan",
    notes: plan.notes,
    meals: phased ? plan.phases[0].dayPlans[0] ?? [] : plan.meals,
    targetCalories: plan.targetCalories ? Number(plan.targetCalories) : null,
    restrictions: plan.restrictions
      ? plan.restrictions.split(",").map((r) => r.trim()).filter(Boolean)
      : [],
    ...(phased && {
      dietType: plan.dietType,
      dietTypeLabel: plan.dietTypeLabel,
      phases: plan.phases.map((p) => ({ diet: p.diet, dayPlans: p.dayPlans.map((meals) => ({ meals })) })),
    }),
    visibleToPatient,
  };
}

// Inverse of toDietPlanPayload, for restoring a saved plan into the form.
export function fromSavedDietPlan(saved: any): DietPlanDraft {
  return {
    title: saved.title ?? "",
    notes: saved.notes ?? "",
    meals: saved.meals ?? [],
    targetCalories: saved.targetCalories != null ? String(saved.targetCalories) : "",
    restrictions: Array.isArray(saved.restrictions) ? saved.restrictions.join(", ") : (saved.restrictions ?? ""),
    dietType: saved.dietType ?? "",
    dietTypeLabel: saved.dietTypeLabel ?? "",
    phases: Array.isArray(saved.phases)
      ? saved.phases.map((p: any) => ({
          diet: p.diet,
          dayPlans: Array.isArray(p.dayPlans) && p.dayPlans.length > 0
            ? p.dayPlans.map((d: any) => d.meals ?? [])
            : [p.meals ?? []],
        }))
      : [],
  };
}

const MEAL_TYPES: DietMeal["mealType"][] = ["Breakfast", "Lunch", "Snacks", "Dinner"];

// Mirrors backend/src/data/dietFoodCatalogs.ts's shapes.
interface DietCatalogFood {
  name: string;
  diets: string[];
  meals: DietMeal["mealType"][];
}

interface DietPlanType {
  id: string;
  label: string;
  phases: string[];
}

interface DietFoodCatalog {
  id: string;
  label: string;
  diets: string[];
  planTypes: DietPlanType[];
  foods: DietCatalogFood[];
}

const MAX_SUGGESTIONS = 50;

// Fetches this deployment's diet food catalogue (GET /api/meta/diet-foods).
// Null when the org has none configured or the fetch fails — the form then
// falls back to plain free-text food entry, which is the default behaviour.
function useDietFoodCatalog(): DietFoodCatalog | null {
  const [catalog, setCatalog] = useState<DietFoodCatalog | null>(null);

  useEffect(() => {
    let cancelled = false;
    const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG;
    const url = orgSlug ? `${API_URL}/api/meta/diet-foods?org=${encodeURIComponent(orgSlug)}` : `${API_URL}/api/meta/diet-foods`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => { if (!cancelled) setCatalog(data.catalog ?? null); })
      .catch(() => { /* keep free-text entry */ });
    return () => { cancelled = true; };
  }, []);

  return catalog;
}

// Food-name input that suggests catalogue foods as the doctor types, while
// still accepting any custom name. When the phase has a diet, only that
// diet's foods are suggested; foods served at the selected meal come first.
function FoodPicker({
  catalog,
  value,
  onChange,
  mealType,
  diet,
}: {
  catalog: DietFoodCatalog;
  value: string;
  onChange: (value: string) => void;
  mealType: DietMeal["mealType"];
  diet?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const query = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    const dietFoods = diet ? catalog.foods.filter((f) => f.diets.includes(diet)) : [];
    // A diet with no catalogue foods falls back to the whole catalogue.
    const pool = dietFoods.length > 0 ? dietFoods : catalog.foods;
    const rank = (f: DietCatalogFood) => (f.meals.includes(mealType) ? 0 : 1);
    return pool
      .filter((f) => !query || f.name.toLowerCase().includes(query))
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
      .slice(0, MAX_SUGGESTIONS);
  }, [catalog, diet, query, mealType]);

  const exactMatch = catalog.foods.some((f) => f.name.toLowerCase() === query);
  const showCustom = !!query && !exactMatch;
  const optionCount = suggestions.length + (showCustom ? 1 : 0);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || optionCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % optionCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? optionCount : h) - 1);
    } else if (e.key === "Enter") {
      // Nothing highlighted → keep what was typed and let the form submit.
      if (highlight < 0) { setOpen(false); return; }
      // Picking a suggestion shouldn't also submit the add-item form.
      e.preventDefault();
      pick(highlight < suggestions.length ? suggestions[highlight].name : value.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Search or type a food"
        required
        className="w-full h-10 px-3 rounded-lg bg-white border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC]"
      />
      {open && optionCount > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg bg-white border border-[#EBEEF5] shadow-lg py-1">
          {suggestions.map((f, i) => (
            <li
              key={f.name}
              // onMouseDown (not onClick) so the pick lands before the input's blur closes the list.
              onMouseDown={(e) => { e.preventDefault(); pick(f.name); }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-3 py-2 cursor-pointer ${highlight === i ? "bg-[#E8F1FF]" : ""}`}
            >
              <span className="block text-[12px] font-semibold text-[#383F45] truncate">{f.name}</span>
            </li>
          ))}
          {showCustom && (
            <li
              onMouseDown={(e) => { e.preventDefault(); pick(value.trim()); }}
              onMouseEnter={() => setHighlight(suggestions.length)}
              className={`px-3 py-2 cursor-pointer text-[12px] font-semibold text-[#5476FC] ${highlight === suggestions.length ? "bg-[#E8F1FF]" : ""}`}
            >
              + Add &ldquo;{value.trim()}&rdquo; as a custom food
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Add meal item"
      className="w-8 h-8 rounded-full bg-[#E8F1FF] text-[#5476FC] flex items-center justify-center hover:bg-[#5476FC] hover:text-white transition-all duration-200 shrink-0"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}

// The add-item form plus the list of meals — used once for a plain plan, and
// once per phase for a diet-type plan.
function MealsEditor({
  meals,
  onChange,
  catalog,
  diet,
  addOpen,
  onAddOpenChange,
}: {
  meals: DietMeal[];
  onChange: (meals: DietMeal[]) => void;
  catalog: DietFoodCatalog | null;
  diet?: string;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
}) {
  const [mealType, setMealType] = useState<DietMeal["mealType"]>("Breakfast");
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  const addMealItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !quantity.trim()) return;

    const name = foodName.trim();
    const custom = !!catalog && !catalog.foods.some((f) => f.name.toLowerCase() === name.toLowerCase());
    const item: DietMealItem = { foodName: name, quantity: quantity.trim(), notes: itemNotes.trim() || undefined, ...(custom && { custom: true }) };
    const existing = meals.find((m) => m.mealType === mealType);

    onChange(existing
      ? meals.map((m) => (m.mealType === mealType ? { ...m, items: [...m.items, item] } : m))
      : [...meals, { id: `${Date.now()}`, mealType, items: [item] }]);
    setFoodName("");
    setQuantity("");
    setItemNotes("");
    onAddOpenChange(false);
  };

  const removeItem = (mealId: string, index: number) => {
    onChange(meals
      .map((m) => (m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== index) } : m))
      .filter((m) => m.items.length > 0));
  };

  return (
    <>
      {addOpen && (
        <form onSubmit={addMealItem} className="flex flex-col gap-3 p-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#676E76]">Meal</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as DietMeal["mealType"])}
              className="w-full h-10 px-3 rounded-lg bg-white border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC]"
            >
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {catalog ? (
              <FoodPicker catalog={catalog} value={foodName} onChange={setFoodName} mealType={mealType} diet={diet} />
            ) : (
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="Food item"
                required
                className="h-10 px-3 rounded-lg bg-white border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC]"
              />
            )}
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantity (e.g. 1 bowl)"
              required
              className="h-10 px-3 rounded-lg bg-white border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC]"
            />
          </div>
          <input
            type="text"
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="h-10 px-3 rounded-lg bg-white border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC]"
          />
          <button
            type="submit"
            className="h-9 px-6 rounded-lg bg-[#5476FC] text-white text-xs font-bold self-end hover:bg-[#3B5BFC] transition-all"
          >
            Add item
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {meals.length === 0 ? (
          <div className="text-center text-xs font-medium text-slate-400 py-8 border border-dashed border-[#EBEEF5] rounded-xl bg-white w-full">
            No meals added yet.
          </div>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#EBEEF5] px-4 py-3.5">
              <span className="text-[#5476FC] text-[11px] font-bold uppercase tracking-wide">{meal.mealType}</span>
              <div className="flex flex-col gap-1.5 mt-2">
                {meal.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[#383F45] text-[12px] font-bold truncate">
                        {item.foodName} — {item.quantity}
                        {item.custom && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#F5F6FA] text-[#838B95] text-[9px] font-semibold align-middle">Custom</span>}
                      </p>
                      {item.notes && <p className="text-[#838B95] text-[10px]">{item.notes}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(meal.id, i)}
                      title="Remove item"
                      className="p-1 rounded-lg text-[#E84949] opacity-80 hover:opacity-100 hover:bg-red-50 transition-all shrink-0"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// Fresh ids for copied meals, so a copied day never shares a meal id (used
// as the remove-item key) with the day it was copied from.
function cloneMeals(meals: DietMeal[]): DietMeal[] {
  return meals.map((m, i) => ({ ...m, id: `${Date.now()}-${i}`, items: m.items.map((it) => ({ ...it })) }));
}

// One phase of a diet-type plan: heading, day tabs, and the selected day's
// meals. Day numbers run on across phases (dayOffset), so in Snehapanam →
// Purgation the Purgation days follow on from the last Snehapanam day.
const MAX_PLAN_DAYS = 90;

// A day anywhere in the plan, addressed by its phase and its index within it.
interface DayRef {
  phase: number;
  day: number;
}

function PhaseSection({
  phase,
  index,
  total,
  dayOffset,
  catalog,
  onChange,
  allDays,
  onCopyTo,
}: {
  phase: DietPhase;
  index: number;
  total: number;
  dayOffset: number;
  catalog: DietFoodCatalog | null;
  onChange: (phase: DietPhase) => void;
  // Every day in the plan (all phases), in order — the copy targets.
  allDays: (DayRef & { label: string; hasMeals: boolean })[];
  // Replaces each target day's meals with a copy of the given day's meals.
  onCopyTo: (from: DayRef, targets: DayRef[]) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const day = Math.min(selectedDay, phase.dayPlans.length - 1);
  const [dayCountDraft, setDayCountDraft] = useState(String(phase.dayPlans.length));
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set());

  useEffect(() => { setDayCountDraft(String(phase.dayPlans.length)); }, [phase.dayPlans.length]);
  useEffect(() => { setCopyOpen(false); setCopyTargets(new Set()); }, [day]);

  // Sets the stage's total number of days up front: adds empty days, or
  // drops days from the end (asking first if any of them have meals).
  const applyDayCount = () => {
    const n = parseInt(dayCountDraft, 10);
    const current = phase.dayPlans.length;
    if (!Number.isFinite(n) || n < 1 || n > MAX_PLAN_DAYS || n === current) {
      setDayCountDraft(String(current));
      return;
    }
    if (n < current) {
      const dropped = phase.dayPlans.slice(n).map((m, i) => ({ m, label: dayOffset + n + i + 1 })).filter((d) => d.m.length > 0);
      if (dropped.length && !window.confirm(`Day ${dropped.map((d) => d.label).join(", ")} ha${dropped.length === 1 ? "s" : "ve"} meals that will be removed. Continue?`)) {
        setDayCountDraft(String(current));
        return;
      }
      onChange({ ...phase, dayPlans: phase.dayPlans.slice(0, n) });
      if (day >= n) setSelectedDay(n - 1);
    } else {
      onChange({ ...phase, dayPlans: [...phase.dayPlans, ...Array.from({ length: n - current }, () => [] as DietMeal[])] });
    }
  };

  const refKey = (r: DayRef) => `${r.phase}:${r.day}`;
  const otherDays = allDays.filter((d) => !(d.phase === index && d.day === day));
  const toggleTarget = (r: DayRef) => {
    setCopyTargets((prev) => {
      const next = new Set(prev);
      const k = refKey(r);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const copyToSelected = () => {
    const targets = otherDays.filter((d) => copyTargets.has(refKey(d)));
    if (targets.length === 0) return;
    const overwritten = targets.filter((d) => d.hasMeals);
    if (overwritten.length && !window.confirm(`${overwritten.map((d) => d.label).join(", ")} already ha${overwritten.length === 1 ? "s" : "ve"} meals. Replace them with Day ${dayOffset + day + 1}'s meals?`)) return;
    onCopyTo({ phase: index, day }, targets.map(({ phase, day }) => ({ phase, day })));
    setCopyOpen(false);
    setCopyTargets(new Set());
  };

  const setDayMeals = (meals: DietMeal[]) => {
    onChange({ ...phase, dayPlans: phase.dayPlans.map((m, i) => (i === day ? meals : m)) });
  };

  const addDay = (copyCurrent: boolean) => {
    onChange({ ...phase, dayPlans: [...phase.dayPlans, copyCurrent ? cloneMeals(phase.dayPlans[day]) : []] });
    setSelectedDay(phase.dayPlans.length);
  };

  const removeDay = () => {
    if (phase.dayPlans.length <= 1) return;
    if (phase.dayPlans[day].length > 0 && !window.confirm(`Remove Day ${dayOffset + day + 1} and its meals?`)) return;
    onChange({ ...phase, dayPlans: phase.dayPlans.filter((_, i) => i !== day) });
    setSelectedDay(Math.max(0, day - 1));
  };

  const dayCount = phase.dayPlans.length;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-[#EBEEF5] bg-[#FAFBFD]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          {total > 1 && (
            <span className="text-[#838B95] text-[10px] font-semibold uppercase tracking-wide">
              {index === 0 ? `Step 1 of ${total}` : `Then — step ${index + 1} of ${total}`}
            </span>
          )}
          <span className="text-[#24292E] text-[13px] font-bold">
            {phase.diet} diet · {dayCount} day{dayCount === 1 ? "" : "s"}
          </span>
        </div>
        <AddButton onClick={() => setAddOpen((v) => !v)} />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[12px] font-semibold text-[#676E76]" htmlFor={`day-count-${index}`}>Number of days</label>
        <input
          id={`day-count-${index}`}
          type="number"
          min={1}
          max={MAX_PLAN_DAYS}
          value={dayCountDraft}
          onChange={(e) => setDayCountDraft(e.target.value)}
          onBlur={applyDayCount}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyDayCount(); } }}
          className="w-20 h-8 px-3 rounded-lg bg-white border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {phase.dayPlans.map((meals, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelectedDay(i)}
            className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all ${
              i === day ? "bg-[#5476FC] text-white" : "bg-white border border-[#EBEEF5] text-[#676E76] hover:border-[#5476FC]"
            }`}
            title={meals.length === 0 ? "No meals yet" : undefined}
          >
            Day {dayOffset + i + 1}{meals.length === 0 && i !== day ? " ·" : ""}
          </button>
        ))}
        <button
          type="button"
          onClick={() => addDay(false)}
          className="h-8 px-3 rounded-lg text-[11px] font-bold text-[#5476FC] bg-[#E8F1FF] hover:bg-[#5476FC] hover:text-white transition-all"
        >
          + Add day
        </button>
        <button
          type="button"
          onClick={() => addDay(true)}
          disabled={phase.dayPlans[day].length === 0}
          className="h-8 px-3 rounded-lg text-[11px] font-bold text-[#5476FC] bg-white border border-[#E8F1FF] hover:border-[#5476FC] disabled:opacity-40 transition-all"
          title="Add a new day with the same meals as this one"
        >
          Copy Day {dayOffset + day + 1}
        </button>
        {otherDays.length > 0 && (
          <button
            type="button"
            onClick={() => setCopyOpen((v) => !v)}
            disabled={phase.dayPlans[day].length === 0}
            className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 ${
              copyOpen ? "bg-[#5476FC] text-white" : "text-[#5476FC] bg-white border border-[#E8F1FF] hover:border-[#5476FC]"
            }`}
            title="Copy this day's meals onto any other days of the plan"
          >
            Copy to days…
          </button>
        )}
        {dayCount > 1 && (
          <button
            type="button"
            onClick={removeDay}
            className="h-8 px-3 rounded-lg text-[11px] font-bold text-[#E84949] hover:bg-red-50 transition-all"
          >
            Remove Day {dayOffset + day + 1}
          </button>
        )}
      </div>

      {copyOpen && (
        <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-white border border-[#EBEEF5]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#676E76]">Copy Day {dayOffset + day + 1}&apos;s meals to:</span>
            <button
              type="button"
              onClick={() => setCopyTargets(copyTargets.size === otherDays.length ? new Set() : new Set(otherDays.map(refKey)))}
              className="text-[11px] font-bold text-[#5476FC] hover:underline"
            >
              {copyTargets.size === otherDays.length ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {otherDays.map((d) => {
              const on = copyTargets.has(refKey(d));
              return (
                <button
                  key={refKey(d)}
                  type="button"
                  onClick={() => toggleTarget(d)}
                  className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all ${
                    on ? "bg-[#5476FC] text-white" : "bg-[#F5F6FA] border border-[#EBEEF5] text-[#676E76] hover:border-[#5476FC]"
                  }`}
                  title={d.hasMeals ? "Already has meals — they'll be replaced" : undefined}
                >
                  {d.label}{d.hasMeals ? " •" : ""}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={copyToSelected}
            disabled={copyTargets.size === 0}
            className="h-8 px-5 rounded-lg bg-[#5476FC] text-white text-[11px] font-bold self-end hover:bg-[#3B5BFC] disabled:opacity-40 transition-all"
          >
            {copyTargets.size === 0 ? "Copy" : `Copy to ${copyTargets.size} day${copyTargets.size === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      <MealsEditor
        key={day}
        meals={phase.dayPlans[day]}
        onChange={setDayMeals}
        catalog={catalog}
        diet={phase.diet}
        addOpen={addOpen}
        onAddOpenChange={setAddOpen}
      />
    </div>
  );
}

function ToggleSwitch({ isOn, onClick, disabled }: { isOn: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors disabled:opacity-50 ${isOn ? "bg-[#179353]" : "bg-gray-300"}`}
    >
      <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${isOn ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

interface AddDietPlanProps {
  plan: DietPlanDraft;
  onChange: (plan: DietPlanDraft) => void;
  visibleToPatient: boolean;
  onToggleVisible: () => void;
  togglingVisible?: boolean;
}

export default function AddDietPlan({ plan, onChange, visibleToPatient, onToggleVisible, togglingVisible }: AddDietPlanProps) {
  const [showAddMeal, setShowAddMeal] = useState(false);
  const catalog = useDietFoodCatalog();
  const phased = plan.phases.length > 0;

  // Switching type keeps the meals of any phase whose diet carries over (e.g.
  // Snehapanam → "Snehapanam → Purgation"), and moves meals entered before a
  // type was picked into the first phase.
  const selectDietType = (typeId: string) => {
    const type = catalog?.planTypes.find((t) => t.id === typeId);
    if (!type) {
      if (plan.phases.some(phaseHasMeals) && !window.confirm("Clear the diet type? Meals entered for it will be removed.")) return;
      onChange({ ...plan, dietType: "", dietTypeLabel: "", phases: [] });
      return;
    }
    const dropped = plan.phases.filter((p) => !type.phases.includes(p.diet) && phaseHasMeals(p));
    if (dropped.length && !window.confirm(`Meals entered for ${dropped.map((p) => p.diet).join(", ")} will be removed. Continue?`)) return;

    const phases = type.phases.map((diet, i) =>
      plan.phases.find((p) => p.diet === diet) ?? { diet, dayPlans: [i === 0 && !phased ? plan.meals : []] }
    );
    onChange({ ...plan, dietType: type.id, dietTypeLabel: type.label, phases, meals: [] });
  };

  const updatePhase = (index: number, phase: DietPhase) => {
    onChange({ ...plan, phases: plan.phases.map((p, i) => (i === index ? phase : p)) });
  };

  // Day labels run on across phases, matching PhaseSection's day tabs.
  const allDays = plan.phases.flatMap((p, pi) => {
    const offset = plan.phases.slice(0, pi).reduce((sum, q) => sum + q.dayPlans.length, 0);
    return p.dayPlans.map((meals, di) => ({ phase: pi, day: di, label: `Day ${offset + di + 1}`, hasMeals: meals.length > 0 }));
  });

  const copyDayTo = (from: DayRef, targets: DayRef[]) => {
    const source = plan.phases[from.phase]?.dayPlans[from.day];
    if (!source) return;
    onChange({
      ...plan,
      phases: plan.phases.map((p, pi) => ({
        ...p,
        dayPlans: p.dayPlans.map((meals, di) =>
          targets.some((t) => t.phase === pi && t.day === di) ? cloneMeals(source) : meals
        ),
      })),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[#24292E] text-sm font-bold tracking-tight">Diet Plan</span>
        {!phased && <AddButton onClick={() => setShowAddMeal((v) => !v)} />}
      </div>

      {catalog && catalog.planTypes?.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#676E76]">Diet type</label>
          <select
            value={plan.dietType}
            onChange={(e) => selectDietType(e.target.value)}
            className="w-full h-11 px-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
          >
            <option value="">Select a diet type…</option>
            {catalog.planTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-[#676E76]">Plan title</label>
        <input
          type="text"
          value={plan.title}
          onChange={(e) => onChange({ ...plan, title: e.target.value })}
          placeholder="e.g. Post-surgery low-sodium diet"
          className="w-full h-11 px-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#676E76]">Target calories/day</label>
          <input
            type="text"
            value={plan.targetCalories}
            onChange={(e) => onChange({ ...plan, targetCalories: e.target.value })}
            placeholder="e.g. 1800"
            className="w-full h-11 px-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#676E76]">Restrictions</label>
          <input
            type="text"
            value={plan.restrictions}
            onChange={(e) => onChange({ ...plan, restrictions: e.target.value })}
            placeholder="e.g. no sugar, low sodium"
            className="w-full h-11 px-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-[#676E76]">Notes</label>
        <textarea
          value={plan.notes}
          onChange={(e) => onChange({ ...plan, notes: e.target.value })}
          placeholder="Overall instructions for the patient…"
          rows={2}
          className="w-full p-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none resize-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
        />
      </div>

      {phased ? (
        plan.phases.map((phase, i) => (
          <PhaseSection
            key={phase.diet}
            phase={phase}
            index={i}
            total={plan.phases.length}
            dayOffset={plan.phases.slice(0, i).reduce((sum, p) => sum + p.dayPlans.length, 0)}
            catalog={catalog}
            onChange={(p) => updatePhase(i, p)}
            allDays={allDays}
            onCopyTo={copyDayTo}
          />
        ))
      ) : (
        <MealsEditor
          meals={plan.meals}
          onChange={(meals) => onChange({ ...plan, meals })}
          catalog={catalog}
          addOpen={showAddMeal}
          onAddOpenChange={setShowAddMeal}
        />
      )}

      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5]">
        <div className="flex flex-col">
          <span className="text-[#24292E] text-xs font-bold">Reflect diet plan to patient</span>
          <span className="text-[#838B95] text-[10px]">When on, this becomes the patient's active diet plan in the app.</span>
        </div>
        <ToggleSwitch isOn={visibleToPatient} onClick={onToggleVisible} disabled={togglingVisible} />
      </div>
    </div>
  );
}
