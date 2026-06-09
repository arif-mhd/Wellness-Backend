import { WaitingPatient, PastConsultation } from "./types";

export const MOCK_WAITING_PATIENTS: WaitingPatient[] = [
  {
    id: "w1",
    name: "Albert Flores",
    age: 89,
    email: "yelena@example.om",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/1472fdb35ca5cec32c0e667e161e060e1fca8f1d?width=72",
    status: "Connected",
    connectedTime: "11:30 s",
    reasonForVisit: "Fever",
    reasonDescription: "I’ve had a fever for three days with chills, body aches, and fatigue.",
    gender: "Male",
    dob: "22 Oct, 1936",
    bloodGroup: "O Positive",
    height: "172 cm",
    weight: "85 kg",
    description: "Albert Flores is an 89-year-old male diagnosed with hypertension. He has a history of Type 2 Diabetes and is currently on medication for both conditions. Albert follows a regular exercise routine and maintains a controlled diet to manage his health. He regularly attends check-ups and is proactive about his well-being."
  },
  {
    id: "w2",
    name: "Yelena Isinbaeva",
    age: 32,
    email: "yelena@example.om",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72",
    status: "Waiting",
    reasonForVisit: "Fever",
    reasonDescription: "I’ve had a fever for three days with chills, body aches, and fatigue.",
    gender: "Female",
    dob: "15 Jun, 1993",
    bloodGroup: "A Negative",
    height: "168 cm",
    weight: "58 kg",
    description: "Yelena Isinbaeva is a 32-year-old female complaining of recurrent fever and headache. She has no known chronic illnesses or prior surgeries. Active lifestyle, no regular medications."
  },
  {
    id: "w3",
    name: "Courtney Henry",
    age: 27,
    email: "courtney@example.om",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/4e784aa7fc65f83b1086258ed27c210aa472f67c?width=72",
    status: "Waiting",
    reasonForVisit: "Fever",
    reasonDescription: "I’ve had a fever for three days with chills, body aches, and fatigue.",
    gender: "Female",
    dob: "04 Apr, 1999",
    bloodGroup: "B Positive",
    height: "165 cm",
    weight: "60 kg",
    description: "Courtney Henry is a 27-year-old female presenting with mild respiratory symptoms and intermittent fever. Patient mentions taking paracetamol to self-manage."
  },
  {
    id: "w4",
    name: "Darrell Steward",
    age: 44,
    email: "darrell@example.om",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/4a821c5ff5dd7c1b3425e006a620f5fafea5a3b4?width=72",
    status: "Waiting",
    reasonForVisit: "Fever",
    reasonDescription: "I’ve had a fever for three days with chills, body aches, and fatigue.",
    gender: "Male",
    dob: "12 Dec, 1981",
    bloodGroup: "AB Positive",
    height: "180 cm",
    weight: "78 kg",
    description: "Darrell Steward is a 44-year-old male with persistent fever, mild cough, and lethargy. History of mild seasonal allergies, otherwise healthy."
  },
  {
    id: "w5",
    name: "Floyd Miles",
    age: 36,
    email: "floyd@example.om",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/dc02ab55ba5dcc79add10ec6a26b87667b7e3518?width=72",
    status: "Waiting",
    reasonForVisit: "Fever",
    reasonDescription: "I’ve had a fever for three days with chills, body aches, and fatigue.",
    gender: "Male",
    dob: "30 Aug, 1989",
    bloodGroup: "O Negative",
    height: "175 cm",
    weight: "72 kg",
    description: "Floyd Miles is a 36-year-old male presenting with fever and muscle aches. No significant medical history. Non-smoker, drinks socially."
  }
];

export const MOCK_PAST_CONSULTATIONS: PastConsultation[] = [
  {
    id: "c1",
    title: "Consultation_01022020",
    ref: "DHA-2025-00123456",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "1 Feb, 2020, 11:40 PM"
  },
  {
    id: "c2",
    title: "Consultation_15052020",
    ref: "DHA-2025-00123457",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "15 May, 2020, 09:20 AM"
  },
  {
    id: "c3",
    title: "Consultation_22092020",
    ref: "DHA-2025-00123458",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "22 Sep, 2020, 03:30 PM"
  },
  {
    id: "c4",
    title: "Consultation_10122020",
    ref: "DHA-2025-00123459",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "10 Dec, 2020, 11:00 AM"
  },
  {
    id: "c5",
    title: "Consultation_03032021",
    ref: "DHA-2025-00123460",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "3 Mar, 2021, 02:15 PM"
  }
];
