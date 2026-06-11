import "dotenv/config";
import { v4 as uuid } from "uuid";
import { feedbackContainer } from "../config/cosmos";

const now = new Date().toISOString();
const dateStr = now.split("T")[0];

const FEEDBACKS = [
  {
    id: uuid(),
    folder: "appointment",
    rating: 5,
    comment: "Dr. Rahim Chowdhury is an incredible professional. He took the time to explain everything thoroughly and was extremely patient.",
    reviewer: {
      id: "patient_kristin",
      name: "Kristin Watson",
      email: "kristin.w@example.com",
      avatar: "KW"
    },
    provider: {
      id: "p1",
      name: "Dr. Rahim Chowdhury",
      email: "r.chowdhury@wellness.com",
      avatar: "RC"
    },
    date: dateStr,
    createdAt: now
  },
  {
    id: uuid(),
    folder: "appointment",
    rating: 4,
    comment: "Dr. Mehnaz Khan was very professional and prompt. The consultation started exactly on time.",
    reviewer: {
      id: "patient_cody",
      name: "Cody Fisher",
      email: "cody.f@example.com",
      avatar: "CF"
    },
    provider: {
      id: "p2",
      name: "Dr. Mehnaz Khan",
      email: "m.khan@wellness.com",
      avatar: "MK"
    },
    date: dateStr,
    createdAt: now
  },
  {
    id: uuid(),
    folder: "pharmacy",
    rating: 4,
    comment: "Delivered all my medications on time, well-packed. Very convenient service!",
    reviewer: {
      id: "patient_wade",
      name: "Wade Warren",
      email: "wade.w@example.com",
      avatar: "WW"
    },
    provider: {
      id: "pharmacy_1",
      name: "Alto Pharmacy",
      email: "alto@pharmacy.com",
      avatar: "AP"
    },
    date: dateStr,
    createdAt: now
  },
  {
    id: uuid(),
    folder: "lab",
    rating: 5,
    comment: "Emirates Diagnostic Lab was outstanding. The nurse was very gentle with the blood draw and results came back in 4 hours.",
    reviewer: {
      id: "patient_esther",
      name: "Esther Howard",
      email: "esther.h@example.com",
      avatar: "EH"
    },
    provider: {
      id: "lab_1",
      name: "Emirates Diagnostic Lab",
      email: "emirates@lab.com",
      avatar: "ED"
    },
    date: dateStr,
    createdAt: now
  },
  {
    id: uuid(),
    folder: "appointment",
    rating: 5,
    comment: "Had an amazing consultation with Dr. Anderson. Highly detailed explanations.",
    reviewer: {
      id: "patient_1",
      name: "Gayathri",
      email: "gayathri@gmail.com",
      avatar: "G"
    },
    provider: {
      id: "doc_1",
      name: "Dr. Michael Anderson",
      email: "m.anderson@wellness.com",
      avatar: "MA"
    },
    date: dateStr,
    createdAt: now
  }
];

async function seed() {
  console.log("🌱 Starting feedback seeding...");
  for (const f of FEEDBACKS) {
    await feedbackContainer.items.upsert(f);
    console.log(`   ✅ Seeded feedback from ${f.reviewer.name} for ${f.provider.name} (${f.folder})`);
  }
  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
