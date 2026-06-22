export interface PreVisitForm {
  chronicIllnesses: string;
  currentMedications: string;
  allergies: string;
  primaryConcern: string;
  smokes: string;
  drinks: string;
  isQuestionnaire?: boolean;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  email: string;
  diagnosis: string;
  description: string;
  status: 'Waiting' | 'Scheduled' | 'Completed';
  dateTime: string;
  avatar: string;
  bio: string;
  preVisitFormDate?: string;
  preVisitForm?: PreVisitForm;
  earnings?: string;
  gender?: string;
  phone?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  dob?: string;
  /** Raw ISO appointment time — needed for real date filtering (e.g. "Today" vs "All Dates"); dateTime is a formatted display string, not parseable. */
  scheduledAt?: string;
  /** Medicines prescribed in this encounter's EMR, if any was saved. */
  medicines?: { name: string; dosage?: string }[];
}
