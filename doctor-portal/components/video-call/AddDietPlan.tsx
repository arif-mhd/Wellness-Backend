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
export interface DietPhase {
  diet: string;
  days: string;
  meals: DietMeal[];
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
  return !!plan.title.trim() || plan.meals.length > 0 || plan.phases.some((p) => p.meals.length > 0);
}

// Request body for PUT /api/appointments/:id/diet-plan. For a phased plan,
// `meals` mirrors the first phase so older readers (patient app, adherence
// progress) still see a usable plan.
export function toDietPlanPayload(plan: DietPlanDraft, visibleToPatient: boolean) {
  const phased = plan.phases.length > 0;
  return {
    // Not defaulted to the diet type's name — the title is shown to the
    // patient, who only sees the prescribed foods, not the diet type.
    title: plan.title || "Diet Plan",
    notes: plan.notes,
    meals: phased ? plan.phases[0].meals : plan.meals,
    targetCalories: plan.targetCalories ? Number(plan.targetCalories) : null,
    restrictions: plan.restrictions
      ? plan.restrictions.split(",").map((r) => r.trim()).filter(Boolean)
      : [],
    ...(phased && {
      dietType: plan.dietType,
      dietTypeLabel: plan.dietTypeLabel,
      phases: plan.phases.map((p) => ({ diet: p.diet, days: p.days ? Number(p.days) : null, meals: p.meals })),
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
      ? saved.phases.map((p: any) => ({ diet: p.diet, days: p.days != null ? String(p.days) : "", meals: p.meals ?? [] }))
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

// Food-name input that suggests every catalogue food as the doctor types,
// while still accepting any custom name. Foods from the current phase's diet
// are listed first, then foods served at the selected meal.
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
    const rank = (f: DietCatalogFood) => (diet && f.diets.includes(diet) ? 0 : 2) + (f.meals.includes(mealType) ? 0 : 1);
    return catalog.foods
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
              className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 ${highlight === i ? "bg-[#E8F1FF]" : ""}`}
            >
              <span className="text-[12px] font-semibold text-[#383F45] truncate">{f.name}</span>
              <span className="text-[10px] text-[#838B95] shrink-0">{f.diets.join(", ")}</span>
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

// One phase of a diet-type plan: heading, optional duration, and its meals.
function PhaseSection({
  phase,
  index,
  total,
  catalog,
  onChange,
}: {
  phase: DietPhase;
  index: number;
  total: number;
  catalog: DietFoodCatalog | null;
  onChange: (phase: DietPhase) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-[#EBEEF5] bg-[#FAFBFD]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          {total > 1 && (
            <span className="text-[#838B95] text-[10px] font-semibold uppercase tracking-wide">
              {index === 0 ? `Step 1 of ${total}` : `Then — step ${index + 1} of ${total}`}
            </span>
          )}
          <span className="text-[#24292E] text-[13px] font-bold">{phase.diet} diet</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={phase.days}
            onChange={(e) => onChange({ ...phase, days: e.target.value })}
            placeholder="Days"
            title="Number of days (optional)"
            className="w-20 h-9 px-3 rounded-lg bg-white border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC]"
          />
          <AddButton onClick={() => setAddOpen((v) => !v)} />
        </div>
      </div>
      <MealsEditor
        meals={phase.meals}
        onChange={(meals) => onChange({ ...phase, meals })}
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
      if (plan.phases.some((p) => p.meals.length > 0) && !window.confirm("Clear the diet type? Meals entered for it will be removed.")) return;
      onChange({ ...plan, dietType: "", dietTypeLabel: "", phases: [] });
      return;
    }
    const dropped = plan.phases.filter((p) => !type.phases.includes(p.diet) && p.meals.length > 0);
    if (dropped.length && !window.confirm(`Meals entered for ${dropped.map((p) => p.diet).join(", ")} will be removed. Continue?`)) return;

    const phases = type.phases.map((diet, i) =>
      plan.phases.find((p) => p.diet === diet) ?? { diet, days: "", meals: i === 0 && !phased ? plan.meals : [] }
    );
    onChange({ ...plan, dietType: type.id, dietTypeLabel: type.label, phases, meals: [] });
  };

  const updatePhase = (index: number, phase: DietPhase) => {
    onChange({ ...plan, phases: plan.phases.map((p, i) => (i === index ? phase : p)) });
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
            catalog={catalog}
            onChange={(p) => updatePhase(i, p)}
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
