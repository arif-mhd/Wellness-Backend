"use client";

import { useState } from "react";

export interface DietMealItem {
  foodName: string;
  quantity: string;
  notes?: string;
}

export interface DietMeal {
  id: string;
  mealType: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  items: DietMealItem[];
}

export interface DietPlanDraft {
  title: string;
  notes: string;
  meals: DietMeal[];
  targetCalories: string;
  restrictions: string;
}

export const EMPTY_DIET_PLAN: DietPlanDraft = {
  title: "",
  notes: "",
  meals: [],
  targetCalories: "",
  restrictions: "",
};

const MEAL_TYPES: DietMeal["mealType"][] = ["Breakfast", "Lunch", "Snacks", "Dinner"];

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
  const [mealType, setMealType] = useState<DietMeal["mealType"]>("Breakfast");
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  const addMealItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !quantity.trim()) return;

    const item: DietMealItem = { foodName: foodName.trim(), quantity: quantity.trim(), notes: itemNotes.trim() || undefined };
    const existing = plan.meals.find((m) => m.mealType === mealType);

    const meals = existing
      ? plan.meals.map((m) => (m.mealType === mealType ? { ...m, items: [...m.items, item] } : m))
      : [...plan.meals, { id: `${Date.now()}`, mealType, items: [item] }];

    onChange({ ...plan, meals });
    setFoodName("");
    setQuantity("");
    setItemNotes("");
    setShowAddMeal(false);
  };

  const removeItem = (mealId: string, index: number) => {
    const meals = plan.meals
      .map((m) => (m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== index) } : m))
      .filter((m) => m.items.length > 0);
    onChange({ ...plan, meals });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[#24292E] text-sm font-bold tracking-tight">Diet Plan</span>
        <button
          onClick={() => setShowAddMeal((v) => !v)}
          title="Add meal item"
          className="w-8 h-8 rounded-full bg-[#E8F1FF] text-[#5476FC] flex items-center justify-center hover:bg-[#5476FC] hover:text-white transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

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

      {showAddMeal && (
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
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="Food item"
              required
              className="h-10 px-3 rounded-lg bg-white border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC]"
            />
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
        {plan.meals.length === 0 ? (
          <div className="text-center text-xs font-medium text-slate-400 py-8 border border-dashed border-[#EBEEF5] rounded-xl bg-white w-full">
            No meals added yet.
          </div>
        ) : (
          plan.meals.map((meal) => (
            <div key={meal.id} className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#EBEEF5] px-4 py-3.5">
              <span className="text-[#5476FC] text-[11px] font-bold uppercase tracking-wide">{meal.mealType}</span>
              <div className="flex flex-col gap-1.5 mt-2">
                {meal.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[#383F45] text-[12px] font-bold truncate">{item.foodName} — {item.quantity}</p>
                      {item.notes && <p className="text-[#838B95] text-[10px]">{item.notes}</p>}
                    </div>
                    <button
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
