import "dotenv/config";
import { medicineOrdersContainer, labBookingsContainer } from "../config/cosmos";

const now = new Date();
const dateStr = now.toISOString();

// Helper to construct past dates
const daysAgo = (num: number) => {
  const d = new Date();
  d.setDate(d.getDate() - num);
  return d.toISOString();
};

const MEDICINE_ORDERS = [
  {
    id: "order_1",
    patientId: "patient_1",
    patient_id: "patient_1",
    items: [
      {
        medicine_id: "med_1",
        name: "Amoxicillin 500 mg",
        quantity: 2,
        unit_price: 50,
        pharmacyId: "pharm_1"
      },
      {
        medicine_id: "med_2",
        name: "Paracetamol 500 mg",
        quantity: 3,
        unit_price: 10,
        pharmacyId: "pharm_1"
      }
    ],
    delivery_address: "2715 Ash Dr. San Jose, South Dakota 83475",
    status: "confirmed",
    total_amount: 130,
    payment_status: "paid",
    payment_method: "mock",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1)
  },
  {
    id: "order_2",
    patientId: "patient_1",
    patient_id: "patient_1",
    items: [
      {
        medicine_id: "med_3",
        name: "Ibuprofen 400 mg",
        quantity: 1,
        unit_price: 35,
        pharmacyId: "pharm_1"
      }
    ],
    delivery_address: "2715 Ash Dr. San Jose, South Dakota 83475",
    status: "shipped",
    total_amount: 35,
    payment_status: "paid",
    payment_method: "mock",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2)
  },
  {
    id: "order_3",
    patientId: "patient_1",
    patient_id: "patient_1",
    items: [
      {
        medicine_id: "med_4",
        name: "Aspirin 325 mg",
        quantity: 5,
        unit_price: 20,
        pharmacyId: "pharm_2"
      }
    ],
    delivery_address: "2715 Ash Dr. San Jose, South Dakota 83475",
    status: "delivered",
    total_amount: 100,
    payment_status: "paid",
    payment_method: "mock",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3)
  }
];

const LAB_BOOKINGS = [
  {
    id: "booking_1",
    patientId: "patient_1",
    items: [
      {
        testId: "test_1",
        testName: "Full Body Essentials Checkup",
        category: "All",
        labId: "lab_1",
        labName: "Wellness Lab",
        price: 350,
        forPatientId: "patient_1",
        visitMode: "Laboratory",
        scheduledAt: daysAgo(0),
        requires_doctor_approval: false
      }
    ],
    consultationDate: daysAgo(0).split("T")[0],
    consultationSlot: "9:00AM",
    status: "awaiting",
    payment_status: "paid",
    payment_amount: 350,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0)
  },
  {
    id: "booking_2",
    patientId: "patient_1",
    items: [
      {
        testId: "test_2",
        testName: "Diabetes Screening & Lipid Profile",
        category: "All",
        labId: "lab_1",
        labName: "Wellness Lab",
        price: 250,
        forPatientId: "patient_1",
        visitMode: "Laboratory",
        scheduledAt: daysAgo(1),
        requires_doctor_approval: false
      }
    ],
    consultationDate: daysAgo(1).split("T")[0],
    consultationSlot: "10:00AM",
    status: "confirmed",
    payment_status: "paid",
    payment_amount: 250,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1)
  },
  {
    id: "booking_3",
    patientId: "patient_1",
    items: [
      {
        testId: "test_3",
        testName: "COVID-19 RT-PCR Test",
        category: "All",
        labId: "lab_1",
        labName: "Wellness Lab",
        price: 150,
        forPatientId: "patient_1",
        visitMode: "Laboratory",
        scheduledAt: daysAgo(2),
        requires_doctor_approval: false
      }
    ],
    consultationDate: daysAgo(2).split("T")[0],
    consultationSlot: "11:00AM",
    status: "analyzing",
    payment_status: "paid",
    payment_amount: 150,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2)
  },
  {
    id: "booking_4",
    patientId: "patient_1",
    items: [
      {
        testId: "test_4",
        testName: "Thyroid Profile (T3, T4, TSH)",
        category: "All",
        labId: "lab_1",
        labName: "Wellness Lab",
        price: 180,
        forPatientId: "patient_1",
        visitMode: "Laboratory",
        scheduledAt: daysAgo(3),
        requires_doctor_approval: false
      }
    ],
    consultationDate: daysAgo(3).split("T")[0],
    consultationSlot: "09:30AM",
    status: "results",
    payment_status: "paid",
    payment_amount: 180,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3)
  }
];

async function seed() {
  console.log("🌱 Seeding medicine orders...");
  for (const o of MEDICINE_ORDERS) {
    await medicineOrdersContainer.items.upsert(o);
    console.log(`   ✅ Seeded medicine order: ${o.id} (${o.status})`);
  }

  console.log("🌱 Seeding lab bookings...");
  for (const b of LAB_BOOKINGS) {
    await labBookingsContainer.items.upsert(b);
    console.log(`   ✅ Seeded lab booking: ${b.id} (${b.status})`);
  }

  console.log("🎉 Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
