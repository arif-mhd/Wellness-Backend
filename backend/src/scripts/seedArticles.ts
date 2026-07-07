/**
 * Seed script — run with:
 *   npx ts-node src/scripts/seedArticles.ts
 *
 * Seeds 12 health articles directly into Cosmos. Safe to run multiple times
 * (checks if articles container already has items before inserting).
 */

import { articlesContainer } from "../config/cosmos";
import { v4 as uuidv4 } from "uuid";

const now = new Date().toISOString();

const ARTICLES = [
  {
    title: "Understanding Your Menstrual Cycle: A Complete Guide",
    summary: "Learn about the four phases of your menstrual cycle and how each phase affects your body, mood, and energy levels.",
    content: `Your menstrual cycle is a monthly hormonal rhythm that influences far more than just your period. Understanding it can help you work with your body rather than against it.

## The Four Phases

**1. Menstrual Phase (Days 1–5)**
This is when your period occurs. Estrogen and progesterone are at their lowest, causing the uterine lining to shed. Many women experience cramps, fatigue, and bloating during this time. Rest and iron-rich foods are particularly helpful.

**2. Follicular Phase (Days 6–14)**
Following your period, follicle-stimulating hormone (FSH) triggers follicles in your ovaries to mature. Estrogen rises steadily, making you feel more energetic and sociable. This is a great time for new projects and high-intensity workouts.

**3. Ovulation Phase (Day 14)**
A surge in luteinising hormone (LH) triggers the release of an egg. You may notice egg-white cervical mucus, a slight rise in basal body temperature, and heightened libido. This is your most fertile window.

**4. Luteal Phase (Days 15–28)**
Progesterone dominates to prepare the uterine lining for a potential embryo. If fertilisation doesn't occur, both hormones drop and the cycle restarts. PMS symptoms like mood changes, bloating, and tender breasts are common in the final days.

## Tracking Tips
- Note your cycle length monthly — the average is 28 days but 21–35 days is normal
- Track basal body temperature daily for ovulation confirmation
- Log symptoms to identify patterns across phases

Understanding your cycle is the first step to better hormonal health.`,
    category: "Women's Health",
    coverImageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
    author: "Dr. Sarah Mitchell",
    tags: ["menstrual cycle", "hormones", "women's health", "fertility"],
  },
  {
    title: "5 Evidence-Based Nutrition Tips for Hormonal Balance",
    summary: "What you eat directly impacts your hormone levels. These five science-backed dietary strategies can help regulate your cycle and reduce PMS symptoms.",
    content: `Hormones are chemical messengers that depend on specific nutrients to be produced and metabolised. Eating for hormonal balance isn't about a restrictive diet — it's about giving your body the building blocks it needs.

## 1. Prioritise Healthy Fats
Your body makes hormones from cholesterol. Include avocado, olive oil, fatty fish (salmon, sardines), and nuts daily. Avoid trans fats found in ultra-processed foods, which disrupt hormone receptor function.

## 2. Eat Enough Protein at Every Meal
Protein stabilises blood sugar and provides amino acids for neurotransmitter production (serotonin, dopamine). Aim for 25–30 g per meal — eggs, legumes, Greek yoghurt, chicken, or tofu all work well.

## 3. Load Up on Cruciferous Vegetables
Broccoli, cauliflower, kale, and Brussels sprouts contain indole-3-carbinol, a compound that helps the liver clear excess oestrogen. This is especially beneficial if you experience heavy periods or PMS.

## 4. Reduce Refined Sugar and Alcohol
Both spike insulin and cortisol, which throws other hormones out of balance. Try swapping sugary snacks for a handful of walnuts or a piece of dark chocolate (≥70% cacao).

## 5. Don't Fear Carbohydrates
Severe carb restriction lowers thyroid hormone and raises cortisol. Choose complex carbs — sweet potato, oats, brown rice — which provide steady energy and support serotonin production in the second half of your cycle.

## Key Micronutrients
- **Magnesium**: Reduces cramps and improves sleep. Found in dark chocolate, pumpkin seeds, spinach.
- **Zinc**: Supports progesterone production. Found in oysters, beef, pumpkin seeds.
- **B6**: Helps metabolise oestrogen. Found in salmon, potatoes, bananas.
- **Vitamin D**: Acts as a hormone itself; deficiency is linked to PCOS and irregular cycles. Supplement if levels are low.`,
    category: "Nutrition",
    coverImageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    author: "Dr. Lisa Tran, RD",
    tags: ["nutrition", "hormones", "PMS", "diet"],
  },
  {
    title: "Managing Anxiety During Your Cycle: What Actually Works",
    summary: "Hormonal fluctuations across your cycle significantly affect anxiety levels. Discover evidence-backed strategies to manage cycle-related anxiety effectively.",
    content: `Up to 80% of women notice changes in anxiety levels across their menstrual cycle. This isn't all in your head — fluctuating oestrogen and progesterone directly influence your brain's stress response system.

## Why Anxiety Peaks Before Your Period
In the late luteal phase (days 21–28), progesterone breaks down into allopregnanolone, a compound that normally calms the nervous system. In some women, the brain becomes hypersensitive to this compound instead, triggering anxiety, irritability, and low mood — the hallmark of Premenstrual Dysphoric Disorder (PMDD).

## Effective Strategies

### Cycle Syncing Your Lifestyle
- **Follicular and ovulation phase**: High-intensity exercise, social commitments, ambitious projects
- **Luteal phase**: Gentle yoga, walking, journaling, setting firmer boundaries with your schedule
- **Menstrual phase**: Rest, warmth, restorative activities

### Breathwork for Immediate Relief
The 4-7-8 technique (inhale 4s, hold 7s, exhale 8s) activates the parasympathetic nervous system within minutes. Practice it daily during your luteal phase.

### Magnesium Glycinate
Research shows 200–400 mg of magnesium glycinate reduces PMS-related anxiety and improves sleep. Take it in the second half of your cycle.

### Limit Caffeine
Caffeine elevates cortisol and worsens anxiety, particularly in the luteal phase when the nervous system is already more reactive. Switch to green tea or half-caf options from day 14 onwards.

### Track to Predict
Logging anxiety levels alongside your cycle helps you predict difficult days and plan accordingly — scheduling lighter workloads and more self-care during vulnerable windows.

When to Seek Help: If anxiety significantly impairs daily life, speak to a GP about PMDD assessment or referral to a therapist specialising in hormonal mood disorders.`,
    category: "Mental Health",
    coverImageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
    author: "Dr. Amara Patel, Psychologist",
    tags: ["anxiety", "mental health", "PMDD", "PMS", "cycle syncing"],
  },
  {
    title: "The Best Exercises for Each Phase of Your Cycle",
    summary: "Matching your workouts to your hormonal phases can improve performance, reduce injury risk, and make exercise feel easier. Here's exactly what to do and when.",
    content: `Your fitness capacity genuinely changes across your cycle. Aligning your training with your hormones isn't just a trend — it's backed by sports science research showing real differences in strength, endurance, and recovery across phases.

## Menstrual Phase (Days 1–5): Rest and Gentle Movement
Oestrogen and progesterone are low, and your body is working hard. Focus on:
- Gentle yoga or stretching
- Short walks in fresh air
- Light swimming
Avoid heavy lifting or high-intensity intervals — your pain tolerance is lower and recovery is slower during menstruation.

## Follicular Phase (Days 6–13): Build Strength
Rising oestrogen improves muscle recovery and pain tolerance. This is your best window for:
- Strength training (progressive overload)
- HIIT sessions
- Rock climbing or challenging new fitness goals
Your muscles adapt better to training in this phase — make the most of it.

## Ovulation Phase (Day 14 ± 2): Peak Power
Peak oestrogen and testosterone equal peak power output. Ideal for:
- Personal best attempts in the gym
- Competitive sport
- High-speed interval runs
Note: Ligament laxity increases slightly around ovulation, so warm up thoroughly to reduce ACL injury risk.

## Luteal Phase (Days 15–28): Moderate and Maintain
Progesterone rises, body temperature is elevated, and endurance may feel harder. Shift to:
- Moderate-intensity cardio (swimming, cycling)
- Pilates or barre
- Yoga with strength components
Keep moving but avoid pushing to maximum effort — recovery takes longer now.

## Practical Tips
- Track your cycle alongside your workouts for 2–3 months to spot your personal patterns
- Adjust calorie intake upward in the luteal phase — your metabolic rate is higher
- Prioritise sleep in both the menstrual and late luteal phases`,
    category: "Fitness",
    coverImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    author: "Coach Priya Sharma",
    tags: ["fitness", "exercise", "cycle syncing", "strength training"],
  },
  {
    title: "PCOS: Symptoms, Diagnosis, and Evidence-Based Management",
    summary: "Polycystic ovary syndrome affects 1 in 10 women. Understanding the condition and the lifestyle interventions that work is key to managing it long-term.",
    content: `Polycystic ovary syndrome (PCOS) is the most common hormonal disorder in women of reproductive age, yet it remains underdiagnosed and misunderstood. Here's what the research actually says.

## What is PCOS?
PCOS is characterised by at least two of three features:
1. Irregular or absent periods
2. Elevated androgens (testosterone) — causing acne, hair loss, excess facial/body hair
3. Polycystic ovaries on ultrasound (multiple small follicles)

PCOS is not just a reproductive condition — it increases long-term risk of type 2 diabetes, cardiovascular disease, and endometrial cancer if left unmanaged.

## Root Cause: Insulin Resistance
In 70–80% of PCOS cases, insulin resistance drives the condition. High insulin stimulates the ovaries to produce more testosterone, which disrupts ovulation. Addressing insulin resistance is the foundation of PCOS management.

## Evidence-Based Lifestyle Interventions

### 1. Low Glycaemic Index Diet
Reducing blood sugar spikes lowers insulin demand. Focus on: vegetables, legumes, whole grains, lean protein, and healthy fats. Limit refined carbohydrates, sugary drinks, and ultra-processed foods.

### 2. Regular Exercise
Both cardio and strength training improve insulin sensitivity. Aim for 150 minutes of moderate exercise per week. High-intensity interval training (HIIT) shows particular benefit for reducing androgen levels.

### 3. Weight Management (if applicable)
Even 5–10% weight loss can restore ovulation in overweight women with PCOS by significantly reducing insulin levels.

### 4. Inositol Supplementation
Myo-inositol (2,000–4,000 mg/day) and D-chiro-inositol improve insulin signalling, reduce testosterone, and can restore ovulation. Strong evidence base, generally well tolerated.

### 5. Stress Management
Chronic stress raises cortisol, which worsens insulin resistance. Prioritise sleep, mindfulness, and adequate downtime.

## When to See a Doctor
If you have irregular periods (more than 35 days apart or fewer than 8 per year), unexplained acne or hair loss, or difficulty conceiving, ask your GP for a PCOS assessment.`,
    category: "Women's Health",
    coverImageUrl: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80",
    author: "Dr. Rebecca Osei, Endocrinologist",
    tags: ["PCOS", "hormones", "insulin resistance", "women's health"],
  },
  {
    title: "Sleep and Your Cycle: Why You Struggle to Sleep Before Your Period",
    summary: "Progesterone and melatonin interact in complex ways that affect sleep quality across your cycle. Learn why and what to do about it.",
    content: `If you find yourself lying awake in the days before your period, you're not imagining it. Sleep architecture genuinely changes across the menstrual cycle, driven by fluctuating hormones.

## The Hormonal–Sleep Connection

**Progesterone** has sedative properties — it's broken down into compounds that bind to GABA receptors (the same receptors targeted by sleep medications). Progesterone peaks in the mid-luteal phase (around day 21), which can make you feel drowsier then.

However, as progesterone plummets in the late luteal phase (days 26–28), this sedative effect disappears suddenly, making sleep more difficult. Body temperature also remains slightly elevated in the luteal phase (by 0.3–0.5°C), which disrupts the cooling effect your body normally uses to trigger sleep.

**Oestrogen** promotes REM sleep and influences serotonin (which converts to melatonin). Low oestrogen in the late luteal and early menstrual phases can fragment sleep and reduce total REM time.

## Why This Matters
Poor sleep worsens PMS symptoms — it increases cortisol, reduces emotional resilience, and intensifies cravings. It's a feedback loop: PMS worsens sleep, poor sleep worsens PMS.

## Evidence-Based Sleep Strategies for Your Cycle

**Throughout your cycle:**
- Maintain consistent sleep and wake times (even weekends)
- Keep your bedroom cool (16–19°C)
- Avoid blue light for 90 minutes before bed

**Luteal phase specifically:**
- Reduce alcohol (disrupts sleep architecture even if it makes you feel drowsy)
- Take magnesium glycinate (200–400 mg) 30–60 minutes before bed
- Gentle yoga or stretching before bed reduces cortisol
- Consider a cooling mattress pad or lighter bedding to compensate for elevated body temperature

**During menstruation:**
- Allow yourself more sleep time — your body is doing significant work
- Heat packs for cramps also help you relax into sleep`,
    category: "Wellness",
    coverImageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80",
    author: "Dr. James Whitfield, Sleep Specialist",
    tags: ["sleep", "progesterone", "PMS", "wellness", "circadian rhythm"],
  },
  {
    title: "Fertility Awareness: How to Identify Your Fertile Window",
    summary: "Fertility awareness methods can be used both to achieve and to avoid pregnancy. Learn to identify ovulation accurately using multiple biological signs.",
    content: `The fertility awareness method (FAM) involves tracking biological signs to identify your fertile window — the days when conception is possible. When used correctly, it can be both a family planning tool and a way to better understand your reproductive health.

## The Science of Fertility
You are fertile for approximately 6 days per cycle: the 5 days before ovulation and the day of ovulation itself (sperm can survive up to 5 days; an egg lives 12–24 hours). Identifying these 6 days requires tracking at least one — ideally three — biological signs.

## The Three Primary Signs

### 1. Basal Body Temperature (BBT)
Your resting body temperature rises by 0.2–0.5°C after ovulation due to progesterone. Take your temperature every morning before getting out of bed, at the same time, using a basal thermometer (accurate to 0.01°C). A sustained rise over 3 days confirms ovulation has occurred.

*Limitation*: BBT confirms ovulation after the fact — it doesn't predict it in advance.

### 2. Cervical Mucus
Your vaginal discharge changes throughout your cycle under oestrogen's influence:
- Post-period: dry or absent
- Approaching ovulation: creamy, white, increasingly wet
- At peak fertility: raw egg white consistency — clear, slippery, and stretchy
- After ovulation: returns to thick/absent

The egg-white phase is your peak fertile days.

### 3. Cervical Position
The cervix rises, softens, and opens slightly around ovulation. This takes practice to identify but adds a third data point for confidence.

## Digital Support
Apps and wearable devices (Tempdrop, Oura Ring) can help track and interpret BBT trends, though they should complement — not replace — your own observations.

## Effectiveness
With perfect use, symptothermal FAM (combining BBT + cervical mucus) is 99.4% effective. With typical use, it's around 76–88%. For pregnancy avoidance, working with a certified FAM educator significantly improves accuracy.`,
    category: "Women's Health",
    coverImageUrl: "https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800&q=80",
    author: "Midwife Emma Clarke",
    tags: ["fertility", "ovulation", "family planning", "BBT", "cervical mucus"],
  },
  {
    title: "Gut Health and Hormones: The Surprising Connection",
    summary: "Your gut microbiome plays a critical role in oestrogen metabolism. Poor gut health can contribute to oestrogen dominance, PMS, and even PCOS.",
    content: `The gut-hormone connection is one of the most exciting areas of women's health research. A specific collection of gut bacteria — the oestrobolome — directly determines how much oestrogen circulates in your body.

## What is the Oestrobolome?
The oestrobolome is the collection of gut bacteria that metabolise oestrogens. After the liver processes oestrogen for elimination, bacteria in the colon determine whether it gets excreted or reabsorbed into the bloodstream.

Bacteria producing an enzyme called beta-glucuronidase can deconjugate (reactivate) oestrogen that was ready for elimination, returning it to circulation. High beta-glucuronidase activity = higher oestrogen levels = potential oestrogen dominance.

## Signs of Oestrogen Dominance
- Heavy, painful periods
- Breast tenderness and bloating
- Mood changes and irritability
- Fibroids or endometriosis

## How to Support Your Oestrobolome

### Eat More Fibre
Fibre binds to oestrogens in the gut and carries them out of the body. Aim for 30+ g/day from vegetables, fruit, legumes, and whole grains. Specifically helpful:
- Flaxseeds (lignans support oestrogen metabolism)
- Cruciferous vegetables (indole-3-carbinol)
- Apples and pears (pectin fibre)

### Reduce Gut Dysbiosis
Dysbiosis (imbalanced gut bacteria) can increase beta-glucuronidase activity. Reduce it by:
- Limiting ultra-processed foods and refined sugar
- Avoiding unnecessary antibiotics
- Managing chronic stress

### Add Fermented Foods
Kefir, kimchi, sauerkraut, and yoghurt with live cultures introduce beneficial bacteria. Research shows fermented food increases microbiome diversity within weeks.

### Consider a Probiotic
Lactobacillus acidophilus and Bifidobacterium species show the most evidence for supporting gut health in women with hormonal imbalances. Look for products with ≥10 billion CFU.

## The Gut-Brain-Hormone Axis
The gut produces 95% of the body's serotonin. Poor gut health can reduce serotonin synthesis, contributing to mood disorders, anxiety, and worsened PMS.`,
    category: "Nutrition",
    coverImageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
    author: "Dr. Kenji Nakamura, Gastroenterologist",
    tags: ["gut health", "microbiome", "oestrogen", "PMS", "nutrition"],
  },
  {
    title: "Mindfulness for Chronic Pain: A Practical Approach",
    summary: "Mindfulness-based interventions show significant efficacy for managing chronic pain conditions including endometriosis and dysmenorrhoea. Here's how to start.",
    content: `Chronic pain changes the brain. Research shows that mindfulness-based stress reduction (MBSR) can physically alter pain-processing regions of the brain, reducing both pain intensity and the emotional suffering that accompanies it.

## How Mindfulness Affects Pain
Pain has two components: the sensory experience (what you feel) and the affective component (how much it bothers you). Mindfulness targets the second component. By training attention without judgment, you can observe pain without catastrophising — which research consistently shows amplifies pain perception.

Studies on dysmenorrhoea (period pain) and endometriosis find that MBSR reduces pain severity scores by 30–40% and significantly improves quality of life.

## Getting Started: A 10-Minute Daily Practice

**Body Scan (5 minutes)**
Lie comfortably. Starting at your feet, slowly move attention up through each body part. When you reach an area of pain, breathe into it — don't try to change it, simply observe its qualities (sharp, dull, throbbing, constant). This interrupts the pain-fear-tension cycle.

**Breath Anchor (5 minutes)**
Focus on the sensation of breathing at your nostrils or belly. When your mind wanders (it will), gently redirect. This builds attentional control, which transfers to pain situations.

## During a Pain Flare
1. Ground yourself with 5-4-3-2-1 (name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste)
2. Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s
3. Place a warm heat pack on the area and consciously relax surrounding muscles

## Apps and Resources
Headspace, Calm, and Insight Timer all have pain-specific programmes. Research supports at least 8 weeks of consistent practice (20+ minutes daily) for measurable neurological change.`,
    category: "Mental Health",
    coverImageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    author: "Dr. Aisha Brennan, Clinical Psychologist",
    tags: ["mindfulness", "chronic pain", "endometriosis", "mental health", "MBSR"],
  },
  {
    title: "Prenatal Nutrition: What to Eat in Each Trimester",
    summary: "Nutritional needs change significantly across pregnancy. This trimester-by-trimester guide covers key nutrients, foods to prioritise, and what to avoid.",
    content: `Pregnancy is the most nutritionally demanding period of a woman's life. The right nutrients at the right time support your baby's development and protect your own long-term health.

## Before and During the First Trimester (Weeks 1–12)

**Folic Acid (400–800 mcg/day)**
Crucial for neural tube development, ideally started 3 months before conception. Found in leafy greens, fortified cereals, and legumes — but supplementation is recommended as dietary sources alone are often insufficient.

**Iron (27 mg/day)**
Blood volume expands by 50% during pregnancy, dramatically increasing iron needs. Lean red meat, dark leafy greens, and lentils are good sources. Pair with vitamin C for better absorption; avoid taking with calcium.

**Managing Morning Sickness**
- Small, frequent meals (empty stomach worsens nausea)
- Cold foods often more tolerable than hot
- Ginger tea or ginger chews have strong evidence for nausea relief
- B6 supplementation (10–25 mg, 3x daily) can help — always check with your doctor

## Second Trimester (Weeks 13–26)

**Calcium (1,000 mg/day)**
Your baby's bones mineralise rapidly. Dairy, fortified plant milks, tofu, and broccoli are excellent sources. If dairy-free, a supplement is often necessary.

**Omega-3 (DHA, 200–300 mg/day)**
Critical for brain and retinal development. Fatty fish (salmon, sardines) 2x/week or an algae-based DHA supplement if fish-free.

**Energy Needs**
Only ~350 extra calories/day — not "eating for two." Focus on nutrient density over quantity.

## Third Trimester (Weeks 27–40)

**Vitamin K2**
Supports fetal bone development and helps with clotting at birth. Found in natto (fermented soy), aged cheeses, egg yolks.

**Magnesium**
Reduces leg cramps, supports sleep, and may lower risk of preterm labour. Aim for 350–400 mg from food and/or supplements.

**Prepare for Labour**
Research supports dates (6/day from week 36) for cervical ripening and reduced need for labour induction.

## Foods to Avoid Throughout Pregnancy
- Raw or undercooked meat, eggs, and fish (listeria and salmonella risk)
- High-mercury fish (shark, swordfish, king mackerel)
- Unpasteurised dairy and soft cheeses
- Alcohol (no safe amount established)
- Excess caffeine (limit to <200 mg/day — roughly one small coffee)`,
    category: "Pregnancy",
    coverImageUrl: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=80",
    author: "Dr. Fatima Al-Rashid, Obstetrician",
    tags: ["pregnancy", "prenatal nutrition", "trimester", "folic acid", "iron"],
  },
  {
    title: "Stress and Your Hormones: How Cortisol Disrupts Everything",
    summary: "Chronic stress raises cortisol, which suppresses sex hormones, disrupts your cycle, impacts thyroid function, and drives weight gain. Here's how to break the cycle.",
    content: `Stress is the most underestimated hormonal disruptor. When your body perceives stress — whether from overwork, poor sleep, relationship conflict, or even intense exercise — it prioritises survival hormones over reproductive ones. Over time, this chronic prioritisation creates a cascade of hormonal dysfunction.

## The HPA Axis and Cortisol
The hypothalamic-pituitary-adrenal (HPA) axis is your body's stress response system. In acute danger, it's lifesaving — cortisol mobilises energy, sharpens focus, and suppresses non-essential functions (including digestion and reproduction).

The problem is that the brain cannot distinguish between a predator and a difficult email. Chronic psychosocial stress keeps cortisol chronically elevated.

## What High Cortisol Does to Your Hormones

**Suppresses Oestrogen and Progesterone**
The body "steals" pregnenolone (a precursor hormone) to make cortisol instead of sex hormones. This is called the "pregnenolone steal" and can cause irregular cycles, anovulation, and low libido.

**Disrupts Thyroid Function**
Cortisol inhibits the conversion of inactive T4 to active T3 thyroid hormone, causing symptoms of hypothyroidism (fatigue, cold intolerance, weight gain, brain fog) even when thyroid labs appear normal.

**Drives Insulin Resistance**
Cortisol raises blood sugar to fuel the stress response. Chronically elevated cortisol keeps blood sugar high, promoting fat storage (especially abdominal) and increasing risk of PCOS and metabolic syndrome.

**Suppresses Melatonin**
Cortisol and melatonin have an inverse relationship. High evening cortisol delays sleep onset and reduces restorative deep sleep.

## Evidence-Based Stress Reduction

### Adaptogens
Ashwagandha (300–600 mg/day) has the strongest evidence for reducing cortisol levels and improving stress resilience in women. Rhodiola rosea improves stress response without sedation.

### Cold Water Therapy
30–90 seconds of cold water at the end of a shower reduces inflammation and trains the HPA axis to respond proportionately to stressors. Start gradually.

### Prioritise Rest, Not Just Sleep
Active recovery — reading fiction, gentle walks in nature, social connection — reduces allostatic load in ways that exercise cannot.

### Reframe Perfectionism
Perfectionism chronically activates the stress response. Cognitive behavioural therapy (CBT) has strong evidence for reducing perfectionism and the associated cortisol burden.`,
    category: "Wellness",
    coverImageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&q=80",
    author: "Dr. Maya Goldstein, Integrative Medicine",
    tags: ["cortisol", "stress", "hormones", "HPA axis", "thyroid", "wellness"],
  },
  {
    title: "Endometriosis: Recognising Symptoms and Finding Support",
    summary: "Endometriosis affects 1 in 10 women but takes an average of 7–10 years to diagnose. Learn the symptoms, why diagnosis is delayed, and how to advocate for yourself.",
    content: `Endometriosis is a chronic inflammatory condition where tissue similar to the uterine lining grows outside the uterus — on the ovaries, fallopian tubes, bowel, or bladder. It affects approximately 190 million women worldwide, yet remains one of the most underdiagnosed conditions in medicine.

## Common Symptoms
- **Painful periods (dysmenorrhoea)**: Pain that is disproportionate to what most women experience — often described as "labour-like" and not adequately controlled by standard painkillers
- **Chronic pelvic pain**: Persistent pain between periods, not just during menstruation
- **Pain during or after sex (dyspareunia)**
- **Pain with bowel movements or urination**, particularly during menstruation
- **Heavy bleeding**: Flooding, large clots, or periods lasting more than 7 days
- **Fatigue**: Often severe and disproportionate to activity level
- **Bloating**: Sometimes called "endo belly" — severe abdominal distension, particularly before menstruation
- **Difficulty conceiving**: Endometriosis is responsible for 30–50% of female infertility

## Why Diagnosis Takes So Long
The average diagnostic delay is 7–10 years. Factors include:
- Normalisation of period pain ("it's supposed to hurt")
- Symptoms overlapping with IBS, pelvic inflammatory disease, and other conditions
- The only definitive diagnosis is laparoscopy (surgical), which many clinicians defer

## How to Advocate for Yourself
1. Track your symptoms in detail — severity, timing, triggers (use a period tracking app)
2. Use pain scales when talking to doctors (1–10, not "quite bad")
3. Specifically ask for a referral to a gynaecologist with endometriosis expertise
4. Consider seeking a second opinion if dismissed

## Management Options
There is currently no cure, but symptoms can be effectively managed:
- **Hormonal therapy**: Combined pill, progesterone-only pill, Mirena IUD, or GnRH agonists reduce lesion stimulation
- **Excision surgery**: Performed by an endometriosis specialist, this removes lesions at the root (more effective than ablation)
- **Anti-inflammatory diet**: Reducing inflammatory triggers (processed food, red meat, alcohol) can reduce symptom severity
- **Physical therapy**: Pelvic floor physiotherapy addresses secondary muscle dysfunction and pain

You deserve to have your pain taken seriously.`,
    category: "Women's Health",
    coverImageUrl: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80",
    author: "Dr. Siobhan McCarthy, Gynaecologist",
    tags: ["endometriosis", "pelvic pain", "women's health", "dysmenorrhoea", "fertility"],
  },
];

async function seed() {
  console.log("Checking articles container...");
  const { resources: existing } = await articlesContainer.items
    .query("SELECT VALUE COUNT(1) FROM c")
    .fetchAll();

  const count = existing[0] as number;
  if (count > 0) {
    console.log(`Container already has ${count} articles. Skipping seed.`);
    return;
  }

  console.log(`Seeding ${ARTICLES.length} articles...`);
  for (const article of ARTICLES) {
    const doc = {
      id: uuidv4(),
      ...article,
      flagged: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    };
    await articlesContainer.items.create(doc);
    console.log(`  ✓ ${article.title}`);
  }
  console.log("Seed complete.");
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
