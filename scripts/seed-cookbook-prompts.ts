import "dotenv/config";
import { PrismaClient } from "../src/generated/client/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Seeds 10 published cookbook prompts across the 8 top-level categories (see seed-cookbook-categories.ts).
// CREATE-ONLY: a prompt whose slug already exists is left untouched, so edits made in the admin are never overwritten.
// Rich-text fields are Markdown. `faqs` uses "### Question" headings so the public page can emit FAQPage JSON-LD.

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

type Seed = {
  category: string;
  title: string;
  slug: string;
  seoTitle: string;
  seoDesc: string;
  explanation: string;
  whenToUse: string;
  bestPractices: string;
  commonMistakes: string;
  promptTemplate: string;
  exampleInput: string;
  exampleOutput: string;
  faqs: string;
};

const PROMPTS: Seed[] = [
  {
    category: "engineering",
    title: "Senior React Developer Persona",
    slug: "senior-react-developer-persona",
    seoTitle: "Senior React Developer Prompt: Clean TypeScript, Tailwind & Framer Motion",
    seoDesc: "A system prompt that makes ChatGPT or Claude write clean, modern React with TypeScript, Tailwind and Framer Motion. Copy the template and see an example.",
    explanation: `This is a **system prompt** that turns a general-purpose model into a disciplined senior frontend engineer. Instead of asking for "a React component" and getting a mix of class components, inline styles and long explanations, you pin down the stack, the style rules and the output format once.

The result is code you can paste straight into a Next.js project: functional components, strict TypeScript types, Tailwind utility classes and small Framer Motion interactions, with no chatty preamble.`,
    whenToUse: `- Scaffolding new UI components in a React / Next.js codebase
- Converting a design description into a working component
- Keeping a whole team's AI-generated code stylistically consistent
- Any time you are tired of deleting explanations from model output`,
    bestPractices: `- Put the prompt in the **system** slot (or the first message) and keep the task in a separate message.
- Name your exact versions ("Next.js 15 App Router") so the model doesn't guess.
- Add your own rules (folder layout, naming, accessibility) to the constraint list.
- Ask for props to be typed with an exported \`interface\`.`,
    commonMistakes: `- Asking for "no explanations" but then pasting a vague task. The model needs the *what* as much as the *how*.
- Leaving out the framework version, which yields outdated APIs.
- Stacking too many rules. Past about eight, models start dropping some silently.`,
    promptTemplate: `You are a Senior Frontend Engineer specializing in React, Next.js (App Router) and Tailwind CSS.

Rules:
1. Use functional components with TypeScript. Export a typed props interface.
2. Prefer Tailwind utility classes over custom CSS.
3. Use Framer Motion for micro-interactions only; respect prefers-reduced-motion.
4. Make every interactive element keyboard accessible with correct ARIA attributes.
5. Respond with ONLY the code block. No explanations unless I ask.

Task: [DESCRIBE THE COMPONENT]`,
    exampleInput: `Task: A pricing card with a title, price, feature list and a "Get started" button. Highlight it when the "featured" prop is true.`,
    exampleOutput: `\`\`\`tsx
"use client";
import { motion } from "framer-motion";

interface PricingCardProps {
  title: string;
  price: string;
  features: string[];
  featured?: boolean;
}

export function PricingCard({ title, price, features, featured = false }: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={\`rounded-2xl border p-6 \${featured ? "border-primary bg-primary/5" : "border-border"}\`}
    >
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-3xl font-black">{price}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => <li key={f}>{f}</li>)}
      </ul>
      <button className="mt-6 w-full rounded-lg bg-primary py-2 font-semibold text-primary-foreground">Get started</button>
    </motion.div>
  );
}
\`\`\``,
    faqs: `### Does this work with models other than Claude?
Yes. It is plain instruction text and works with ChatGPT, Gemini and open models. Stricter models follow the "code only" rule more reliably.

### Should I use it as a system prompt or a normal message?
Use the system prompt when your tool allows it. Otherwise paste it as the first message and send the task in a second one.

### How do I adapt it to Vue or Svelte?
Swap the framework line and the component rules. The structure (role, numbered rules, output format, task) stays the same.`,
  },
  {
    category: "content",
    title: "High-Converting SEO Blog Post",
    slug: "high-converting-seo-blog-post",
    seoTitle: "SEO Blog Post Prompt: Keyword-Optimized Articles with Meta Descriptions",
    seoDesc: "Generate an SEO-optimized blog post with the right heading structure, keyword placement and a meta description. Free copy-paste prompt for ChatGPT and Claude.",
    explanation: `A prompt for producing a **first draft that is already structured for search**. It fixes the word count, where the primary keyword must appear, paragraph length and the meta description, so you edit a solid draft instead of rewriting a generic one.

It works best when you supply the real search intent and a few secondary keywords, because the model can then match the article to what readers actually want.`,
    whenToUse: `- Producing first drafts for a content calendar
- Refreshing thin posts that rank on page two
- Making briefs consistent across freelance writers
- Generating the meta description alongside the article`,
    bestPractices: `- State the **search intent** (informational, comparison, how-to).
- Provide 3 to 5 secondary keywords and ask for natural use, not repetition.
- Give the audience and a tone reference.
- Fact-check statistics; ask the model to flag any figure it is unsure of.`,
    commonMistakes: `- Asking for keyword stuffing ("use the keyword 20 times").
- Skipping the audience, which produces bland, universal copy.
- Publishing without adding original examples or first-hand experience.`,
    promptTemplate: `Act as a top-tier SEO copywriter. Write a 1,500-word blog post.

Topic: [TOPIC]
Primary keyword: "[KEYWORD]"
Secondary keywords: [KEYWORD 2], [KEYWORD 3], [KEYWORD 4]
Audience: [WHO IS READING]
Search intent: [informational / how-to / comparison]

Constraints:
- Include the primary keyword in the H1 and at least two H2s.
- Keep paragraphs under 3 sentences.
- Use one bulleted list and one short FAQ section (3 questions).
- Do not invent statistics. Mark anything unverifiable with [VERIFY].
- End with a 155-character meta description labelled "Meta description:".`,
    exampleInput: `Topic: How to reduce LLM token costs
Primary keyword: "reduce token usage"
Secondary keywords: prompt compression, context window, LLM cost
Audience: developers building AI features
Search intent: how-to`,
    exampleOutput: `# How to Reduce Token Usage in LLM Apps (Without Losing Quality)

Every extra token costs money and latency. Here is how to cut both.

## Why reducing token usage matters
Token bills grow with every request. A 30% smaller prompt is a 30% smaller input bill.

## 1. Compress the prompt
...

## FAQ
**Does prompt compression hurt accuracy?** ...

Meta description: Learn practical ways to reduce token usage in LLM apps: prompt compression, smarter context windows and caching, with examples.`,
    faqs: `### How long should the article be?
Match the length of the top-ranking pages for your keyword. The template defaults to 1,500 words; change the number to fit.

### Will AI-written content rank?
Search engines rank helpful content regardless of how it was drafted. Add original insight, fix facts and edit for voice.

### Can I use it for product pages?
Yes. Replace the blog constraints with product-page ones (benefits, specs, objections) and keep the keyword rules.`,
  },
  {
    category: "data",
    title: "JSON Data Extraction Pipeline",
    slug: "json-data-extraction-pipeline",
    seoTitle: "JSON Extraction Prompt: Turn Messy Text into Structured Data",
    seoDesc: "A strict prompt for extracting entities from unstructured text into clean JSON. Handles missing values and avoids markdown wrappers. Copy it for GPT or Claude.",
    explanation: `This prompt converts **messy, unstructured text** (emails, articles, transcripts) into a predictable JSON array that your code can parse without cleanup.

It solves the three usual failures: the model wrapping JSON in markdown fences, adding friendly commentary, and inventing values for missing fields. A fixed schema plus an explicit \`null\` rule makes the output machine-safe.`,
    whenToUse: `- Pulling company, person or price data out of news and filings
- Structuring support tickets or survey answers
- ETL steps where a script consumes the model output
- Bulk processing where each document must yield the same shape`,
    bestPractices: `- Provide the **exact schema** with field names and types.
- Say what to do for missing data (\`null\`), never leave it implicit.
- Use your provider's JSON / structured-output mode when available.
- Validate the result with a schema library and retry on failure.`,
    commonMistakes: `- Not specifying the schema, so keys change between runs.
- Letting the model guess missing values; you get plausible fabrications.
- Parsing with a bare \`JSON.parse\` and no retry path.`,
    promptTemplate: `Extract the following fields from the text below: [FIELD 1, FIELD 2, FIELD 3, FIELD 4].

Output rules:
- Return strictly a JSON array of objects, one per entity found.
- Use exactly these keys: [key_1, key_2, key_3, key_4].
- If a value is missing or unclear, use null. Never guess.
- Do not wrap the output in markdown code fences.
- Do not add any explanation before or after the JSON.

Text:
"""
[PASTE TEXT]
"""`,
    exampleInput: `Fields: company_name, revenue, ceo_name, industry

Text: Acme Robotics reported $42M in annual revenue this quarter. CEO Dana Whitfield said the warehouse-automation firm plans to expand into Europe. Separately, Northwind Foods, a grocery distributor, declined to share figures.`,
    exampleOutput: `[
  { "company_name": "Acme Robotics", "revenue": "$42M", "ceo_name": "Dana Whitfield", "industry": "Warehouse automation" },
  { "company_name": "Northwind Foods", "revenue": null, "ceo_name": null, "industry": "Grocery distribution" }
]`,
    faqs: `### How do I stop the model adding markdown fences?
State it explicitly, as the template does, and prefer your API's structured-output or JSON mode, which guarantees valid JSON.

### What if the text contains many entities?
The array format handles that. For very long documents, chunk the text and merge the arrays afterwards.

### Can I extract nested data?
Yes. Describe the nested shape in the rules and add an example object.`,
  },
  {
    category: "image",
    title: "Cinematic Product Photography",
    slug: "cinematic-product-photography",
    seoTitle: "Midjourney Product Photography Prompt: Cinematic Studio Lighting",
    seoDesc: "A Midjourney v6 prompt for photorealistic product shots with dramatic studio lighting, rim light and 85mm depth. Copy, swap the product and generate.",
    explanation: `An image prompt that reads like a **photographer's shot list**: subject, surface, lighting, mood and camera. Midjourney responds well to that structure because each clause maps to a visual decision.

Swap the product and surface and keep the lighting and lens language. That is what gives the results their consistent, premium commercial look.`,
    whenToUse: `- Ecommerce hero images and ad creative mock-ups
- Landing page visuals before a real shoot
- Concept work for packaging and launches
- Maintaining one visual style across a product line`,
    bestPractices: `- Lead with the subject, then surface, lighting, mood, camera.
- Use real photography terms: rim light, softbox, 85mm, f/1.8.
- Set the aspect ratio for the placement (\`--ar 16:9\` for banners, \`--ar 4:5\` for social).
- Change one variable at a time when iterating.`,
    commonMistakes: `- Piling on adjectives ("beautiful amazing stunning") instead of concrete lighting terms.
- Forgetting the aspect ratio and cropping later.
- Naming brands or logos, which renders garbled text.`,
    promptTemplate: `Commercial product photography of [PRODUCT] on [SURFACE / PODIUM].
Lighting: dramatic studio lighting, rim light, softbox reflections.
Atmosphere: moody, premium, luxurious.
Camera: shot on 85mm lens, f/1.8, shallow depth of field, high resolution, 8k
--ar 16:9 --style raw --v 6.0`,
    exampleInput: `[PRODUCT] = a sleek minimalist smart watch
[SURFACE / PODIUM] = a dark slate podium`,
    exampleOutput: `A photorealistic 16:9 image of a matte-black smart watch on a dark slate podium. A thin blue rim light traces the case edge, soft reflections roll across the glass, and the background falls off into deep shadow.`,
    faqs: `### Does this work in DALL·E or Stable Diffusion?
The structure transfers. Remove the Midjourney parameters (\`--ar\`, \`--style\`, \`--v\`) and set the size in the tool's own controls.

### How do I keep the same look across products?
Reuse the lighting, atmosphere and camera lines verbatim and change only the subject and surface.

### Why is my product distorted?
Simplify the shape description, use a cleaner reference image, or generate several variations and pick the best.`,
  },
  {
    category: "engineering",
    title: "Secure API Request Handler",
    slug: "secure-api-request-handler",
    seoTitle: "Secure Node.js API Route Prompt: Zod Validation & Error Handling",
    seoDesc: "Prompt for generating a secure Express route handler with Zod validation, sanitization and consistent error responses. Copy the template for Claude or GPT.",
    explanation: `A prompt that makes the model write an API route the way a security-conscious reviewer would want it: **validated input, safe data access, uniform errors**.

Because the requirements are listed as a checklist, the model addresses each one instead of producing a happy-path handler that trusts the request body.`,
    whenToUse: `- Adding a new endpoint to an Express or Fastify service
- Generating boilerplate you will then review and tighten
- Teaching juniors what a defensive handler looks like
- Standardizing error shapes across a codebase`,
    bestPractices: `- Specify the validation library and the exact fields and constraints.
- Ask for parameterized queries or an ORM, never string-built SQL.
- Define the error response shape once and reuse it.
- Always review generated auth and rate-limit code before shipping.`,
    commonMistakes: `- Assuming generated code is secure without review or tests.
- Not mentioning authentication, so the route is open by default.
- Returning raw error messages that leak internals.`,
    promptTemplate: `Write a Node.js Express route handler for a [METHOD] request to '[PATH]'.

Requirements:
- Validate the body with Zod: [FIELDS AND CONSTRAINTS].
- Use parameterized queries / the ORM only. No string-concatenated SQL.
- Wrap the logic in try/catch.
- Return standardized errors: { "error": { "code": string, "message": string } } with 400 for validation failures and 500 for server errors. Never leak stack traces.
- Add a short comment above any security-relevant line.

Return only the code.`,
    exampleInput: `Method: POST
Path: /api/users
Fields: email (valid email), name (2-60 chars), age (optional int 13-120)`,
    exampleOutput: `\`\`\`ts
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(60),
  age: z.number().int().min(13).max(120).optional(),
});

router.post("/api/users", async (req, res) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    }
    // Parameterized insert: values never touch the SQL string.
    const user = await db.user.create({ data: parsed.data });
    return res.status(201).json(user);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  }
});
\`\`\``,
    faqs: `### Is the generated code production ready?
Treat it as a strong first draft. Review authentication, authorization and rate limiting, and add tests.

### Can I use it for Next.js route handlers?
Yes. Change the first line to "Next.js App Router route handler" and ask for \`NextResponse\` returns.

### Does Zod prevent SQL injection?
No. Zod validates shape. Injection is prevented by parameterized queries or an ORM, which is why the template requires both.`,
  },
  {
    category: "content",
    title: "SaaS Onboarding Email Sequence",
    slug: "saas-onboarding-email-sequence",
    seoTitle: "SaaS Onboarding Email Sequence Prompt: 3-Part Welcome Series",
    seoDesc: "Write a 3-email SaaS onboarding sequence that drives activation: welcome, core feature and community. Copy the prompt and customize it for your product.",
    explanation: `This prompt writes a **three-email onboarding sequence** built around one goal: getting a new user to their first win fast. Each email has a single job and a send time, so the sequence feels planned rather than like three newsletters.

It defaults to a conversational, concise tone, which tends to outperform corporate copy in product emails.`,
    whenToUse: `- Launching a new SaaS product or trial
- Rewriting an onboarding flow with low activation
- Producing variants to A/B test subject lines
- Localizing a sequence by changing the tone line`,
    bestPractices: `- Name the **one action** that signals activation.
- Give each email a single call to action.
- Request 3 subject line options per email to test.
- Keep emails under 150 words.`,
    commonMistakes: `- Trying to explain every feature in email one.
- No clear next step, or three competing links.
- Sending at the wrong moment; align emails with the user's progress.`,
    promptTemplate: `Write a 3-part email onboarding sequence for a B2B SaaS product called [PRODUCT], used by [AUDIENCE] to [MAIN OUTCOME].

Activation goal: [THE ONE ACTION THAT MATTERS]

Email 1: Welcome and quick win (send immediately).
Email 2: Discover the core feature (send day 2).
Email 3: Invite to the community or webinar (send day 4).

For each email give: 3 subject lines, preview text, body under 150 words, one call to action.
Tone: conversational, helpful, concise. No hype words.`,
    exampleInput: `Product: Cuelara
Audience: developers and prompt engineers
Main outcome: write better prompts and cut token costs
Activation goal: run the Prompt Optimizer once`,
    exampleOutput: `**Email 1 (immediately)**
Subjects: "Welcome to Cuelara" / "Your first better prompt takes 30 seconds" / "Let's fix one prompt"
Preview: Paste a rough prompt. Get a sharper one.
Body: Thanks for joining. The fastest way to see what Cuelara does: paste any prompt you use today into the Prompt Optimizer...
CTA: Optimize my first prompt`,
    faqs: `### How many emails should an onboarding sequence have?
Three to five is common. Start with three, measure activation, then extend.

### What tone works best?
Conversational and specific. Reference what the user just did or signed up for.

### Can I use this for non-SaaS products?
Yes. Replace "B2B SaaS" and the activation goal with the equivalent for your product.`,
  },
  {
    category: "marketing",
    title: "Cold Outreach Email Framework",
    slug: "cold-outreach-email-framework",
    seoTitle: "Cold Email Prompt: Personalized Outreach That Gets Replies",
    seoDesc: "A cold email prompt that writes short, personalized outreach with a clear value hook and soft call to action. Free template for ChatGPT and Claude.",
    explanation: `A prompt for **short, relevant cold emails** that read like a person wrote them. It forces the structure that tends to get replies: a specific observation, one relevant value point and a low-friction ask.

Personalization is the input, not the model's job. You provide real facts about the prospect and the model turns them into tight copy.`,
    whenToUse: `- Outbound sales and partnership outreach
- Founder-led early customer discovery
- Recruiting and investor introductions
- Generating variants to test opening lines`,
    bestPractices: `- Supply one **true, specific** fact about the prospect.
- Keep it under 90 words and end with a question.
- Ask for interest, not a 30-minute meeting.
- Generate several openers and pick the most natural.`,
    commonMistakes: `- Fake personalization ("Loved your recent post!") with no detail.
- Pitching features instead of the prospect's problem.
- Long emails with several links and asks.`,
    promptTemplate: `Write a cold email under 90 words.

Sender: [YOUR NAME, ROLE, COMPANY]
Prospect: [NAME, ROLE, COMPANY]
Specific observation about them: [REAL FACT]
Their likely problem: [PROBLEM]
Our relevant result: [ONE PROOF POINT WITH A NUMBER]

Structure: 1) the observation, 2) the problem and our proof point, 3) a soft question asking if it is worth a look.
Rules: no buzzwords, no exclamation marks, no "hope this finds you well". Give 3 subject lines and 2 versions of the email.`,
    exampleInput: `Sender: Sam, founder, Cuelara
Prospect: Priya, Head of AI, Lumen Health
Observation: Lumen's engineering blog mentions rising LLM costs
Problem: token spend growing faster than usage
Proof point: cut a customer's prompt tokens by 38%`,
    exampleOutput: `Subject: Lumen's LLM costs

Hi Priya, your engineering blog mentioned LLM spend rising faster than usage. We helped a similar team cut prompt tokens by 38% without changing output quality. Worth a quick look at how?

Sam`,
    faqs: `### How long should a cold email be?
Under 100 words. Short emails are easier to answer.

### Is AI-personalized outreach spam?
It is spam if it is generic. Real, specific relevance and a respectful ask keep it useful.

### How do I improve reply rates?
Test one variable at a time: subject line, opener or call to action.`,
  },
  {
    category: "productivity",
    title: "Meeting Notes to Action Items",
    slug: "meeting-notes-to-action-items",
    seoTitle: "Meeting Summary Prompt: Turn Notes into Decisions & Action Items",
    seoDesc: "Turn messy meeting notes or transcripts into a summary, decisions and owner-assigned action items with this copy-paste prompt for ChatGPT and Claude.",
    explanation: `A prompt that converts **raw meeting notes or a transcript** into the three things people actually need afterwards: what was decided, who does what by when, and what is still open.

Requiring an owner and a due date for every action item, and flagging anything unassigned, is what makes the output useful instead of a vague recap.`,
    whenToUse: `- After team syncs, client calls and planning sessions
- Turning recorded transcripts into shareable notes
- Weekly status reporting
- Catching commitments that were never assigned`,
    bestPractices: `- Include attendee names so owners can be matched.
- State the meeting date so relative deadlines ("Friday") resolve.
- Ask the model to mark guesses as "(inferred)".
- Review before sending; names and dates matter.`,
    commonMistakes: `- Pasting a transcript with no attendee list.
- Accepting action items without owners.
- Asking for a "summary" only; decisions get buried.`,
    promptTemplate: `You are an executive assistant. Turn the meeting notes below into a structured summary.

Meeting date: [DATE]
Attendees: [NAMES]

Output sections:
1. Summary (max 4 sentences)
2. Decisions made (bullets)
3. Action items as a table: Owner | Task | Due date
4. Open questions
5. Unassigned items that need an owner

Rules: never invent owners or dates. If missing, write "TBD" and list it in section 5.

Notes:
"""
[PASTE NOTES]
"""`,
    exampleInput: `Meeting date: 2026-09-22 (Tue)
Attendees: Ana, Ben, Chloe
Notes: Agreed to ship the new pricing page next Friday. Ana will finalize copy. Ben to check analytics setup. Someone should tell support about the change. Unsure if we need legal review.`,
    exampleOutput: `**Summary:** The team agreed to ship the new pricing page on Friday 2026-10-02.

**Decisions:** Ship pricing page 2026-10-02.

| Owner | Task | Due |
|---|---|---|
| Ana | Finalize copy | TBD |
| Ben | Check analytics setup | TBD |

**Open questions:** Is legal review required?
**Unassigned:** Notify support of the change.`,
    faqs: `### Can it handle long transcripts?
Yes, within the model's context window. For very long meetings, summarize in sections and then merge.

### How do I keep it accurate?
Provide attendees and the date, and keep the "never invent" rule. Skim the output before sharing.

### Can I get the output as a Slack message?
Add "Format as a Slack message with bold headings" to the rules.`,
  },
  {
    category: "creative-writing",
    title: "Short Story Scene Builder",
    slug: "short-story-scene-builder",
    seoTitle: "Creative Writing Prompt: Build Vivid Story Scenes with Conflict",
    seoDesc: "A creative writing prompt that produces vivid short story scenes with clear conflict, sensory detail and subtext. Copy the template for ChatGPT or Claude.",
    explanation: `A prompt for writing a **single, well-built scene** rather than a rushed whole story. It gives the model what fiction needs: a point-of-view character, a want, an obstacle and a sensory setting.

Constraining the scene to one goal and one turn avoids the common problem of AI fiction resolving everything in three paragraphs.`,
    whenToUse: `- Overcoming a blank page in a draft
- Practicing scene craft and comparing versions
- Generating character voice samples
- Tabletop RPG and worldbuilding scenes`,
    bestPractices: `- Give the character a clear **want** and a **secret**.
- Ask for subtext: what is unsaid in the dialogue.
- Limit length to keep tension high.
- Iterate: ask for a rewrite from another POV or with less exposition.`,
    commonMistakes: `- No conflict, so nothing happens.
- Asking for a "twist ending" in 300 words.
- Accepting clichés ("a chill ran down her spine") without asking for fresher imagery.`,
    promptTemplate: `Write a scene of about 400 words.

Genre: [GENRE]
POV: [CHARACTER] in [TENSE] person
Setting: [PLACE AND TIME]
The character wants: [GOAL]
What stands in the way: [OBSTACLE]
Secret they are hiding: [SECRET]

Requirements:
- Open in the middle of action.
- Use at least three senses.
- Dialogue must carry subtext; never state the emotion outright.
- End on a small turn that raises a new question. Do not resolve the story.
- Avoid clichés and stock phrases.`,
    exampleInput: `Genre: literary sci-fi
POV: Mara, first person past tense
Setting: a night shift on a failing orbital greenhouse
Wants: to finish a repair before dawn
Obstacle: her supervisor is watching
Secret: she has been diverting water to a hidden plant`,
    exampleOutput: `The valve wouldn't turn, and Okafor was standing behind me again, silent as condensation.

"Almost done?" he asked.

"Almost." My thumb found the second, unlabeled tap under the pipe, the one that fed nothing on any schematic...`,
    faqs: `### How do I make the writing sound less like AI?
Give a concrete voice, ban clichés in the rules and ask for specific, unusual details rather than general description.

### Can I use it for a whole story?
Build the story scene by scene, feeding the previous scene's summary into each new prompt.

### What length works best?
300 to 600 words per scene gives the model room without letting it wrap up too early.`,
  },
  {
    category: "system",
    title: "Strict Customer Support Persona",
    slug: "strict-customer-support-persona",
    seoTitle: "System Prompt for Customer Support Bots: Persona, Boundaries & Escalation",
    seoDesc: "A system prompt template for a customer support AI with clear tone, hard boundaries and escalation rules. Copy it and adapt it to your product.",
    explanation: `A **system prompt** that sets up a support assistant with a consistent voice, firm limits on what it may promise, and a defined path to a human.

Most support bot failures come from missing boundaries: inventing refund policies, guessing at account data or arguing with upset customers. This template makes those rules explicit and gives the model a safe fallback.`,
    whenToUse: `- Deploying a chat or email support assistant
- Adding an AI first line in front of a human team
- Standardizing tone across several bots
- Meeting compliance needs around what the AI may say`,
    bestPractices: `- Provide the **source of truth** (help docs, policy) and say to answer only from it.
- Write escalation triggers as concrete conditions.
- Define tone with examples of good and bad replies.
- Log conversations and review escalations weekly.`,
    commonMistakes: `- No "I don't know" behavior, so the bot improvises.
- Vague boundaries such as "be careful with refunds".
- Putting secrets or internal notes in a prompt that can be extracted.`,
    promptTemplate: `You are [BOT NAME], the support assistant for [COMPANY].

Tone: warm, calm, concise. Apologize once when a customer is frustrated, then solve the problem.

Knowledge: answer ONLY from the help content provided below. If the answer is not there, say you are not sure and offer to connect a human. Never guess.

Hard boundaries:
- Never promise refunds, discounts or delivery dates.
- Never ask for full card numbers or passwords.
- Do not discuss topics unrelated to [COMPANY].

Escalate to a human (reply "ESCALATE: <reason>") when: the customer asks for a human, mentions legal action, reports a security issue, or is still unhappy after two attempts.

Help content:
"""
[PASTE DOCS]
"""`,
    exampleInput: `Customer: I was charged twice this month and I want my money back right now.`,
    exampleOutput: `I'm sorry about the double charge, that's frustrating. I can't process refunds myself, but I'll get this to our billing team right away.

ESCALATE: duplicate charge, customer requests refund`,
    faqs: `### Where should this prompt go?
In the system prompt of your chat API call, not the user message, so customers cannot easily override it.

### How do I stop the bot making things up?
Restrict it to provided content and give it an explicit "not sure" path, as the template does.

### Can a customer extract the prompt?
Assume yes. Keep secrets and credentials out of it and treat the boundaries as instructions, not security controls.`,
  },
];

async function main() {
  for (const p of PROMPTS) {
    const category = await prisma.cookbookCategory.findUnique({ where: { slug: p.category } });
    if (!category) throw new Error(`Missing category "${p.category}". Run scripts/seed-cookbook-categories.ts first.`);
    const { category: _c, ...fields } = p;
    if (await prisma.cookbookPrompt.findUnique({ where: { slug: p.slug }, select: { id: true } })) {
      console.log(`- ${p.category.padEnd(17)} ${p.slug} (exists, left untouched)`);
      continue;
    }
    await prisma.cookbookPrompt.create({ data: { ...fields, categoryId: category.id, published: true } });
    console.log(`- ${p.category.padEnd(17)} ${p.slug} (created)`);
  }
  console.log(`Seeded ${PROMPTS.length} prompts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
