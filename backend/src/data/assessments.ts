export type QuestionType = "choice" | "number" | "scale";

export interface AssessmentOption {
  label: string;
  subtext: string;
  score: number; // 1 (worst) – 5 (best)
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  type: QuestionType;
  unit?: string;       // for number type, e.g. "cm", "kg"
  min?: number;        // for scale type
  max?: number;
  options?: AssessmentOption[];
}

export interface ScoreRange {
  min: number;
  max: number;
  risk: "Low" | "Moderate" | "High";
  title: string;
  summary: string;
  recommendations: string[];
}

export interface ScoreDetail {
  summary: string;
  recommendations: string[];
}

export interface AssessmentDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  questions: AssessmentQuestion[];
  scoreRanges: ScoreRange[];
  /** Optional per-exact-score overrides. Key is the integer score as a string. */
  scoreSummaries?: Record<string, ScoreDetail>;
}

// ─── Assessment Definitions ───────────────────────────────────────────────────

const ASSESSMENTS: AssessmentDefinition[] = [

  // 1 ── Physical Health ──────────────────────────────────────────────────────
  {
    id: "physical-health",
    title: "Physical Health Assessment",
    category: "Physical Health",
    description: "Evaluate your overall physical fitness and activity levels.",
    questions: [
      { id: "q1", type: "choice", text: "How often do you engage in physical exercise each week?",
        options: [
          { label: "Never",        subtext: "No physical activity at all.",          score: 1 },
          { label: "1–2 times",    subtext: "Light activity once or twice a week.",  score: 2 },
          { label: "3–4 times",    subtext: "Moderate activity several days.",       score: 3 },
          { label: "5–6 times",    subtext: "Active most days of the week.",         score: 4 },
          { label: "Daily",        subtext: "I exercise every day.",                 score: 5 },
        ]
      },
      { id: "q2", type: "choice", text: "How would you rate your energy levels throughout the day?",
        options: [
          { label: "Very Low",     subtext: "Fatigued almost all the time.",         score: 1 },
          { label: "Low",          subtext: "Often tired, struggle to get through.", score: 2 },
          { label: "Moderate",     subtext: "Average energy with some dips.",        score: 3 },
          { label: "High",         subtext: "Generally energetic and active.",       score: 4 },
          { label: "Very High",    subtext: "Always energetic and refreshed.",       score: 5 },
        ]
      },
      { id: "q3", type: "choice", text: "Do you experience chronic physical pain or discomfort?",
        options: [
          { label: "Constant & Severe", subtext: "Pain significantly limits daily life.",   score: 1 },
          { label: "Frequent",          subtext: "Pain several days a week.",               score: 2 },
          { label: "Occasional",        subtext: "Pain a few times a month.",               score: 3 },
          { label: "Rare",              subtext: "Minimal discomfort, rarely bothersome.",  score: 4 },
          { label: "Never",             subtext: "No chronic pain at all.",                 score: 5 },
        ]
      },
      { id: "q4", type: "choice", text: "How many glasses of water do you drink per day?",
        options: [
          { label: "Fewer than 3",  subtext: "Very low hydration.",       score: 1 },
          { label: "3–4 glasses",   subtext: "Below recommended intake.", score: 2 },
          { label: "5–6 glasses",   subtext: "Moderate hydration.",       score: 3 },
          { label: "7–8 glasses",   subtext: "Good hydration.",           score: 4 },
          { label: "8+ glasses",    subtext: "Excellent hydration.",      score: 5 },
        ]
      },
      { id: "q5", type: "choice", text: "How would you rate your overall physical fitness?",
        options: [
          { label: "Very Poor",     subtext: "Difficulty with basic physical tasks.", score: 1 },
          { label: "Poor",          subtext: "Below average fitness level.",          score: 2 },
          { label: "Average",       subtext: "Can do moderate activities.",           score: 3 },
          { label: "Good",          subtext: "Fit and able to handle most tasks.",    score: 4 },
          { label: "Excellent",     subtext: "Athlete-level fitness.",                score: 5 },
        ]
      },
      { id: "q6", type: "choice", text: "How often do you feel physically exhausted at the end of the day?",
        options: [
          { label: "Always",        subtext: "Completely drained every day.",          score: 1 },
          { label: "Often",         subtext: "Most days leave me exhausted.",          score: 2 },
          { label: "Sometimes",     subtext: "Occasionally feel worn out.",            score: 3 },
          { label: "Rarely",        subtext: "Usually feel fine by end of day.",       score: 4 },
          { label: "Never",         subtext: "I consistently feel well-rested.",       score: 5 },
        ]
      },
    ],
    scoreRanges: [
      { min: 23, max: 30, risk: "Low",      title: "Good Physical Health",
        summary: "Your responses indicate strong physical health. Keep up your active lifestyle and healthy habits.",
        recommendations: ["Maintain your current exercise routine", "Consider adding variety to your workouts", "Keep up with regular health checkups"] },
      { min: 13, max: 22, risk: "Moderate", title: "Moderate Physical Health",
        summary: "Some areas of your physical health need attention. Small consistent improvements can make a big difference.",
        recommendations: ["Aim for 30 minutes of exercise at least 4 days a week", "Increase daily water intake to 8 glasses", "Consider consulting a physiotherapist for pain management"] },
      { min: 6,  max: 12, risk: "High",     title: "Physical Health Needs Attention",
        summary: "Your responses suggest your physical health may need significant improvement. We recommend speaking with a healthcare professional.",
        recommendations: ["Schedule a full physical examination with your doctor", "Start with low-impact exercises like walking", "Address any chronic pain with a specialist", "Focus on sleep quality and hydration"] },
    ],
    scoreSummaries: {
      "6":  { summary: "Your score of 6 is the lowest possible, indicating very serious physical health concerns across all areas. Immediate medical attention is strongly advised.", recommendations: ["Seek a full medical evaluation as soon as possible", "Discuss all symptoms with a doctor — do not delay", "Begin with the gentlest possible activity such as short walks", "Focus on sleep, water intake, and basic nutrition first"] },
      "7":  { summary: "A score of 7 reflects critical gaps in physical health — very low activity, persistent exhaustion, and likely chronic pain. Professional support is essential.", recommendations: ["Schedule an urgent appointment with your GP", "Start a pain diary to track symptoms", "Aim for at least one 5-minute walk daily", "Drink at least 6 glasses of water per day"] },
      "8":  { summary: "Your score of 8 shows significant physical health challenges. Energy, exercise, and hydration all need meaningful improvement with medical guidance.", recommendations: ["See a doctor to rule out underlying conditions", "Set a goal of 10 minutes of light activity daily", "Track your daily water intake and aim for 7 glasses", "Consider a physiotherapy referral for pain"] },
      "9":  { summary: "At 9 points, your physical health needs substantial work. Multiple areas — activity, hydration, energy, and pain — are below healthy levels.", recommendations: ["Book a health screening within the next few weeks", "Increase movement gradually — even standing breaks help", "Reduce caffeine and improve sleep duration", "Start with low-impact exercises like swimming or cycling"] },
      "10": { summary: "A score of 10 reflects notable physical health issues. While some areas may be manageable, others are pulling your overall health down significantly.", recommendations: ["Consult a doctor about your energy and pain levels", "Begin a 15-minute daily walk and build gradually", "Prioritise 7–8 hours of sleep each night", "Increase water intake to at least 7 glasses daily"] },
      "11": { summary: "Your score of 11 indicates below-average physical health. You are managing some areas but several key habits are still well below recommended levels.", recommendations: ["Aim for 20 minutes of moderate exercise 3 days per week", "Address any chronic pain with a healthcare provider", "Improve your hydration — carry a water bottle", "Limit sedentary time; add short movement breaks"] },
      "12": { summary: "At 12 points, you are at the upper edge of the high-risk band. Meaningful improvements in just one or two areas could move you to a better health tier.", recommendations: ["Set one concrete exercise goal this week", "Replace one unhealthy habit with a healthy one", "Get your blood pressure and basic bloodwork checked", "Focus on consistent sleep timing"] },
      "13": { summary: "A score of 13 places you at the low end of moderate physical health. There is clear room for improvement, but a solid foundation to build on.", recommendations: ["Commit to 3 exercise sessions per week — even 20 minutes each", "Track your water intake and aim for 7 glasses", "Look into a physiotherapist if you have recurring pain", "Try to end each day without complete exhaustion"] },
      "14": { summary: "Your score of 14 reflects moderate physical health with several gaps. Targeted improvements in exercise frequency and hydration would make a quick difference.", recommendations: ["Add one more exercise day to your weekly routine", "Set a daily hydration reminder on your phone", "Experiment with stretching or yoga for energy", "Evaluate whether your current workload is draining you physically"] },
      "15": { summary: "At 15, your physical health is moderate. You are doing some things well, but energy levels, fitness, or pain management still need your attention.", recommendations: ["Increase exercise to at least 4 sessions per week", "Ensure you are drinking 8 glasses of water daily", "Consult a physiotherapist if pain is recurring", "Prioritise a consistent sleep schedule"] },
      "16": { summary: "A score of 16 indicates moderate-but-improving physical health. You have built some healthy habits — now it is about reinforcing them consistently.", recommendations: ["Push your exercise routine to 4–5 times per week", "Focus on reducing processed foods alongside exercise", "Track energy patterns — identify your lowest points and adjust", "Consider adding strength or resistance training"] },
      "17": { summary: "Your score of 17 shows you are on the right track physically. A few persistent weaknesses — perhaps hydration or exhaustion — are holding back a stronger result.", recommendations: ["Fine-tune hydration: 8+ glasses of water daily", "Experiment with post-workout recovery habits", "Ensure your exercise includes both cardio and strength", "Monitor your sleep quality — not just quantity"] },
      "18": { summary: "At 18 points, your physical health is solidly moderate. You engage regularly in healthy habits but there are still clear areas with room to grow.", recommendations: ["Add variety to your workout — try a new activity", "Pay attention to post-meal energy and adjust diet accordingly", "Aim to eliminate at least one source of recurring physical discomfort", "Schedule an annual health check"] },
      "19": { summary: "A score of 19 reflects good-but-not-yet-great physical health. You are clearly committed, and a few targeted adjustments will take you to the next level.", recommendations: ["Push exercise to 5+ sessions per week", "Evaluate the quality of your workouts — not just frequency", "Focus on flexibility and mobility alongside cardio", "Ensure your diet supports your activity level"] },
      "20": { summary: "Your score of 20 puts you in the upper-moderate range. You have solid physical habits with only minor gaps. Consistent refinement will get you to excellent health.", recommendations: ["Maintain your current habits and build on them", "Consider working with a personal trainer for guidance", "Track your long-term fitness trends to stay motivated", "Invest in recovery: sleep, stretching, and nutrition"] },
      "21": { summary: "At 21, you are approaching good physical health. Your daily habits are mostly healthy — just a few specific areas still need attention.", recommendations: ["Address any remaining sources of physical exhaustion", "Ensure your hydration is optimal on exercise days", "Add mindfulness or breathing exercises to support physical recovery", "Consider a fitness goal to stay motivated"] },
      "22": { summary: "A score of 22 reflects strong physical health overall with minor room for improvement. You are close to the top tier — keep pushing.", recommendations: ["Maintain or slightly increase exercise intensity", "Fine-tune sleep habits for optimal recovery", "Keep hydration consistent, especially during physical activity", "Schedule your next health check to confirm everything is well"] },
      "23": { summary: "Your score of 23 puts you in the good physical health range. You lead an active life and your habits are largely supporting your wellbeing.", recommendations: ["Keep your exercise routine consistent", "Consider adding a new physical challenge to stay engaged", "Maintain excellent hydration throughout the day", "Continue with regular health check-ups"] },
      "24": { summary: "At 24, your physical health is strong. You exercise regularly, manage energy well, and keep discomfort minimal. This is a great place to be.", recommendations: ["Consider a sport or group class to maintain motivation", "Vary your workouts to prevent plateaus", "Keep prioritising sleep and recovery", "Celebrate and protect your healthy habits"] },
      "25": { summary: "A score of 25 reflects excellent physical health. Your lifestyle choices are clearly paying off — you are in the top quarter of physical wellbeing.", recommendations: ["Keep doing what you are doing", "Share your habits with friends or family — you can be a positive influence", "Set performance goals, not just health goals", "Stay consistent — this level takes effort to maintain"] },
      "26": { summary: "Your score of 26 is exceptional. You demonstrate consistently strong physical health across energy, activity, pain management, and hydration.", recommendations: ["Maintain your current exercise frequency and intensity", "Continue protecting your sleep quality", "Consider entering a fitness event or challenge to stay inspired", "Keep monitoring your health with annual check-ups"] },
      "27": { summary: "At 27, you are in outstanding physical health. Very few people score this high, reflecting disciplined and consistent healthy behaviours across every area.", recommendations: ["Focus on longevity — add mobility and flexibility work", "Mentor others around you toward healthier habits", "Continue annual health screenings to catch any early changes", "Enjoy your fitness — you have earned it"] },
      "28": { summary: "A score of 28 is near-perfect physical health. Every aspect of your lifestyle — exercise, energy, hydration, and pain management — is working in harmony.", recommendations: ["Maintain this level with intentionality", "Consider advanced training or endurance goals", "Pay special attention to recovery and joint health as you stay active", "Your habits are an excellent model — keep them"] },
      "29": { summary: "Your score of 29 places you among the top physical health performers. You are highly active, well-hydrated, full of energy, and virtually pain-free.", recommendations: ["Keep optimising recovery alongside your high activity level", "Focus on injury prevention — mobility work is important at this level", "Annual health screenings remain important even at peak health", "Continue challenging yourself physically"] },
      "30": { summary: "A perfect score of 30 — you are in peak physical health across every dimension. This reflects deep commitment to your body and lifestyle. Extraordinary.", recommendations: ["Continue your elite habits with the same discipline", "Focus on long-term sustainability — protect your joints and recovery", "Inspire others with your approach to physical health", "Stay vigilant with annual health check-ups even at this level"] },
    },
  },

  // 2 ── Lifestyle Related ───────────────────────────────────────────────────
  {
    id: "lifestyle-related",
    title: "Lifestyle Assessment",
    category: "Lifestyle Related",
    description: "Understand how your daily habits impact your overall wellbeing.",
    questions: [
      { id: "q1", type: "choice", text: "How many hours of sleep do you typically get per night?",
        options: [
          { label: "Less than 5h", subtext: "Severely sleep deprived.",              score: 1 },
          { label: "5–6 hours",    subtext: "Below recommended sleep.",              score: 2 },
          { label: "6–7 hours",    subtext: "Slightly under recommended.",           score: 3 },
          { label: "7–8 hours",    subtext: "Optimal sleep for most adults.",        score: 4 },
          { label: "8–9 hours",    subtext: "Well-rested and refreshed.",            score: 5 },
        ]
      },
      { id: "q2", type: "choice", text: "How would you describe your daily stress levels?",
        options: [
          { label: "Overwhelming",  subtext: "Constantly stressed, hard to cope.",   score: 1 },
          { label: "High",          subtext: "Stressed most of the time.",           score: 2 },
          { label: "Moderate",      subtext: "Some stress, manageable.",             score: 3 },
          { label: "Low",           subtext: "Mostly calm and in control.",          score: 4 },
          { label: "Minimal",       subtext: "Rarely feel stressed.",                score: 5 },
        ]
      },
      { id: "q3", type: "choice", text: "How often do you smoke or use tobacco products?",
        options: [
          { label: "Daily",          subtext: "I smoke every day.",                   score: 1 },
          { label: "Frequently",     subtext: "Several times a week.",               score: 2 },
          { label: "Occasionally",   subtext: "A few times a month.",               score: 3 },
          { label: "Rarely / Quit",  subtext: "Quit or almost quit.",                score: 4 },
          { label: "Never",          subtext: "I have never smoked.",                score: 5 },
        ]
      },
      { id: "q4", type: "choice", text: "How often do you consume alcohol?",
        options: [
          { label: "Daily",          subtext: "I drink every day.",                  score: 1 },
          { label: "4–6x per week",  subtext: "Heavily and frequently.",            score: 2 },
          { label: "1–3x per week",  subtext: "Moderate social drinking.",          score: 3 },
          { label: "Rarely",         subtext: "Occasionally at special events.",    score: 4 },
          { label: "Never",          subtext: "I don't drink alcohol.",             score: 5 },
        ]
      },
      { id: "q5", type: "choice", text: "How much leisure screen time do you have daily (excluding work)?",
        options: [
          { label: "8+ hours",     subtext: "Constant screen use.",              score: 1 },
          { label: "6–8 hours",    subtext: "Very high screen time.",            score: 2 },
          { label: "4–6 hours",    subtext: "Moderate to high.",                 score: 3 },
          { label: "2–4 hours",    subtext: "Balanced screen usage.",            score: 4 },
          { label: "Less than 2h", subtext: "Minimal leisure screen time.",      score: 5 },
        ]
      },
      { id: "q6", type: "choice", text: "How often do you engage in meaningful social activities?",
        options: [
          { label: "Never",          subtext: "I am socially isolated.",            score: 1 },
          { label: "Rarely",         subtext: "Very infrequently.",                score: 2 },
          { label: "Occasionally",   subtext: "A few times a month.",             score: 3 },
          { label: "Often",          subtext: "Several times a week.",            score: 4 },
          { label: "Very Often",     subtext: "Daily social connections.",        score: 5 },
        ]
      },
    ],
    scoreRanges: [
      { min: 23, max: 30, risk: "Low", title: "Healthy Lifestyle",
        summary: "You maintain a well-balanced lifestyle. Your sleep, social connections, and habits support your overall health.",
        recommendations: ["Continue your healthy sleep schedule", "Maintain your social connections", "Keep limiting screen time and substance use"] },
      { min: 13, max: 22, risk: "Moderate", title: "Lifestyle Needs Some Improvements",
        summary: "Your lifestyle has some areas that could be improved. Gradual changes in sleep, stress, or habits can yield significant health benefits.",
        recommendations: ["Aim for 7-8 hours of sleep nightly", "Try stress-management techniques like meditation", "Reduce alcohol and tobacco if applicable", "Schedule regular breaks from screens"] },
      { min: 6, max: 12, risk: "High", title: "Lifestyle Poses Health Risks",
        summary: "Several lifestyle factors may be negatively affecting your health. We recommend professional guidance to address these issues.",
        recommendations: ["Speak to a doctor about smoking or alcohol cessation programs", "Consult a mental health professional for stress management", "Work on a sleep schedule with a sleep specialist", "Set daily limits on screen time"] },
    ],
    scoreSummaries: {
      "6":  { summary: "A score of 6 signals a lifestyle at critical risk — poor sleep, high stress, likely substance use, and social isolation are all contributing. Urgent changes and professional support are needed.", recommendations: ["Consult your GP about the lifestyle factors affecting your health", "Identify the single most harmful habit and address it first", "Seek mental health support for stress and mood", "Aim for at least 6 hours of sleep tonight as a starting point"] },
      "7":  { summary: "Your score of 7 reflects multiple serious lifestyle risk factors. Sleep deprivation, high stress, and harmful habits are compounding each other and require attention now.", recommendations: ["Speak to a doctor about sleep and stress management", "Start a 30-minute screen-free wind-down before bed", "Consider a smoking or alcohol reduction program", "Reconnect with at least one person socially this week"] },
      "8":  { summary: "At 8, your lifestyle is significantly impacting your health. Two or three major areas — likely sleep, stress, and substance use — need structured improvement.", recommendations: ["Set a consistent sleep schedule — same time every night", "Replace one unhealthy habit with a healthier alternative", "Limit alcohol to social occasions only", "Try a 10-minute daily walk to reduce stress"] },
      "9":  { summary: "A score of 9 shows that multiple lifestyle factors are working against your health. Stress management and sleep are likely the most impactful places to start.", recommendations: ["Begin a simple stress journal — write 3 thoughts before bed", "Reduce screen time after 9pm to improve sleep quality", "Limit screen-based entertainment to 4 hours per day", "Try one new social activity this week"] },
      "10": { summary: "Your score of 10 reflects a lifestyle with significant challenges in several areas. Progress is possible with focused, gradual changes rather than overhauling everything at once.", recommendations: ["Choose one habit to change this week and stick to it", "Improve your sleep window to at least 6–7 hours", "Reduce substance use frequency by one day per week", "Spend meaningful time with a friend or family member"] },
      "11": { summary: "At 11, your lifestyle has clear risk areas. You may be managing some aspects but stress, sleep, or social connection is likely still a weak point.", recommendations: ["Aim for 7 hours of sleep with a consistent bedtime", "Introduce a 5-minute mindfulness practice daily", "Evaluate your alcohol or tobacco habits honestly", "Schedule one social outing per week"] },
      "12": { summary: "A score of 12 puts you at the edge of the high-risk lifestyle band. One or two focused improvements could move you into a healthier tier.", recommendations: ["Prioritise sleep — turn off devices 30 minutes before bed", "Identify your main stressor and create one small coping strategy", "Commit to reducing one harmful substance this month", "Increase social engagement — even a short call with a friend helps"] },
      "13": { summary: "Your score of 13 places you at the lower end of the moderate lifestyle band. You have some healthy routines but stress, sleep, or substance use may still be problems.", recommendations: ["Work toward 7–8 hours of sleep nightly", "Try a relaxation technique: breathing exercises, meditation, or yoga", "Limit alcohol to no more than 2–3 times per week", "Set a daily screen-time limit of 3 hours for leisure"] },
      "14": { summary: "At 14, your lifestyle is moderate with meaningful room for improvement. Sleep and stress management are likely your biggest opportunities for quick gains.", recommendations: ["Improve sleep duration and consistency", "Try 10 minutes of meditation or deep breathing daily", "Reduce tobacco or alcohol intake if applicable", "Make time for at least one meaningful social interaction daily"] },
      "15": { summary: "A score of 15 reflects a moderate lifestyle with clear strengths and clear weaknesses. Stress or screen time is likely pulling your score down.", recommendations: ["Reduce leisure screen time to under 3 hours daily", "Try a weekly digital detox half-day", "Assess stress sources and address the most impactful one", "Maintain your positive habits while improving the weaker ones"] },
      "16": { summary: "Your score of 16 shows a moderate-to-good lifestyle. You are managing most areas reasonably well — a few focused tweaks will push you into the healthy range.", recommendations: ["Stick to a consistent 7–8 hour sleep schedule", "Build in 20 minutes of stress relief activity daily", "Cut one unnecessary source of stress from your week", "Continue socialising and protecting your positive habits"] },
      "17": { summary: "At 17, your lifestyle is fairly healthy. You are managing stress and sleep reasonably, but there is still room to refine specific habits for a stronger result.", recommendations: ["Target 8 hours of high-quality sleep", "Evaluate your social life — are you getting enough connection?", "If you smoke or drink, consider a reduction plan", "Reduce screen time by 30 minutes per day this week"] },
      "18": { summary: "A score of 18 reflects a solid lifestyle overall. You are making good choices in most areas — consistency is the main thing separating you from excellent.", recommendations: ["Maintain sleep, exercise, and social habits", "Try adding one stress-reduction practice you have not tried before", "Evaluate whether any substance use can be further reduced", "Celebrate the healthy parts of your lifestyle and protect them"] },
      "19": { summary: "Your score of 19 puts you in a healthy lifestyle range. Most of your habits are working well — minor adjustments will get you to excellent.", recommendations: ["Focus on the one area that still feels inconsistent", "Deepen your social connections — quality over quantity", "Explore new stress-management techniques such as journalling", "Keep screen time intentional and limited to what adds value"] },
      "20": { summary: "At 20, you have a genuinely healthy lifestyle. Sleep, stress management, and social habits are all working in your favour.", recommendations: ["Maintain your current healthy routines", "Invest in hobbies and social activities that energise you", "Keep screens and substances in check", "Set a lifestyle goal for the next 90 days to stay motivated"] },
      "21": { summary: "A score of 21 reflects a strong lifestyle. You are doing most things right — the remaining gaps are minor and easy to close with a little focus.", recommendations: ["Fine-tune sleep quality — consider your bedroom environment", "Continue with your social connections and invest in them", "Keep stress management daily, not just reactive", "Avoid complacency — maintain what is working"] },
      "22": { summary: "Your score of 22 shows a lifestyle that supports excellent health. You are close to the top band — very few changes are needed.", recommendations: ["Maintain your healthy sleep and social rhythms", "Continue limiting substances and screen time", "Keep prioritising stress reduction daily", "Consider coaching or mentoring others in healthy living"] },
      "23": { summary: "At 23, your lifestyle is clearly in the healthy range. You are making consistently good choices across sleep, stress, substances, and social connection.", recommendations: ["Keep doing what is working — your habits are solid", "Push for 8 hours of quality sleep as a nightly target", "Stay socially active and invest in meaningful relationships", "Continue managing stress proactively"] },
      "24": { summary: "A score of 24 reflects an excellent lifestyle. Your daily habits are protecting your long-term health in multiple important ways.", recommendations: ["Keep your habits consistent even during stressful periods", "Add a new social or recreational activity to your routine", "Challenge yourself to reduce screen time even further", "Your lifestyle is a real asset — protect it"] },
      "25": { summary: "Your score of 25 is outstanding. Sleep, stress, social life, and substance habits are all at healthy levels. You are clearly prioritising your wellbeing.", recommendations: ["Maintain your habits through all seasons of life", "Share your approach — you are a positive influence on those around you", "Keep stress low by reviewing commitments periodically", "Continue your excellent sleep and screen discipline"] },
      "26": { summary: "At 26, your lifestyle is exemplary. Every major risk factor is well-managed and you are clearly investing in your own wellbeing daily.", recommendations: ["Keep up your excellent habits — they compound over time", "Continue prioritising sleep, stress, and social connection", "Stay mindful of creeping screen time", "Inspire others around you by leading by example"] },
      "27": { summary: "A score of 27 reflects a near-perfect lifestyle. Your habits around sleep, stress, substances, and social wellbeing are exceptional.", recommendations: ["Maintain your discipline even when life gets busy", "Seek out new challenges that enrich your social and mental life", "Keep substances absent or minimal", "Continue protecting your sleep as the foundation of everything else"] },
      "28": { summary: "Your score of 28 puts you in the top tier of lifestyle health. All major lifestyle risk factors are effectively managed with excellent daily habits.", recommendations: ["Continue your routines with intention", "Use your excellent lifestyle as a platform for ambitious personal goals", "Protect your habits during high-stress periods", "Continue annual health reviews even at peak lifestyle health"] },
      "29": { summary: "At 29, you have a near-perfect lifestyle across every dimension. Sleep, stress, substances, screen time, and social connection are all outstanding.", recommendations: ["Maintain and celebrate your healthy lifestyle", "Focus on longevity — think of habits as compounding investments", "Mentor or inspire others to adopt healthier habits", "Keep up your annual health reviews"] },
      "30": { summary: "A perfect lifestyle score of 30. Every dimension — sleep, stress, substances, screen time, and social connection — is optimised. Truly exceptional.", recommendations: ["Your lifestyle is a model — share it with others", "Continue all habits with the same discipline", "Protect your routines during life transitions", "Keep annual health screenings to confirm your lifestyle is translating to clinical health"] },
    },
  },

  // 3 ── Nutritional Health ──────────────────────────────────────────────────
  {
    id: "nutritional-health",
    title: "Nutritional Health Assessment",
    category: "Nutritional Health",
    description: "Assess the quality and balance of your diet and eating habits.",
    questions: [
      { id: "q1", type: "choice", text: "How many servings of fruits and vegetables do you eat daily?",
        options: [
          { label: "None",        subtext: "I don't eat fruits or vegetables.",         score: 1 },
          { label: "1 serving",   subtext: "One small portion per day.",               score: 2 },
          { label: "2 servings",  subtext: "Two portions — below recommended.",        score: 3 },
          { label: "3–4 servings",subtext: "Meeting most recommendations.",            score: 4 },
          { label: "5+ servings", subtext: "Excellent — meeting all guidelines.",      score: 5 },
        ]
      },
      { id: "q2", type: "choice", text: "How often do you eat fast food or processed meals?",
        options: [
          { label: "Daily",           subtext: "Fast food is my main diet.",          score: 1 },
          { label: "4–6x per week",   subtext: "Very frequent consumption.",         score: 2 },
          { label: "2–3x per week",   subtext: "Moderate fast food intake.",         score: 3 },
          { label: "Once a week",     subtext: "Occasional treat.",                  score: 4 },
          { label: "Rarely/Never",    subtext: "I mostly cook at home.",             score: 5 },
        ]
      },
      { id: "q3", type: "choice", text: "How would you rate your overall diet quality?",
        options: [
          { label: "Very Poor",    subtext: "Mostly junk food and sugar.",           score: 1 },
          { label: "Poor",         subtext: "Unbalanced with few nutrients.",        score: 2 },
          { label: "Fair",         subtext: "Some healthy choices but inconsistent.",score: 3 },
          { label: "Good",         subtext: "Balanced meals most of the time.",      score: 4 },
          { label: "Excellent",    subtext: "Optimal nutrition and balance.",        score: 5 },
        ]
      },
      { id: "q4", type: "choice", text: "How much water do you drink daily?",
        options: [
          { label: "Less than 2 glasses", subtext: "Severely dehydrated.",           score: 1 },
          { label: "2–4 glasses",         subtext: "Below recommended intake.",      score: 2 },
          { label: "4–6 glasses",         subtext: "Adequate but could improve.",    score: 3 },
          { label: "6–8 glasses",         subtext: "Good hydration.",                score: 4 },
          { label: "8+ glasses",          subtext: "Excellent daily hydration.",     score: 5 },
        ]
      },
      { id: "q5", type: "choice", text: "Do you eat breakfast regularly?",
        options: [
          { label: "Never",        subtext: "I skip breakfast entirely.",            score: 1 },
          { label: "Rarely",       subtext: "Breakfast once or twice a week.",       score: 2 },
          { label: "Sometimes",    subtext: "Breakfast 3–4 days a week.",            score: 3 },
          { label: "Usually",      subtext: "Most days I eat breakfast.",            score: 4 },
          { label: "Every Day",    subtext: "I never skip breakfast.",               score: 5 },
        ]
      },
      { id: "q6", type: "choice", text: "How often do you consume sugary foods or drinks?",
        options: [
          { label: "Multiple daily",  subtext: "Sugar is in most of my meals.",      score: 1 },
          { label: "Daily",           subtext: "At least once every day.",           score: 2 },
          { label: "Several/week",    subtext: "A few times per week.",              score: 3 },
          { label: "Rarely",          subtext: "Occasionally as a treat.",           score: 4 },
          { label: "Never",           subtext: "I avoid sugary foods entirely.",     score: 5 },
        ]
      },
    ],
    scoreRanges: [
      { min: 23, max: 30, risk: "Low", title: "Excellent Nutritional Health",
        summary: "Your dietary habits are excellent. You're making nutritious choices that support long-term health.",
        recommendations: ["Continue eating diverse fruits and vegetables", "Stay hydrated with 8+ glasses daily", "Keep limiting processed and sugary foods"] },
      { min: 13, max: 22, risk: "Moderate", title: "Nutrition Needs Improvement",
        summary: "Your diet has room for improvement. Small changes in food choices can significantly boost your health.",
        recommendations: ["Add more vegetables to each meal", "Replace one processed meal per day with home-cooked food", "Reduce sugar intake gradually", "Consult a dietitian for a personalized meal plan"] },
      { min: 6, max: 12, risk: "High", title: "Poor Nutritional Habits",
        summary: "Your nutritional habits may be putting your health at risk. A consultation with a nutritionist is strongly recommended.",
        recommendations: ["Schedule an appointment with a registered dietitian", "Start a food journal to track what you eat", "Gradually replace fast food with home-cooked meals", "Increase water intake to at least 6 glasses daily"] },
    ],
    scoreSummaries: {
      "6":  { summary: "A score of 6 is the lowest possible — your diet lacks almost every essential element: fruits, vegetables, hydration, and meal consistency are all critically deficient.", recommendations: ["See a registered dietitian as soon as possible", "Start by adding one piece of fruit or vegetable to each meal", "Drink at least 4 glasses of water today — build from there", "Commit to cooking one meal at home this week"] },
      "7":  { summary: "Your score of 7 reflects a diet heavily dependent on processed and fast food with very little nutritional variety. Health consequences are likely already developing.", recommendations: ["Begin a simple food journal to understand your current intake", "Replace one fast food meal per day with home-cooked food", "Increase fruit and vegetable intake to at least one serving daily", "Reduce sugary drinks by replacing one with water"] },
      "8":  { summary: "At 8, your nutritional habits are significantly below healthy levels. Multiple key behaviours — meal regularity, hydration, and food quality — all need improvement.", recommendations: ["Schedule a dietitian consultation within the next month", "Aim to cook at home at least 3 times this week", "Eliminate one category of processed food this week", "Set an alarm as a daily water reminder"] },
      "9":  { summary: "A score of 9 indicates poor dietary habits across most areas. You may be relying on convenience foods and skipping meals, which significantly impacts energy and health.", recommendations: ["Plan your meals one day in advance", "Add one fresh vegetable to lunch and dinner this week", "Commit to no late-night eating after 9pm", "Replace one sugary snack per day with fruit or nuts"] },
      "10": { summary: "Your score of 10 reflects a diet that needs significant improvement in variety, timing, and food quality. The good news is that small changes have a big impact here.", recommendations: ["Start batch cooking one healthy meal on the weekend", "Increase to 5 glasses of water per day this week", "Eat breakfast at least 5 days this week", "Reduce fast food to no more than 2 times per week"] },
      "11": { summary: "At 11, your diet is below average with clear nutritional gaps. You may eat regularly but the quality and variety of your food choices needs work.", recommendations: ["Swap refined carbs for whole grains in at least one meal", "Eat 2 servings of vegetables today", "Cut sugary food and drinks to less than once per day", "Check nutrition labels when grocery shopping"] },
      "12": { summary: "A score of 12 places you at the edge of the high-risk nutrition band. Targeted changes — particularly in hydration and processed food intake — will make a quick difference.", recommendations: ["Drink 6 glasses of water daily as a minimum", "Reduce processed food frequency to 2–3 times per week", "Add at least 2 fruit or vegetable servings daily", "Cook at home at least 4 times this week"] },
      "13": { summary: "Your score of 13 puts you at the low end of the moderate nutrition band. Some healthy choices are being made, but consistency and variety remain significant issues.", recommendations: ["Aim for 3 servings of fruit and vegetables daily", "Replace one processed meal per week with home-cooked food", "Increase water intake to 7 glasses per day", "Eat breakfast every day this week"] },
      "14": { summary: "At 14, your nutritional habits are moderate but inconsistent. Some meals are healthy while others undermine your overall intake significantly.", recommendations: ["Plan 3 healthy meals per day rather than relying on impulse choices", "Reduce fast food to once per week maximum", "Increase hydration to 7–8 glasses per day", "Try adding a new vegetable to your diet this week"] },
      "15": { summary: "A score of 15 reflects moderate nutrition — you are making some good choices but sugar intake, meal skipping, or fast food are still holding you back.", recommendations: ["Reduce sugary food and drink to less than once per day", "Commit to eating breakfast 6 out of 7 days", "Cook at home at least 5 times this week", "Aim for 4 servings of fruits and vegetables daily"] },
      "16": { summary: "Your score of 16 shows a moderate-to-improving diet. You have some solid habits but a few specific behaviours — likely sugar or late-night eating — are still a risk.", recommendations: ["Eliminate late-night eating after 9pm", "Reach 7 glasses of water per day", "Cut sugary snacks to 2–3 times per week maximum", "Diversify your meals — try a new healthy recipe this week"] },
      "17": { summary: "At 17, your diet is above average moderate. Most of your meals are reasonably healthy — the main improvements are in consistency and cutting remaining unhealthy habits.", recommendations: ["Aim for 8 glasses of water daily", "Keep fast food to once per week or less", "Eat 4–5 servings of fruit and vegetables per day", "Read nutrition labels to make more informed choices"] },
      "18": { summary: "A score of 18 reflects a solid nutritional foundation. Your eating habits are largely healthy — the focus should be on optimising specific areas for full benefit.", recommendations: ["Push for 8+ glasses of water daily", "Try to eliminate fast food entirely for one month", "Add more variety to your vegetable intake", "Eat breakfast every day with a focus on protein and fibre"] },
      "19": { summary: "Your score of 19 puts you in a healthy nutritional range. Your eating habits are supporting your health — just a few refinements will get you to excellent.", recommendations: ["Focus on meal prep to maintain consistency", "Experiment with new healthy ingredients or recipes", "Track water intake for one week to confirm you hit 8 glasses", "Eliminate remaining processed food from your weekly diet"] },
      "20": { summary: "At 20, your nutrition is clearly above average. You are making genuinely good choices most of the time, with only minor areas to refine.", recommendations: ["Maintain your healthy eating habits", "Consider consulting a dietitian for performance-level nutrition guidance", "Keep processed foods to under once per week", "Add one more serving of vegetables per day"] },
      "21": { summary: "A score of 21 reflects strong nutritional habits. You eat well consistently, with only minor gaps in variety or timing remaining.", recommendations: ["Diversify your protein sources — try more plant-based options", "Ensure your meals include enough fibre", "Keep hydration optimal: 8–10 glasses daily", "Stay consistent — your habits are working"] },
      "22": { summary: "Your score of 22 reflects excellent nutrition across almost all dimensions. You are close to the top tier and your eating habits are a genuine health asset.", recommendations: ["Maintain your current diet quality", "Explore anti-inflammatory foods to further protect long-term health", "Continue avoiding late-night eating and processed foods", "Stay hydrated and keep fruit and vegetables central"] },
      "23": { summary: "At 23, your nutritional health is in the excellent range. You consistently make healthy food choices, stay hydrated, and manage meal timing well.", recommendations: ["Keep eating a diverse range of whole foods", "Continue your hydration discipline", "Experiment with functional foods that support your specific health goals", "Maintain your habit of eating breakfast daily"] },
      "24": { summary: "A score of 24 reflects a highly nutritious and well-structured diet. You are fuelling your body with the right foods at the right times consistently.", recommendations: ["Keep your current excellent habits", "Consider working with a nutritionist to fine-tune macros", "Stay vigilant with sugar and processed foods — even at this level", "Your diet is a real competitive advantage — protect it"] },
      "25": { summary: "Your score of 25 is outstanding. Your diet is rich in nutrients, well-timed, and free from most harmful habits. You are in the top tier of nutritional health.", recommendations: ["Maintain your excellent dietary habits", "Share your approach with others who may benefit", "Continue monitoring hydration and micronutrient variety", "Keep fast food and sugar out of your regular routine"] },
      "26": { summary: "At 26, your nutrition is exemplary. Every key indicator — food quality, hydration, meal timing, and variety — is at a high level.", recommendations: ["Keep your habits consistent through busy periods", "Explore advanced nutrition topics: gut health, micronutrients, anti-inflammatory eating", "Continue your exceptional hydration and whole-food habits", "Stay curious about food — the science keeps improving"] },
      "27": { summary: "A score of 27 is near-perfect nutrition. You consistently eat well, stay hydrated, and make smart choices across every aspect of your diet.", recommendations: ["Maintain your exceptional standards", "Focus on micronutrient diversity — colours, variety, fermented foods", "Continue keeping sugar and processed foods to a minimum", "Use your habits as a model for those around you"] },
      "28": { summary: "Your score of 28 reflects a near-flawless nutritional profile. Your food choices are consistently outstanding and support excellent long-term health outcomes.", recommendations: ["Stay consistent with your habits", "Consider advanced dietary strategies aligned with your specific health goals", "Keep processed foods and sugar effectively eliminated", "Continue your outstanding hydration discipline"] },
      "29": { summary: "At 29, your nutritional health is among the best possible. Every dimension of your diet is optimised with intention and consistency.", recommendations: ["Maintain your habits with the same discipline", "Share your nutritional knowledge with others", "Continue annual health reviews to confirm your diet is supporting clinical health", "Stay current with nutrition research"] },
      "30": { summary: "A perfect nutrition score of 30. Your diet is a masterclass in healthy eating — diverse, hydrated, home-cooked, and free from harmful habits. Truly exceptional.", recommendations: ["Keep your outstanding habits consistent across all life contexts", "Your nutritional discipline is extraordinary — protect it through all seasons", "Consider sharing your approach through mentoring or community", "Continue annual health reviews"] },
    },
  },

  // 4 ── Chronic Conditions ──────────────────────────────────────────────────
  {
    id: "chronic-conditions",
    title: "Chronic Conditions Risk Assessment",
    category: "Chronic Conditions",
    description: "Identify your risk factors for chronic diseases like diabetes, hypertension, and heart disease.",
    questions: [
      { id: "q1", type: "choice", text: "Do you have a family history of heart disease, diabetes, or hypertension?",
        options: [
          { label: "Multiple conditions", subtext: "Multiple relatives with chronic conditions.",score: 1 },
          { label: "One condition",        subtext: "One close relative affected.",             score: 2 },
          { label: "Distant relatives",    subtext: "Only distant relatives affected.",         score: 3 },
          { label: "Not sure",             subtext: "I'm not aware of family history.",         score: 4 },
          { label: "No",                   subtext: "No family history of chronic disease.",    score: 5 },
        ]
      },
      { id: "q2", type: "choice", text: "How often do you experience shortness of breath during mild activity?",
        options: [
          { label: "Always",       subtext: "Even walking short distances.",           score: 1 },
          { label: "Often",        subtext: "With moderate activity.",                 score: 2 },
          { label: "Sometimes",    subtext: "During intense activity.",               score: 3 },
          { label: "Rarely",       subtext: "Only with very strenuous exercise.",     score: 4 },
          { label: "Never",        subtext: "No shortness of breath.",                score: 5 },
        ]
      },
      { id: "q3", type: "choice", text: "Do you know your blood pressure status?",
        options: [
          { label: "High / Very High",    subtext: "Diagnosed with hypertension.",              score: 1 },
          { label: "Borderline High",     subtext: "Pre-hypertension range.",                   score: 2 },
          { label: "Don't Know",          subtext: "I haven't checked recently.",               score: 3 },
          { label: "Controlled with meds",subtext: "Managed with medication.",                  score: 4 },
          { label: "Normal",              subtext: "Confirmed normal blood pressure.",           score: 5 },
        ]
      },
      { id: "q4", type: "choice", text: "How often do you experience persistent joint or muscle pain?",
        options: [
          { label: "Daily & Severe",  subtext: "Affects mobility significantly.",        score: 1 },
          { label: "Daily & Mild",    subtext: "Constant but manageable pain.",          score: 2 },
          { label: "Several/week",    subtext: "Frequent but not daily.",               score: 3 },
          { label: "Occasionally",    subtext: "Rare and minor discomfort.",            score: 4 },
          { label: "Never",           subtext: "No joint or muscle pain.",              score: 5 },
        ]
      },
      { id: "q5", type: "choice", text: "How would you describe your current weight?",
        options: [
          { label: "Obese",          subtext: "Significantly above healthy range.",     score: 1 },
          { label: "Overweight",     subtext: "Above recommended weight.",             score: 2 },
          { label: "Not Sure",       subtext: "I haven't checked recently.",           score: 3 },
          { label: "Slightly Over",  subtext: "A little above ideal weight.",          score: 4 },
          { label: "Healthy Weight", subtext: "Within recommended BMI range.",         score: 5 },
        ]
      },
      { id: "q6", type: "choice", text: "When did you last have a full health checkup?",
        options: [
          { label: "Never",         subtext: "I've never had a health screening.",       score: 1 },
          { label: "5+ years ago",  subtext: "Very long time since last checkup.",      score: 2 },
          { label: "3–5 years ago", subtext: "Several years ago.",                     score: 3 },
          { label: "1–3 years ago", subtext: "Reasonably recent checkup.",             score: 4 },
          { label: "Within a year", subtext: "Recently completed health screening.",   score: 5 },
        ]
      },
    ],
    scoreRanges: [
      { min: 23, max: 30, risk: "Low", title: "Low Chronic Disease Risk",
        summary: "Your responses suggest a low risk of chronic conditions. Continue your healthy habits and regular screenings.",
        recommendations: ["Maintain annual health checkups", "Continue a balanced diet and regular exercise", "Monitor blood pressure and blood sugar periodically"] },
      { min: 13, max: 22, risk: "Moderate", title: "Moderate Chronic Disease Risk",
        summary: "Some risk factors are present. Addressing these early can prevent the development of chronic conditions.",
        recommendations: ["Schedule a comprehensive health screening soon", "Discuss family history with your doctor", "Monitor blood pressure and blood glucose regularly", "Consider lifestyle modifications to reduce risk factors"] },
      { min: 6, max: 12, risk: "High", title: "High Chronic Disease Risk",
        summary: "Multiple risk factors are present that may significantly increase your risk of chronic diseases. Medical evaluation is strongly recommended.",
        recommendations: ["Book an urgent appointment with a general practitioner", "Request a full blood panel including blood glucose and lipid profile", "Discuss family history and personal symptoms with your doctor", "Consider specialist referral for specific concerns"] },
    ],
    scoreSummaries: {
      "6":  { summary: "A score of 6 is the maximum risk level — you have multiple serious chronic disease risk factors including family history, weight concerns, elevated blood pressure, and no recent health screening. Urgent medical evaluation is essential.", recommendations: ["Book a GP appointment this week — do not delay", "Request a full blood panel: glucose, lipids, kidney function", "Disclose all family history of chronic conditions to your doctor", "Begin monitoring blood pressure and blood sugar at home if possible"] },
      "7":  { summary: "Your score of 7 indicates critical chronic disease risk across several domains. Multiple unaddressed risk factors are likely compounding each other.", recommendations: ["See a doctor as soon as possible for a comprehensive screening", "Begin monitoring blood pressure weekly", "Discuss your family history and symptoms with your GP", "Start making one dietary or activity change immediately"] },
      "8":  { summary: "At 8, you have significant risk factors for chronic diseases. Several indicators suggest your risk is elevated and a medical evaluation should happen soon.", recommendations: ["Schedule a health screening within the next 2 weeks", "Request blood glucose and cholesterol testing", "Discuss shortness of breath or joint pain with your doctor", "Begin moderate activity if cleared by your doctor"] },
      "9":  { summary: "A score of 9 reflects a meaningful accumulation of chronic disease risk factors. Without intervention, these risks are likely to compound over time.", recommendations: ["Book a full health screening within the next month", "Discuss your weight and blood pressure with a healthcare provider", "Start tracking symptoms like shortness of breath or fatigue", "Make one lasting dietary change this week"] },
      "10": { summary: "Your score of 10 shows several chronic disease risk factors present simultaneously. A medical review would help prioritise which risks to address first.", recommendations: ["Schedule a health check with your GP within 4–6 weeks", "Begin a simple exercise routine approved by your doctor", "Reduce processed food and increase vegetables in your diet", "Monitor blood pressure monthly"] },
      "11": { summary: "At 11, you have multiple moderate risk factors that, left unaddressed, may develop into chronic conditions. Early intervention is much more effective than later treatment.", recommendations: ["Book a health check within the next 6 weeks", "Start a simple daily walking habit — even 10 minutes", "Discuss any persistent joint pain or breathlessness with a doctor", "Reduce refined sugars and processed carbohydrates"] },
      "12": { summary: "A score of 12 is at the boundary of high risk. You have several risk factors that need addressing — the good news is that this is still an early intervention opportunity.", recommendations: ["Prioritise a health check before it becomes urgent", "Evaluate your weight and begin a sustainable plan to reach a healthy range", "Check your blood pressure and blood sugar if you haven't recently", "Start reducing one major dietary risk factor"] },
      "13": { summary: "Your score of 13 reflects moderate chronic disease risk. You have some risk factors present but there is still significant time and opportunity to reverse the trajectory.", recommendations: ["Schedule a health screening in the next 2–3 months", "Increase physical activity to 150 minutes of moderate exercise per week", "Monitor blood pressure and blood sugar quarterly", "Make one lasting dietary change to reduce processed food"] },
      "14": { summary: "At 14, your chronic disease risk is moderate. Several factors such as weight, family history, or blood pressure may need monitoring to prevent progression.", recommendations: ["Discuss your family history with your GP at your next check-up", "Aim for 30 minutes of activity on at least 4 days per week", "Check your blood pressure bi-monthly", "Gradually reduce refined carbohydrates and sugar in your diet"] },
      "15": { summary: "A score of 15 reflects moderate chronic disease risk with specific areas that need attention. You are not yet at high risk, but consistent action is important.", recommendations: ["Get a health screening within the next 3–4 months", "If you have joint pain, discuss it with a physio or GP", "Increase daily movement and reduce sedentary time", "Focus on plant-based foods and lean proteins in your diet"] },
      "16": { summary: "Your score of 16 shows moderate-to-improving chronic disease risk. Most of your risk factors are manageable — consistent lifestyle habits will make a real difference.", recommendations: ["Continue your healthy habits and add annual screenings", "Monitor blood pressure and blood sugar periodically", "Stay physically active — aim for 5 sessions per week", "Keep dietary quality high and limit processed foods"] },
      "17": { summary: "At 17, your chronic disease risk is in the moderate-low range. You are managing most risk factors reasonably well but a few still need attention.", recommendations: ["Maintain regular exercise and a balanced diet", "Schedule a health check to review blood markers", "Address any remaining weight concerns with your GP", "Keep blood pressure and blood sugar in your awareness"] },
      "18": { summary: "A score of 18 reflects well-managed chronic disease risk overall. You have healthy habits in place but a few risk factors — perhaps family history or blood pressure — still need monitoring.", recommendations: ["Keep up your healthy lifestyle habits", "Have your blood pressure and cholesterol checked annually", "Discuss family history with your GP so it is documented", "Continue regular exercise — it remains your best preventive tool"] },
      "19": { summary: "Your score of 19 shows that your chronic disease risk is largely under control. Most risk factors are absent or well-managed — minor refinements will further reduce your risk.", recommendations: ["Keep up your current exercise and dietary habits", "Schedule annual health screenings to track trends", "Stay hydrated and maintain a healthy weight range", "Discuss any family history of chronic conditions with your doctor"] },
      "20": { summary: "At 20, your chronic disease risk is low-to-moderate. Your lifestyle is clearly working to protect your long-term health across most risk factors.", recommendations: ["Continue your preventive habits", "Annual health checks are important even when feeling well", "Maintain blood pressure and blood sugar awareness", "Keep your weight in the healthy range"] },
      "21": { summary: "A score of 21 reflects a healthy chronic disease risk profile. You have most protective factors in place and your risk for major chronic conditions is meaningfully low.", recommendations: ["Keep your exercise, diet, and screening habits consistent", "Stay current with health screenings as you age", "Continue managing stress — it is an underrated risk factor", "Protect your healthy lifestyle through all life transitions"] },
      "22": { summary: "Your score of 22 shows a strong chronic disease risk profile. You are actively protecting yourself against most major chronic conditions through your daily habits.", recommendations: ["Maintain your excellent preventive habits", "Continue annual health reviews", "Keep your blood pressure and blood glucose in the normal range", "Stay active — physical fitness is your strongest protective factor"] },
      "23": { summary: "At 23, your chronic disease risk is low and your lifestyle choices are clearly protective. You are doing the right things to prevent major conditions from developing.", recommendations: ["Keep up your preventive habits with consistency", "Annual screening is important even at low risk", "Continue healthy dietary patterns and exercise", "Discuss your healthy habits with your GP so they are on record"] },
      "24": { summary: "A score of 24 reflects an excellent chronic disease risk profile. You have minimal risk factors and your lifestyle is actively protecting your long-term health.", recommendations: ["Maintain your outstanding preventive habits", "Continue annual health screenings", "Keep weight, blood pressure, and blood sugar in healthy ranges", "Stay physically active — this is your most powerful protective factor"] },
      "25": { summary: "Your score of 25 is exceptional for chronic disease risk. Nearly all protective factors are present and you are doing everything right to stay healthy long-term.", recommendations: ["Keep your habits consistent — they compound over decades", "Continue annual health reviews even at this level", "Stay aware of family history as you age", "Celebrate your excellent health — it reflects real effort"] },
      "26": { summary: "At 26, your chronic disease risk profile is outstanding. You have comprehensive protective habits and virtually no major risk factors currently present.", recommendations: ["Maintain your lifestyle — it is genuinely protective", "Continue annual screenings and stay ahead of any changes", "Keep your weight, blood pressure, and blood sugar in check", "Stay physically and socially active — both protect against chronic disease"] },
      "27": { summary: "A score of 27 reflects a near-perfect chronic disease risk profile. You are actively protecting against nearly every major chronic condition through your choices.", recommendations: ["Keep your habits consistent", "Annual health reviews remain important even at this level", "Continue all protective behaviours and add to them if possible", "Share your approach to health with others"] },
      "28": { summary: "Your score of 28 is remarkable. Your lifestyle is comprehensively protective against chronic disease across every assessed dimension.", recommendations: ["Maintain your outstanding protective habits", "Continue annual health reviews", "Keep blood pressure, blood sugar, and weight in check", "Your proactive approach to health is exceptional — sustain it"] },
      "29": { summary: "At 29, you have an almost perfect chronic disease risk profile. Nearly every factor is under control and your lifestyle is maximally protective.", recommendations: ["Keep your exceptional habits consistent", "Stay current with health screenings", "Continue your active, healthy lifestyle", "Your commitment to chronic disease prevention is outstanding"] },
      "30": { summary: "A perfect score of 30 — you have the lowest possible chronic disease risk profile. No major risk factors are present and your lifestyle is comprehensively protective. Extraordinary.", recommendations: ["Maintain all your excellent preventive habits", "Continue annual health reviews even at this level", "Your health profile is exceptional — protect it", "Share and inspire others with your commitment to health"] },
    },
  },

  // 5 ── Mental Health ───────────────────────────────────────────────────────
  {
    id: "mental-health",
    title: "Mental Health Assessment",
    category: "Mental Health",
    description: "Screen for common mental health concerns including stress, anxiety, and mood.",
    questions: [
      { id: "q1", type: "choice", text: "Over the past 2 weeks, how often have you felt little interest or pleasure in activities?",
        options: [
          { label: "Nearly Every Day",   subtext: "Consistently low motivation.",              score: 1 },
          { label: "More Than Half",     subtext: "Over half the days affected.",              score: 2 },
          { label: "Several Days",       subtext: "Some days with low interest.",              score: 3 },
          { label: "Rarely",             subtext: "Just one or two days.",                     score: 4 },
          { label: "Not at All",         subtext: "I feel engaged in my interests.",           score: 5 },
        ]
      },
      { id: "q2", type: "choice", text: "How often have you felt down, depressed, or hopeless?",
        options: [
          { label: "Nearly Every Day",   subtext: "Persistent sadness and hopelessness.",      score: 1 },
          { label: "More Than Half",     subtext: "Mostly feeling down.",                      score: 2 },
          { label: "Several Days",       subtext: "Occasional low mood.",                      score: 3 },
          { label: "Rarely",             subtext: "Brief moments of sadness.",                 score: 4 },
          { label: "Not at All",         subtext: "I feel generally positive.",                score: 5 },
        ]
      },
      { id: "q3", type: "choice", text: "How often do you have trouble falling or staying asleep, or sleeping too much?",
        options: [
          { label: "Nearly Every Day",   subtext: "Sleep problems severely impact my life.",   score: 1 },
          { label: "More Than Half",     subtext: "Frequent sleep disruption.",                score: 2 },
          { label: "Several Days",       subtext: "Occasional sleep issues.",                  score: 3 },
          { label: "Rarely",             subtext: "Mostly sleep well.",                        score: 4 },
          { label: "Not at All",         subtext: "Excellent, consistent sleep.",              score: 5 },
        ]
      },
      { id: "q4", type: "choice", text: "How often have you felt tired or had little energy?",
        options: [
          { label: "Nearly Every Day",   subtext: "Constant fatigue and exhaustion.",          score: 1 },
          { label: "More Than Half",     subtext: "Often feeling low-energy.",                 score: 2 },
          { label: "Several Days",       subtext: "Periodic fatigue.",                         score: 3 },
          { label: "Rarely",             subtext: "Occasionally tired.",                       score: 4 },
          { label: "Not at All",         subtext: "Generally feel energetic.",                 score: 5 },
        ]
      },
      { id: "q5", type: "choice", text: "How often have you had trouble concentrating on tasks?",
        options: [
          { label: "Nearly Every Day",   subtext: "Concentration severely impaired.",          score: 1 },
          { label: "More Than Half",     subtext: "Frequently distracted.",                    score: 2 },
          { label: "Several Days",       subtext: "Some difficulty focusing.",                 score: 3 },
          { label: "Rarely",             subtext: "Usually able to concentrate.",              score: 4 },
          { label: "Not at All",         subtext: "Sharp focus and clear thinking.",           score: 5 },
        ]
      },
      { id: "q6", type: "choice", text: "How would you rate your overall emotional wellbeing?",
        options: [
          { label: "Very Poor",   subtext: "Struggling significantly day to day.",       score: 1 },
          { label: "Poor",        subtext: "Often feeling emotionally depleted.",        score: 2 },
          { label: "Fair",        subtext: "Managing but with noticeable challenges.",  score: 3 },
          { label: "Good",        subtext: "Generally stable with occasional lows.",    score: 4 },
          { label: "Excellent",   subtext: "Emotionally balanced and positive.",        score: 5 },
        ]
      },
    ],
    scoreRanges: [
      { min: 23, max: 30, risk: "Low", title: "Good Mental Wellbeing",
        summary: "Your responses suggest healthy mental wellbeing. You're managing stress and mood effectively.",
        recommendations: ["Keep up with activities that bring you joy", "Maintain social connections", "Practice mindfulness or meditation for continued mental health"] },
      { min: 13, max: 22, risk: "Moderate", title: "Moderate Mental Health Concerns",
        summary: "Some mental health challenges are present. These are common and manageable with the right support.",
        recommendations: ["Consider speaking with a counselor or therapist", "Practice stress-reduction techniques daily", "Establish a regular sleep routine", "Limit social media and news consumption"] },
      { min: 6, max: 12, risk: "High", title: "Mental Health Needs Attention",
        summary: "Your responses indicate significant mental health challenges. Professional support is strongly recommended.",
        recommendations: ["Consult a mental health professional as soon as possible", "Reach out to a trusted friend, family member, or support line", "Avoid making major decisions while feeling overwhelmed", "Consider a comprehensive mental health evaluation"] },
    ],
    scoreSummaries: {
      "6":  { summary: "A score of 6 — the lowest possible — indicates severe and persistent mental health challenges across mood, energy, sleep, interest, and concentration. Professional support is urgent.", recommendations: ["Contact a mental health professional today — do not wait", "Reach out to a trusted person in your life right now", "If you are in crisis, contact a mental health helpline immediately", "Avoid major decisions until you have professional support in place"] },
      "7":  { summary: "Your score of 7 reflects serious mental health distress. Feelings of hopelessness, exhaustion, sleep problems, and loss of interest are affecting your daily life significantly.", recommendations: ["Book an appointment with a mental health professional this week", "Tell someone you trust how you are feeling", "Avoid alcohol and substances which worsen mental health", "Rest and reduce commitments until you have support in place"] },
      "8":  { summary: "At 8, your mental wellbeing is significantly compromised. Multiple indicators — mood, motivation, sleep, and concentration — are all flagging concern at the same time.", recommendations: ["See a GP or therapist within the next week", "Reach out to a friend or family member today", "Reduce stressors where possible and protect sleep time", "Try one small self-care activity today — a walk, a call, anything that helps"] },
      "9":  { summary: "A score of 9 shows significant mental health challenges. Energy, mood, and concentration are all affected, and the pattern has likely been going on for some time.", recommendations: ["Book a mental health appointment within 2 weeks", "Share how you are feeling with at least one person you trust", "Establish a consistent sleep schedule as a foundation", "Limit news and social media consumption, which may amplify distress"] },
      "10": { summary: "Your score of 10 reflects notable mental health struggles. You may be managing day to day, but the effort required is clearly taking a significant toll.", recommendations: ["Consider therapy — even short-term counselling can help quickly", "Prioritise sleep above all other interventions", "Do one thing today that gives you even a small sense of pleasure or control", "Try a guided meditation or breathing exercise for immediate relief"] },
      "11": { summary: "At 11, your mental health is clearly being affected across multiple dimensions. Some days may feel manageable but there is a clear overall pattern of distress.", recommendations: ["Speak to a GP about how you have been feeling", "Establish a consistent daily routine — structure supports mental health", "Reach out socially, even briefly — isolation makes things harder", "Limit alcohol and prioritise sleep"] },
      "12": { summary: "A score of 12 is at the edge of the high-risk mental health band. You are struggling but may be coping on the surface. Professional support at this stage is very effective.", recommendations: ["Contact a therapist or counsellor — now is the right time", "Prioritise sleep and a regular daily schedule", "Talk to someone you trust about how you have been feeling", "Try one physical activity per day — movement directly improves mood"] },
      "13": { summary: "Your score of 13 places you at the lower end of moderate mental health concerns. You are experiencing real challenges — mood, energy, or concentration — but they are not yet overwhelming.", recommendations: ["Consider therapy or counselling as a proactive step", "Establish a consistent sleep routine", "Try mindfulness or breathing exercises daily", "Reduce sources of stress where possible"] },
      "14": { summary: "At 14, you are experiencing moderate mental health challenges. Things may feel manageable most of the time but some persistent symptoms are affecting your quality of life.", recommendations: ["Consider speaking with a counsellor or therapist", "Prioritise 7–8 hours of sleep nightly", "Engage in physical activity at least 3 days per week — it directly helps mood", "Identify and reduce your main sources of stress"] },
      "15": { summary: "A score of 15 reflects moderate mental health — you are managing but not thriving. Some days are clearly harder than others, and the pattern is worth addressing.", recommendations: ["Try a mindfulness or meditation app daily for 2 weeks", "Prioritise exercise and sleep as first-line mood support", "Limit social media and news if they increase anxiety or low mood", "Consider scheduling a check-in with a mental health professional"] },
      "16": { summary: "Your score of 16 shows moderate mental health with specific areas of concern. You are broadly coping but mood, energy, or sleep is holding you back from feeling well.", recommendations: ["Establish a consistent daily routine including sleep, meals, and activity", "Add one mood-boosting activity to your day — exercise, socialising, or a hobby", "Practise one mindfulness or breathing exercise daily", "Reduce caffeine and alcohol if they disrupt your sleep"] },
      "17": { summary: "At 17, your mental health is in the moderate-to-healthy range. Most days are manageable, though occasional dips in mood, energy, or focus are noticeable.", recommendations: ["Continue or begin a regular exercise routine — it has strong mood benefits", "Invest in your social connections — isolation compounds mental health dips", "Keep a simple gratitude journal for 2 weeks and notice the effect", "Ensure you are getting 7–8 hours of quality sleep nightly"] },
      "18": { summary: "A score of 18 reflects solid but not exceptional mental wellbeing. You are managing well overall, with room to strengthen resilience and emotional balance.", recommendations: ["Maintain your current positive mental health habits", "Add a daily mindfulness practice to build resilience", "Invest in relationships that energise and support you", "Notice your mental patterns — journalling for 5 minutes a day can help"] },
      "19": { summary: "Your score of 19 shows strong mental health with minor areas to refine. You are generally positive, energised, and engaged — just a few habits away from excellent.", recommendations: ["Deepen your mindfulness or meditation practice", "Continue regular exercise and social engagement", "Protect your sleep quality — it underpins everything else", "Address any remaining stressors before they become bigger"] },
      "20": { summary: "At 20, your mental wellbeing is clearly above average. You are managing stress, maintaining energy, and staying emotionally engaged most of the time.", recommendations: ["Keep your mental health habits consistent", "Invest in relationships and activities that feed your sense of purpose", "Continue regular exercise as a mental health anchor", "Keep sleep quality high — it is the foundation of emotional resilience"] },
      "21": { summary: "A score of 21 reflects strong mental wellbeing. Your mood, energy, concentration, and sleep are all generally working well together.", recommendations: ["Maintain your current positive habits", "Continue using exercise, sleep, and social connection as anchors", "Set a meaningful personal or creative goal to stay engaged", "Keep your stress management practices active"] },
      "22": { summary: "Your score of 22 shows excellent mental health that is almost — but not quite — in the top tier. You are resilient, engaged, and emotionally stable most of the time.", recommendations: ["Keep your excellent habits consistent", "Explore new growth or learning opportunities to maintain engagement", "Continue your strong sleep and exercise routines", "Stay connected socially — your relationships support your mental health"] },
      "23": { summary: "At 23, your mental health is in the excellent range. You are emotionally balanced, energised, and cognitively engaged, with very few persistent symptoms.", recommendations: ["Maintain your excellent mental health practices", "Keep sleep, exercise, and social connection as daily priorities", "Continue practising stress management before it becomes acute", "Invest in activities that give you meaning and purpose"] },
      "24": { summary: "A score of 24 reflects exceptional mental wellbeing. Mood, energy, concentration, sleep, and emotional stability are all functioning at a high level.", recommendations: ["Keep your outstanding mental health habits", "Continue investing in meaningful relationships and purpose", "Stay vigilant about sleep quality — it remains the most important factor", "Share your approach with others who may be struggling"] },
      "25": { summary: "Your score of 25 is outstanding. You demonstrate exceptional resilience, positive mood, sustained energy, and strong emotional wellbeing across all dimensions.", recommendations: ["Maintain your extraordinary mental health habits", "Continue to invest in what gives you meaning and connection", "Protect your sleep, exercise, and social routines through busy periods", "Your mental wellbeing is a real asset — guard it carefully"] },
      "26": { summary: "At 26, your mental health is among the best possible. Every dimension assessed — mood, interest, sleep, energy, concentration, and emotional wellbeing — is at a high level.", recommendations: ["Keep your habits consistent", "Continue your investment in social connection and purpose", "Stay proactive about stress — manage it before it accumulates", "Your mental resilience is exceptional — protect and model it"] },
      "27": { summary: "A score of 27 reflects near-perfect mental wellbeing. You are emotionally stable, energised, focused, and socially connected across virtually every dimension.", recommendations: ["Maintain all your excellent mental health habits", "Continue growing and challenging yourself — it sustains positive mental health", "Share your approach and support others in your life", "Keep mental health as a daily priority even when life is going well"] },
      "28": { summary: "Your score of 28 is remarkable — near-perfect mental health across all assessed dimensions. You are thriving emotionally, cognitively, and socially.", recommendations: ["Keep your extraordinary habits intact", "Continue prioritising sleep, exercise, and social connection as anchors", "Stay curious and purposeful — these sustain excellent mental health long-term", "Protect your wellbeing through life's inevitable transitions"] },
      "29": { summary: "At 29, you have exceptional mental health across every assessed dimension. Your resilience, mood, energy, sleep, and engagement are all at the highest possible level.", recommendations: ["Maintain your extraordinary mental health practices", "Continue sharing your positivity and resilience with others", "Keep all protective habits in place even through challenging periods", "Your mental health is a genuine gift — sustain it with intention"] },
      "30": { summary: "A perfect mental health score of 30. You are thriving across every single dimension — mood, energy, sleep, concentration, interest, and emotional wellbeing. Truly exceptional.", recommendations: ["Maintain your perfect habits with the same discipline", "Continue to invest in purpose, relationships, and growth", "Protect your mental health during life transitions — it requires ongoing attention", "Share your approach: you have something valuable to offer others"] },
    },
  },

  // 6 ── Cognitive Health ────────────────────────────────────────────────────
  {
    id: "cognitive-health",
    title: "Cognitive Health Assessment",
    category: "Cognitive Health",
    description: "Evaluate memory, concentration, and cognitive function.",
    questions: [
      { id: "q1", type: "choice", text: "How often do you forget recent conversations, events, or where you placed items?",
        options: [
          { label: "Very Often",     subtext: "Daily and significantly impacting my life.",    score: 1 },
          { label: "Often",          subtext: "Several times a week.",                        score: 2 },
          { label: "Sometimes",      subtext: "Occasional forgetfulness.",                   score: 3 },
          { label: "Rarely",         subtext: "Only minor and infrequent lapses.",            score: 4 },
          { label: "Never",          subtext: "My memory is sharp and reliable.",             score: 5 },
        ]
      },
      { id: "q2", type: "choice", text: "How often do you struggle to find the right words during conversation?",
        options: [
          { label: "Daily",          subtext: "Frequently unable to recall words.",            score: 1 },
          { label: "Several/Week",   subtext: "Often searching for words.",                   score: 2 },
          { label: "Occasionally",   subtext: "A few times a month.",                        score: 3 },
          { label: "Rarely",         subtext: "Very infrequent word-finding issues.",         score: 4 },
          { label: "Never",          subtext: "Fluent and no word difficulties.",              score: 5 },
        ]
      },
      { id: "q3", type: "choice", text: "How well can you concentrate on tasks for extended periods?",
        options: [
          { label: "Very Poorly",    subtext: "Cannot focus for more than a few minutes.",    score: 1 },
          { label: "Poorly",         subtext: "Struggle to maintain focus.",                  score: 2 },
          { label: "Fairly Well",    subtext: "Can focus with some effort.",                  score: 3 },
          { label: "Well",           subtext: "Good focus and sustained attention.",          score: 4 },
          { label: "Very Well",      subtext: "Excellent concentration ability.",             score: 5 },
        ]
      },
      { id: "q4", type: "choice", text: "How often do you feel confused about time, date, or familiar surroundings?",
        options: [
          { label: "Often",          subtext: "Confusion is frequent and concerning.",        score: 1 },
          { label: "Sometimes",      subtext: "Occasional disorientation.",                  score: 2 },
          { label: "Occasionally",   subtext: "A few times.",                               score: 3 },
          { label: "Rarely",         subtext: "Only when very tired or stressed.",           score: 4 },
          { label: "Never",          subtext: "Always oriented and aware.",                  score: 5 },
        ]
      },
      { id: "q5", type: "choice", text: "How would you rate your ability to learn new information or skills?",
        options: [
          { label: "Very Poor",      subtext: "Significant difficulty learning new things.",  score: 1 },
          { label: "Poor",           subtext: "Slow to grasp new concepts.",                 score: 2 },
          { label: "Fair",           subtext: "Average learning ability.",                   score: 3 },
          { label: "Good",           subtext: "Pick up new skills reasonably well.",         score: 4 },
          { label: "Excellent",      subtext: "Quick learner, retains information well.",    score: 5 },
        ]
      },
      { id: "q6", type: "choice", text: "How often do you engage in mentally stimulating activities (reading, puzzles, games)?",
        options: [
          { label: "Never",          subtext: "No cognitive exercises at all.",               score: 1 },
          { label: "Rarely",         subtext: "Once a month or less.",                       score: 2 },
          { label: "Monthly",        subtext: "A few times a month.",                        score: 3 },
          { label: "Weekly",         subtext: "Several times per week.",                     score: 4 },
          { label: "Daily",          subtext: "Daily mental exercises.",                     score: 5 },
        ]
      },
    ],
    scoreRanges: [
      { min: 23, max: 30, risk: "Low", title: "Good Cognitive Health",
        summary: "Your cognitive function appears strong. Continue stimulating your mind and maintaining healthy habits.",
        recommendations: ["Continue daily mental exercises and reading", "Stay socially engaged", "Maintain good sleep hygiene for optimal brain health"] },
      { min: 13, max: 22, risk: "Moderate", title: "Moderate Cognitive Health",
        summary: "Some cognitive areas may benefit from attention. Lifestyle improvements can help maintain and improve brain health.",
        recommendations: ["Engage in daily brain-training activities", "Ensure you get 7-8 hours of quality sleep", "Add aerobic exercise to boost brain blood flow", "Consider discussing cognitive health with your doctor"] },
      { min: 6, max: 12, risk: "High", title: "Cognitive Health Needs Evaluation",
        summary: "Your responses suggest cognitive challenges that warrant professional evaluation. Early intervention is key.",
        recommendations: ["Schedule an appointment with a neurologist or cognitive specialist", "Inform your doctor about any changes in memory or thinking", "Avoid alcohol and substances that impair cognition", "Cognitive testing can provide a more detailed picture"] },
    ],
    scoreSummaries: {
      "6":  { summary: "A score of 6 — the minimum — indicates severe cognitive difficulties across memory, concentration, orientation, learning, and word-finding. Professional neurological evaluation is essential.", recommendations: ["Book an appointment with a neurologist or cognitive specialist urgently", "Inform your GP of all memory and thinking changes you have noticed", "Avoid alcohol, sleep deprivation, and substances that impair cognition", "Ask a trusted person to accompany you to medical appointments for support"] },
      "7":  { summary: "Your score of 7 reflects very significant cognitive challenges. Frequent memory lapses, word-finding difficulties, and disorientation are all affecting daily life.", recommendations: ["See a neurologist or cognitive specialist as soon as possible", "Speak to your GP about your symptoms immediately", "Begin cognitive testing to establish a baseline", "Avoid any substances that impair cognitive function"] },
      "8":  { summary: "At 8, multiple cognitive domains are significantly impaired. Memory, concentration, orientation, and language are all flagging serious concern and need professional evaluation.", recommendations: ["Schedule a comprehensive cognitive evaluation within 2 weeks", "Inform your doctor of all cognitive changes — timing, severity, and progression", "Prioritise 8 hours of sleep — it is essential for cognitive function", "Eliminate alcohol and reduce all cognitive stressors"] },
      "9":  { summary: "A score of 9 reflects serious cognitive health concerns. Multiple areas of thinking and memory are clearly affected and professional assessment is strongly recommended.", recommendations: ["Book a GP appointment this week to discuss cognitive symptoms", "Begin cognitive testing to understand your specific profile", "Prioritise consistent, high-quality sleep", "Engage in daily mental stimulation: reading, puzzles, conversation"] },
      "10": { summary: "Your score of 10 shows significant cognitive challenges in multiple areas. Concentration, memory, and learning are all below where they should be for good cognitive function.", recommendations: ["Schedule a cognitive health appointment within 3–4 weeks", "Begin a simple daily brain exercise — even 10 minutes of a puzzle or reading", "Improve sleep quality — poor sleep acutely impacts every cognitive domain", "Consider whether medications or health conditions may be contributing"] },
      "11": { summary: "At 11, your cognitive health is below average in several key areas. Memory lapses, word-finding, and focus difficulties are occurring frequently enough to impact daily life.", recommendations: ["Discuss cognitive symptoms with your GP", "Engage in daily mental stimulation activities", "Improve sleep and reduce alcohol consumption — both directly affect cognition", "Learn a new skill or take up a mentally engaging hobby"] },
      "12": { summary: "A score of 12 is at the edge of the high-risk cognitive band. Cognitive challenges are present but not yet severe — this is the ideal time for early intervention.", recommendations: ["Speak to your GP about your cognitive symptoms", "Begin a consistent daily cognitive exercise routine", "Prioritise 7–8 hours of quality sleep", "Reduce alcohol intake, which impairs memory and concentration significantly"] },
      "13": { summary: "Your score of 13 places you at the lower end of moderate cognitive health. Some memory or concentration issues are present but manageable with the right habits.", recommendations: ["Engage in daily cognitive activities: reading, puzzles, memory games", "Prioritise 7–8 hours of sleep — it directly supports memory consolidation", "Reduce cognitive stressors like excessive multitasking", "Consider discussing symptoms with your GP if they are worsening"] },
      "14": { summary: "At 14, your cognitive health is moderately affected. Occasional word-finding difficulty, concentration lapses, or memory gaps may be present but not disabling.", recommendations: ["Add a daily brain-training activity to your routine", "Get consistent, high-quality sleep every night", "Add aerobic exercise — it is one of the strongest cognitive enhancers", "Reduce multitasking — it impairs memory encoding and concentration"] },
      "15": { summary: "A score of 15 reflects moderate cognitive health. You function adequately but specific cognitive domains — likely memory or concentration — are noticeably below their potential.", recommendations: ["Begin a daily mental exercise routine: 15 minutes of puzzles, reading, or learning", "Ensure you are getting 7–8 hours of quality sleep every night", "Add cardiovascular exercise to your routine — it boosts brain blood flow", "Discuss your cognitive health with your doctor at your next appointment"] },
      "16": { summary: "Your score of 16 shows moderate-to-good cognitive health. Most areas are functional but there is clear room to strengthen memory, concentration, or learning ability.", recommendations: ["Learn something new: a language, instrument, or skill — neuroplasticity depends on it", "Maintain consistent quality sleep", "Add aerobic exercise 4–5 times per week", "Reduce screen time in favour of cognitively demanding activities"] },
      "17": { summary: "At 17, your cognitive health is approaching good levels. You have solid cognitive function with some room to sharpen specific areas such as sustained focus or word recall.", recommendations: ["Continue challenging your brain daily", "Prioritise sleep — even one poor night impairs cognitive function measurably", "Engage socially — conversation is one of the best cognitive exercises", "Reduce passive screen time in favour of active learning"] },
      "18": { summary: "A score of 18 reflects solid cognitive health. Memory, concentration, and learning are all working reasonably well, with only minor gaps that are easy to address.", recommendations: ["Keep up daily mental stimulation", "Ensure sleep quality is optimal — not just adequate", "Stay physically active — exercise consistently ranks as the top cognitive protector", "Stay socially engaged — social interaction challenges and supports the brain"] },
      "19": { summary: "Your score of 19 shows strong cognitive health across most domains. You are sharp, engaged, and learning well — just a couple of habits could take you to excellent.", recommendations: ["Continue challenging yourself with new learning", "Maintain your sleep, exercise, and social habits", "Try advanced cognitive exercises: strategy games, complex reading, or creative projects", "Stay curious — novelty is one of the best brain stimulants"] },
      "20": { summary: "At 20, your cognitive health is clearly above average. Memory, concentration, orientation, and learning are all functioning well in your daily life.", recommendations: ["Maintain your brain-healthy habits", "Continue daily mental stimulation with variety", "Keep sleep and exercise consistent — they underpin cognitive function", "Explore new intellectual challenges to keep your mind growing"] },
      "21": { summary: "A score of 21 reflects strong cognitive health. Your memory, focus, and learning ability are all above average, with only minor areas that could be further optimised.", recommendations: ["Keep challenging your brain across domains: verbal, spatial, numerical", "Maintain excellent sleep and exercise habits", "Stay socially active — social engagement is cognitively protective", "Keep learning something new — this is what keeps the brain sharp long-term"] },
      "22": { summary: "Your score of 22 reflects excellent cognitive function. You are operating near the top of the cognitive health range with sharp memory, focus, and learning ability.", recommendations: ["Maintain your outstanding cognitive habits", "Continue to seek intellectual challenge and novelty", "Keep exercise, sleep, and social connection as daily priorities", "Your brain is clearly being well-served by your habits — protect them"] },
      "23": { summary: "At 23, your cognitive health is excellent. Memory is reliable, concentration is strong, and you learn and adapt effectively with very few difficulties.", recommendations: ["Keep challenging your brain with varied and complex activities", "Maintain your exceptional sleep and exercise habits", "Continue to invest in social connection — it is cognitively protective at every age", "Keep learning: it is the most powerful long-term cognitive protector"] },
      "24": { summary: "A score of 24 reflects exceptional cognitive health. Your memory, focus, orientation, language, and learning are all performing at a very high level.", recommendations: ["Maintain your excellent cognitive habits", "Keep your brain challenged with new and complex tasks", "Continue your strong sleep, exercise, and social habits", "Your cognitive health is outstanding — protect it through all life stages"] },
      "25": { summary: "Your score of 25 is outstanding. Cognitive function across every dimension assessed is sharp, reliable, and far above average.", recommendations: ["Keep doing what you are doing — your cognitive habits are excellent", "Continue to seek out new intellectual challenges", "Maintain your sleep and exercise routines — they are protecting your brain", "Share your cognitively healthy habits with those around you"] },
      "26": { summary: "At 26, your cognitive health is among the best possible. Memory is sharp, concentration is excellent, and you learn and adapt with ease across all situations.", recommendations: ["Maintain your habits with the same discipline", "Continue seeking intellectual challenge and novelty", "Stay socially engaged — it is one of the strongest protectors of long-term cognition", "Keep exercise and sleep as non-negotiable cognitive anchors"] },
      "27": { summary: "A score of 27 reflects near-perfect cognitive health. Every assessed domain — memory, concentration, orientation, word-finding, learning, and mental activity — is at a high level.", recommendations: ["Keep your exceptional cognitive habits consistent", "Continue learning new skills and engaging with complex ideas", "Maintain your excellent sleep and exercise routines", "Your cognitive health is extraordinary — protect and celebrate it"] },
      "28": { summary: "Your score of 28 is remarkable cognitive health. Your brain is clearly well-supported by your lifestyle across every dimension — memory, focus, language, and learning.", recommendations: ["Maintain your outstanding habits", "Continue seeking intellectual variety and challenge", "Keep sleep, exercise, and social connection as your cognitive pillars", "Your brain performance is among the best — sustain it intentionally"] },
      "29": { summary: "At 29, you have near-perfect cognitive health. Every cognitive domain is functioning at an exceptional level, reflecting excellent lifestyle habits and strong neurological health.", recommendations: ["Maintain your extraordinary cognitive habits", "Continue challenging your brain with new and demanding tasks", "Keep your sleep and exercise as non-negotiable daily habits", "Share your approach — your cognitive health is genuinely inspiring"] },
      "30": { summary: "A perfect cognitive health score of 30. Every dimension assessed — memory, concentration, orientation, language, learning, and mental stimulation — is at the highest possible level. Exceptional.", recommendations: ["Maintain your perfect cognitive habits with intention", "Continue learning and challenging yourself across domains", "Keep sleep, exercise, and social engagement as your daily priorities", "Your cognitive health is extraordinary — protect and share it"] },
    },
  },

  // 7 ── BMI Calculator ──────────────────────────────────────────────────────
  {
    id: "bmi-calculator",
    title: "BMI Calculator",
    category: "Physical",
    description: "Calculate your Body Mass Index and understand what it means for your health.",
    questions: [
      { id: "q1", type: "number", text: "What is your height?", unit: "cm" },
      { id: "q2", type: "number", text: "What is your weight?", unit: "kg" },
    ],
    // BMI scoring is handled separately in the route
    scoreRanges: [
      { min: 0,   max: 18, risk: "Moderate", title: "Underweight",
        summary: "Your BMI is below the healthy range. Being underweight can impact your immune system, bone density, and energy levels.",
        recommendations: ["Consult a dietitian to develop a nutrient-rich meal plan", "Focus on nutrient-dense foods rather than empty calories", "Consider strength training to build muscle mass", "Rule out underlying medical conditions with your doctor"] },
      { min: 18,  max: 25, risk: "Low", title: "Healthy Weight",
        summary: "Your BMI falls within the healthy range. Maintaining this weight reduces your risk of chronic diseases.",
        recommendations: ["Maintain a balanced diet rich in fruits, vegetables, and lean proteins", "Continue regular physical activity", "Monitor weight periodically to stay in range"] },
      { min: 25,  max: 30, risk: "Moderate", title: "Overweight",
        summary: "Your BMI indicates you are overweight. Even modest weight loss can significantly improve health outcomes.",
        recommendations: ["Aim to reduce calorie intake by 300-500 kcal per day", "Increase physical activity to at least 150 minutes per week", "Consult a nutritionist for a personalized plan", "Monitor blood pressure and blood sugar regularly"] },
      { min: 30,  max: 999, risk: "High", title: "Obese",
        summary: "Your BMI indicates obesity, which significantly increases the risk of diabetes, heart disease, and other conditions. Medical guidance is important.",
        recommendations: ["Consult a doctor for a medically supervised weight loss program", "Consider referral to a bariatric specialist", "Prioritize metabolic health testing (blood glucose, cholesterol)", "Start with low-impact exercise like swimming or walking"] },
    ],
  },

  // 8 ── Pain Scale ──────────────────────────────────────────────────────────
  {
    id: "pain-scale",
    title: "Pain Scale Assessment",
    category: "Physical",
    description: "Evaluate the nature and intensity of any pain you are experiencing.",
    questions: [
      { id: "q1", type: "choice", text: "Where do you primarily experience pain?",
        options: [
          { label: "Head / Neck",         subtext: "Headaches, neck stiffness, or migraines.", score: 3 },
          { label: "Back / Spine",        subtext: "Lower or upper back, spine pain.",          score: 3 },
          { label: "Joints / Limbs",      subtext: "Knees, hips, shoulders, or other joints.",  score: 3 },
          { label: "Chest / Abdomen",     subtext: "Internal or chest pain.",                  score: 3 },
          { label: "Widespread",          subtext: "Pain across multiple areas.",               score: 2 },
          { label: "No Specific Location",subtext: "General discomfort without focus.",         score: 4 },
        ]
      },
      { id: "q2", type: "scale", text: "On a scale of 0–10, how would you rate your pain intensity right now?",
        min: 0, max: 10
      },
      { id: "q3", type: "choice", text: "How long have you been experiencing this pain?",
        options: [
          { label: "Just Started",     subtext: "Less than 24 hours.",             score: 5 },
          { label: "About a Week",     subtext: "2–7 days of pain.",              score: 4 },
          { label: "About a Month",    subtext: "2–4 weeks.",                     score: 3 },
          { label: "3–6 Months",       subtext: "Persisting for several months.",  score: 2 },
          { label: "6+ Months",        subtext: "Chronic long-term pain.",         score: 1 },
        ]
      },
      { id: "q4", type: "choice", text: "How much does this pain affect your daily activities?",
        options: [
          { label: "Unable to Function", subtext: "Pain prevents all normal activity.",          score: 1 },
          { label: "Significant Impact",  subtext: "Severely limits what I can do.",             score: 2 },
          { label: "Moderate Impact",     subtext: "Pain interferes with many activities.",      score: 3 },
          { label: "Slight Discomfort",   subtext: "Noticeable but manageable.",                score: 4 },
          { label: "No Impact",           subtext: "I function normally despite pain.",          score: 5 },
        ]
      },
    ],
    scoreRanges: [
      { min: 14, max: 20, risk: "Low", title: "Mild Pain",
        summary: "Your pain level appears mild and manageable. Monitor for any changes and maintain healthy habits.",
        recommendations: ["Over-the-counter pain relief may be adequate", "Gentle stretching and movement often helps", "Monitor if pain worsens or persists beyond a week"] },
      { min: 9, max: 13, risk: "Moderate", title: "Moderate Pain",
        summary: "You're experiencing moderate pain that may benefit from medical evaluation, especially if it has persisted.",
        recommendations: ["Schedule an appointment with your general practitioner", "Track pain patterns: timing, triggers, and intensity", "Avoid activities that aggravate the pain", "Ask about appropriate pain management options"] },
      { min: 4, max: 8, risk: "High", title: "Severe Pain",
        summary: "Your pain level is significant and requires prompt medical attention. Do not delay seeking care.",
        recommendations: ["Seek medical attention as soon as possible", "If chest or abdominal pain, consider going to an emergency room", "Do not self-medicate with high doses of painkillers", "A specialist referral may be required"] },
    ],
    scoreSummaries: {
      "4":  { summary: "A score of 4 — the lowest possible — indicates severe, long-standing pain that is completely disrupting your daily function. This is a medical emergency if pain is in the chest or abdomen. Seek care immediately.", recommendations: ["Go to an emergency room or urgent care now if pain is severe or in chest/abdomen", "Do not delay medical attention under any circumstances", "Do not self-administer high doses of pain medication", "Ask someone to accompany you — do not drive yourself if in severe pain"] },
      "5":  { summary: "Your score of 5 reflects severe, chronic pain that significantly limits function. The combination of high intensity and long duration requires immediate specialist evaluation.", recommendations: ["Book an urgent appointment with your GP or a pain specialist", "Request imaging or diagnostic tests to identify the pain source", "Do not rely on over-the-counter painkillers alone at this severity", "Consider a referral to a pain management clinic"] },
      "6":  { summary: "At 6, you are experiencing significant pain that is substantially affecting your daily activities and has been present for some time. Prompt medical evaluation is essential.", recommendations: ["See your doctor within the next few days", "Describe the exact location, intensity, and duration of pain precisely", "Request a referral to a physiotherapist or pain specialist", "Apply RICE (rest, ice, compression, elevation) for localised musculoskeletal pain while awaiting care"] },
      "7":  { summary: "A score of 7 reflects considerable pain that is noticeably limiting function and has persisted long enough to warrant medical investigation.", recommendations: ["Book a GP appointment within the next week", "Track pain patterns: timing, triggers, intensity, and what relieves it", "Avoid activities that aggravate the pain", "Ask about appropriate prescription pain management options"] },
      "8":  { summary: "Your score of 8 is at the boundary of moderate and severe pain. You are coping with pain that is increasingly limiting your normal activities and deserves medical attention.", recommendations: ["Schedule a GP appointment within the next 2 weeks", "Keep a pain diary to identify patterns and triggers", "Try gentle heat or cold therapy depending on the type of pain", "Ask about physiotherapy or pain management referrals"] },
      "9":  { summary: "A score of 9 reflects moderate pain that is affecting some of your daily activities and has persisted for a noticeable period of time. Medical evaluation is recommended.", recommendations: ["Book a GP appointment within the next 2–3 weeks", "Track your pain — when it occurs, what triggers it, and what relieves it", "Use over-the-counter pain relief as directed if appropriate", "Ask about physiotherapy or targeted stretching for musculoskeletal pain"] },
      "10": { summary: "Your score of 10 reflects moderate pain that is impacting your daily life in meaningful ways. It is persistent enough that a medical review would be beneficial.", recommendations: ["Schedule a GP review within the next 3 weeks", "Try gentle stretching or movement therapy depending on pain location", "Use heat or cold therapy to manage flare-ups", "Avoid self-diagnosis — a professional should evaluate the source of pain"] },
      "11": { summary: "At 11, your pain is at a moderate level — it affects your activities but you are still managing to function in most areas. The duration and pattern are worth discussing with a doctor.", recommendations: ["See your GP to discuss the pain pattern", "Try physiotherapy or targeted exercise for musculoskeletal pain", "Avoid pain medications beyond the recommended dosage", "Use activity modification to reduce pain while maintaining function"] },
      "12": { summary: "A score of 12 reflects moderate pain that is manageable but still affecting your quality of life. Getting clarity on the source of pain will help direct the most effective treatment.", recommendations: ["Book a medical review to identify the underlying cause", "Try low-impact activity — movement often helps moderate musculoskeletal pain", "Use over-the-counter pain relief appropriately and as directed", "Consider complementary approaches: acupuncture, massage, or physiotherapy"] },
      "13": { summary: "Your score of 13 is at the high end of the moderate pain range. The pain has been present for a while and is noticeable, but it is not completely disrupting your daily life.", recommendations: ["Schedule a GP check-in about your pain pattern", "Try physiotherapy or gentle targeted stretching for musculoskeletal pain", "Keep track of what makes pain better or worse", "Use anti-inflammatory strategies: rest, ice, and appropriate medication"] },
      "14": { summary: "At 14, your pain is mild-to-moderate. It is noticeable and recurring but not yet significantly impacting most daily activities. Early management will prevent escalation.", recommendations: ["Over-the-counter pain relief should be adequate if taken as directed", "Gentle movement and stretching often helps mild pain", "Monitor for worsening — if pain escalates, see a doctor", "Try heat or cold therapy depending on the nature of the pain"] },
      "15": { summary: "A score of 15 reflects mild pain that is recent and having minimal impact on your daily activities. At this level, conservative self-management is usually sufficient.", recommendations: ["Use over-the-counter pain relief as directed for acute mild pain", "Apply gentle movement and stretching", "Monitor whether pain resolves or worsens over the next few days", "Rest the affected area if the pain is from recent activity or injury"] },
      "16": { summary: "Your score of 16 indicates mild, manageable pain that has limited impact on your daily function. This level is often responsive to simple self-care strategies.", recommendations: ["Use appropriate over-the-counter pain relief if needed", "Apply gentle heat or cold therapy depending on the pain type", "Light stretching and gentle movement often help", "Monitor for changes — see a GP if pain persists beyond 2 weeks"] },
      "17": { summary: "At 17, pain is mild and relatively brief. It may be from recent activity or minor strain. Standard self-care measures should be effective.", recommendations: ["Rest and allow natural healing if pain follows physical activity or minor injury", "Use ice for the first 48 hours for acute injuries", "Gentle movement prevents stiffness and aids recovery", "See a GP if pain persists beyond 1–2 weeks or worsens"] },
      "18": { summary: "A score of 18 reflects mild, short-duration pain with minimal impact on daily function. This is likely to resolve with basic self-care and watchful waiting.", recommendations: ["Allow the area to rest briefly, then reintroduce gentle movement", "Use over-the-counter pain relief if needed for comfort", "Apply ice or heat as appropriate", "No immediate medical attention required unless pain escalates"] },
      "19": { summary: "Your score of 19 indicates very mild pain of recent onset that is not significantly affecting your daily life. Standard self-management is appropriate.", recommendations: ["Use over-the-counter pain relief if discomfort persists", "Gentle stretching and light movement are appropriate at this level", "Monitor for any escalation over the next few days", "No medical appointment needed unless symptoms worsen or persist"] },
      "20": { summary: "A score of 20 reflects the mildest possible pain presentation — very recent, very mild, and having virtually no impact on daily activities. Self-care is all that is needed.", recommendations: ["Rest briefly if pain followed activity or minor strain", "Apply ice or heat for comfort if needed", "Light movement and stretching are fine at this level", "Monitor and see a GP only if pain intensifies or lasts more than 2 weeks"] },
    },
  },

  // 9 ── Dietary Habits Evaluation ──────────────────────────────────────────
  {
    id: "dietary-habits",
    title: "Dietary Habits Evaluation",
    category: "Nutritional",
    description: "Evaluate your eating behaviors, meal patterns, and dietary awareness.",
    questions: [
      { id: "q1", type: "choice", text: "How often do you cook or prepare your own meals at home?",
        options: [
          { label: "Never",           subtext: "I always eat out or order food.",              score: 1 },
          { label: "Rarely",          subtext: "I cook less than once a week.",               score: 2 },
          { label: "Occasionally",    subtext: "Home-cooked meals a few times a week.",       score: 3 },
          { label: "Often",           subtext: "I cook most days.",                           score: 4 },
          { label: "Almost Always",   subtext: "I prepare nearly all my meals at home.",      score: 5 },
        ]
      },
      { id: "q2", type: "choice", text: "How mindful are you about portion sizes when you eat?",
        options: [
          { label: "Never",           subtext: "I eat without any awareness of portions.",    score: 1 },
          { label: "Rarely",          subtext: "I mostly overeat without control.",           score: 2 },
          { label: "Sometimes",       subtext: "Occasionally aware of how much I eat.",       score: 3 },
          { label: "Often",           subtext: "Regularly mindful of portions.",              score: 4 },
          { label: "Always",          subtext: "Consistent portion control every meal.",      score: 5 },
        ]
      },
      { id: "q3", type: "choice", text: "How often do you skip meals?",
        options: [
          { label: "Multiple/Day",    subtext: "Often skip both lunch and dinner.",           score: 1 },
          { label: "Daily",           subtext: "Skip at least one meal every day.",          score: 2 },
          { label: "Few/Week",        subtext: "Skip meals several times a week.",           score: 3 },
          { label: "Rarely",          subtext: "Rarely miss a meal.",                        score: 4 },
          { label: "Never",           subtext: "I eat regular, consistent meals.",           score: 5 },
        ]
      },
      { id: "q4", type: "choice", text: "How often do you eat late at night (after 9 PM)?",
        options: [
          { label: "Daily",           subtext: "Late-night eating is a regular habit.",      score: 1 },
          { label: "4–6x per week",   subtext: "Frequent late-night snacking.",              score: 2 },
          { label: "2–3x per week",   subtext: "Moderate late-night eating.",               score: 3 },
          { label: "Rarely",          subtext: "Occasional late-night snack.",               score: 4 },
          { label: "Never",           subtext: "I stop eating before 9 PM.",                score: 5 },
        ]
      },
      { id: "q5", type: "choice", text: "How aware are you of nutritional content when choosing food?",
        options: [
          { label: "Never",           subtext: "I never read nutrition labels.",              score: 1 },
          { label: "Rarely",          subtext: "Occasionally glance at labels.",              score: 2 },
          { label: "Sometimes",       subtext: "I check labels for some foods.",              score: 3 },
          { label: "Often",           subtext: "Regularly make informed food choices.",       score: 4 },
          { label: "Always",          subtext: "Highly aware, always check nutrition info.", score: 5 },
        ]
      },
      { id: "q6", type: "choice", text: "Do you follow any structured meal plan or dietary guideline?",
        options: [
          { label: "Never",           subtext: "No meal planning at all.",                   score: 1 },
          { label: "Rarely",          subtext: "Occasionally try but don't follow through.", score: 2 },
          { label: "Occasionally",    subtext: "Follow a plan some of the time.",            score: 3 },
          { label: "Often",           subtext: "Consistently follow a meal structure.",      score: 4 },
          { label: "Always",          subtext: "Strictly follow a dietary plan.",            score: 5 },
        ]
      },
    ],
    scoreRanges: [
      { min: 23, max: 30, risk: "Low", title: "Excellent Dietary Habits",
        summary: "Your dietary behaviors are commendable. You show strong awareness and consistency in your eating patterns.",
        recommendations: ["Keep up your mindful eating practices", "Continue meal prepping to stay on track", "Share your positive habits with those around you"] },
      { min: 13, max: 22, risk: "Moderate", title: "Dietary Habits Need Improvement",
        summary: "Your eating behaviors have room for improvement. Small, sustainable changes can lead to significant health benefits.",
        recommendations: ["Start simple meal planning at the beginning of each week", "Replace one takeout meal per week with a home-cooked option", "Practice eating without screens to improve mindfulness", "Consider consulting a dietitian"] },
      { min: 6, max: 12, risk: "High", title: "Poor Dietary Habits",
        summary: "Your current eating patterns may be harming your health. Professional nutritional guidance is recommended.",
        recommendations: ["Consult a registered dietitian for personalized guidance", "Start by making one healthy swap per day", "Establish a regular meal schedule to avoid skipping", "Track your food intake for one week to identify patterns"] },
    ],
    scoreSummaries: {
      "6":  { summary: "A score of 6 is the lowest possible for dietary habits — you are eating out or ordering food constantly, skipping meals frequently, never checking nutrition, and eating late at night daily. Your eating patterns are actively harming your health.", recommendations: ["Consult a registered dietitian urgently", "Commit to cooking one meal at home this week", "Start a food journal today to see exactly what you are consuming", "Set a hard stop on eating at 9pm every night"] },
      "7":  { summary: "Your score of 7 reflects eating habits with almost no structure, planning, or nutritional awareness. Meal skipping, late-night eating, and daily takeaway are all contributing to health risk.", recommendations: ["Begin tracking everything you eat for one week", "Replace one takeout meal per day with home-cooked food", "Eat breakfast every morning this week, even if it is simple", "Stop eating at least 2 hours before bed"] },
      "8":  { summary: "At 8, your dietary habits are significantly unhealthy. Frequent meal skipping, minimal home cooking, and no portion awareness are all creating nutritional deficits and risks.", recommendations: ["Commit to cooking at home at least 3 times this week", "Eat at least 2 structured meals per day at consistent times", "Reduce late-night eating to no more than twice this week", "Start reading nutrition labels on at least one food product per day"] },
      "9":  { summary: "A score of 9 reflects poor dietary habits in multiple areas. You are not cooking regularly, skipping meals, eating late, and not tracking what you consume.", recommendations: ["Plan 3 meals per day — even simple ones", "Cook at home at least 4 times this week", "Eliminate late-night eating on weekdays", "Track one day of eating to understand your current baseline"] },
      "10": { summary: "Your score of 10 shows dietary habits that are significantly below a healthy standard. Meal skipping and reliance on takeaway are the main contributors to your score.", recommendations: ["Establish a consistent meal schedule: breakfast, lunch, dinner", "Cook at home 4–5 times this week", "Reduce takeaway to no more than 3 times this week", "Be aware of portion sizes — no need to count calories, just notice amounts"] },
      "11": { summary: "At 11, your dietary habits are notably below average. Some meals are skipped, cooking is infrequent, and late-night eating is likely still a pattern.", recommendations: ["Commit to not skipping breakfast for one full week", "Cook at home 5 times this week", "Stop eating after 9pm this week", "Begin reading at least one nutrition label per day"] },
      "12": { summary: "A score of 12 is at the edge of the high-risk dietary band. Your eating patterns have clear structural problems — skipping meals, late-night eating, or minimal cooking — that a few habits can address.", recommendations: ["Eat three structured meals every day this week", "Reduce late-night eating to no more than once", "Try one new home-cooked recipe this week", "Identify your worst dietary habit and commit to changing it"] },
      "13": { summary: "Your score of 13 puts you at the low end of moderate dietary habits. Some improvements are in place but meal planning, portion control, or late-night eating still need work.", recommendations: ["Plan your meals one day in advance", "Aim for 3 structured meals every day", "Reduce late-night eating to less than twice per week", "Cook at home at least 5 times this week"] },
      "14": { summary: "At 14, your dietary habits are moderately developed. Some good choices exist but inconsistency — particularly in meal timing or home cooking — is holding your score down.", recommendations: ["Commit to cooking at home 5–6 days this week", "Eat breakfast daily with a focus on protein and fibre", "Reduce portion sizes if you are eating larger amounts than needed", "Add more awareness of nutrition labels when shopping"] },
      "15": { summary: "A score of 15 reflects moderate dietary habits. You make some good choices but meal skipping, late-night eating, or limited cooking still undermine your overall diet quality.", recommendations: ["Establish a firm daily meal schedule and stick to it", "Cook at home 6 days this week", "Cut late-night eating to zero this week as a challenge", "Practise mindful eating — eat without screens for one meal per day"] },
      "16": { summary: "Your score of 16 shows moderately good dietary habits with specific areas to improve. Portion control and meal planning are likely where the biggest gains can be made.", recommendations: ["Focus on portion awareness — use smaller plates if needed", "Plan weekly meals on Sunday to stay consistent", "Reduce dining out to twice per week maximum", "Practise eating slowly and mindfully at each meal"] },
      "17": { summary: "At 17, your dietary habits are above moderate. You cook regularly and eat meals at reasonable times — the main improvements are in portion awareness and nutritional knowledge.", recommendations: ["Read nutrition labels for your most frequently eaten foods", "Focus on protein and fibre at breakfast to control hunger", "Keep portion sizes consistent — avoid second helpings unless hungry", "Reduce late-night eating to less than once per week"] },
      "18": { summary: "A score of 18 reflects solid dietary habits. You cook regularly, eat at consistent times, and have decent portion awareness — minor refinements will further improve your score.", recommendations: ["Fine-tune portion control for your heaviest meal of the day", "Increase nutritional awareness — aim to check labels regularly", "Keep late-night eating occasional at most", "Try to add more variety to your home-cooked meals"] },
      "19": { summary: "Your score of 19 shows strong dietary habits with only minor areas to optimise. You are cooking regularly, eating consistently, and managing portions reasonably well.", recommendations: ["Focus on consistently following a structured meal plan", "Increase variety in your home cooking to improve nutritional breadth", "Aim to stop eating 2 hours before bed consistently", "Keep reading nutrition labels and making informed choices"] },
      "20": { summary: "At 20, your dietary habits are clearly above average. Most of the healthy behaviours are in place — cooking, timing, and some nutritional awareness are all working.", recommendations: ["Maintain your healthy eating schedule", "Increase dietary variety — try new vegetables and protein sources", "Keep late-night eating minimal", "Consider meal prepping to maintain consistency during busy weeks"] },
      "21": { summary: "A score of 21 reflects genuinely good dietary habits. You cook regularly, eat at consistent times, manage portions, and have meaningful nutritional awareness.", recommendations: ["Keep your excellent habits consistent", "Focus on dietary variety — aim for a rainbow of vegetables", "Continue avoiding late-night eating", "Practise mindful eating consistently across all meals"] },
      "22": { summary: "Your score of 22 reflects strong dietary habits that are close to excellent. All major dietary behaviours are in a healthy place with only minor fine-tuning needed.", recommendations: ["Maintain your excellent cooking and meal planning habits", "Further improve nutritional label reading — focus on sugar and sodium", "Keep portions consistent and mindful at all meals", "Add one new nutrient-dense food to your diet each week"] },
      "23": { summary: "At 23, your dietary habits are excellent. You cook consistently, eat at regular times, practice portion control, and show strong nutritional awareness.", recommendations: ["Keep your excellent dietary habits intact", "Continue meal planning to stay consistent week to week", "Focus on maximising dietary diversity for micronutrient variety", "Maintain your discipline around late-night eating — keep it rare"] },
      "24": { summary: "A score of 24 reflects exceptional dietary habits. Meal timing, home cooking, portion control, and nutritional awareness are all working harmoniously.", recommendations: ["Maintain your outstanding dietary habits", "Continue prioritising home cooking and meal prep", "Keep nutritional awareness high — stay informed about food quality", "Explore advanced dietary strategies: anti-inflammatory foods, fermented foods"] },
      "25": { summary: "Your score of 25 is outstanding dietary behaviour. You cook nearly all your meals, eat mindfully, manage portions well, and are highly nutritionally aware.", recommendations: ["Maintain your exceptional habits", "Share your meal prep and planning strategies with others", "Explore nutrient density — push for even more whole foods", "Continue late-night eating abstinence — your body thanks you for it"] },
      "26": { summary: "At 26, your dietary habits are exemplary. Every key behaviour — cooking, planning, timing, portions, and awareness — is performing at a high level.", recommendations: ["Keep your outstanding habits consistent", "Continue meal prepping and planning to maintain excellence", "Explore advanced nutritional strategies aligned with your health goals", "Your dietary discipline is extraordinary — protect it"] },
      "27": { summary: "A score of 27 reflects near-perfect dietary habits. Home cooking is your default, portions are mindful, you never eat late, and your nutritional knowledge guides your choices.", recommendations: ["Maintain your near-perfect habits", "Continue your meal planning discipline", "Explore micronutrient optimisation and dietary diversity", "Share your approach with others — your dietary habits are a model"] },
      "28": { summary: "Your score of 28 reflects exceptional dietary behaviour across every assessed dimension. Cooking, mindfulness, timing, and nutritional knowledge are all at a high standard.", recommendations: ["Keep your extraordinary habits consistent", "Continue applying nutritional knowledge in your meal planning", "Stay disciplined around late-night eating — even at this level it matters", "Your dietary habits are among the best — protect and maintain them"] },
      "29": { summary: "At 29, you have near-perfect dietary habits. Every dimension — home cooking, portion control, nutritional awareness, meal planning, and meal timing — is optimised.", recommendations: ["Maintain your outstanding habits with the same discipline", "Continue exploring new healthy foods and recipes", "Keep nutritional education central to your food choices", "Your dietary habits are exceptional — share your approach and inspire others"] },
      "30": { summary: "A perfect dietary habits score of 30. You cook virtually all your meals at home, eat mindfully and in appropriate portions, never eat late, and are deeply nutritionally aware. Extraordinary.", recommendations: ["Maintain your perfect dietary habits with intention", "Continue meal prepping and planning to sustain excellence", "Your dietary discipline is extraordinary — protect it through all life seasons", "Share your habits and knowledge with those around you"] },
    },
  },
];

