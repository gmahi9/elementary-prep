# Elementary Prep

Sunny Steps is a kid-friendly practice app for elementary students. Kindergarten and grades 1 through 5 are ready.

It runs in the browser. Guests keep scores for the current visit. Sign-in is optional and saves scores for each grade.

## Disclaimer

Sunny Steps is unofficial practice. It is not affiliated with, endorsed by, or a source of items from CogAT, the Cognitive Abilities Test, i-Ready, Curriculum Associates, MAP Growth, NWEA, the Torrance Tests of Creative Thinking, or their publishers. Every question was written for this project in the style of those kinds of tasks. Practice results do not predict school placement.

## Features

- Grade picker for kindergarten and grades 1 through 5. The last grade you pick is remembered. Signed-in scores stay separate for each grade
- Section tabs for CogAT-style reasoning, i-Ready-style math, MAP-style reading, and Torrance-style creative challenges
- Practice with instant feedback, a short explanation, and a "Learn this skill" link
- Timed or untimed mock tests with an end summary by skill
- A review queue for missed questions
- Scoreboard for correct answers, questions answered, streak, and score
- Badges and per-skill progress. Guest scores stay in the browser tab for the visit. A signed-in account stores scores, streaks, badges, and mock-test history for each grade
- Optional sign-in with Google, Microsoft, or GitHub. The first sign-in can combine scores already on the device. Providers without keys stay hidden
- Read-aloud for the question and choices through the Web Speech API
- Large tap targets, keyboard answers (1–4), and a grown-ups view with a skill mastery chart
- Download for offline: one HTML file that opens without a network
- Hash routing and relative asset paths, so the same build works at a subdomain root (`https://elementary.aiteksolutions.net/`) and under a path (`https://aiteksolutions.net/elementary/`)

Creative prompts are open-ended. They use a self-check rubric and are not part of the score.

## Content coverage

Questions live in D1, not in the client bundle. The files under `seeds/questions/` are the source. Grade 3 has **1,167** questions, **1,137** of them scored. Kindergarten and grades 1, 2, 4, and 5 each have at least 200 scored questions. Counts below for grade 3 are unique items, not copies of the same stem.

| Section | Questions | Scored | What is inside |
| --- | ---: | ---: | --- |
| CogAT-style reasoning | 362 | 362 | Verbal analogies 60, verbal classification 42, sentence completion 42, number series 56, number puzzles 56, number analogies 54, figure matrices 22, paper folding 18, figure classification 12 |
| i-Ready-style math | 551 | 551 | Place value 80, add and subtract 96, multiplication and division 72, word problems 52, fractions 68, measurement 31, time 40, money 24, area and perimeter 36, geometry 28, graphs and data 24 |
| MAP-style reading | 224 | 224 | 21 original passages with main idea, inference, vocabulary, and text evidence (84), plus grammar and language 140 |
| Torrance-style creative | 30 | 0 | Open prompts with a fluency, flexibility, originality, and elaboration checklist |
| **Total** | **1,167** | **1,137** | |

Figure questions are drawn as inline SVG. Math items that can be recomputed (operations, place value, rounding, fractions, time, money, area, perimeter, graphs, and number patterns) carry a `verify` field. `npm test` recomputes those answers, checks that evidence sentences appear in the passage, and fails if any question text is repeated.

Skill links come from one map in `src/data/skills.json`. Each scored question points at that map. Links go to Khan Academy, the Common Core State Standards, Math is Fun, PBS LearningMedia, or ReadWriteThink.

## Local development

Requires Node.js 22.

```bash
npm install
npm test
npm run dev
npm run build
```

`npm run dev` starts Vite. `npm run build` typechecks and writes `dist/`. `npm run preview` serves that folder.

The Vite `base` is `./`, and routes use the URL hash (`#/practice`, `#/test`, `#/review`, `#/badges`, `#/grownups`). Assets and the offline download stay on this origin.

## Sign-in

See [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md) for the OAuth apps, the D1 database, and the Pages secrets. `npm run dev` serves the question API from `seeds/questions/` so practice works without D1. Sign-in still runs when the site is served with the Pages Functions in `functions/`. Production reads questions from the D1 binding `DB`.

