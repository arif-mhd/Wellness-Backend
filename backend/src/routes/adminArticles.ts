import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { articlesContainer } from "../config/cosmos";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(requireRole("admin"));

// ─── GET /api/admin/articles ─────────────────────────────────────────────────
// Returns all articles, sorted by createdAt desc.
// Optional query: ?category=wellness&flagged=true
router.get("/", async (req: SessionRequest, res: Response) => {
  try {
    const { category, flagged } = req.query;
    let query = "SELECT * FROM c";
    const params: { name: string; value: any }[] = [];
    const filters: string[] = [];

    if (category) {
      filters.push("c.category = @category");
      params.push({ name: "@category", value: category });
    }
    if (flagged !== undefined) {
      filters.push("c.flagged = @flagged");
      params.push({ name: "@flagged", value: flagged === "true" });
    }
    if (filters.length) query += " WHERE " + filters.join(" AND ");
    query += " ORDER BY c.createdAt DESC";

    const { resources } = await articlesContainer.items.query({ query, parameters: params }).fetchAll();
    res.json({ articles: resources });
  } catch (err) {
    console.error("[articles] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/articles/:id ────────────────────────────────────────────
router.get("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource } = await articlesContainer.item(id, id).read();
    if (!resource) { res.status(404).json({ error: "Article not found" }); return; }
    res.json({ article: resource });
  } catch (err: any) {
    if (err.code === 404) { res.status(404).json({ error: "Article not found" }); return; }
    console.error("[articles] get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/articles ────────────────────────────────────────────────
// Body: { title, summary, content, category, coverImageUrl?, tags?, author? }
router.post("/", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const { title, summary, content, category, coverImageUrl, tags, author } = req.body;

    if (!title?.trim() || !content?.trim() || !category?.trim()) {
      res.status(400).json({ error: "title, content, and category are required" });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const article = {
      id,
      title: title.trim(),
      summary: summary?.trim() ?? "",
      content: content.trim(),
      category: category.trim(),
      coverImageUrl: coverImageUrl?.trim() ?? null,
      tags: Array.isArray(tags) ? tags : [],
      author: author?.trim() ?? "Admin",
      flagged: false,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    };

    await articlesContainer.items.create(article);
    res.status(201).json({ article });
  } catch (err) {
    console.error("[articles] create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/admin/articles/:id ────────────────────────────────────────────
// Full update — replaces editable fields.
router.put("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource: existing } = await articlesContainer.item(id, id).read();
    if (!existing) { res.status(404).json({ error: "Article not found" }); return; }

    const { title, summary, content, category, coverImageUrl, tags, author } = req.body;
    if (!title?.trim() || !content?.trim() || !category?.trim()) {
      res.status(400).json({ error: "title, content, and category are required" });
      return;
    }

    const updated = {
      ...existing,
      title: title.trim(),
      summary: summary?.trim() ?? existing.summary,
      content: content.trim(),
      category: category.trim(),
      coverImageUrl: coverImageUrl?.trim() ?? existing.coverImageUrl,
      tags: Array.isArray(tags) ? tags : existing.tags,
      author: author?.trim() ?? existing.author,
      updatedAt: new Date().toISOString(),
    };

    await articlesContainer.items.upsert(updated);
    res.json({ article: updated });
  } catch (err: any) {
    if (err.code === 404) { res.status(404).json({ error: "Article not found" }); return; }
    console.error("[articles] update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/articles/:id/flag ──────────────────────────────────────
// Toggle or explicitly set flagged status. Body: { flagged: boolean }
router.patch("/:id/flag", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resource: existing } = await articlesContainer.item(id, id).read();
    if (!existing) { res.status(404).json({ error: "Article not found" }); return; }

    const flagged = req.body.flagged !== undefined ? Boolean(req.body.flagged) : !existing.flagged;
    const updated = { ...existing, flagged, updatedAt: new Date().toISOString() };
    await articlesContainer.items.upsert(updated);
    res.json({ article: updated });
  } catch (err: any) {
    if (err.code === 404) { res.status(404).json({ error: "Article not found" }); return; }
    console.error("[articles] flag error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/articles/seed ──────────────────────────────────────────
// Inserts seed articles only if the container is empty.
router.post("/seed", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources: countResult } = await articlesContainer.items
      .query("SELECT VALUE COUNT(1) FROM c")
      .fetchAll();
    const count = countResult[0] as number;
    if (count > 0) {
      res.json({ status: "skipped", message: `Container already has ${count} articles.` });
      return;
    }

    const now = new Date().toISOString();
    const SEED_ARTICLES = [
      {
        title: "Understanding Your Menstrual Cycle: A Complete Guide",
        summary: "Learn about the four phases of your menstrual cycle and how each phase affects your body, mood, and energy levels.",
        content: `Your menstrual cycle is a monthly hormonal rhythm that influences far more than just your period.\n\n## The Four Phases\n\n**1. Menstrual Phase (Days 1–5)**: When your period occurs. Oestrogen and progesterone are at their lowest, causing the uterine lining to shed. Rest and iron-rich foods are particularly helpful.\n\n**2. Follicular Phase (Days 6–14)**: Follicle-stimulating hormone (FSH) triggers follicles to mature. Oestrogen rises steadily, making you feel more energetic. Great time for new projects and high-intensity workouts.\n\n**3. Ovulation Phase (Day 14)**: A surge in LH triggers egg release. You may notice egg-white cervical mucus and heightened libido. Your most fertile window.\n\n**4. Luteal Phase (Days 15–28)**: Progesterone dominates. PMS symptoms like mood changes and bloating are common in the final days.\n\n## Tracking Tips\n- Note your cycle length monthly\n- Track basal body temperature for ovulation confirmation\n- Log symptoms to identify patterns across phases`,
        category: "Women's Health",
        coverImageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
        author: "Dr. Sarah Mitchell",
        tags: ["menstrual cycle", "hormones", "women's health", "fertility"],
      },
      {
        title: "5 Evidence-Based Nutrition Tips for Hormonal Balance",
        summary: "What you eat directly impacts your hormone levels. These science-backed dietary strategies can help regulate your cycle and reduce PMS symptoms.",
        content: `Hormones depend on specific nutrients to be produced and metabolised. Eating for hormonal balance is about giving your body the right building blocks.\n\n## 1. Prioritise Healthy Fats\nYour body makes hormones from cholesterol. Include avocado, olive oil, fatty fish, and nuts daily. Avoid trans fats which disrupt hormone receptor function.\n\n## 2. Eat Enough Protein at Every Meal\nProtein stabilises blood sugar and provides amino acids for neurotransmitter production. Aim for 25–30 g per meal.\n\n## 3. Load Up on Cruciferous Vegetables\nBroccoli, cauliflower, and kale contain indole-3-carbinol, which helps the liver clear excess oestrogen.\n\n## 4. Reduce Refined Sugar and Alcohol\nBoth spike insulin and cortisol, which throws other hormones out of balance.\n\n## 5. Don't Fear Carbohydrates\nChoose complex carbs — sweet potato, oats, brown rice — which provide steady energy and support serotonin.\n\n## Key Micronutrients\n- **Magnesium**: Reduces cramps and improves sleep\n- **Zinc**: Supports progesterone production\n- **B6**: Helps metabolise oestrogen\n- **Vitamin D**: Acts as a hormone itself`,
        category: "Nutrition",
        coverImageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
        author: "Dr. Lisa Tran, RD",
        tags: ["nutrition", "hormones", "PMS", "diet"],
      },
      {
        title: "Managing Anxiety During Your Cycle: What Actually Works",
        summary: "Hormonal fluctuations across your cycle significantly affect anxiety levels. Discover evidence-backed strategies to manage cycle-related anxiety effectively.",
        content: `Up to 80% of women notice changes in anxiety levels across their menstrual cycle. Fluctuating oestrogen and progesterone directly influence your brain's stress response system.\n\n## Why Anxiety Peaks Before Your Period\nIn the late luteal phase, progesterone breaks down into allopregnanolone. In some women, the brain becomes hypersensitive to this compound, triggering anxiety and irritability — the hallmark of PMDD.\n\n## Effective Strategies\n\n### Cycle Syncing Your Lifestyle\n- **Follicular**: High-intensity exercise, social commitments\n- **Luteal**: Gentle yoga, walking, journaling\n- **Menstrual**: Rest, warmth, restorative activities\n\n### Breathwork\nThe 4-7-8 technique activates the parasympathetic nervous system within minutes.\n\n### Magnesium Glycinate\n200–400 mg reduces PMS-related anxiety and improves sleep. Take in the second half of your cycle.\n\n### Limit Caffeine\nCaffeine elevates cortisol and worsens anxiety, particularly in the luteal phase.`,
        category: "Mental Health",
        coverImageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
        author: "Dr. Amara Patel, Psychologist",
        tags: ["anxiety", "mental health", "PMDD", "PMS", "cycle syncing"],
      },
      {
        title: "The Best Exercises for Each Phase of Your Cycle",
        summary: "Matching your workouts to your hormonal phases can improve performance, reduce injury risk, and make exercise feel easier.",
        content: `Your fitness capacity genuinely changes across your cycle. Aligning your training with your hormones is backed by sports science research.\n\n## Menstrual Phase (Days 1–5): Gentle Movement\nFocus on yoga, stretching, light swimming. Avoid heavy lifting — pain tolerance is lower.\n\n## Follicular Phase (Days 6–13): Build Strength\nRising oestrogen improves muscle recovery. Best window for strength training and HIIT.\n\n## Ovulation Phase (Day 14): Peak Power\nPeak oestrogen and testosterone equal peak power output. Ideal for personal bests and competitive sport. Note: Ligament laxity increases slightly, so warm up thoroughly.\n\n## Luteal Phase (Days 15–28): Moderate and Maintain\nShift to moderate-intensity cardio, Pilates, or yoga. Recovery takes longer now.\n\n## Practical Tips\n- Track your cycle alongside workouts for 2–3 months\n- Adjust calorie intake upward in the luteal phase — metabolic rate is higher\n- Prioritise sleep in the menstrual and late luteal phases`,
        category: "Fitness",
        coverImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
        author: "Coach Priya Sharma",
        tags: ["fitness", "exercise", "cycle syncing", "strength training"],
      },
      {
        title: "PCOS: Symptoms, Diagnosis, and Evidence-Based Management",
        summary: "Polycystic ovary syndrome affects 1 in 10 women. Understanding the condition and lifestyle interventions that work is key to managing it long-term.",
        content: `PCOS is characterised by at least two of three features: irregular periods, elevated androgens, and polycystic ovaries on ultrasound.\n\n## Root Cause: Insulin Resistance\nIn 70–80% of PCOS cases, insulin resistance drives the condition. High insulin stimulates the ovaries to produce more testosterone, disrupting ovulation.\n\n## Evidence-Based Lifestyle Interventions\n\n### Low Glycaemic Index Diet\nReducing blood sugar spikes lowers insulin demand. Focus on vegetables, legumes, whole grains, lean protein, and healthy fats.\n\n### Regular Exercise\nBoth cardio and strength training improve insulin sensitivity. HIIT shows particular benefit for reducing androgen levels.\n\n### Inositol Supplementation\nMyo-inositol (2,000–4,000 mg/day) improves insulin signalling, reduces testosterone, and can restore ovulation.\n\n### Stress Management\nChronic stress raises cortisol, which worsens insulin resistance. Prioritise sleep and mindfulness.\n\n## When to See a Doctor\nIf you have irregular periods, unexplained acne or hair loss, or difficulty conceiving, ask your GP for a PCOS assessment.`,
        category: "Women's Health",
        coverImageUrl: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80",
        author: "Dr. Rebecca Osei, Endocrinologist",
        tags: ["PCOS", "hormones", "insulin resistance", "women's health"],
      },
      {
        title: "Sleep and Your Cycle: Why You Struggle to Sleep Before Your Period",
        summary: "Progesterone and melatonin interact in complex ways that affect sleep quality across your cycle.",
        content: `If you find yourself lying awake before your period, you're not imagining it. Sleep architecture genuinely changes across the menstrual cycle.\n\n## The Hormonal–Sleep Connection\n**Progesterone** has sedative properties, but as it plummets in the late luteal phase, this sedative effect disappears suddenly, making sleep more difficult. Body temperature also remains slightly elevated (0.3–0.5°C), disrupting the cooling effect that triggers sleep.\n\n**Oestrogen** promotes REM sleep. Low oestrogen in the late luteal phase can fragment sleep and reduce total REM time.\n\n## Evidence-Based Sleep Strategies\n\n**Throughout your cycle:**\n- Maintain consistent sleep and wake times\n- Keep your bedroom cool (16–19°C)\n- Avoid blue light for 90 minutes before bed\n\n**Luteal phase specifically:**\n- Reduce alcohol (disrupts sleep architecture)\n- Take magnesium glycinate 30–60 minutes before bed\n- Consider a cooling mattress pad to compensate for elevated body temperature`,
        category: "Wellness",
        coverImageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80",
        author: "Dr. James Whitfield, Sleep Specialist",
        tags: ["sleep", "progesterone", "PMS", "wellness"],
      },
      {
        title: "Gut Health and Hormones: The Surprising Connection",
        summary: "Your gut microbiome plays a critical role in oestrogen metabolism. Poor gut health can contribute to oestrogen dominance, PMS, and PCOS.",
        content: `The gut-hormone connection is one of the most exciting areas of women's health research. The oestrobolome — a collection of gut bacteria — directly determines how much oestrogen circulates in your body.\n\n## What is the Oestrobolome?\nBacteria producing beta-glucuronidase can reactivate oestrogen that was ready for elimination, returning it to circulation. High activity = potential oestrogen dominance.\n\n## Signs of Oestrogen Dominance\n- Heavy, painful periods\n- Breast tenderness and bloating\n- Mood changes and irritability\n- Fibroids or endometriosis\n\n## How to Support Your Oestrobolome\n\n### Eat More Fibre\nAim for 30+ g/day from vegetables, fruit, legumes, and whole grains. Flaxseeds and cruciferous vegetables are especially helpful.\n\n### Add Fermented Foods\nKefir, kimchi, sauerkraut, and yoghurt with live cultures increase beneficial bacteria.\n\n### Consider a Probiotic\nLactobacillus acidophilus and Bifidobacterium species show the most evidence for supporting gut health in women with hormonal imbalances.`,
        category: "Nutrition",
        coverImageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
        author: "Dr. Kenji Nakamura, Gastroenterologist",
        tags: ["gut health", "microbiome", "oestrogen", "PMS"],
      },
      {
        title: "Prenatal Nutrition: What to Eat in Each Trimester",
        summary: "Nutritional needs change significantly across pregnancy. A trimester-by-trimester guide covering key nutrients and what to avoid.",
        content: `Pregnancy is the most nutritionally demanding period of a woman's life.\n\n## First Trimester (Weeks 1–12)\n**Folic Acid (400–800 mcg/day)**: Crucial for neural tube development, ideally started 3 months before conception.\n\n**Iron (27 mg/day)**: Blood volume expands by 50% during pregnancy. Lean red meat, dark leafy greens, and lentils are good sources.\n\n**Managing Morning Sickness**: Small frequent meals, cold foods, ginger tea, and B6 supplementation can help.\n\n## Second Trimester (Weeks 13–26)\n**Calcium (1,000 mg/day)**: Baby's bones mineralise rapidly. Dairy, fortified plant milks, tofu, and broccoli are excellent sources.\n\n**Omega-3 (DHA, 200–300 mg/day)**: Critical for brain and retinal development.\n\n## Third Trimester (Weeks 27–40)\n**Magnesium**: Reduces leg cramps and supports sleep. **Vitamin K2**: Supports fetal bone development.\n\n## Foods to Avoid\n- Raw or undercooked meat, eggs, and fish\n- High-mercury fish\n- Unpasteurised dairy\n- Alcohol\n- Excess caffeine (limit to <200 mg/day)`,
        category: "Pregnancy",
        coverImageUrl: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=80",
        author: "Dr. Fatima Al-Rashid, Obstetrician",
        tags: ["pregnancy", "prenatal nutrition", "trimester", "folic acid"],
      },
      {
        title: "Stress and Your Hormones: How Cortisol Disrupts Everything",
        summary: "Chronic stress raises cortisol, which suppresses sex hormones, disrupts your cycle, impacts thyroid function, and drives weight gain.",
        content: `Stress is the most underestimated hormonal disruptor. When your body perceives stress, it prioritises survival hormones over reproductive ones.\n\n## What High Cortisol Does to Your Hormones\n\n**Suppresses Oestrogen and Progesterone**: The body "steals" pregnenolone to make cortisol instead of sex hormones, causing irregular cycles and low libido.\n\n**Disrupts Thyroid Function**: Cortisol inhibits conversion of T4 to active T3, causing fatigue, cold intolerance, and weight gain.\n\n**Drives Insulin Resistance**: Chronically elevated cortisol promotes fat storage and increases risk of PCOS.\n\n**Suppresses Melatonin**: High evening cortisol delays sleep onset and reduces restorative deep sleep.\n\n## Evidence-Based Stress Reduction\n\n### Adaptogens\nAshwagandha (300–600 mg/day) has the strongest evidence for reducing cortisol levels in women.\n\n### Cold Water Therapy\n30–90 seconds of cold water at the end of a shower trains the HPA axis to respond proportionately.\n\n### Reframe Perfectionism\nPerfectionism chronically activates the stress response. CBT has strong evidence for reducing perfectionism and associated cortisol burden.`,
        category: "Wellness",
        coverImageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&q=80",
        author: "Dr. Maya Goldstein, Integrative Medicine",
        tags: ["cortisol", "stress", "hormones", "thyroid", "wellness"],
      },
      {
        title: "Endometriosis: Recognising Symptoms and Finding Support",
        summary: "Endometriosis affects 1 in 10 women but takes an average of 7–10 years to diagnose. Learn to recognise symptoms and advocate for yourself.",
        content: `Endometriosis affects approximately 190 million women worldwide, yet remains one of the most underdiagnosed conditions in medicine.\n\n## Common Symptoms\n- Painful periods that are disproportionate and not controlled by standard painkillers\n- Chronic pelvic pain between periods\n- Pain during or after sex\n- Pain with bowel movements or urination during menstruation\n- Heavy bleeding with large clots\n- Severe fatigue disproportionate to activity level\n- "Endo belly" — severe abdominal distension before menstruation\n- Difficulty conceiving\n\n## Why Diagnosis Takes So Long\nThe average diagnostic delay is 7–10 years due to normalisation of period pain and overlapping symptoms with other conditions.\n\n## How to Advocate for Yourself\n1. Track symptoms in detail with timing and severity\n2. Use pain scales when talking to doctors\n3. Ask for referral to a gynaecologist with endometriosis expertise\n\n## Management Options\n- Hormonal therapy (combined pill, Mirena IUD, GnRH agonists)\n- Excision surgery by an endometriosis specialist\n- Anti-inflammatory diet\n- Pelvic floor physiotherapy`,
        category: "Women's Health",
        coverImageUrl: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80",
        author: "Dr. Siobhan McCarthy, Gynaecologist",
        tags: ["endometriosis", "pelvic pain", "women's health", "dysmenorrhoea"],
      },
      {
        title: "Iron Deficiency and Women's Health: Are You at Risk?",
        summary: "Iron deficiency is the most common nutritional deficiency worldwide and disproportionately affects women. Learn the signs and how to address it.",
        content: `Iron deficiency affects approximately 30% of women of reproductive age and is the world's most common nutritional deficiency. Yet it often goes undiagnosed because symptoms are attributed to stress or busy lifestyles.\n\n## Why Women Are at Higher Risk\n- Monthly blood loss through menstruation (especially heavy periods)\n- Increased demands during pregnancy and breastfeeding\n- Dietary choices (vegetarian/vegan diets contain non-haem iron, which is less bioavailable)\n\n## Symptoms of Iron Deficiency\n- Persistent fatigue and weakness\n- Pale skin, pale inside lower eyelids\n- Shortness of breath with normal activities\n- Heart palpitations\n- Cold hands and feet\n- Brain fog and difficulty concentrating\n- Brittle nails and hair loss\n- Restless legs syndrome\n- Cravings for non-food items (pica) — ice, dirt, starch\n\n## Getting Diagnosed\nAsk your GP for a ferritin test (stores iron) alongside a full blood count. Ferritin <30 mcg/L indicates depletion; <12 mcg/L indicates deficiency, even if haemoglobin is normal.\n\n## Treatment\n**Dietary sources**: Red meat, organ meats (liver, kidney), dark leafy greens, legumes, fortified cereals, pumpkin seeds.\n\n**Absorption tips**: Pair iron-rich foods with vitamin C (bell peppers, citrus, kiwi). Avoid tea, coffee, and calcium supplements within 1 hour of iron-rich meals — they inhibit absorption.\n\n**Supplementation**: If ferritin is low, supplementation is often necessary. Ferrous bisglycinate (gentle iron) is better tolerated than ferrous sulphate for most people. Take with vitamin C, away from meals.`,
        category: "General",
        coverImageUrl: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&q=80",
        author: "Dr. Ngozi Adeyemi, Haematologist",
        tags: ["iron deficiency", "anaemia", "fatigue", "women's health", "nutrition"],
      },
      {
        title: "Understanding Vaginal Health: What's Normal and What's Not",
        summary: "Vaginal health is an important but often overlooked aspect of women's wellness. Learn what normal discharge looks like, signs of infection, and how to maintain pH balance.",
        content: `The vagina is a self-cleaning organ with a carefully balanced ecosystem. Understanding what's normal helps you recognise when something needs attention.\n\n## Normal Vaginal Discharge\nDischarge changes throughout your cycle:\n- **Post-period**: Dry or minimal\n- **Follicular phase**: White, cloudy, or sticky\n- **Approaching ovulation**: Increasingly wet, becoming clear and stretchy (egg white consistency)\n- **Post-ovulation**: Returns to thicker, creamier consistency\n\nNormal discharge is odourless or has a mild, slightly acidic smell. It may be white, clear, or pale yellow.\n\n## Signs Something Is Off\n\n**Bacterial Vaginosis (BV)**\n- Thin, grey or white discharge\n- Strong fishy odour, particularly after sex\n- Mild itching or burning\n- *Most common vaginal condition; caused by overgrowth of naturally occurring bacteria*\n\n**Yeast Infection**\n- Thick, white, cottage cheese-like discharge\n- Intense itching and irritation\n- Redness and swelling\n\n**Trichomoniasis** (STI)\n- Yellow-green, frothy discharge\n- Foul odour\n- Itching and burning during urination\n\n## Supporting Vaginal Health\n- **Avoid douching**: Disrupts the natural pH (3.8–4.5) and beneficial Lactobacillus bacteria\n- **Wear breathable underwear**: Cotton allows airflow and reduces moisture\n- **Probiotics**: Lactobacillus rhamnosus and reuteri strains support vaginal microbiome health\n- **Stay hydrated**: Supports natural lubrication\n- **Avoid scented products**: In and around the vagina\n\n## When to See a Doctor\nAny change in colour, smell, consistency, or the presence of itching, burning, or pelvic pain warrants evaluation.`,
        category: "Women's Health",
        coverImageUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
        author: "Dr. Chloé Beaumont, Gynaecologist",
        tags: ["vaginal health", "discharge", "BV", "yeast infection", "women's health"],
      },
      // ── Additional seed articles ──────────────────────────────────────────
      {
        title: "Hydration and Your Cycle: How Much Water Do You Actually Need?",
        summary: "Your fluid needs fluctuate across your menstrual cycle. Learn when dehydration hits hardest, why it worsens PMS, and simple strategies to stay on top of it.",
        content: `Water is involved in every hormonal process in your body — from transporting oestrogen through the bloodstream to flushing prostaglandins (the compounds that cause cramps) out of your uterus. Yet most women don't adjust their hydration based on where they are in their cycle.\n\n## How Your Cycle Affects Hydration Needs\n\n**Follicular phase**: Oestrogen helps your body retain fluid more efficiently. Hydration is relatively straightforward — standard recommendations of 2–2.5 L/day apply.\n\n**Ovulation**: Cervical mucus production peaks. Adequate hydration directly supports the production of the egg-white mucus that is your most fertile sign. Dehydration makes mucus thicker and harder to identify.\n\n**Luteal phase**: Progesterone has a mild diuretic effect, meaning you lose more fluid through breathing and sweating. Your plasma volume also changes, which can cause bloating paradoxically even as you lose fluid. You need 300–500 mL more per day than usual.\n\n**Menstruation**: Blood loss, sweating, and prostaglandin activity all increase fluid requirements. Staying well hydrated reduces cramping intensity by helping the uterus contract and relax more efficiently.\n\n## Signs You Are Under-Hydrated\n- Urine darker than pale straw yellow\n- Headaches (especially in the luteal phase)\n- Increased cramp severity\n- Brain fog and difficulty concentrating\n- Bloating that worsens in the afternoon\n\n## Practical Tips\n- **Add electrolytes in the luteal phase**: A pinch of sea salt, a slice of lemon, and a small amount of coconut water in your water bottle helps retain fluid and reduce bloating.\n- **Warm water and herbal teas during menstruation**: Warmth reduces uterine spasm. Ginger, chamomile, and raspberry leaf teas are all anti-inflammatory and count towards fluid intake.\n- **Track intake with your cycle app**: If you notice headaches or worsened PMS, check whether low fluid intake correlates.\n- **Limit diuretics**: Coffee and alcohol increase urinary losses. Offset each coffee with an extra glass of water.`,
        category: "Wellness",
        coverImageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
        author: "Dr. Priya Nair, Nutritionist",
        tags: ["hydration", "water", "PMS", "cycle", "wellness"],
      },
      {
        title: "Perimenopause: What to Expect and How to Navigate It",
        summary: "Perimenopause can start up to 10 years before your last period. Understanding the signs early gives you the best tools to manage the transition with confidence.",
        content: `Perimenopause — the transitional phase leading up to menopause — is one of the least discussed yet most impactful hormonal shifts a woman will experience. It typically begins in the mid-40s, though for some women it starts as early as 35.\n\n## What Is Perimenopause?\nPerimenopause is defined by fluctuating and eventually declining oestrogen and progesterone levels as the ovaries wind down egg production. It ends 12 months after your last period (at which point you are in menopause).\n\n## Early Signs (Often Missed)\n- Cycle length changes: shorter cycles (< 26 days) or increasing irregularity\n- Changes in flow: heavier or lighter than usual\n- New or worsening PMS\n- Sleep disturbances, particularly waking between 2–4 am\n- Increased anxiety or mood instability\n- Brain fog and memory lapses\n- Reduced libido\n\n## Later Signs\n- Hot flashes and night sweats (vasomotor symptoms)\n- Vaginal dryness and discomfort\n- Urinary urgency or frequency\n- Joint pain and stiffness\n- Thinning hair and skin changes\n\n## Evidence-Based Management\n\n**Hormone Replacement Therapy (HRT)**\nFor most women under 60 or within 10 years of menopause, the benefits of HRT outweigh the risks. Modern body-identical HRT (oestradiol patches/gel + micronised progesterone) significantly reduces vasomotor symptoms, protects bone density, and improves mood and sleep. Discuss with a menopause-specialist GP.\n\n**Lifestyle Foundations**\n- **Strength training**: Counteracts muscle and bone loss accelerated by falling oestrogen\n- **Protein intake**: Increase to 1.2–1.6 g/kg body weight to preserve muscle mass\n- **Phytoestrogens**: Soy isoflavones (in edamame, tofu, tempeh) have weak oestrogenic activity and may reduce hot flash frequency\n- **Limit alcohol and caffeine**: Both worsen hot flashes and disrupt sleep\n\n**Sleep Prioritisation**\nCool bedroom (16–18°C), moisture-wicking bedding, and consistent sleep times help manage night sweats. Cognitive behavioural therapy for insomnia (CBT-I) has strong evidence for perimenopausal sleep disruption.`,
        category: "Women's Health",
        coverImageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80",
        author: "Dr. Helen Foster, Menopause Specialist",
        tags: ["perimenopause", "menopause", "hormones", "HRT", "women's health"],
      },
      {
        title: "The Anti-Inflammatory Diet: Reducing Pain Naturally",
        summary: "Chronic inflammation drives period pain, endometriosis, and PCOS. An anti-inflammatory diet can significantly reduce symptoms — here is exactly what to eat and avoid.",
        content: `Inflammation is a normal immune response, but when it becomes chronic, it amplifies pain signals, disrupts hormones, and worsens conditions like endometriosis, PCOS, and primary dysmenorrhoea. Diet is one of the most powerful levers available to reduce inflammatory load.\n\n## The Inflammation–Pain Connection\nProstaglandins — hormone-like lipids responsible for uterine contractions and cramp pain — are synthesised from omega-6 fatty acids. A diet high in omega-6 and low in omega-3 tips the prostaglandin balance toward more inflammatory, pain-amplifying types (PGE2 and PGF2α).\n\n## Foods to Prioritise\n\n**Omega-3 rich foods**\n- Fatty fish: salmon, sardines, mackerel, anchovies (aim for 2–3 servings/week)\n- Walnuts, flaxseeds, chia seeds\n- Algae-based DHA/EPA supplements (for plant-based diets)\n\n**Polyphenol-rich foods**\n- Berries (blueberries, raspberries, cherries) — contain anthocyanins with potent anti-inflammatory activity\n- Dark chocolate ≥ 70% cacao — flavonoids reduce prostaglandin synthesis\n- Turmeric + black pepper — curcumin inhibits NF-κB inflammatory pathways; black pepper increases absorption 2,000%\n\n**Fibre and prebiotic foods**\n- Garlic, onions, leeks, asparagus, Jerusalem artichoke\n- Support gut health and oestrogen metabolism\n\n**Cruciferous vegetables**\n- Broccoli, kale, cabbage, Brussels sprouts\n- Indole-3-carbinol supports liver oestrogen clearance\n\n## Foods to Reduce\n- **Refined vegetable oils**: Sunflower, corn, soybean oils are high in omega-6. Switch to olive oil and avocado oil.\n- **Ultra-processed foods**: Contain trans fats, additives, and refined sugar — all pro-inflammatory\n- **Red and processed meat**: Arachidonic acid in red meat drives prostaglandin production; limit to 1–2 portions/week\n- **Alcohol**: Increases oestrogen levels and gut permeability\n- **Refined sugar**: Spikes insulin and inflammatory cytokines\n\n## Supplements with Evidence\n- **Omega-3 (EPA + DHA)**: 2–3 g/day shown to reduce dysmenorrhoea pain comparable to ibuprofen in some trials\n- **Magnesium glycinate**: 300–400 mg/day reduces prostaglandin production and muscle spasm\n- **Vitamin E**: 400 IU/day in the week before menstruation reduces pain in primary dysmenorrhoea\n- **Ginger**: 250 mg capsule 4x daily as effective as mefenamic acid for period pain in multiple RCTs`,
        category: "Nutrition",
        coverImageUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80",
        author: "Dr. Ananya Krishnan, Integrative Nutritionist",
        tags: ["anti-inflammatory", "diet", "period pain", "endometriosis", "omega-3"],
      },
      {
        title: "Building Mental Resilience: A Practical Guide for Women",
        summary: "Mental resilience isn't about suppressing emotions — it's about developing the skills to recover from adversity. These evidence-based techniques build lasting psychological strength.",
        content: `Resilience is not a fixed trait you either have or don't — it is a set of skills that can be built through deliberate practice. Research in positive psychology and neuroscience shows that the brain remains plastic throughout life, capable of building new stress-response circuits well into adulthood.\n\n## What Resilience Actually Is\nResilience is the capacity to adapt to stress, adversity, and change — not the absence of difficulty. Resilient people experience the same negative emotions as others; they simply process and recover from them more efficiently.\n\n## The Six Pillars of Psychological Resilience\n\n### 1. Emotional Regulation\nThe ability to observe and modulate emotional responses without suppression. Practices that develop this:\n- **Journaling**: 15 minutes of expressive writing after a stressful event reduces rumination and cortisol\n- **Naming emotions precisely**: Research by Marc Brackett shows that granular emotional labelling (not just "bad" but "disappointed," "ashamed," or "frustrated") reduces amygdala reactivity\n\n### 2. Cognitive Flexibility\nResilient thinking involves holding multiple perspectives simultaneously. CBT-based techniques like cognitive restructuring help identify and challenge catastrophic thinking patterns.\n\n### 3. Self-Compassion\nKristín Neff's research consistently shows that self-compassion (treating yourself with the kindness you'd offer a friend) predicts better mental health outcomes than self-esteem. It buffers against rumination and shame.\n\n### 4. Social Connection\nStrong social bonds are the single strongest predictor of resilience. Invest in 2–3 deep relationships rather than many superficial ones. Oxytocin released through social bonding directly dampens the HPA stress axis.\n\n### 5. Meaning and Purpose\nPost-traumatic growth — where adversity leads to positive psychological change — is most likely when individuals can construct meaning from their experiences. Journaling about what an experience taught you accelerates this process.\n\n### 6. Physical Health as Foundation\nSleep, movement, and nutrition are the substrate on which all psychological resilience rests. Without them, emotional regulation becomes neurologically impaired regardless of any other interventions.\n\n## Daily Practices (10 Minutes)\n- **Morning**: Write 3 specific things you're grateful for + 1 sentence on today's intention\n- **Evening**: 5-minute body scan meditation to discharge accumulated tension`,
        category: "Mental Health",
        coverImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        author: "Dr. Layla Hassan, Clinical Psychologist",
        tags: ["resilience", "mental health", "stress", "self-compassion", "CBT"],
      },
      {
        title: "Strength Training for Beginners: Your First 8 Weeks",
        summary: "Starting strength training is one of the best things you can do for your long-term health. This progressive 8-week plan is designed specifically for women new to resistance training.",
        content: `Strength training is the most evidence-backed intervention for long-term health in women — it builds bone density, improves insulin sensitivity, boosts metabolism, and supports hormonal balance. Yet many women find it intimidating to start.\n\n## Why Strength Training Matters Specifically for Women\n- **Bone density**: Peak bone mass is established by age 30. Resistance training after 30 slows bone loss significantly, reducing osteoporosis risk\n- **Metabolic health**: Muscle tissue is metabolically active — each kg of muscle burns ~13 kcal/day at rest\n- **Hormonal benefits**: Reduces insulin resistance (critical for PCOS) and increases growth hormone, which supports body composition and mood\n- **Longevity**: Grip strength and muscle mass are among the strongest predictors of healthy ageing and reduced all-cause mortality\n\n## Weeks 1–2: Foundation\nFocus on learning movement patterns, not load. 3 sessions/week, 45 minutes each.\n\n**Session A:**\n- Goblet squat: 3 × 10 reps\n- Dumbbell Romanian deadlift: 3 × 10 reps\n- Seated dumbbell press: 3 × 10 reps\n- Lat pulldown: 3 × 10 reps\n- Plank: 3 × 30 seconds\n\n**Session B:**\n- Hip thrust (bodyweight or light barbell): 3 × 12 reps\n- Dumbbell bench press: 3 × 10 reps\n- Dumbbell bent-over row: 3 × 10 reps\n- Walking lunges: 3 × 10 each leg\n- Dead bug: 3 × 8 reps\n\n## Weeks 3–4: Build Load\nIncrease weight by 5–10% when you can complete all reps with good form.\n\n## Weeks 5–6: Introduce Progressive Overload\nAdd one set to each exercise. Focus on tempo: 2 seconds down, 1 second pause, 2 seconds up.\n\n## Weeks 7–8: Compound Focus\nPrioritise barbell movements: back squat, conventional deadlift, barbell bench press. These recruit the most muscle and drive the greatest hormonal response.\n\n## Key Principles\n- **Rest 60–90 seconds between sets** for hypertrophy; 2–3 minutes for strength\n- **Eat protein within 2 hours post-training**: 25–40 g to maximise muscle protein synthesis\n- **Sleep**: Growth hormone is released primarily during deep sleep — training without adequate sleep limits adaptation\n- **Progress tracking**: Log weights and reps every session. Progress is the point.`,
        category: "Fitness",
        coverImageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
        author: "Coach Valentina Cruz",
        tags: ["strength training", "beginners", "fitness", "resistance training", "muscle"],
      },
      {
        title: "Breastfeeding Nutrition: What to Eat to Support Milk Production",
        summary: "Breastfeeding increases nutritional demands significantly. Discover which nutrients matter most, foods that support milk supply, and what to avoid.",
        content: `Breastfeeding is the most calorie-demanding physiological state a woman can be in — requiring approximately 500 extra calories per day above baseline needs. The quality of your diet affects both milk composition and your own energy and hormonal recovery.\n\n## Calorie and Macronutrient Needs\n- **Calories**: +400–500 kcal/day above pre-pregnancy maintenance\n- **Protein**: 1.3 g/kg body weight/day — supports milk protein synthesis and your own tissue repair\n- **Fat**: Don't restrict dietary fat. The fatty acid profile of breast milk (particularly DHA content) directly reflects your intake.\n\n## Critical Nutrients During Breastfeeding\n\n**DHA (Omega-3)**\nBreast milk DHA is critical for infant brain and retinal development. If you eat fatty fish (salmon, sardines) 2–3x/week, this is likely sufficient. Otherwise, supplement with 200–300 mg algae-based DHA daily.\n\n**Iodine (290 mcg/day)**\nIodine is essential for infant thyroid function and brain development — requirements during breastfeeding are higher than at any other life stage. Most prenatal vitamins don't contain adequate iodine. Sources: seaweed, fish, dairy, iodised salt.\n\n**Vitamin D**\nBreast milk is a poor source of vitamin D. Most breastfed infants require a separate vitamin D supplement (400 IU/day). Mothers should also continue supplementing (1,000–2,000 IU/day).\n\n**Choline (550 mg/day)**\nCritical for infant brain development. Eggs are the richest source (147 mg per egg). Also found in beef liver, salmon, and soybeans.\n\n## Foods Traditionally Associated with Milk Supply\n- **Oats**: Contain beta-glucan, which may support prolactin levels\n- **Fenugreek**: Used traditionally; modest evidence; discontinue if it causes digestive upset\n- **Fennel seeds**: Anti-spasmodic and used across many cultures to support lactation\n- **Staying well hydrated**: Milk is 88% water — drink to thirst, aiming for pale urine\n\n## What to Limit or Avoid\n- **Alcohol**: Transfers to milk; peak levels at 30–60 minutes after drinking. Wait 2–3 hours per drink before feeding\n- **High-mercury fish**: Shark, swordfish, king mackerel\n- **Excessive caffeine**: Limit to <200 mg/day; some sensitive infants react to even small amounts`,
        category: "Pregnancy",
        coverImageUrl: "https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?w=800&q=80",
        author: "Dr. Amira Osei, Lactation Consultant",
        tags: ["breastfeeding", "nutrition", "milk supply", "postpartum", "DHA"],
      },
      {
        title: "Walking for Health: Why 8,000 Steps Beats 10,000",
        summary: "The 10,000-step target is a marketing myth. The research on walking, mortality risk, and metabolic health tells a more nuanced and encouraging story.",
        content: `The 10,000-steps-a-day target was not born from science — it originated in a 1960s Japanese marketing campaign for a pedometer called the Manpo-kei ("10,000 steps meter"). The actual evidence on walking and health is both more nuanced and more encouraging for most people.\n\n## What the Research Actually Shows\n\nA 2021 study in JAMA Internal Medicine followed 4,840 adults and found:\n- **4,000 steps/day** significantly reduced all-cause mortality vs < 4,000\n- **8,000 steps/day** reduced mortality risk by 51% vs 4,000\n- Benefits plateaued above 8,000–12,000 steps (no meaningful additional gains)\n\nFor older adults, even 2,000–4,500 steps showed significant protective benefits.\n\n## Why Walking Is Underrated as Exercise\n- **Zone 2 cardio**: Walking at a brisk pace (you can talk but not sing) is in the metabolic "fat burning" zone. This improves mitochondrial density and metabolic flexibility over time.\n- **Non-exercise activity thermogenesis (NEAT)**: Daily walking contributes to NEAT — calories burned outside formal exercise. High NEAT is strongly associated with healthy body weight.\n- **Blood sugar regulation**: A 10-minute walk after each meal reduces postprandial glucose spikes by ~30% — more effectively than a single 30-minute session.\n- **Mental health**: 20–30 minutes of walking in nature reduces cortisol and rumination measurably.\n\n## Making Walking More Effective\n- **Add incline**: Walking uphill or on a treadmill with incline doubles calorie expenditure\n- **Rucking**: Adding 5–10 kg in a backpack builds upper body and core strength while walking\n- **After-meal walks**: 10 minutes post-meal is the highest-leverage time for metabolic benefit\n- **Phone-free**: Walking without a phone in natural settings maximises mental health and creative benefits\n\n## Realistic Starting Points\n- Currently sedentary: Aim for 5,000 steps (roughly 40 minutes walking) 5 days/week\n- Currently active: Aim for 7,000–9,000 steps daily with 2–3 brisk sessions`,
        category: "Fitness",
        coverImageUrl: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80",
        author: "Dr. Marcus Webb, Sports Medicine",
        tags: ["walking", "steps", "fitness", "Zone 2", "metabolic health"],
      },
      {
        title: "Vitamin D Deficiency: The Silent Epidemic",
        summary: "Vitamin D deficiency affects over 1 billion people worldwide and is linked to fatigue, depression, hormonal imbalances, and immune dysfunction. Here's what to do about it.",
        content: `Vitamin D is not just a vitamin — it's a steroid hormone that influences over 2,000 genes and regulates immune function, mood, bone health, insulin sensitivity, and reproductive hormones. Deficiency is extraordinarily common, particularly in people who spend limited time outdoors or live at higher latitudes.\n\n## How Widespread Is Deficiency?\nEstimates suggest 40–80% of populations in the Middle East, South Asia, and Northern Europe are deficient (serum 25-OH vitamin D < 50 nmol/L). Even in sunny regions, modern indoor lifestyles mean many people produce far less vitamin D than their bodies require.\n\n## Symptoms of Deficiency\n- Persistent fatigue not explained by sleep\n- Muscle weakness and aches\n- Bone pain (particularly in the shins, back, and hips)\n- Depressed mood, seasonal depression\n- Frequent infections and slow wound healing\n- Hair loss\n- In women: irregular or absent periods, worsened PMS, reduced fertility\n\n## Who Is at Highest Risk?\n- People with darker skin (melanin reduces UV-B synthesis)\n- Those spending most of the day indoors\n- People in latitudes above 35° north (or below 35° south)\n- Those covering skin for cultural or medical reasons\n- Older adults (skin efficiency at synthesising D drops with age)\n- Overweight individuals (vitamin D is fat-soluble and sequestered in adipose tissue)\n\n## Testing and Target Levels\nAsk your GP for a 25-hydroxyvitamin D (25-OH D) blood test.\n- Deficient: < 50 nmol/L (< 20 ng/mL)\n- Insufficient: 50–75 nmol/L\n- Optimal: 75–150 nmol/L\n\n## Supplementation\n- **Vitamin D3 (cholecalciferol)** is 87% more potent than D2 — always choose D3\n- **Dose for deficiency**: 3,000–5,000 IU/day for 8–12 weeks to correct levels, then 1,000–2,000 IU/day maintenance\n- **Take with fat**: Vitamin D is fat-soluble — take with a meal containing fat for optimal absorption\n- **Pair with Vitamin K2**: K2 (MK-7 form, 100–200 mcg/day) directs calcium to bones rather than arteries — important when supplementing D3 long-term\n- Retest after 3 months to confirm levels have corrected`,
        category: "General",
        coverImageUrl: "https://images.unsplash.com/photo-1534577403868-87de6a1ddad2?w=800&q=80",
        author: "Dr. Zainab Al-Farsi, Endocrinologist",
        tags: ["vitamin D", "deficiency", "supplements", "immune health", "hormones"],
      },
      {
        title: "Managing Chronic Fatigue: A Root Cause Approach",
        summary: "Persistent tiredness is rarely just about sleep. Thyroid dysfunction, iron deficiency, adrenal stress, and nutrient gaps are common overlooked causes.",
        content: `Chronic fatigue is one of the most common complaints in primary care and one of the most under-investigated. Many women are told their blood tests are "normal" when in fact the normal range is wide enough to miss meaningful dysfunction. A root-cause approach means going beyond the haemoglobin count.\n\n## Common Root Causes\n\n### Iron Deficiency Without Anaemia\nFerritin (stored iron) can be low even when haemoglobin is normal. Ferritin < 30 mcg/L causes fatigue by reducing oxygen delivery to mitochondria and disrupting dopamine synthesis. Always ask for a ferritin level, not just a full blood count.\n\n### Subclinical Thyroid Dysfunction\nTSH at the "high normal" end of the range (2.5–4.5 mIU/L) is associated with fatigue, weight gain, and brain fog in many women, even without a formal hypothyroidism diagnosis. Request T3 and T4 alongside TSH, and consider free T3 (active thyroid hormone).\n\n### Vitamin D Deficiency\nAs above — deficiency at < 50 nmol/L causes musculoskeletal fatigue and mood-related tiredness.\n\n### B12 Deficiency\nParticularly common in vegetarians and vegans. B12 < 300 pmol/L causes neurological fatigue, brain fog, and low mood. Supplement with methylcobalamin 1,000 mcg/day rather than cyanocobalamin.\n\n### HPA Axis Dysregulation\nChronic stress keeps cortisol chronically elevated, then depleted. "Adrenal fatigue" is not a formal diagnosis, but HPA axis dysregulation is real and well-documented. Signs include waking unrefreshed, afternoon energy crashes, and reliance on caffeine to function.\n\n### Poor Sleep Architecture\nYou can sleep 8 hours and still have poor restorative sleep if deep sleep (N3) and REM stages are disrupted. Alcohol, blue light, and irregular sleep schedules all fragment deep sleep.\n\n## Getting Investigated\nRequest from your GP:\n- Full blood count + ferritin\n- TSH, free T4, free T3\n- 25-OH vitamin D\n- B12 and folate\n- HbA1c (blood sugar marker)\n- CRP (inflammatory marker)\n\n## Foundational Interventions\n1. Correct identified deficiencies first — most respond within 6–8 weeks\n2. Prioritise sleep hygiene rigorously\n3. Reduce caffeine dependency — it masks fatigue without resolving its cause\n4. Adjust exercise: if fatigued, zone 2 walking > high-intensity training\n5. Address psychological load — anxiety and depression are among the most common causes of chronic fatigue`,
        category: "Wellness",
        coverImageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80",
        author: "Dr. Riya Mehta, Functional Medicine",
        tags: ["fatigue", "iron deficiency", "thyroid", "B12", "wellness"],
      },
      {
        title: "Yoga for Menstrual Health: Poses That Actually Help",
        summary: "Certain yoga poses reduce cramping, relieve bloating, and support hormonal balance. This evidence-informed guide tells you which poses to do and when in your cycle.",
        content: `Yoga's effects on menstrual health go beyond relaxation. Research shows specific postures reduce prostaglandin-driven cramp severity, improve blood flow to the pelvis, and down-regulate the sympathetic nervous system response that amplifies pain.\n\n## The Evidence\nA 2016 RCT in the Journal of Alternative and Complementary Medicine found that 30 minutes of yoga 3x/week significantly reduced dysmenorrhoea severity and duration compared to controls. A 2019 systematic review of 15 trials confirmed yoga's benefit for PMS symptoms including pain, mood changes, and bloating.\n\n## Phase-by-Phase Guide\n\n### Menstrual Phase (Days 1–5): Restorative Poses\nAvoid inversions during heavy flow (comfort-based, not medically required). Focus on:\n- **Supta Baddha Konasana** (Reclining Bound Angle): Opens inner groins, releases pelvic tension. Hold 3–5 minutes with a bolster.\n- **Balasana** (Child's Pose): Gentle compression relieves cramping. Knees wide apart to reduce abdominal pressure.\n- **Viparita Karani** (Legs Up the Wall): Reduces swelling, calms the nervous system.\n- **Matsyasana** (Fish Pose, supported): Opens chest and stretches abdomen, countering the hunched posture of pain.\n\n### Follicular Phase (Days 6–13): Building Energy\n- **Warrior I and II**: Build heat and strength as energy returns\n- **Crescent lunge**: Hip flexor opening supports pelvic circulation\n- **Boat pose**: Core strengthening to support pelvic floor\n\n### Ovulation Phase (Day 14 ±2): Peak Mobility\n- **Wide-leg forward fold (Prasarita Padottanasana)**: Stretches inner thighs and hips at peak flexibility\n- **Pigeon pose**: Deep hip opener\n\n### Luteal Phase (Days 15–28): Grounding Practices\n- **Seated forward folds**: Calm the nervous system; counter luteal-phase anxiety\n- **Twisted seated poses**: Support liver detoxification of excess hormones\n- **Savasana with extended hold**: 10+ minutes at end of practice to maximise parasympathetic activation\n\n## Breathwork to Pair With Practice\n- **Nadi Shodhana** (alternate nostril breathing): Balances left–right brain hemispheres; reduces anxiety in the luteal phase\n- **Ujjayi breath** during active phases: Builds internal heat and focus`,
        category: "Fitness",
        coverImageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
        author: "Ananya Pillai, Yoga Therapist",
        tags: ["yoga", "menstrual health", "cramps", "PMS", "fitness"],
      },
      {
        title: "Postpartum Recovery: What Your Body Needs in the First 12 Weeks",
        summary: "The first 12 weeks after birth are a period of profound physical recovery. Nutrition, rest, and realistic expectations are the foundation for healing well.",
        content: `The postpartum period — sometimes called the "fourth trimester" — involves as much physiological change as pregnancy itself. Yet cultural expectations around "bouncing back" set many new mothers up for exhaustion, nutrient depletion, and delayed recovery.\n\n## What Is Actually Happening in Your Body\n\n**Weeks 1–2: Acute Recovery**\nThe uterus contracts from grapefruit size back to pre-pregnancy size (involution). Lochia (postpartum bleeding) continues for 4–6 weeks. Hormones drop precipitously — oestrogen and progesterone fall to their lowest levels since before puberty.\n\n**Weeks 3–6: Hormonal Recalibration**\nProlactin rises with breastfeeding, suppressing oestrogen. This causes vaginal dryness and reduced libido. Mood instability ("baby blues") typically peaks at days 3–5 and resolves by week 2. Persistent low mood beyond this is postpartum depression and requires professional support.\n\n**Weeks 7–12: Tissue Repair**\nCollagen remodelling of the pelvic floor, abdominal linea alba, and perineal tissue continues. Return to high-impact exercise too early increases prolapse risk.\n\n## Nutrition for Postpartum Recovery\n\n**Iron**: Blood loss during delivery depletes iron stores. Request a ferritin test at your 6-week check. Supplement if ferritin < 50 mcg/L.\n\n**Protein**: 1.5–2 g/kg/day to support tissue repair, muscle recovery, and milk production if breastfeeding.\n\n**Zinc**: Supports wound healing and immune function. Found in red meat, pumpkin seeds, legumes.\n\n**Collagen peptides**: 10–15 g/day may support connective tissue recovery in the pelvic floor and linea alba.\n\n**Anti-inflammatory foods**: Turmeric, ginger, berries, and omega-3s reduce postpartum inflammation and support mood.\n\n## When to Seek Help\n- Postpartum depression: persistent low mood, inability to bond with baby, intrusive thoughts\n- Diastasis recti: abdominal gap > 2 cm at 6 weeks — refer to a women's health physiotherapist\n- Pelvic floor dysfunction: leaking urine, prolapse sensation, pain during sex — refer to pelvic physio\n- Fever, increased bleeding, or foul-smelling discharge — see your GP immediately`,
        category: "Pregnancy",
        coverImageUrl: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=80",
        author: "Dr. Niamh O'Connor, Women's Health Physio",
        tags: ["postpartum", "recovery", "fourth trimester", "nutrition", "pelvic floor"],
      },
      {
        title: "Understanding Blood Pressure: What the Numbers Mean",
        summary: "Blood pressure is one of the most important health metrics you can track. Learn what the numbers mean, what affects it, and how to manage it naturally.",
        content: `High blood pressure (hypertension) affects over 1 billion people worldwide and is the leading modifiable risk factor for heart disease and stroke. Yet it causes no symptoms until damage has already occurred — earning it the name "the silent killer."\n\n## Reading Your Numbers\nBlood pressure is expressed as two numbers: systolic (the pressure when your heart beats) over diastolic (pressure between beats). Unit: mmHg.\n\n| Category | Systolic | | Diastolic |\n|---|---|---|---|\n| Optimal | < 120 | and | < 80 |\n| Normal | 120–129 | and | < 80 |\n| Elevated | 130–139 | or | 80–89 |\n| Stage 1 Hypertension | 140–159 | or | 90–99 |\n| Stage 2 Hypertension | ≥ 160 | or | ≥ 100 |\n\n## What Raises Blood Pressure\n- High sodium intake (> 2,300 mg/day)\n- Low potassium intake (counteracts sodium)\n- Excess alcohol\n- Chronic stress and poor sleep\n- Excess body weight (particularly visceral fat)\n- Physical inactivity\n- Smoking\n- Stimulant use (caffeine in high doses, decongestants)\n\n## In Women Specifically\n- **Oral contraceptives**: Can raise BP by 3–5 mmHg in susceptible women; monitor annually\n- **Pregnancy**: Gestational hypertension and pre-eclampsia require immediate medical attention\n- **Perimenopause**: Oestrogen loss increases arterial stiffness, raising BP risk\n\n## Evidence-Based Lifestyle Interventions\n\n**DASH Diet**: Reduces BP by 8–14 mmHg. Rich in fruits, vegetables, whole grains, low-fat dairy, nuts; low in sodium, red meat, and sweets.\n\n**Sodium Reduction**: Cutting sodium from 3,400 to 2,300 mg/day reduces systolic BP by ~5 mmHg. Cook at home — restaurant and processed food is the largest source.\n\n**Potassium**: 3,500–4,700 mg/day from bananas, sweet potatoes, avocados, beans, spinach.\n\n**Exercise**: 150 minutes/week of moderate aerobic exercise reduces BP by 5–8 mmHg.\n\n**Sleep**: < 6 hours/night raises BP. Each additional hour of sleep reduces systolic BP by ~1 mmHg.\n\n**Stress Management**: Chronic cortisol elevation directly raises blood pressure. Mindfulness-based stress reduction (MBSR) reduces systolic BP by ~4–5 mmHg in clinical trials.`,
        category: "General",
        coverImageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80",
        author: "Dr. Ahmed Al-Qahtani, Cardiologist",
        tags: ["blood pressure", "hypertension", "heart health", "DASH diet", "general"],
      },
      {
        title: "The Science of Cravings: Why You Want Sugar Before Your Period",
        summary: "Pre-menstrual sugar cravings are not a lack of willpower — they're driven by measurable hormonal and neurochemical changes. Understanding them helps you manage them.",
        content: `If you find yourself reaching for chocolate, crisps, or carbohydrates in the week before your period, you are not lacking willpower — you are experiencing measurable neurochemical changes driven by the luteal phase of your cycle.\n\n## The Biological Cause\n\n**Serotonin Drops in the Luteal Phase**\nOestrogen directly stimulates serotonin production. As oestrogen falls in the late luteal phase, serotonin drops with it. Since serotonin is your primary mood stabiliser and satisfaction hormone, your brain instinctively seeks quick ways to raise it — and carbohydrates (particularly sugar) provide the fastest route via insulin-driven tryptophan transport across the blood–brain barrier.\n\n**Metabolic Rate Increases**\nYour resting metabolic rate rises by 100–300 kcal/day in the luteal phase (your body is preparing for a potential pregnancy). This genuine increase in calorie requirement, combined with lower blood sugar efficiency, drives hunger and craving intensity.\n\n**Magnesium Depletion**\nMagnesium levels fall in the luteal phase. Low magnesium specifically drives chocolate cravings — dark chocolate is the richest food source of magnesium. Your body is sometimes trying to tell you something.\n\n**Progesterone and Appetite**\nProgesterone increases appetite and slows gastric emptying, making you feel less satisfied after meals and more prone to snacking.\n\n## Managing Cravings Without White-Knuckling\n\n**Address the Root Cause: Serotonin**\n- **Complex carbohydrates + protein**: Oats with protein powder, brown rice with chicken, sweet potato — these raise serotonin without the glucose crash\n- **5-HTP supplement**: 50–100 mg in the late luteal phase supports serotonin precursor availability\n- **Exercise**: Even a 20-minute walk raises serotonin within 30 minutes\n\n**Address the Root Cause: Magnesium**\n- Take magnesium glycinate 200–400 mg daily from day 14\n- Dark chocolate ≥ 70% cacao satisfies cravings and genuinely delivers magnesium (64 mg per 28 g)\n\n**Stabilise Blood Sugar**\n- Never skip meals in the luteal phase — low blood sugar amplifies cravings dramatically\n- Pair any carbohydrate with protein and fat to slow glucose absorption\n- Reduce caffeine — it destabilises blood sugar and worsens craving cycles`,
        category: "Nutrition",
        coverImageUrl: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=800&q=80",
        author: "Dr. Olivia Fernandez, Neuroscientist",
        tags: ["cravings", "PMS", "serotonin", "sugar", "nutrition", "luteal phase"],
      },
      {
        title: "Journaling for Mental Health: A Research-Backed Guide",
        summary: "Journaling is one of the most studied and most accessible mental health tools available. Here's what the research says actually works and how to start.",
        content: `Journaling has been studied as a therapeutic tool for over 40 years, and the evidence is consistently positive. From James Pennebaker's original 1986 expressive writing research to modern studies on cognitive processing, writing about your inner life produces measurable benefits for mental and even physical health.\n\n## What the Research Shows\n\n**Expressive Writing (Pennebaker Protocol)**\nWriting about emotionally difficult experiences for 20 minutes over 4 consecutive days produces lasting benefits:\n- Reduced intrusive thoughts and rumination\n- Improved immune function (measured by T-lymphocyte counts)\n- Reduced physical health complaints\n- Better academic and work performance\n- Reduced depression and anxiety scores for 3–6 months\n\n**Gratitude Journaling**\nWriting about 3 specific things you're grateful for (with WHY, not just what) shows:\n- Increased activity in the medial prefrontal cortex (linked to positive affect)\n- Reduced cortisol\n- Improved sleep quality\n- Stronger social relationships over time\n\n**Future Self Journaling**\nWriting as if you are describing your ideal future self from 5 years ahead increases motivation, goal clarity, and sense of agency.\n\n## Common Pitfalls That Reduce Effectiveness\n- **Venting without reflection**: Repeated venting without sense-making increases rumination rather than reducing it. Add a "what does this mean?" or "what can I control?" question.\n- **Being too brief**: 5-word gratitude lists don't work as well as 2–3 sentences on why something mattered\n- **Inconsistency**: Benefits accumulate over weeks. 10 minutes daily beats 1 hour weekly.\n\n## Formats to Try\n\n**Morning Pages** (Julia Cameron): 3 pages of stream-of-consciousness first thing in the morning. Clears mental clutter and surfaces subconscious material.\n\n**The 5-Minute Journal**: Structured prompts — 3 gratitudes + 1 daily intention in the morning; 3 highlights + 1 lesson in the evening.\n\n**Cycle Journaling**: Track mood, energy, symptoms, and emotional patterns alongside your cycle. Within 2–3 months, patterns emerge that allow you to plan proactively.\n\n**CBT Thought Record**: Identify a triggering event → automatic thought → feeling → challenge the thought → balanced response. Formally breaks cognitive distortions.`,
        category: "Mental Health",
        coverImageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80",
        author: "Dr. Leila Mortazavi, Therapist",
        tags: ["journaling", "mental health", "anxiety", "gratitude", "CBT"],
      },
      {
        title: "Fibroids: Everything You Need to Know",
        summary: "Uterine fibroids affect up to 80% of women by age 50. Most cause no problems, but some significantly impact quality of life. Know your options.",
        content: `Uterine fibroids (leiomyomas) are benign muscular growths in or on the uterus. They are the most common pelvic tumours in women of reproductive age, affecting up to 80% of women by their 50th birthday — though most women never know they have them.\n\n## Types of Fibroids\n- **Intramural**: Within the uterine wall (most common)\n- **Submucosal**: Protruding into the uterine cavity — most likely to cause heavy bleeding and fertility problems\n- **Subserosal**: On the outer uterine surface — can grow very large before causing symptoms\n- **Pedunculated**: Attached by a stalk (intracavitary or external)\n\n## When Fibroids Cause Symptoms\nSize, number, and location determine symptoms:\n- **Heavy menstrual bleeding**: The most common symptom; can lead to iron-deficiency anaemia\n- **Prolonged periods**: > 7 days\n- **Pelvic pressure or pain**: Particularly with larger fibroids pressing on the bladder or bowel\n- **Frequent urination**\n- **Bloating**: "Fibroid belly" with large fibroids\n- **Difficulty conceiving**: Submucosal fibroids can interfere with implantation\n- **Pregnancy complications**: Increased risk of preterm birth, breech position, and caesarean\n\n## What Causes Fibroids?\nThe precise cause is unknown, but oestrogen and progesterone drive fibroid growth — they shrink after menopause. Risk factors include:\n- Black African heritage (2–3x higher prevalence and often more severe disease)\n- Family history\n- Early menarche\n- Obesity (higher circulating oestrogen via adipose conversion)\n- Vitamin D deficiency\n\n## Treatment Options\n\n**Watchful waiting**: Appropriate for small, asymptomatic fibroids\n\n**Medical management**:\n- Combined pill or Mirena IUD: Reduces bleeding but doesn't shrink fibroids\n- GnRH agonists (e.g. Zoladex): Temporarily shrink fibroids by inducing temporary menopause\n- Tranexamic acid / NSAIDs: Reduce bleeding and pain\n\n**Minimally invasive procedures**:\n- Uterine artery embolisation (UAE): Blocks blood supply to fibroids; effective with shorter recovery than surgery\n- MRI-guided focused ultrasound: Non-invasive; emerging evidence\n\n**Surgery**:\n- Myomectomy: Removes fibroids while preserving the uterus; preferred for women wanting fertility\n- Hysterectomy: Definitive treatment if family is complete`,
        category: "Women's Health",
        coverImageUrl: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80",
        author: "Dr. Tendai Moyo, Consultant Gynaecologist",
        tags: ["fibroids", "uterine fibroids", "heavy periods", "women's health", "fertility"],
      },
      {
        title: "Intermittent Fasting for Women: What the Research Says",
        summary: "Intermittent fasting works differently in women than in men. Learn which protocols are safe, which to avoid, and how to work with your hormones rather than against them.",
        content: `Intermittent fasting (IF) is one of the most popular dietary approaches worldwide, but most of the foundational research was conducted on male subjects. The hormonal complexity of the female body — particularly the sensitivity of the hypothalamic-pituitary-ovarian (HPO) axis — means the blanket advice to "just skip breakfast" can backfire significantly for some women.\n\n## Why Women Respond Differently\nThe female reproductive system is exquisitely sensitive to energy availability. Severe calorie restriction or prolonged fasting signals scarcity to the HPO axis, which can suppress GnRH (gonadotropin-releasing hormone) and disrupt the LH surge required for ovulation. This protective mechanism evolved to prevent pregnancy during famine.\n\n## What the Evidence Shows\n\n**Potential Benefits (supported in women):**\n- Improved insulin sensitivity (particularly relevant for PCOS)\n- Reduced inflammatory markers\n- Weight loss when it creates a calorie deficit\n- Autophagy (cellular cleanup) during fasting windows\n\n**Potential Risks in Women:**\n- Irregular or absent periods (amenorrhoea) with aggressive protocols\n- Cortisol elevation from fasting stress, worsening adrenal fatigue\n- Worsened sleep from overnight fasting window\n- Increased binge-eating tendency in those with eating disorder history\n\n## Protocols Ranked by Safety for Women\n\n**Safest: 14:10** — 14-hour fast, 10-hour eating window. Eating from 8 am to 6 pm. Mild enough not to stress the HPO axis while still capturing metabolic benefits.\n\n**Moderate: 16:8** — Works well for many women in the follicular phase. Some women find it too aggressive in the luteal phase when hunger and energy requirements are higher.\n\n**Avoid: 18:6, OMAD (one meal a day), 24-hour fasts** — Strong evidence these protocols suppress reproductive hormones in women of reproductive age.\n\n## Cycle-Synced Fasting\n- **Follicular phase**: Experiment with 16:8 when oestrogen supports stable blood sugar\n- **Ovulation**: Keep fasting windows shorter — your body needs energy for egg release\n- **Luteal phase**: Abandon fasting entirely or stick to 12:12 maximum. Appetite increase is biological and appropriate.\n- **Menstruation**: Eat when hungry. Your body is working hard.\n\n## Who Should Avoid IF\n- History of disordered eating\n- Pregnancy or breastfeeding\n- Current amenorrhoea or irregular cycles\n- Underweight (BMI < 18.5)`,
        category: "Nutrition",
        coverImageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
        author: "Dr. Sophia Tan, Nutrition Scientist",
        tags: ["intermittent fasting", "nutrition", "PCOS", "hormones", "weight"],
      },
      {
        title: "Pelvic Floor Health: Why Every Woman Should Know About It",
        summary: "The pelvic floor affects bladder control, sexual function, core stability, and organ support. Weakness or dysfunction is common but rarely discussed. Here's what to know.",
        content: `The pelvic floor is a group of muscles, ligaments, and connective tissues forming a hammock-like base at the bottom of the pelvis. It supports the bladder, uterus, and bowel — and its function (or dysfunction) has far-reaching effects on daily life that many women suffer in silence.\n\n## What the Pelvic Floor Does\n- **Continence**: Controls urinary and faecal release\n- **Sexual function**: Contributes to arousal, orgasm, and vaginal tone\n- **Core stability**: Works in coordination with the diaphragm, deep abdominals, and multifidus\n- **Organ support**: Prevents prolapse of the bladder, uterus, or rectum\n- **Birth**: Allows the baby to rotate and descend during labour\n\n## Signs of Pelvic Floor Dysfunction\n\n**Hypotonicity (weak/underactive):**\n- Stress urinary incontinence (leaking when sneezing, jumping, or coughing)\n- Reduced sexual sensation\n- Heaviness or dragging sensation in the pelvis\n- Pelvic organ prolapse\n\n**Hypertonicity (tight/overactive):**\n- Pain during sex (vaginismus or dyspareunia)\n- Chronic pelvic pain\n- Difficulty inserting tampons\n- Constipation and difficulty emptying the bladder fully\n- Tailbone pain\n\n## Why Dysfunction Is So Common\n- Childbirth (especially prolonged second stage or instrumental delivery)\n- Chronic straining at stool (constipation)\n- High-impact sport without adequate pelvic floor conditioning\n- Hormonal changes (oestrogen decline in perimenopause)\n- Chronic cough\n- Obesity\n\n## Kegel Exercises: The Right Way\nKegels are not always the answer — for hypertonic pelvic floors, they can worsen symptoms. Always get an assessment first.\n\nFor hypotonicity, correct Kegel technique:\n1. Identify the right muscles (stop urine flow mid-stream once to locate them — don't practice this way regularly)\n2. Squeeze and lift upward (not just squeezing)\n3. Hold 5–10 seconds, release fully, rest 5 seconds\n4. 10 repetitions, 3 sets daily\n\n## When to See a Women's Health Physiotherapist\nAny pelvic floor symptom warrants a professional assessment. Pelvic physio is first-line treatment for incontinence, prolapse, and pelvic pain — more effective than any home exercise programme done in isolation.`,
        category: "Women's Health",
        coverImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
        author: "Dr. Brigid Flanagan, Women's Health Physio",
        tags: ["pelvic floor", "incontinence", "kegel", "women's health", "prolapse"],
      },
      {
        title: "Cold and Heat Therapy for Pain and Recovery",
        summary: "Ice baths, hot compresses, saunas, and contrast therapy each have distinct physiological effects. Learn which to use for period pain, muscle recovery, and inflammation.",
        content: `Temperature-based therapies are among the oldest pain management tools in human history — and among the most rigorously studied for specific applications. The key is knowing which to use and when.\n\n## Heat Therapy\n\n**Mechanisms:**\n- Vasodilation: Increases blood flow to the area, delivering oxygen and removing metabolic waste\n- Muscle relaxation: Reduces muscle spindle sensitivity, lowering spasm\n- Gate control: Warm signals travel faster than pain signals, "crowding out" pain perception\n- Prostaglandin inhibition: Heat reduces prostaglandin synthesis locally (directly relevant to period pain)\n\n**Best for:**\n- Menstrual cramps: A 2004 RCT found a heat patch as effective as ibuprofen 400 mg for dysmenorrhoea\n- Chronic muscle tension and back pain\n- Stiff joints (e.g. morning stiffness)\n- Before stretching or exercise (warm-up)\n\n**Sauna (40–100°C for 15–20 minutes):**\n- Reduces cortisol\n- Increases heat shock proteins (cellular repair)\n- Regular sauna use (4x/week) associated with 40% reduction in cardiovascular mortality in Finnish cohort studies\n\n## Cold Therapy\n\n**Mechanisms:**\n- Vasoconstriction: Limits blood flow and acute inflammatory response\n- Analgesic: Cold temporarily blocks pain nerve conduction\n- Anti-inflammatory: Reduces cytokine production in acute injury\n\n**Best for:**\n- Acute injuries (first 48–72 hours): Ice reduces swelling and pain\n- Post-exercise recovery: Ice baths (10–15°C for 10–15 minutes) reduce DOMS (delayed onset muscle soreness)\n- Cold shower/plunge: Activates norepinephrine (up to 300% increase), improving mood and focus\n\n**Cold shower protocol for beginners:**\nStart with 30 seconds cold at the end of a normal shower. Build to 2–3 minutes over 2–3 weeks. Breathe slowly and steadily — the Wim Hof nasal breathing technique reduces the shock response.\n\n## Contrast Therapy\nAlternating hot and cold (e.g. hot tub → cold plunge × 3 cycles) produces a "vascular pump" effect — enhanced blood and lymph circulation. Used by elite athletes for post-training recovery. Emerging evidence for reducing muscle soreness and improving perceived recovery.\n\n## For Menstrual Pain Specifically\n- Apply heat (hot water bottle, heat patch) directly to the lower abdomen and lower back\n- Temperature of 40°C for minimum 30 minutes\n- Combine with a warm herbal tea (ginger, chamomile) for additive effect`,
        category: "Wellness",
        coverImageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
        author: "Dr. Ivan Kovalev, Sports Medicine",
        tags: ["cold therapy", "heat therapy", "sauna", "ice bath", "recovery", "period pain"],
      },
      {
        title: "Thyroid Health in Women: Signs, Tests, and Natural Support",
        summary: "Thyroid disorders affect women 5–8 times more than men. Fatigue, weight changes, hair loss, and mood issues are often thyroid-related. Here's how to investigate and support thyroid health.",
        content: `The thyroid gland — a butterfly-shaped organ in your neck — produces hormones (T3 and T4) that regulate the metabolism of every cell in your body. Thyroid dysfunction is among the most common and most commonly missed conditions in women.\n\n## Why Women Are More Affected\nThyroid disorders are autoimmune in the majority of cases (Hashimoto's thyroiditis is the most common cause of hypothyroidism worldwide). Women's immune systems are generally more reactive, and thyroid autoimmunity is strongly linked to oestrogen — which modulates immune function throughout the cycle.\n\n## Hypothyroidism (Underactive Thyroid)\n**Symptoms:**\n- Persistent fatigue even with adequate sleep\n- Weight gain not explained by diet\n- Cold intolerance (always feeling cold when others are comfortable)\n- Constipation\n- Dry skin, brittle nails, hair loss and thinning\n- Brain fog and poor memory\n- Depression and low mood\n- Heavy or irregular periods\n- High cholesterol\n- Slow heart rate\n\n**Hashimoto's Thyroiditis:**\nAutoimmune destruction of the thyroid. TSH rises as the thyroid struggles to produce enough hormone. Anti-TPO antibodies are elevated. Hashimoto's is strongly associated with gluten sensitivity and other autoimmune conditions.\n\n## Hyperthyroidism (Overactive Thyroid)\n**Symptoms:**\n- Unintentional weight loss\n- Rapid or irregular heartbeat\n- Anxiety and irritability\n- Tremor in the hands\n- Heat intolerance and excessive sweating\n- Light or absent periods\n- Sleep difficulties\n\n**Graves' Disease:** The most common autoimmune cause of hyperthyroidism.\n\n## Getting the Right Tests\nDon't accept just TSH. Request:\n- **TSH**: Screening test; high = hypothyroid, low = hyperthyroid\n- **Free T4 and Free T3**: Active hormone levels (T3 is the active form; many practitioners only check T4)\n- **Anti-TPO antibodies**: Identifies Hashimoto's even before TSH is abnormal\n- **Anti-thyroglobulin antibodies**: Additional Hashimoto's marker\n- **Reverse T3** (optional): Elevated in chronic stress, blocking T3 activity\n\n## Natural Support for Thyroid Health\n\n**Key nutrients:**\n- **Iodine**: Essential for T3/T4 synthesis. Found in seaweed, fish, dairy. Don't over-supplement — excess iodine worsens autoimmune thyroid disease.\n- **Selenium** (200 mcg/day): Reduces anti-TPO antibodies in Hashimoto's by 40–50% in clinical trials. Brazil nuts (2/day) or supplement.\n- **Zinc** (15–30 mg/day): Required for T3 receptor function.\n- **Vitamin D**: Deficiency strongly associated with Hashimoto's; supplement to maintain levels > 100 nmol/L.\n\n**For Hashimoto's specifically:**\n- A 3-month trial of gluten elimination reduces anti-TPO antibodies in a significant subset of patients\n- Reduce ultra-processed food and alcohol — both increase intestinal permeability ("leaky gut") which drives autoimmune activity`,
        category: "General",
        coverImageUrl: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80",
        author: "Dr. Maryam Khalil, Endocrinologist",
        tags: ["thyroid", "Hashimoto's", "hypothyroidism", "fatigue", "autoimmune", "women's health"],
      },
      {
        title: "Better Sex After Baby: Navigating Postpartum Intimacy",
        summary: "Physical and hormonal changes after birth affect libido, comfort, and connection. A frank, evidence-based guide to postpartum sexual health.",
        content: `Postpartum sexual health is one of the least discussed aspects of the fourth trimester — yet the majority of new mothers experience significant changes to desire, comfort, and intimacy in the months after birth. These changes are biological, not a reflection of your relationship or how you feel about your partner.\n\n## Why Sex Changes After Birth\n\n**Oestrogen Crash**\nAfter delivery, oestrogen falls to its lowest level since before puberty. This causes:\n- Vaginal dryness and thinning of vaginal tissue (vaginal atrophy)\n- Reduced natural lubrication\n- Discomfort or pain during penetration\n- Reduced clitoral sensitivity\n\n**Prolactin Dominance**\nBreastfeeding elevates prolactin, which suppresses oestrogen further. Breastfeeding mothers often experience more pronounced vaginal dryness and lower libido until weaning.\n\n**Physical Recovery**\nTissue healing (perineal tears, episiotomy, caesarean scar) takes 6–12 weeks or longer. Pelvic floor changes affect sensation and comfort.\n\n**Psychological Factors**\n- Identity shift (becoming a mother affects body image and sense of self)\n- Sleep deprivation reduces libido biochemically (lower testosterone and dopamine)\n- Anxiety and postpartum depression significantly reduce desire\n- Partner dynamics and unmet emotional needs affect willingness to be physically intimate\n\n## Practical Guidance\n\n**Timing**\nMedical guidance advises waiting 6 weeks before penetrative sex — but this is the minimum, not a target. Many women feel ready later, and that is completely normal. Survey data suggest most women don't resume penetrative sex until 3–6 months postpartum.\n\n**Addressing Vaginal Dryness**\n- **Lubricants**: Use every time, generously. Silicone-based lubricants last longer; water-based are condom-compatible.\n- **Vaginal moisturisers** (e.g. hyaluronic acid-based): Used 2–3x/week for chronic dryness, separate from sex\n- **Topical oestrogen**: Safe even during breastfeeding (minimal systemic absorption); highly effective for vaginal atrophy\n\n**Communication**\nBeing explicit with your partner about what feels comfortable and what doesn't is essential. Many new parents find that expanding the definition of intimacy (touch, closeness, non-penetrative sex) maintains connection while physical recovery continues.\n\n**Pelvic Physiotherapy**\nIf sex is painful 3+ months postpartum, a referral to a women's health physiotherapist is first-line treatment — not something to push through.`,
        category: "Women's Health",
        coverImageUrl: "https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?w=800&q=80",
        author: "Dr. Jess Coleman, Sexual Health Physician",
        tags: ["postpartum", "intimacy", "libido", "sexual health", "breastfeeding", "women's health"],
      },
    ];

    let seeded = 0;
    for (const article of SEED_ARTICLES) {
      const id = uuidv4();
      await articlesContainer.items.create({
        id,
        ...article,
        flagged: false,
        createdBy: "seed",
        createdAt: now,
        updatedAt: now,
      });
      seeded++;
    }

    res.json({ status: "OK", seeded });
  } catch (err) {
    console.error("[articles] seed error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/admin/articles/:id ─────────────────────────────────────────
router.delete("/:id", async (req: SessionRequest, res: Response) => {
  try {
    const { id } = req.params;
    await articlesContainer.item(id, id).delete();
    res.json({ status: "OK" });
  } catch (err: any) {
    if (err.code === 404) { res.status(404).json({ error: "Article not found" }); return; }
    console.error("[articles] delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
