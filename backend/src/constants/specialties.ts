// Canonical specialty vocabulary used by the Dr. Wellness chatbot (wellness.ts)
// to ground its specialty recommendations, and by GET /api/doctors' specialty
// filter. Keep doctor documents' `specialty` field values aligned with this
// list so recommendations reliably match real doctors.
export const SPECIALTIES: string[] = [
  "General Physician",
  "Neurologist",
  "Cardiologist",
  "Dermatologist",
  "ENT Specialist",
  "Gynecologist",
  "Orthopedic Surgeon",
  "Pediatrician",
  "Psychiatrist",
  "Ophthalmologist",
  "Gastroenterologist",
  "Urologist",
  "Pulmonologist",
  "Endocrinologist",
  "Rheumatologist",
  "Oncologist",
  "Nephrologist",
  "Allergist",
  "Infectious Disease Specialist",
];

// Example symptom → specialty mappings used to steer the model's reasoning.
// Not exhaustive — the model should generalize beyond these examples.
export const SYMPTOM_SPECIALTY_HINTS: { symptoms: string; specialty: string }[] = [
  { symptoms: "Headache, migraine", specialty: "Neurologist" },
  { symptoms: "Chest pain, heart palpitations", specialty: "Cardiologist" },
  { symptoms: "Skin rash, acne", specialty: "Dermatologist" },
  { symptoms: "Ear pain, sore throat, sinus", specialty: "ENT Specialist" },
  { symptoms: "Pregnancy, menstrual issues", specialty: "Gynecologist" },
  { symptoms: "Joint pain, fracture", specialty: "Orthopedic Surgeon" },
  { symptoms: "Child illness", specialty: "Pediatrician" },
  { symptoms: "Anxiety, depression", specialty: "Psychiatrist" },
  { symptoms: "Eye problems", specialty: "Ophthalmologist" },
  { symptoms: "Stomach pain, digestion", specialty: "Gastroenterologist" },
  { symptoms: "Breathing, asthma", specialty: "Pulmonologist" },
  { symptoms: "Diabetes, thyroid", specialty: "Endocrinologist" },
  { symptoms: "General/unclear symptoms", specialty: "General Physician" },
];