## Netlify

`netlify.toml` builds with `npm run build`, publishes `dist`, and sets Node 22. Response headers include a content security policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Strict-Transport-Security`.

## Questions in D1

Adding a question or a grade is a database insert. The site does not need a new build for new rows.

1. Add a JSON file under `seeds/questions/grade-<n>/`, or append items to a file already there. Kindergarten is `grade-0`. Use the same item shape as the grade 3 files: a stable id such as `g3-fractions-0042`, a grade, section, topic, prompt, choices, answer index, a step-by-step explanation, and a free lesson link.
2. Validate the bank and write SQL:

```bash
npm run seed:sql
```

That checks every item (schema, unique ids, the answer is one of the choices, and an explanation is present) and writes idempotent `INSERT OR REPLACE` statements to `seeds/out/questions.sql`.

3. Create the table, if this database does not have it yet, and load the rows.

Production:

```bash
npx wrangler d1 migrations apply elementary-prep --remote
npx wrangler d1 execute elementary-prep --remote --file=seeds/out/questions.sql
```

Local D1:

```bash
npm run seed:local
```

`seed:local` writes the SQL, applies migrations to the local database, and executes `seeds/out/questions.sql`. The database id in `wrangler.toml` stays as it is.

The public Pages Functions are:

- `GET /api/grades` returns each grade and how many active questions it has
- `GET /api/sections?grade=` returns the sections and topics for that grade
- `GET /api/questions?grade=&section=&limit=` returns a random sample of active questions

`grade` may be `K` or `0` through `5`. `section` is `cogat`, `iready`, `map`, or `torrance`. `limit` defaults to 24 and cannot be higher than 80.

## Contributing questions

Edit the JSON under `seeds/questions/`, then run `npm run seed:sql` and the execute command above. `npm run generate` rewrites only `seeds/questions/grade-3/`. Do not run generate after a hand edit unless you have moved that edit into `scripts/`. `node scripts/generate-grades.mjs` rewrites kindergarten and grades 1, 2, 4, and 5; do not run it after a hand edit to those files.

Scored questions use this shape:

```json
{
  "id": "g3-va-001",
  "grade": 3,
  "section": "cogat",
  "topic": "verbal-analogies",
  "topicLabel": "Verbal analogies",
  "prompt": "Puppy is to dog as kitten is to ____.",
  "choices": ["puppy", "bone", "cat", "bark"],
  "answerIndex": 2,
  "explanation": "A puppy is a young dog. In the same way, a kitten is a young cat.",
  "skill": "L.3.5",
  "skillLabel": "Word relationships",
  "difficulty": 1,
  "links": [
    {
      "label": "Khan Academy: 3rd grade vocabulary",
      "href": "https://www.khanacademy.org/ela/cc-3rd-reading-vocab/xfb4fc0bf01437792:cc-3rd-vocab"
    }
  ],
  "scored": true,
  "verify": { "kind": "authored" }
}
```

Rules for a new item:

- The prompt text must be unique across the whole bank.
- A scored item needs 4 or 5 choices (one answer and 3 or 4 distractors), a difficulty of 1, 2, or 3, and an explanation a child can follow.
- Grade 3 `links` must be copied from the matching skill in `src/data/skills.json`. Other grades need one or two real `https` lesson links (Khan Academy, the Common Core State Standards, Math is Fun, PBS LearningMedia, or ReadWriteThink). The first link is stored as `lesson_url`.
- Math that can be recalculated should include a `verify` object the test can recompute (`expr`, `series`, `round`, `fraction`, `money`, and the other kinds in `src/lib/verify.mjs`).
- Reading evidence must quote a sentence that appears in the passage. The other choices must not.
- Creative items set `scored` to false, leave the choices empty, and include a rubric of at least four checks.
- Figure prompts can include a `figure` object. The app renders it as inline SVG.

Sections are `cogat`, `iready`, `map`, and `torrance`.

## License

MIT. See [LICENSE](LICENSE). Copyright 2026 gmahi9.
