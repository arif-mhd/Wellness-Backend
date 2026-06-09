import { getExerciseById, Exercise } from "./exercises";

export interface RoutineExercise {
  exerciseId: string;
  name: string;
  image: string;
  type: "strength" | "bodyweight" | "cardio";
  defaultSets: { weight?: number; reps?: number; durationMin?: number }[];
}

export interface DiscoveryRoutine {
  id: string;
  title: string;
  category: string;
  exercises: RoutineExercise[];
}

const RAW_DISCOVERY: Array<{
  id: string; title: string; category: string;
  exercises: Array<{ id: string; sets: Array<{ weight?: number; reps?: number; durationMin?: number }> }>;
}> = [
  {
    id: "discovery-arms", title: "Arms", category: "Weight Training",
    exercises: [
      { id: "bicep-curl-dumbbell", sets: [{ weight: 12, reps: 12 }, { weight: 15, reps: 10 }] },
      { id: "tricep-dips",         sets: [{ reps: 12 }, { reps: 10 }] },
      { id: "skull-crusher",       sets: [{ weight: 20, reps: 12 }, { weight: 25, reps: 10 }] },
      { id: "hammer-curl",         sets: [{ weight: 10, reps: 12 }] },
    ],
  },
  {
    id: "discovery-legs", title: "Legs", category: "Weight Training",
    exercises: [
      { id: "squat-barbell",   sets: [{ weight: 60, reps: 8 }, { weight: 80, reps: 8 }] },
      { id: "leg-press",       sets: [{ weight: 100, reps: 12 }, { weight: 120, reps: 10 }] },
      { id: "lunges",          sets: [{ reps: 12 }, { reps: 10 }] },
      { id: "calf-raise",      sets: [{ weight: 60, reps: 15 }, { weight: 60, reps: 15 }] },
      { id: "hamstring-curl",  sets: [{ weight: 40, reps: 12 }] },
    ],
  },
  {
    id: "discovery-back", title: "Back", category: "Weight Training",
    exercises: [
      { id: "pull-ups",       sets: [{ reps: 10 }, { reps: 8 }] },
      { id: "lat-pulldown",   sets: [{ weight: 50, reps: 12 }, { weight: 60, reps: 10 }] },
      { id: "deadlift",       sets: [{ weight: 80, reps: 8 }, { weight: 100, reps: 5 }] },
      { id: "bent-over-row",  sets: [{ weight: 45, reps: 12 }] },
    ],
  },
  {
    id: "discovery-core", title: "Core", category: "Weight Training",
    exercises: [
      { id: "plank",              sets: [{ durationMin: 1 }, { durationMin: 1 }] },
      { id: "crunches",           sets: [{ reps: 20 }, { reps: 20 }] },
      { id: "russian-twists",     sets: [{ reps: 30 }] },
      { id: "mountain-climbers",  sets: [{ reps: 30 }] },
    ],
  },
  {
    id: "discovery-cardio", title: "Cardio Blast", category: "Cardio",
    exercises: [
      { id: "jumping-jacks", sets: [{ durationMin: 5 }, { durationMin: 5 }] },
      { id: "running",       sets: [{ durationMin: 20 }] },
      { id: "jump-rope",     sets: [{ durationMin: 5 }, { durationMin: 5 }] },
    ],
  },
  {
    id: "discovery-chest", title: "Chest & Triceps", category: "Weight Training",
    exercises: [
      { id: "bench-press-barbell",  sets: [{ weight: 45, reps: 8 }, { weight: 60, reps: 8 }] },
      { id: "incline-press",        sets: [{ weight: 35, reps: 10 }, { weight: 45, reps: 8 }] },
      { id: "push-ups",             sets: [{ reps: 20 }, { reps: 20 }] },
      { id: "tricep-dips",          sets: [{ reps: 12 }, { reps: 12 }] },
      { id: "skull-crusher",        sets: [{ weight: 20, reps: 12 }] },
    ],
  },
];

// Hydrate discovery routines with full exercise data from our exercise DB
export const DISCOVERY_ROUTINES: DiscoveryRoutine[] = RAW_DISCOVERY.map(raw => ({
  id:       raw.id,
  title:    raw.title,
  category: raw.category,
  exercises: raw.exercises.map(e => {
    const ex = getExerciseById(e.id);
    return {
      exerciseId:  e.id,
      name:        ex?.name  ?? e.id,
      image:       ex?.image ?? "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100",
      type:        (ex?.type  ?? "strength") as "strength" | "bodyweight" | "cardio",
      defaultSets: e.sets,
    };
  }),
}));

export function getDiscoveryRoutineById(id: string): DiscoveryRoutine | undefined {
  return DISCOVERY_ROUTINES.find(r => r.id === id);
}
