export interface PreVisitForm {
  chronicIllnesses: string;
  currentMedications: string;
  allergies: string;
  primaryConcern: string;
  smokes: string;
  drinks: string;
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
}
