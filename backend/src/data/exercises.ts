export interface Exercise {
  id: string;
  name: string;
  category: string;
  type: 'strength' | 'bodyweight' | 'cardio';
  image: string;
  met: number;            // MET value — used for cardio calorie calc
  caloriesPerSet: number; // used for strength / bodyweight
}

export const EXERCISES: Exercise[] = [

  // ── Chest ────────────────────────────────────────────────────────────────────
  { id: 'bench-press-barbell',    name: 'Bench Press Barbell',      category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 6.0, caloriesPerSet: 15 },
  { id: 'bench-press-dumbbell',   name: 'Bench Press Dumbbell',     category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 6.0, caloriesPerSet: 13 },
  { id: 'push-ups',               name: 'Push Ups',                 category: 'Chest',      type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598971939620-639a0390f70c?q=80&w=100', met: 8.0, caloriesPerSet: 10 },
  { id: 'incline-press-barbell',  name: 'Incline Press Barbell',    category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?q=80&w=100', met: 6.0, caloriesPerSet: 13 },
  { id: 'incline-press-dumbbell', name: 'Incline Press Dumbbell',   category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 6.0, caloriesPerSet: 12 },
  { id: 'decline-press-barbell',  name: 'Decline Press Barbell',    category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 6.0, caloriesPerSet: 13 },
  { id: 'decline-press-dumbbell', name: 'Decline Press Dumbbell',   category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=100', met: 6.0, caloriesPerSet: 12 },
  { id: 'chest-fly-dumbbell',     name: 'Chest Fly Dumbbell',       category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1581009146145-b5ef03a1966b?q=80&w=100', met: 5.0, caloriesPerSet: 10 },
  { id: 'cable-crossover',        name: 'Cable Crossover',          category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 5.0, caloriesPerSet: 10 },
  { id: 'pec-deck-machine',       name: 'Pec Deck Machine',         category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 4.5, caloriesPerSet: 9  },
  { id: 'chest-dips',             name: 'Chest Dips',               category: 'Chest',      type: 'bodyweight', image: 'https://images.unsplash.com/photo-1594737625785-a6badf30297b?q=80&w=100', met: 6.0, caloriesPerSet: 12 },
  { id: 'wide-push-ups',          name: 'Wide Push Ups',            category: 'Chest',      type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598971939620-639a0390f70c?q=80&w=100', met: 7.5, caloriesPerSet: 10 },
  { id: 'diamond-push-ups',       name: 'Diamond Push Ups',         category: 'Chest',      type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598971939620-639a0390f70c?q=80&w=100', met: 8.5, caloriesPerSet: 11 },
  { id: 'svend-press',            name: 'Svend Press',              category: 'Chest',      type: 'strength',   image: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?q=80&w=100', met: 4.5, caloriesPerSet: 8  },

  // ── Arms — Biceps ─────────────────────────────────────────────────────────────
  { id: 'bicep-curl-dumbbell',    name: 'Biceps Curl Dumbbell',     category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=100', met: 4.5, caloriesPerSet: 8  },
  { id: 'bicep-curl-barbell',     name: 'Biceps Curl Barbell',      category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 4.5, caloriesPerSet: 9  },
  { id: 'hammer-curl',            name: 'Hammer Curl',              category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1585489285272-0a2c8fdb5ba1?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'concentration-curl',     name: 'Concentration Curl',       category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'cable-curl',             name: 'Cable Curl',               category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'preacher-curl',          name: 'Preacher Curl',            category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'incline-dumbbell-curl',  name: 'Incline Dumbbell Curl',    category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'reverse-curl',           name: 'Reverse Curl',             category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 3.5, caloriesPerSet: 6  },

  // ── Arms — Triceps ────────────────────────────────────────────────────────────
  { id: 'skull-crusher',          name: 'Skull Crusher',            category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=100', met: 4.5, caloriesPerSet: 9  },
  { id: 'tricep-dips',            name: 'Tricep Dips',              category: 'Arms',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1594737625785-a6badf30297b?q=80&w=100', met: 5.0, caloriesPerSet: 10 },
  { id: 'tricep-pushdown',        name: 'Tricep Pushdown',          category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.5, caloriesPerSet: 8  },
  { id: 'overhead-tricep-ext',    name: 'Overhead Tricep Extension', category: 'Arms',      type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 4.5, caloriesPerSet: 9  },
  { id: 'close-grip-bench',       name: 'Close Grip Bench Press',   category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 5.5, caloriesPerSet: 12 },
  { id: 'tricep-kickback',        name: 'Tricep Kickback',          category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'diamond-push-up-tri',    name: 'Diamond Push Up',          category: 'Arms',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598971939620-639a0390f70c?q=80&w=100', met: 8.0, caloriesPerSet: 10 },

  // ── Arms — Forearms ────────────────────────────────────────────────────────────
  { id: 'wrist-curl',             name: 'Wrist Curl',               category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1585489285272-0a2c8fdb5ba1?q=80&w=100', met: 3.0, caloriesPerSet: 5  },
  { id: 'reverse-wrist-curl',     name: 'Reverse Wrist Curl',       category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 3.0, caloriesPerSet: 5  },
  { id: 'farmers-walk',           name: "Farmer's Walk",            category: 'Arms',       type: 'strength',   image: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?q=80&w=100', met: 5.0, caloriesPerSet: 10 },

  // ── Shoulders ─────────────────────────────────────────────────────────────────
  { id: 'shoulder-press-barbell', name: 'Shoulder Press Barbell',   category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?q=80&w=100', met: 5.5, caloriesPerSet: 13 },
  { id: 'shoulder-press-db',      name: 'Shoulder Press Dumbbell',  category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?q=80&w=100', met: 5.5, caloriesPerSet: 12 },
  { id: 'lateral-raise',          name: 'Lateral Raise',            category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'front-raise',            name: 'Front Raise',              category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'rear-delt-fly',          name: 'Rear Delt Fly',            category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'face-pull',              name: 'Face Pull',                category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.5, caloriesPerSet: 8  },
  { id: 'arnold-press',           name: 'Arnold Press',             category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?q=80&w=100', met: 5.5, caloriesPerSet: 12 },
  { id: 'upright-row',            name: 'Upright Row',              category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 5.0, caloriesPerSet: 10 },
  { id: 'cable-lateral-raise',    name: 'Cable Lateral Raise',      category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'shrugs-barbell',         name: 'Shrugs Barbell',           category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'shrugs-dumbbell',        name: 'Shrugs Dumbbell',          category: 'Shoulders',  type: 'strength',   image: 'https://images.unsplash.com/photo-1585489285272-0a2c8fdb5ba1?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'pike-push-up',           name: 'Pike Push Up',             category: 'Shoulders',  type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598971939620-639a0390f70c?q=80&w=100', met: 6.0, caloriesPerSet: 10 },
  { id: 'handstand-push-up',      name: 'Handstand Push Up',        category: 'Shoulders',  type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 8.0, caloriesPerSet: 15 },

  // ── Back ──────────────────────────────────────────────────────────────────────
  { id: 'pull-ups',               name: 'Pull-Ups',                 category: 'Back',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 8.0, caloriesPerSet: 15 },
  { id: 'chin-ups',               name: 'Chin-Ups',                 category: 'Back',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 8.0, caloriesPerSet: 14 },
  { id: 'lat-pulldown',           name: 'Lat Pulldown',             category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 5.0, caloriesPerSet: 12 },
  { id: 'bent-over-row-barbell',  name: 'Bent Over Row Barbell',    category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?q=80&w=100', met: 5.5, caloriesPerSet: 13 },
  { id: 'bent-over-row-dumbbell', name: 'Bent Over Row Dumbbell',   category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=100', met: 5.5, caloriesPerSet: 12 },
  { id: 'deadlift',               name: 'Deadlift',                 category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 7.5, caloriesPerSet: 20 },
  { id: 'romanian-deadlift',      name: 'Romanian Deadlift',        category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 7.0, caloriesPerSet: 18 },
  { id: 'sumo-deadlift',          name: 'Sumo Deadlift',            category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 7.5, caloriesPerSet: 20 },
  { id: 'seated-cable-row',       name: 'Seated Cable Row',         category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 5.0, caloriesPerSet: 12 },
  { id: 'single-arm-db-row',      name: 'Single Arm Dumbbell Row',  category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=100', met: 5.0, caloriesPerSet: 11 },
  { id: 't-bar-row',              name: 'T-Bar Row',                category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 6.0, caloriesPerSet: 14 },
  { id: 'cable-pullover',         name: 'Cable Pullover',           category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.5, caloriesPerSet: 9  },
  { id: 'back-extension',         name: 'Back Extension',           category: 'Back',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'good-morning',           name: 'Good Morning',             category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 5.0, caloriesPerSet: 11 },
  { id: 'rack-pull',              name: 'Rack Pull',                category: 'Back',       type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 6.5, caloriesPerSet: 16 },
  { id: 'inverted-row',           name: 'Inverted Row',             category: 'Back',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 6.0, caloriesPerSet: 12 },
  { id: 'muscle-up',              name: 'Muscle-Up',                category: 'Back',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 10.0,caloriesPerSet: 20 },

  // ── Legs ──────────────────────────────────────────────────────────────────────
  { id: 'squat-barbell',          name: 'Barbell Squat',            category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 8.0, caloriesPerSet: 20 },
  { id: 'squat-dumbbell',         name: 'Dumbbell Squat',           category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 7.5, caloriesPerSet: 18 },
  { id: 'front-squat',            name: 'Front Squat',              category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 8.0, caloriesPerSet: 20 },
  { id: 'goblet-squat',           name: 'Goblet Squat',             category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 7.0, caloriesPerSet: 15 },
  { id: 'bodyweight-squat',       name: 'Bodyweight Squat',         category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 5.5, caloriesPerSet: 10 },
  { id: 'sumo-squat',             name: 'Sumo Squat',               category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 6.0, caloriesPerSet: 12 },
  { id: 'leg-press',              name: 'Leg Press',                category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 6.0, caloriesPerSet: 15 },
  { id: 'hack-squat',             name: 'Hack Squat',               category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 7.5, caloriesPerSet: 18 },
  { id: 'lunges',                 name: 'Lunges',                   category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 7.0, caloriesPerSet: 12 },
  { id: 'walking-lunges',         name: 'Walking Lunges',           category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 7.5, caloriesPerSet: 13 },
  { id: 'reverse-lunges',         name: 'Reverse Lunges',           category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 7.0, caloriesPerSet: 12 },
  { id: 'calf-raise-standing',    name: 'Standing Calf Raise',      category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 3.5, caloriesPerSet: 6  },
  { id: 'calf-raise-seated',      name: 'Seated Calf Raise',        category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 3.0, caloriesPerSet: 5  },
  { id: 'leg-extension',          name: 'Leg Extension',            category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'hamstring-curl-lying',   name: 'Lying Hamstring Curl',     category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'hamstring-curl-seated',  name: 'Seated Hamstring Curl',    category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'hip-thrust',             name: 'Hip Thrust',               category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 5.5, caloriesPerSet: 12 },
  { id: 'glute-bridge',           name: 'Glute Bridge',             category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 4.5, caloriesPerSet: 9  },
  { id: 'step-ups',               name: 'Step Ups',                 category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 6.0, caloriesPerSet: 11 },
  { id: 'split-squat',            name: 'Bulgarian Split Squat',    category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 7.0, caloriesPerSet: 14 },
  { id: 'wall-sit',               name: 'Wall Sit',                 category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'pistol-squat',           name: 'Pistol Squat',             category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 8.0, caloriesPerSet: 16 },
  { id: 'box-jump',               name: 'Box Jump',                 category: 'Legs',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 8.0, caloriesPerSet: 15 },
  { id: 'rdl-single-leg',         name: 'Single Leg RDL',           category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 5.5, caloriesPerSet: 11 },
  { id: 'adductor-machine',       name: 'Adductor Machine',         category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 3.5, caloriesPerSet: 7  },
  { id: 'abductor-machine',       name: 'Abductor Machine',         category: 'Legs',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 3.5, caloriesPerSet: 7  },

  // ── Core ──────────────────────────────────────────────────────────────────────
  { id: 'plank',                  name: 'Plank',                    category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'side-plank',             name: 'Side Plank',               category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'crunches',               name: 'Crunches',                 category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 4.5, caloriesPerSet: 8  },
  { id: 'bicycle-crunch',         name: 'Bicycle Crunch',           category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 5.5, caloriesPerSet: 10 },
  { id: 'reverse-crunch',         name: 'Reverse Crunch',           category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 5.0, caloriesPerSet: 9  },
  { id: 'russian-twists',         name: 'Russian Twists',           category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 5.0, caloriesPerSet: 9  },
  { id: 'mountain-climbers',      name: 'Mountain Climbers',        category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 8.0, caloriesPerSet: 12 },
  { id: 'leg-raises',             name: 'Leg Raises',               category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 5.0, caloriesPerSet: 9  },
  { id: 'hanging-leg-raise',      name: 'Hanging Leg Raise',        category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 6.0, caloriesPerSet: 12 },
  { id: 'ab-wheel-rollout',       name: 'Ab Wheel Rollout',         category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 6.5, caloriesPerSet: 13 },
  { id: 'cable-crunch',           name: 'Cable Crunch',             category: 'Core',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 5.0, caloriesPerSet: 10 },
  { id: 'dragon-flag',            name: 'Dragon Flag',              category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 7.5, caloriesPerSet: 15 },
  { id: 'flutter-kicks',          name: 'Flutter Kicks',            category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 5.0, caloriesPerSet: 9  },
  { id: 'v-ups',                  name: 'V-Ups',                    category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 6.0, caloriesPerSet: 11 },
  { id: 'toe-touches',            name: 'Toe Touches',              category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.5, caloriesPerSet: 8  },
  { id: 'dead-bug',               name: 'Dead Bug',                 category: 'Core',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 3.5, caloriesPerSet: 7  },
  { id: 'woodchop',               name: 'Cable Wood Chop',          category: 'Core',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 5.0, caloriesPerSet: 9  },

  // ── HIIT / Plyometrics ────────────────────────────────────────────────────────
  { id: 'burpees',                name: 'Burpees',                  category: 'HIIT',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 10.0,caloriesPerSet: 18 },
  { id: 'jump-squats',            name: 'Jump Squats',              category: 'HIIT',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 9.0, caloriesPerSet: 16 },
  { id: 'high-knees',             name: 'High Knees',               category: 'HIIT',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 9.5, caloriesPerSet: 14 },
  { id: 'box-jumps-hiit',         name: 'Box Jumps',                category: 'HIIT',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 8.0, caloriesPerSet: 15 },
  { id: 'jumping-lunges',         name: 'Jumping Lunges',           category: 'HIIT',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 9.0, caloriesPerSet: 16 },
  { id: 'battle-ropes',           name: 'Battle Ropes',             category: 'HIIT',       type: 'cardio',     image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 10.5,caloriesPerSet: 0  },
  { id: 'kettlebell-swing',       name: 'Kettlebell Swing',         category: 'HIIT',       type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 9.0, caloriesPerSet: 16 },
  { id: 'sled-push',              name: 'Sled Push',                category: 'HIIT',       type: 'strength',   image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 9.0, caloriesPerSet: 18 },
  { id: 'tire-flip',              name: 'Tire Flip',                category: 'HIIT',       type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 9.0, caloriesPerSet: 20 },
  { id: 'sprint-intervals',       name: 'Sprint Intervals',         category: 'HIIT',       type: 'cardio',     image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=100', met: 14.0,caloriesPerSet: 0  },
  { id: 'tabata',                 name: 'Tabata',                   category: 'HIIT',       type: 'cardio',     image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 11.0,caloriesPerSet: 0  },

  // ── Cardio ────────────────────────────────────────────────────────────────────
  { id: 'walking',                name: 'Walking',                  category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1551854838-212c20bcf6b1?q=80&w=100', met: 3.5, caloriesPerSet: 0  },
  { id: 'brisk-walking',          name: 'Brisk Walking',            category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1551854838-212c20bcf6b1?q=80&w=100', met: 5.0, caloriesPerSet: 0  },
  { id: 'running',                name: 'Running',                  category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=100', met: 9.8, caloriesPerSet: 0  },
  { id: 'jogging',                name: 'Jogging',                  category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=100', met: 7.0, caloriesPerSet: 0  },
  { id: 'cycling',                name: 'Cycling',                  category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?q=80&w=100', met: 7.5, caloriesPerSet: 0  },
  { id: 'stationary-bike',        name: 'Stationary Bike',          category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?q=80&w=100', met: 6.8, caloriesPerSet: 0  },
  { id: 'jump-rope',              name: 'Jump Rope',                category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a3c?q=80&w=100', met: 11.8,caloriesPerSet: 0  },
  { id: 'swimming',               name: 'Swimming',                 category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=100', met: 7.0, caloriesPerSet: 0  },
  { id: 'jumping-jacks',          name: 'Jumping Jacks',            category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 8.0, caloriesPerSet: 0  },
  { id: 'elliptical',             name: 'Elliptical',               category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 5.0, caloriesPerSet: 0  },
  { id: 'rowing-machine',         name: 'Rowing Machine',           category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 7.0, caloriesPerSet: 0  },
  { id: 'stair-climber',          name: 'Stair Climber',            category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 9.0, caloriesPerSet: 0  },
  { id: 'hiking',                 name: 'Hiking',                   category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1551854838-212c20bcf6b1?q=80&w=100', met: 6.5, caloriesPerSet: 0  },
  { id: 'dancing',                name: 'Dancing',                  category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 5.5, caloriesPerSet: 0  },
  { id: 'kickboxing',             name: 'Kickboxing',               category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 9.5, caloriesPerSet: 0  },
  { id: 'treadmill-incline',      name: 'Treadmill Incline Walk',   category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=100', met: 5.0, caloriesPerSet: 0  },
  { id: 'zumba',                  name: 'Zumba',                    category: 'Cardio',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 6.5, caloriesPerSet: 0  },

  // ── Yoga ──────────────────────────────────────────────────────────────────────
  { id: 'yoga-sun-salutation',    name: 'Sun Salutation',           category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'yoga-warrior-i',         name: 'Warrior I Pose',           category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 3.5, caloriesPerSet: 6  },
  { id: 'yoga-warrior-ii',        name: 'Warrior II Pose',          category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 3.5, caloriesPerSet: 6  },
  { id: 'yoga-downward-dog',      name: 'Downward Dog',             category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 3.0, caloriesPerSet: 5  },
  { id: 'yoga-chair-pose',        name: 'Chair Pose',               category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'yoga-tree-pose',         name: 'Tree Pose',                category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 2.5, caloriesPerSet: 4  },
  { id: 'yoga-boat-pose',         name: 'Boat Pose',                category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 4.0, caloriesPerSet: 8  },
  { id: 'yoga-bridge-pose',       name: 'Bridge Pose',              category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 3.0, caloriesPerSet: 6  },
  { id: 'yoga-crow-pose',         name: 'Crow Pose',                category: 'Yoga',       type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 5.0, caloriesPerSet: 10 },
  { id: 'yoga-flow-vinyasa',      name: 'Vinyasa Flow',             category: 'Yoga',       type: 'cardio',     image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 4.5, caloriesPerSet: 0  },
  { id: 'yoga-hatha',             name: 'Hatha Yoga',               category: 'Yoga',       type: 'cardio',     image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 3.0, caloriesPerSet: 0  },
  { id: 'yoga-power',             name: 'Power Yoga',               category: 'Yoga',       type: 'cardio',     image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 6.0, caloriesPerSet: 0  },

  // ── Flexibility & Mobility ────────────────────────────────────────────────────
  { id: 'foam-rolling',           name: 'Foam Rolling',             category: 'Flexibility', type: 'bodyweight', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 2.5, caloriesPerSet: 4  },
  { id: 'hip-flexor-stretch',     name: 'Hip Flexor Stretch',       category: 'Flexibility', type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 2.0, caloriesPerSet: 3  },
  { id: 'hamstring-stretch',      name: 'Hamstring Stretch',        category: 'Flexibility', type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 2.0, caloriesPerSet: 3  },
  { id: 'shoulder-stretch',       name: 'Shoulder Stretch',         category: 'Flexibility', type: 'bodyweight', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 2.0, caloriesPerSet: 3  },
  { id: 'pigeon-pose',            name: 'Pigeon Pose Stretch',      category: 'Flexibility', type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 2.5, caloriesPerSet: 4  },
  { id: 'cat-cow-stretch',        name: 'Cat-Cow Stretch',          category: 'Flexibility', type: 'bodyweight', image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=100', met: 2.0, caloriesPerSet: 3  },
  { id: 'thoracic-rotation',      name: 'Thoracic Rotation',        category: 'Flexibility', type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 2.5, caloriesPerSet: 4  },
  { id: 'ankle-mobility',         name: 'Ankle Mobility Drill',     category: 'Flexibility', type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 2.0, caloriesPerSet: 3  },

  // ── Olympic / Power Lifting ────────────────────────────────────────────────────
  { id: 'clean-and-jerk',         name: 'Clean and Jerk',           category: 'Olympic',    type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 9.0, caloriesPerSet: 22 },
  { id: 'snatch',                 name: 'Snatch',                   category: 'Olympic',    type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 9.0, caloriesPerSet: 22 },
  { id: 'power-clean',            name: 'Power Clean',              category: 'Olympic',    type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 8.5, caloriesPerSet: 20 },
  { id: 'hang-clean',             name: 'Hang Clean',               category: 'Olympic',    type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 8.0, caloriesPerSet: 19 },
  { id: 'push-press',             name: 'Push Press',               category: 'Olympic',    type: 'strength',   image: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?q=80&w=100', met: 7.5, caloriesPerSet: 17 },
  { id: 'thruster',               name: 'Thruster',                 category: 'Olympic',    type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 9.0, caloriesPerSet: 20 },

  // ── Kettlebell ────────────────────────────────────────────────────────────────
  { id: 'kettlebell-swing-kb',    name: 'Kettlebell Swing',         category: 'Kettlebell', type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 9.0, caloriesPerSet: 16 },
  { id: 'kettlebell-goblet-squat',name: 'Kettlebell Goblet Squat',  category: 'Kettlebell', type: 'strength',   image: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?q=80&w=100', met: 7.0, caloriesPerSet: 14 },
  { id: 'kettlebell-press',       name: 'Kettlebell Press',         category: 'Kettlebell', type: 'strength',   image: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?q=80&w=100', met: 6.0, caloriesPerSet: 12 },
  { id: 'kettlebell-snatch',      name: 'Kettlebell Snatch',        category: 'Kettlebell', type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 9.0, caloriesPerSet: 18 },
  { id: 'kettlebell-clean',       name: 'Kettlebell Clean',         category: 'Kettlebell', type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 8.0, caloriesPerSet: 16 },
  { id: 'kettlebell-deadlift',    name: 'Kettlebell Deadlift',      category: 'Kettlebell', type: 'strength',   image: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?q=80&w=100', met: 7.0, caloriesPerSet: 15 },
  { id: 'turkish-getup',          name: 'Turkish Get-Up',           category: 'Kettlebell', type: 'strength',   image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=100', met: 7.5, caloriesPerSet: 16 },

  // ── Sports ────────────────────────────────────────────────────────────────────
  { id: 'basketball',             name: 'Basketball',               category: 'Sports',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=100', met: 8.0, caloriesPerSet: 0  },
  { id: 'soccer',                 name: 'Soccer / Football',        category: 'Sports',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=100', met: 7.0, caloriesPerSet: 0  },
  { id: 'tennis',                 name: 'Tennis',                   category: 'Sports',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=100', met: 7.3, caloriesPerSet: 0  },
  { id: 'badminton',              name: 'Badminton',                category: 'Sports',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=100', met: 5.5, caloriesPerSet: 0  },
  { id: 'volleyball',             name: 'Volleyball',               category: 'Sports',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=100', met: 4.0, caloriesPerSet: 0  },
  { id: 'cricket',                name: 'Cricket',                  category: 'Sports',     type: 'cardio',     image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=100', met: 5.0, caloriesPerSet: 0  },

  // ── Stretching / Warm-Up ─────────────────────────────────────────────────────
  { id: 'jumping-jacks-warmup',   name: 'Jumping Jacks (Warm-Up)', category: 'Warm-Up',    type: 'bodyweight', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 7.0, caloriesPerSet: 10 },
  { id: 'arm-circles',            name: 'Arm Circles',              category: 'Warm-Up',    type: 'bodyweight', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=100', met: 2.5, caloriesPerSet: 4  },
  { id: 'leg-swings',             name: 'Leg Swings',               category: 'Warm-Up',    type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 2.5, caloriesPerSet: 4  },
  { id: 'inchworm',               name: 'Inchworm',                 category: 'Warm-Up',    type: 'bodyweight', image: 'https://images.unsplash.com/photo-1598266663439-2056e6900339?q=80&w=100', met: 4.0, caloriesPerSet: 7  },
  { id: 'hip-circles',            name: 'Hip Circles',              category: 'Warm-Up',    type: 'bodyweight', image: 'https://images.unsplash.com/photo-1606902965551-dce093cda6e7?q=80&w=100', met: 2.0, caloriesPerSet: 3  },
];

export const FREQUENT_EXERCISE_IDS = [
  'bench-press-barbell', 'push-ups', 'walking', 'skull-crusher',
  'lat-pulldown', 'squat-barbell', 'running', 'bicep-curl-dumbbell',
  'deadlift', 'pull-ups', 'plank', 'burpees',
];

export function searchExercises(query: string): Exercise[] {
  const q = query.toLowerCase().trim();
  if (!q) return FREQUENT_EXERCISE_IDS.map(id => EXERCISES.find(e => e.id === id)!).filter(Boolean);
  return EXERCISES.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q) ||
    e.type.toLowerCase().includes(q)
  ).slice(0, 50);
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find(e => e.id === id);
}

/**
 * Estimate calories burned.
 * Cardio: MET × bodyWeightKg × durationHours
 * Strength/Bodyweight: caloriesPerSet × numberOfSets
 */
export function calcCaloriesBurned(
  exercise: Exercise,
  bodyWeightKg = 70,
  opts: { sets?: { weight: number; reps: number }[]; durationMinutes?: number }
): number {
  if (exercise.type === 'cardio' && opts.durationMinutes) {
    return Math.round(exercise.met * bodyWeightKg * (opts.durationMinutes / 60));
  }
  if (opts.sets && opts.sets.length > 0) {
    return Math.round(exercise.caloriesPerSet * opts.sets.length);
  }
  return 30; // fallback
}
