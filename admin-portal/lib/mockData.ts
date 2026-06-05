export interface Patient {
  id: number;
  name: string;
  age: string;
  email: string;
  detailEmail: string;
  avatar: string;
  totalAppointments: number;
  lastAppointment: string;
  emiratesId: string;
  gender: string;
  dob: string;
  phone: string;
  address: string;
  bio: string;
  height: string;
  weight: string;
  postalCode: string;
}

export const mockPatients: Patient[] = [
  {
    id: 1,
    name: "Brooklyn Simmons",
    age: "32 y/o",
    email: "yelena@example.com",
    detailEmail: "john@example.com",
    avatar: "/doctor-avatar.png",
    totalAppointments: 154,
    lastAppointment: "21 Sep, 2020, 11:40 PM",
    emiratesId: "784-1234-5678",
    gender: "Male",
    dob: "02 January 1990",
    phone: "+971 50 123 4567",
    address: "1234 Al Zahra Streetm",
    bio: "A board-certified physician specializing in internal medicine. I completed my medical degree at Harvard Medical School and my residency at Johns Hopkins Hospital, where I gained extensive experience in patient care and clinical research.",
    height: "167",
    weight: "89",
    postalCode: "12345"
  },
  {
    id: 2,
    name: "Arlene McCoy",
    age: "32 y/o",
    email: "yelena@example.com",
    detailEmail: "john@example.com",
    avatar: "/doctor-avatar.png",
    totalAppointments: 426,
    lastAppointment: "1 Feb, 2020, 11:40 PM",
    emiratesId: "784-2345-6789",
    gender: "Female",
    dob: "14 May 1988",
    phone: "+971 50 987 6543",
    address: "1234 Al Zahra Streetm",
    bio: "An experienced practitioner with a focus on holistic health. I am dedicated to providing comprehensive and compassionate care to all my patients.",
    height: "160",
    weight: "65",
    postalCode: "12345"
  },
  {
    id: 3,
    name: "Devon Lane",
    age: "32 y/o",
    email: "yelena@example.com",
    detailEmail: "john@example.com",
    avatar: "/doctor-avatar.png",
    totalAppointments: 21,
    lastAppointment: "1 Feb, 2020, 11:40 PM",
    emiratesId: "784-3456-7890",
    gender: "Male",
    dob: "23 August 1985",
    phone: "+971 50 111 2222",
    address: "1234 Al Zahra Streetm",
    bio: "A specialist in sports medicine and rehabilitation. I have worked with numerous professional athletes to help them recover from injuries.",
    height: "180",
    weight: "75",
    postalCode: "12345"
  },
  {
    id: 4,
    name: "Cody Fisher",
    age: "32 y/o",
    email: "yelena@example.com",
    detailEmail: "john@example.com",
    avatar: "/doctor-avatar.png",
    totalAppointments: 426,
    lastAppointment: "1 Feb, 2020, 11:40 PM",
    emiratesId: "784-4567-8901",
    gender: "Male",
    dob: "30 November 1992",
    phone: "+971 50 333 4444",
    address: "1234 Al Zahra Streetm",
    bio: "Focused on preventative care and wellness programs. My goal is to empower patients to take charge of their health through education and support.",
    height: "175",
    weight: "80",
    postalCode: "12345"
  },
  {
    id: 5,
    name: "Courtney Henry",
    age: "32 y/o",
    email: "yelena@example.com",
    detailEmail: "john@example.com",
    avatar: "/doctor-avatar.png",
    totalAppointments: 426,
    lastAppointment: "1 Feb, 2020, 11:40 PM",
    emiratesId: "784-5678-9012",
    gender: "Female",
    dob: "12 July 1995",
    phone: "+971 50 555 6666",
    address: "1234 Al Zahra Streetm",
    bio: "Passionate about pediatric care and ensuring the healthy development of children. I strive to create a welcoming and comforting environment for my young patients.",
    height: "165",
    weight: "55",
    postalCode: "12345"
  },
];
