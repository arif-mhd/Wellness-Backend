// Default Help & FAQ content, loaded into a brand from the admin portal
// ("Load default FAQ") and freely editable there afterwards.
//
// Every answer describes what the patient app actually does, checked against
// its code — screen names and steps match the labels patients see. Anything
// that is business policy rather than app behaviour (refunds, cancellation
// deadlines, how video consultations are paid for) carries a reviewNote and
// is seeded hidden, so nobody publishes a policy the business hasn't set.
//
// `feature` on a category or entry means "only load this for brands that
// have that feature enabled", so the same defaults suit any brand.

export interface DefaultFaqEntry {
  key: string;
  question: string;
  answer: string;
  deepLink?: string;
  related?: string[];
  feature?: string;
  reviewNote?: string;
}

export interface DefaultFaqCategory {
  key: string;
  title: string;
  feature?: string;
  entries: DefaultFaqEntry[];
}

export const DEFAULT_FAQ: DefaultFaqCategory[] = [
  {
    key: "account",
    title: "Account & sign-in",
    entries: [
      {
        key: "create-account",
        question: "How do I create an account?",
        answer:
          "On the sign-in screen, tap Register Now. Enter your name, date of birth, gender, email and phone number, then enter the 6-digit verification code we send you. You can also tap Continue with Google, or Continue with Apple on iPhone.",
        related: ["sign-in", "forgot-password"],
      },
      {
        key: "sign-in",
        question: "How do I sign in?",
        answer:
          "Enter your email address and tap Continue, then enter your password. If you created your account with Google or Apple, tap that same button instead.",
        related: ["forgot-password", "create-account"],
      },
      {
        key: "forgot-password",
        question: "I forgot my password. How do I reset it?",
        answer:
          "On the password screen, tap Forgot Password? and enter your email. We'll send you a 6-digit code. Enter it, then choose a new password of at least 8 characters.",
        related: ["change-password", "sign-in"],
      },
      {
        key: "change-password",
        question: "How do I change my password?",
        answer: "Go to Profile, then Settings, then Account & Security, and tap Change Password. You'll need your current password.",
        deepLink: "account_settings",
        related: ["forgot-password", "active-sessions"],
      },
      {
        key: "active-sessions",
        question: "Can I see which devices are signed in to my account?",
        answer: "Yes. Go to Profile, then Settings, then Account & Security, and open Active Sessions to see every device currently signed in.",
        deepLink: "account_settings",
        related: ["change-password"],
      },
      {
        key: "change-language",
        question: "How do I change the app language?",
        answer: "Go to Profile, then Settings, then Language, and choose English, Arabic, Spanish or French. Restart the app for the change to take effect.",
        deepLink: "language",
      },
      {
        key: "delete-account",
        question: "How do I delete my account?",
        answer:
          "Go to Profile, then Settings, then Account & Security, and tap Delete Account. Type DELETE to confirm. This removes your account and every family member profile under it.",
        deepLink: "account_settings",
        related: ["family-add"],
      },
    ],
  },
  {
    key: "appointments",
    title: "Appointments",
    feature: "appointments",
    entries: [
      {
        key: "book-consultation",
        question: "How do I book a consultation?",
        answer:
          "On Home, tap Book an Appointment or the Doctors tile. Choose a doctor, pick a date and time, and choose In-Person Visit or Video Consultation. Select For Me or Someone Else, describe the reason for your visit, and confirm.",
        deepLink: "book_consultation",
        related: ["book-for-family", "previsit-form", "join-video"],
      },
      {
        key: "book-for-family",
        question: "Can I book an appointment for a family member?",
        answer:
          "Yes. While booking, choose Someone Else and select the family member. They need to be added to your account first, from Profile, then Family.",
        deepLink: "family",
        related: ["family-add", "book-consultation"],
      },
      {
        key: "upcoming-appointments",
        question: "Where can I see my upcoming appointments?",
        answer:
          "Your next appointment appears in the Your Appointments card on Home, and in Your Updates on the Services tab. Tap it to open the full details.",
        related: ["reschedule", "cancel"],
      },
      {
        key: "reschedule",
        question: "How do I reschedule an appointment?",
        answer: "Open the appointment and tap Reschedule, then pick a new date and time. Cancelled or completed appointments can't be rescheduled.",
        related: ["cancel", "upcoming-appointments"],
      },
      {
        key: "cancel",
        question: "How do I cancel an appointment?",
        answer: "Open the appointment, tap Cancel Appointment, choose a reason and confirm.",
        related: ["reschedule", "cancel-deadline"],
      },
      {
        key: "cancel-deadline",
        question: "Is there a deadline for cancelling an appointment?",
        answer: "Please cancel at least two hours before your appointment time.",
        related: ["cancel", "refunds"],
        reviewNote:
          "The cancel screen asks patients to cancel at least two hours ahead, but the system does not enforce any limit. Confirm the actual policy before publishing.",
      },
      {
        key: "previsit-form",
        question: "What is the pre-visit form?",
        answer:
          "After booking, you can tell the doctor about your symptoms before the visit, either by answering a short questionnaire or by asking us to call you. If you described your symptoms to the assistant first, those details are filled in for you.",
        related: ["book-consultation"],
      },
      {
        key: "doctor-cancelled",
        question: "What happens if the doctor or clinic cancels?",
        answer: "You'll get a notification straight away, and the appointment will show as cancelled. You can then book another slot.",
        related: ["book-consultation", "notifications"],
      },
      {
        key: "message-doctor",
        question: "Can I message my doctor?",
        answer: "Yes, you can message any doctor you have an appointment with. Tap the chat icon at the top of the Home screen.",
        related: ["notifications"],
      },
    ],
  },
  {
    key: "video",
    title: "Video consultations",
    feature: "appointments",
    entries: [
      {
        key: "join-video",
        question: "How do I join a video consultation?",
        answer:
          "Open your appointment and tap Join to enter the waiting room. When your doctor is ready you'll see a banner saying they're ready — tap it to join the call.",
        related: ["camera-mic", "left-call"],
      },
      {
        key: "camera-mic",
        question: "The doctor can't see or hear me. What should I do?",
        answer:
          "Allow camera and microphone access when the app asks. If you declined earlier, open your phone's Settings, find the app, and turn on Camera and Microphone, then rejoin the call.",
        related: ["join-video", "left-call"],
      },
      {
        key: "left-call",
        question: "I left the call by mistake. Can I get back in?",
        answer: "Yes. If your doctor is still connected you'll see a Call Paused screen — tap to rejoin the consultation.",
        related: ["join-video"],
      },
    ],
  },
  {
    key: "payments",
    title: "Payments & insurance",
    entries: [
      {
        key: "pay-in-person",
        question: "How do I pay for an in-person visit?",
        answer: "There's nothing to pay in the app. You pay the consultation fee directly at the clinic during your visit.",
        feature: "appointments",
        related: ["pay-video", "use-insurance"],
      },
      {
        key: "pay-video",
        question: "How do I pay for a video consultation?",
        answer: "Payment details for video consultations will be shown at checkout.",
        feature: "appointments",
        related: ["pay-in-person", "refunds"],
        reviewNote:
          "Video-consultation checkout currently shows sample saved cards, and no payment is taken in the app. Write how patients actually pay before publishing.",
      },
      {
        key: "use-insurance",
        question: "How do I use my insurance?",
        answer:
          "Add your insurance card from Profile, then Insurance. It shows Waiting for verification until it's approved. Once approved, you can choose it as your payment option at checkout.",
        feature: "insurance",
        deepLink: "insurance",
        related: ["pay-in-person"],
      },
      {
        key: "refunds",
        question: "How do refunds work?",
        answer: "Please raise an issue under Billing Inquiries and our team will look into it.",
        deepLink: "raise_issue",
        related: ["cancel-deadline", "contact-support"],
        reviewNote: "There is no refund process in the system. Set the refund policy before publishing.",
      },
    ],
  },
  {
    key: "medicines",
    title: "Medicines & orders",
    feature: "pharmacy",
    entries: [
      {
        key: "order-medicines",
        question: "How do I order medicines?",
        answer: "Open Pharmacy from Home, then search or browse by category. Tap Add to Cart on the medicines you need and go to checkout.",
        deepLink: "medicines",
        related: ["need-prescription", "track-order"],
      },
      {
        key: "need-prescription",
        question: "Do I need a prescription?",
        answer:
          "Some medicines need one. When your cart has them, you'll be asked to share your prescription, either by entering its eRx number or by uploading it.",
        related: ["order-medicines"],
      },
      {
        key: "track-order",
        question: "How do I track my order?",
        answer:
          "Go to Profile, then My Orders. Medicine, test and vaccine orders each have their own tab, and every order shows its progress from Order Confirmed to Shipped to Delivered.",
        deepLink: "orders",
        related: ["delivery-address", "order-medicines"],
      },
      {
        key: "delivery-address",
        question: "How do I add or change my delivery address?",
        answer: "Go to Profile, then Addresses, to add a new address or edit a saved one.",
        deepLink: "addresses",
        related: ["track-order"],
      },
      {
        key: "delivery-time",
        question: "How long does delivery take, and is there a delivery charge?",
        answer: "Delivery times and charges depend on the pharmacy and are shown at checkout.",
        related: ["track-order"],
        reviewNote: "Delivery times and charges aren't defined in the system. Confirm them before publishing.",
      },
    ],
  },
  {
    key: "lab",
    title: "Lab tests",
    feature: "lab_booking",
    entries: [
      {
        key: "book-lab-test",
        question: "How do I book a lab test?",
        answer: "Open Lab Services from the Services tab. Search for the tests you need, choose who they're for, pick a lab and a time, then confirm.",
        deepLink: "lab_tests",
        related: ["lab-prep", "lab-results"],
      },
      {
        key: "lab-prep",
        question: "Do I need to prepare for a test, like fasting?",
        answer: "Open the test's details before booking. Any preparation, such as fasting, is listed there under the patient instructions.",
        related: ["book-lab-test"],
      },
      {
        key: "lab-results",
        question: "Where do I find my lab results?",
        answer:
          "Results appear once the lab has processed your sample, and you'll get a notification when they're ready. Open the booking and tap View Result. You can also find completed tests under Profile, then My Orders, in the Tests tab.",
        deepLink: "orders",
        related: ["book-lab-test"],
      },
    ],
  },
  {
    key: "vaccination",
    title: "Vaccinations",
    feature: "vaccination",
    entries: [
      {
        key: "book-vaccination",
        question: "How do I book a vaccination?",
        answer: "Open Vaccination, search for the vaccine, choose who it's for, then choose a provider and confirm.",
        deepLink: "vaccination",
        related: ["track-order"],
      },
    ],
  },
  {
    key: "family",
    title: "Family members",
    entries: [
      {
        key: "family-add",
        question: "How do I add a family member?",
        answer:
          "Go to Profile, then Family, and tap Add. You can add up to 4 family members, so 5 profiles in total including yours.",
        deepLink: "family",
        related: ["family-switch", "book-for-family"],
      },
      {
        key: "family-switch",
        question: "How do I see a family member's records or appointments?",
        answer:
          "Press and hold the Profile tab at the bottom of the screen, then choose their profile. Appointments, records and orders then show for that person.",
        related: ["family-add"],
      },
    ],
  },
  {
    key: "records",
    title: "Health records",
    entries: [
      {
        key: "consultation-history",
        question: "Where can I find my past consultations and prescriptions?",
        answer: "Go to Profile and open My Records to see your consultation history. Tap any consultation to see its summary and prescriptions.",
        deepLink: "my_records",
        related: ["health-details"],
      },
      {
        key: "health-details",
        question: "How do I add my allergies, conditions or medications?",
        answer: "Go to Profile, open Profile Details, then choose Allergies, Medications or Chronic Diseases & Injuries. Keeping these up to date helps your doctor during a consultation.",
        related: ["consultation-history", "medication-reminders"],
      },
      {
        key: "medication-reminders",
        question: "Can the app remind me to take my medication?",
        answer: "Yes. Go to Profile, then Reminders, and add the medicine name, dose, time and the days to repeat it.",
        deepLink: "reminders",
        related: ["health-details", "notifications"],
      },
    ],
  },
  {
    key: "wellness",
    title: "Wellness tools",
    entries: [
      {
        key: "diet-plan",
        question: "Where is the diet plan my doctor gave me?",
        answer: "Open the Wellness tab and go to Fitness & Nutrition. A diet plan from your doctor appears there, and you can log your meals against it.",
        feature: "fitness",
        deepLink: "fitness",
        related: ["log-food"],
      },
      {
        key: "log-food",
        question: "How do I log what I eat?",
        answer: "Open the Wellness tab, go to Fitness & Nutrition and tap Log Food. Search for a food, or add your own if it isn't listed, and the app keeps track of your calories and macros.",
        feature: "fitness",
        deepLink: "fitness",
        related: ["diet-plan"],
      },
      {
        key: "assessments",
        question: "What are the health assessments?",
        answer:
          "Short questionnaires in the Wellness tab, under Evaluation & Assessment, covering physical health, lifestyle, nutrition, chronic conditions and mental health. Each one gives a risk level and suggests doctors who can help. They're a guide, not a diagnosis.",
        deepLink: "assessments",
      },
      {
        key: "menstrual-tracking",
        question: "How do I track my cycle or pregnancy?",
        answer: "Open the Wellness tab and choose Menstrual Tracking, or Pregnancy Tracking if you're expecting.",
        feature: "menstrual",
      },
    ],
  },
  {
    key: "assistant",
    title: "Using the assistant",
    feature: "ai_chat",
    entries: [
      {
        key: "assistant-what",
        question: "What can the assistant help me with?",
        answer:
          "Describe how you're feeling and it asks a few questions, then suggests the right kind of doctor and helps you book. It can also answer general wellness questions and questions about using the app.",
        related: ["assistant-doctor"],
      },
      {
        key: "assistant-doctor",
        question: "Is the assistant a doctor?",
        answer:
          "No. It doesn't diagnose or prescribe. It helps you describe your symptoms and find the right doctor, and your doctor makes every medical decision.",
        related: ["emergency", "assistant-what"],
      },
    ],
  },
  {
    key: "support",
    title: "Help & safety",
    entries: [
      {
        key: "contact-support",
        question: "How do I contact support?",
        answer:
          "Go to Profile, then Help and Support, and tap Raise an issue. Choose a category, describe the problem, and our team's reply will appear on your ticket.",
        deepLink: "raise_issue",
        related: ["refunds"],
      },
      {
        key: "notifications",
        question: "How do I control my notifications?",
        answer: "Go to Profile, then Settings, then Notifications, and choose which reminders and messages you want to receive.",
        deepLink: "notifications",
      },
      {
        key: "emergency",
        question: "What should I do in a medical emergency?",
        answer:
          "This app is not an emergency service. If you have a medical emergency, call 998 for an ambulance or 999 for the police straight away, or go to the nearest emergency department.",
        related: ["assistant-doctor"],
      },
    ],
  },
];
