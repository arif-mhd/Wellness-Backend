export interface PastConsultation {
  id: string;
  date: string;
  diagnosis: string;
  email?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  email: string;
  diagnosis: string;
  description: string;
  dateTime: string;
  avatar: string;
  bio: string;
  pastConsultations: PastConsultation[];
}

export const MOCK_RECENT_PATIENTS: Patient[] = [
  {
    id: "new-1",
    name: "Yelena Isinbaeva",
    age: 32,
    email: "yelena@example.com",
    diagnosis: "Fever",
    description: "I’ve had a fever for three days with chills, body aches, and fatigue.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72",
    bio: "Yelena Isinbaeva is a 32-year-old female diagnosed with a high fever. She has a history of seasonal allergies and is proactive about seeking treatment when symptoms persist. She is looking for an immediate consultation to address the fever, chills, and body aches.",
    pastConsultations: [
      { id: "Consultation_01022020", date: "1 Feb, 2020, 11:40 PM", diagnosis: "Fever" },
      { id: "Consultation_26062019", date: "26 Jun, 2019, 11:40 PM", diagnosis: "Headache" }
    ]
  },
  {
    id: "new-2",
    name: "Albert Flores",
    age: 89,
    email: "albert.flores@example.com",
    diagnosis: "Cough",
    description: "John Smith is a 45-year-old male from Sharjah, UAE, diagnosed with hypertension. He has a history of Type 2 Diabetes and is currently on medication for both conditions...",
    dateTime: "17 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/193603633a5140267134f1748cf7c4365ae534a9?width=72",
    bio: "John Smith is a 45-year-old male from Sharjah, UAE, diagnosed with hypertension. He has a history of Type 2 Diabetes and is currently on medication for both conditions. John follows a regular exercise routine and maintains a controlled diet to manage his health. He regularly attends check-ups and is proactive about his well-being.",
    pastConsultations: [
      { id: "Consultation_01022020", date: "1 Feb, 2020, 11:40 PM", diagnosis: "Fever" },
      { id: "Consultation_03022019", date: "3 Feb, 2019, 11:40 PM", diagnosis: "Cough", email: "yelena@example.com" },
      { id: "Consultation_26062019", date: "26 Jun, 2019, 11:40 PM", diagnosis: "Headache", email: "yelena@example.com" },
      { id: "Consultation_26062019_2", date: "26 Jun, 2019, 04:30 PM", diagnosis: "Fever", email: "yelena@example.com" },
      { id: "Consultation_26062019_3", date: "26 Jun, 2019, 10:15 AM", diagnosis: "Fever", email: "yelena@example.com" }
    ]
  },
  {
    id: "new-3",
    name: "Savannah Nguyen",
    age: 32,
    email: "savannah.n@example.com",
    diagnosis: "Asthma",
    description: "Mild asthma flare-up triggered by change in weather, needing inhaler adjustment.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/2fc70c27396226e96d788f42ab8214ce8f948ab5?width=72",
    bio: "Savannah Nguyen is a 32-year-old female who has been managing mild asthma since childhood. She uses a rescue inhaler when needed and is visiting for a routine check-up and prescription renewal. She is otherwise in good health and maintains an active lifestyle.",
    pastConsultations: [
      { id: "Consultation_14102020", date: "14 Oct, 2020, 09:00 AM", diagnosis: "Asthma" },
      { id: "Consultation_05052019", date: "5 May, 2019, 11:40 PM", diagnosis: "Cough" }
    ]
  },
  {
    id: "new-4",
    name: "Darlene Robertson",
    age: 32,
    email: "darlene.r@example.com",
    diagnosis: "Cough",
    description: "Acute chest congestion with painful cough and occasional shortness of breath.",
    dateTime: "21 Sep, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/05a901293de2a84f45dff39e0efa33b0984e765e?width=72",
    bio: "Darlene Robertson is a 32-year-old female presenting with a persistent dry cough for the past week. She has no significant medical history but reports mild throat irritation and congestion. She is seeking advice on symptomatic relief.",
    pastConsultations: [
      { id: "Consultation_11092020", date: "11 Sep, 2020, 02:30 PM", diagnosis: "Cough" }
    ]
  },
  {
    id: "new-5",
    name: "Cody Fisher",
    age: 32,
    email: "cody.f@example.com",
    diagnosis: "Fever",
    description: "Sudden onset of fever over 101F with body pain and headache.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/b4cc7594fc29dd53530bda4ab8cd965eebd0526d?width=72",
    bio: "Cody Fisher is a 32-year-old male who has been experiencing a fever, fatigue, and muscle aches for three days. He has no chronic conditions and is looking for a professional assessment and potential treatment options.",
    pastConsultations: [
      { id: "Consultation_20102020", date: "20 Oct, 2020, 11:40 PM", diagnosis: "Fever" }
    ]
  }
];

