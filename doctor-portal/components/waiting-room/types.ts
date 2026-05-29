export interface WaitingPatient {
  id: string;
  name: string;
  age: number;
  email: string;
  avatar: string;
  status: "Connected" | "Waiting";
  connectedTime?: string;
  reasonForVisit: string;
  reasonDescription: string;
  gender: string;
  dob: string;
  bloodGroup: string;
  height: string;
  weight: string;
  description: string;
}

export interface PastConsultation {
  id: string;
  title: string;
  ref: string;
  doctor: string;
  doctorAvatar: string;
  date: string;
}