// ─── Helper functions ────────────────────────────────────────────────────────

export function getAllAssessments(): AssessmentDefinition[] { return ASSESSMENTS; }

export function getAssessmentById(id: string): AssessmentDefinition | undefined {
  return ASSESSMENTS.find(a => a.id === id);
}

/**
 * Compute score + risk from a map of { questionId → answerScore }.
 * For BMI: height_cm and weight_kg are passed directly; answers contain those values.
 * Looks up per-exact-score detail first (scoreSummaries), then falls back to scoreRange band.
 * Returns { totalScore, risk, title, summary, recommendations, bmi? }
 */
export function computeResult(assessment: AssessmentDefinition, answers: Record<string, number>) {
  if (assessment.id === "bmi-calculator") {
    const height = answers["q1"];
    const weight = answers["q2"];
    if (!height || !weight) return null;
    const bmi = weight / Math.pow(height / 100, 2);
    const bmiRounded = Math.round(bmi * 10) / 10;
    const range = assessment.scoreRanges.find(r => bmiRounded >= r.min && bmiRounded < r.max)
      ?? assessment.scoreRanges[assessment.scoreRanges.length - 1];
    // For BMI use one decimal bucket (e.g. "22.4")
    const detail = assessment.scoreSummaries?.[bmiRounded.toFixed(1)]
      ?? assessment.scoreSummaries?.[String(Math.round(bmiRounded))];
    return {
      totalScore: bmiRounded,
      risk: range.risk,
      title: range.title,
      summary: detail?.summary ?? range.summary,
      recommendations: detail?.recommendations ?? range.recommendations,
      bmi: bmiRounded,
    };
  }

  const totalScore = Object.values(answers).reduce((s, v) => s + v, 0);
  const range = assessment.scoreRanges.find(r => totalScore >= r.min && totalScore <= r.max)
    ?? assessment.scoreRanges[assessment.scoreRanges.length - 1];
  const detail = assessment.scoreSummaries?.[String(totalScore)];
  return {
    totalScore,
    risk: range.risk,
    title: range.title,
    summary: detail?.summary ?? range.summary,
    recommendations: detail?.recommendations ?? range.recommendations,
  };
}