export const MOCK_ALL_CONSULTATIONS: Patient[] = [
  {
    id: "all-1",
    name: "Brooklyn Simmons",
    age: 32,
    email: "brooklyn.s@example.com",
    diagnosis: "Fever",
    description: "Recovering from viral fever, seeking follow-up on temperature stability.",
    dateTime: "21 Sep, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/75256e943440be4cb0a85199610fc72cb903d28c?width=72",
    bio: "Brooklyn Simmons is a 32-year-old female who recently recovered from a moderate fever. Her follow-up visit is to ensure that her vital signs are stable and no secondary infection has developed.",
    pastConsultations: [
      { id: "Consultation_15092020", date: "15 Sep, 2020, 11:40 PM", diagnosis: "Fever" }
    ]
  },
  {
    id: "all-2",
    name: "Arlene McCoy",
    age: 32,
    email: "arlene.m@example.com",
    diagnosis: "Cough",
    description: "Persistent cough for two weeks, throat irritation.",
    dateTime: "1 Feb, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/2fc70c27396226e96d788f42ab8214ce8f948ab5?width=72",
    bio: "Arlene McCoy is a 32-year-old female experiencing persistent dry cough and throat irritation for two weeks.",
    pastConsultations: [
      { id: "Consultation_20012020", date: "20 Jan, 2020, 11:40 PM", diagnosis: "Cough" }
    ]
  },
  {
    id: "all-3",
    name: "Cameron Williamson",
    age: 32,
    email: "cameron.w@example.com",
    diagnosis: "Asthma",
    description: "Routine assessment of exercise-induced asthma control.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/b68921b9bb9ab8729018822005356cd9a7bdb3d5?width=72",
    bio: "Cameron Williamson is a 32-year-old male with moderate asthma. His session in October was a routine asthma control assessment.",
    pastConsultations: [
      { id: "Consultation_10102020", date: "10 Oct, 2020, 11:40 PM", diagnosis: "Asthma" }
    ]
  },
  {
    id: "all-4",
    name: "Courtney Henry",
    age: 32,
    email: "courtney.h@example.com",
    diagnosis: "Cough",
    description: "Mild bronchitis symptoms following cold, seeking guidance.",
    dateTime: "8 Sep, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/05a901293de2a84f45dff39e0efa33b0984e765e?width=72",
    bio: "Courtney Henry is a 32-year-old female who presented with an acute cough following a viral upper respiratory infection.",
    pastConsultations: [
      { id: "Consultation_01092020", date: "1 Sep, 2020, 11:40 PM", diagnosis: "Cough" }
    ]
  },
  {
    id: "all-5",
    name: "Bessie Cooper",
    age: 32,
    email: "bessie.cooper@example.com",
    diagnosis: "Fever",
    description: "Fever for three days with chills and fatigue.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/a6e1aefad7124efd79b13f8c10e84778817f96f0?width=72",
    bio: "Bessie Cooper is a 32-year-old female who presented with fever and body aches.",
    pastConsultations: [
      { id: "Consultation_19102020", date: "19 Oct, 2020, 11:40 PM", diagnosis: "Fever" }
    ]
  },
  {
    id: "all-6",
    name: "Bessie Cooper",
    age: 28,
    email: "bessie.c2@example.com",
    diagnosis: "Fever",
    description: "Recurring mild fever in evenings.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/70edbe32982956e0679a8ff727695d9b1777fc72?width=72",
    bio: "Bessie Cooper, 28, presented with low-grade evening fevers.",
    pastConsultations: [
      { id: "Consultation_18102020", date: "18 Oct, 2020, 11:40 PM", diagnosis: "Fever" }
    ]
  },
  {
    id: "all-7",
    name: "Bessie Cooper",
    age: 35,
    email: "bessie.c3@example.com",
    diagnosis: "Fever",
    description: "High fever accompanied by severe sore throat.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/849e04b65fc61409106af3d69a42e91596c64bd2?width=72",
    bio: "Bessie Cooper, 35, complained of a sudden fever and throat discomfort.",
    pastConsultations: [
      { id: "Consultation_17102020", date: "17 Oct, 2020, 11:40 PM", diagnosis: "Fever" }
    ]
  },
  {
    id: "all-8",
    name: "Bessie Cooper",
    age: 41,
    email: "bessie.c4@example.com",
    diagnosis: "Fever",
    description: "Post-vaccination high fever and chills.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/9095e778a7eba1729febd7b2a1d7026c11d62d63?width=72",
    bio: "Bessie Cooper, 41, experienced immune response fevers following booster immunizations.",
    pastConsultations: [
      { id: "Consultation_16102020", date: "16 Oct, 2020, 11:40 PM", diagnosis: "Fever" }
    ]
  },
  {
    id: "all-9",
    name: "Bessie Cooper",
    age: 50,
    email: "bessie.c5@example.com",
    diagnosis: "Fever",
    description: "Fever, body aches, joint stiffness.",
    dateTime: "22 Oct, 2020, 11:40 PM",
    avatar: "https://api.builder.io/api/v1/image/assets/TEMP/5c080405a4cfd0cc48c023c7e3ca5054f6c0c807?width=72",
    bio: "Bessie Cooper, 50, sought consultation for a fever combined with joint pain.",
    pastConsultations: [
      { id: "Consultation_15102020", date: "15 Oct, 2020, 11:40 PM", diagnosis: "Fever" }
    ]
  }
];
