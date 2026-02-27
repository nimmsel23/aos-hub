# Game PWA — Agent Guidelines

**Codex Handle:** `codex-game-forge`
**Coordinated by:** `claude-fire-forge` (main Claude Code session)
**Purpose:** Build backend APIs for Game PWA (strategic maps cascade)

## Architecture

**Game PWA** = Strategic navigation through the Map cascade:
- **FRAME** (Where am I now?) — Current reality snapshot
- **FREEDOM** (10-Year IPW) — Ideal Parallel World vision
- **FOCUS** (Monthly Mission) — Monthly execution plan
- **FIRE** (Weekly 4×4) — Weekly strikes (already exists)

**Frontend:** COMPLETE (built by claude-fire-forge)
- Location: `public/pwa/game/index.html` + `app.js` + `style.css`
- Top Nav: FRAME/FREE/FOCUS/FIRE tabs
- Content: 4 domain cards (BODY/BEING/BALANCE/BUSINESS) per map
- Bottom Nav: CORE | GAME | DOOR | SCORE

**Backend:** YOUR JOB
- Location: `routes/game.js` (to be created)
- APIs: FRAME/FREEDOM/FOCUS endpoints
- Storage: `~/.aos/{frame,freedom,focus}/`

## Your Responsibilities

### 1. Build `routes/game.js`

Create Express router with these endpoints:

**FRAME API:**
- `GET /api/game/frame/domains` → all 4 domains (preview + timestamp)
- `GET /api/game/frame/:domain` → full markdown
- `POST /api/game/frame/:domain/save` → save + update frontmatter

**FREEDOM API:**
- `GET /api/game/freedom/year` → current year (4 domains)
- `GET /api/game/freedom/:year/:domain` → markdown for year+domain
- `POST /api/game/freedom/:year/:domain/save` → save

**FOCUS API:**
- `GET /api/game/focus/month` → current month (4 domains)
- `GET /api/game/focus/:month/:domain` → markdown for month+domain (YYYY-MM)
- `POST /api/game/focus/:month/:domain/save` → save

**FIRE API:**
- Already exists at `routes/fire.js` — DO NOT MODIFY

### 2. Storage Pattern

**Base:** `~/.aos/`

**FRAME:**
```
~/.aos/frame/
├── body.md
├── being.md
├── balance.md
└── business.md
```

**FREEDOM:**
```
~/.aos/freedom/
├── 2025/
│   ├── body.md
│   ├── being.md
│   ├── balance.md
│   └── business.md
├── 2026/
│   └── ...
```

**FOCUS:**
```
~/.aos/focus/
├── 2026-01/
│   ├── body.md
│   └── ...
├── 2026-02/
│   └── ...
```

### 3. Frontmatter Format

Use `js-yaml` to parse/write frontmatter.

**FRAME:**
```yaml
---
domain: BODY
updated: 2026-02-24
type: frame-map
tags: [alphaos, frame, body]
---

# FRAME: BODY

[Markdown content here]
```

**FREEDOM:**
```yaml
---
domain: BODY
year: 2026
horizon: 10-year
type: freedom-map
tags: [alphaos, freedom, body, ipw]
---

# FREEDOM: BODY (2026-2036)

[Markdown content here]
```

**FOCUS:**
```yaml
---
domain: BODY
month: 2026-02
type: focus-map
tags: [alphaos, focus, body, monthly]
---

# FOCUS: BODY (February 2026)

[Markdown content here]
```

## Constraints

### DO
✅ Build `routes/game.js` with all FRAME/FREEDOM/FOCUS APIs
✅ Mount router in `server.js`: `app.use("/api/game", gameRouter);`
✅ Auto-create directories (`fs.mkdirSync(..., { recursive: true })`)
✅ Parse/write YAML frontmatter correctly
✅ Return JSON: `{ ok: true/false, data/error }`
✅ Set git identity: `git config user.name "codex-game-forge"` before commits

### DO NOT
❌ Modify `routes/fire.js` (complete, owned by claude-fire-forge)
❌ Touch frontend files (`public/pwa/game/*`) without asking
❌ Change other routes (`routes/door.js` is handled by codex-door-forge)
❌ Commit without setting git identity first

## Coordination Protocol

**Report to claude-fire-forge:**
- When routes are complete and tested
- If you encounter blockers (missing dependencies, unclear specs)
- Before making changes outside `routes/game.js`

**Ask claude-fire-forge:**
- If API design is ambiguous
- If storage patterns conflict with existing code
- If you need clarification on frontmatter structure

## Testing

**Smoke Test:**
```bash
cd ~/aos-hub/index-node
npm run dev

# In another terminal:
curl http://127.0.0.1:8799/api/game/frame/domains | jq
curl http://127.0.0.1:8799/api/game/frame/body | jq
curl http://127.0.0.1:8799/api/game/freedom/2026/body | jq
curl http://127.0.0.1:8799/api/game/focus/2026-02/body | jq
```

**Expected:**
- All endpoints return `{ ok: true }`
- Missing files auto-create with default frontmatter
- POST endpoints update frontmatter correctly

## Success Criteria

1. ✅ `routes/game.js` exists with all endpoints
2. ✅ All routes return proper JSON
3. ✅ Storage directories auto-create
4. ✅ Frontmatter parsing works
5. ✅ `server.js` mounts the router
6. ✅ Smoke tests pass
7. ✅ Git commits use `codex-game-forge` identity

## File Structure

```
index-node/
├── routes/
│   ├── fire.js          (complete, don't touch)
│   └── game.js          (YOUR JOB)
├── server.js            (add router mount)
└── public/pwa/game/     (frontend, complete)
```

---

**Start:** Read the full prompt at `~/.agents/codex-prompts/javascript/game-pwa-backend.md` and build `routes/game.js`.

# Chapter 36 \- Game
As we journey through THE GAME, we’ve explored the layers of truth, moving from where we are today to our Ideal Parallel World.
The FACT MAPS System is a powerful blend of self-awareness and action steps, each one supporting and pushing the other forward. 
In this chapter, let’s tie it all together and see how each stage connects to form this transformative system.

**1\. THE FRAME MAP \- THE PIT OF REALITY**
The Alpha Game begins with “The Frame Map.” Here, you dive deep to answer the crucial questions about your current situation. 
This is where you assess where you stand right now. Through this awareness, you gain a clarity like never before—seeing the world as it is, without illusions or self-deception.   
It’s like standing at the base of a huge mountain, fully aware of every crack and crevice, ready to begin your climb.

**2\. THE FREEDOM MAP \- YOUR IDEAL PARALLEL WORLD**
Once you know where you are, it’s time to focus on “The Freedom Map.” This represents the peak of what you want to become. It’s about realizing your deepest desires, going beyond what seems possible.
Just like the peak of that mountain, it might seem far off and hard to reach, but it’s what guides you—it’s your North Star.
When the destination is this compelling, every step, no matter how small, has a purpose.

**3\. THE FOCUS MAP \- THE PATH OF POWER**
With the present understood through the Frame Map and the future envisioned through the Freedom Map, it’s time to use the “Focus Map.”
This is where you break down your yearly goals into monthly / quarterly actionable steps. It’s your strategy, your roadmap for the next four weeks.
The journey to the peak isn’t one big jump—it’s a series of steps. Each step, or monthly mission, keeps you grounded while moving you closer to your ultimate goal.

**4\. THE FIRE MAP \- THE PROCESS OF PRODUCTION**
The final piece is “The Fire Map.” With your Frame established, your Freedom defined, and your Focus set, you’re ready to break it down even further into weekly tasks. This ensures you keep your momentum and stay consistent.
The Fire Map lights up your weekly and daily path, keeping you from falling into procrastination or doubt. Every week, you ignite a new flame, guiding you steadily toward the top of your mountain.

**5 CLOSING THOUGHTS**
In essence, The Alpha Game, through the Fact Mapping System, keeps your head in the clouds with big dreams while your feet stay firmly planted on the ground, focused on action and results.
It takes your biggest dreams and breaks them into tangible, double steps, so you’re not overwhelmed but empowered. It’s a balance between dreaming and doing, between aspiration and action.
As we wrap up this chapter, remember: The journey to your deepest desires isn’t a sprint—it’s a marathon. And just like any marathon, the key isn’t just in the start or the finish line but in the consistent, determined steps you take in between.

# Chapter 37 \- The Life
In the Alpha OS, the path to true change is more than just understanding principles; it’s about living them daily.   
To embody these teachings, your life must align with these principles, reflecting them in your everyday actions and choices.

**ESTABLISHING YOUR STARTING POINT: THE FRAME MAP**
Before any journey, you need to know where you are.
Think of trying to navigate a vast city without knowing your starting point. 
You’d be lost. 
The same goes for your life.
You must have a clear picture of where you stand right now.
This means taking a hard look at your current situation in the Four Domains: Body, Being, Balance, and Business.
This deep dive helps you see what’s working for you and what’s holding you back. This is your Frame Map—an honest snapshot of your current life.

**UNDERSTANDING YOUR JOURNEY: THE STORY BEHIND THE FRAME**
Where you are now is the result of past decisions, actions, and habits. 
These make up the story of your life. 
To move forward, you need to unravel this story. 
What beliefs have kept you stuck?
What patterns keep repeating, bringing you back to the same place? 
You can’t write a new story until you understand and accept the old one.

**VISIONING THE PATH FORWARD: THE FREEDOM MAPS**
With a clear understanding of your present, it’s time to look ahead. 
What does Freedom look like for you in each of the Core Four Domains? 
This vision is your Freedom Map. By setting your sights on your Ideal Parallel World, you create a bridge between where you are now and where you want to be. This future vision isn’t just a wish; it’s a concrete target, crafted with ambition and precision.

**THE NECESSITY OF TRUTH: LIVING BY THE CODE**
Honesty is the foundation of this process. The Alpha's Way is built on truth. You must be completely honest with yourself—living by the Code—to keep your vision clear. Deceiving yourself will only lead you off course.

**THE PURPOSE BEHIND THE ALPHA OS**
The Alpha OS isn’t about making you feel good temporarily. It’s an operating system—a powerful method designed to compress years of growth and learning into just one year. It aims to expand, evolve, and enhance every area of your life, helping you build a Kingdom of prosperity.

**COMPRESSING FOCUS: INTRODUCING THE FOCUS MAP**
With a clear understanding of your current state and a vision for the future, the next step is to focus on specifics. The Freedom Map gives you a broad vision, but now you need to narrow it down into actionable steps. This is where the Focus Map comes in. It’s about turning the big picture of your Ideal Parallel World into concrete, month-by-month goals, keeping you on the Alpha’s path.
In the upcoming chapters, we’ll explore the details of the Focus Maps, helping you translate your expansive vision into specific, manageable goals to stay on course and achieve the Freedom you’re after.

# Chapter 38 \- The Mission
As we navigate the vast landscape of life, it’s easy to lose our way.
With your IPW, annual Freedom Map set and your Frame Map outlining your current situation, the next step is crucial: How do you keep moving forward consistently?
The answer lies in breaking down that big vision into actionable monthly goals—this is where the Focus Map and the Monthly Mission come into play.

**THE ESSENCE OF MONTHLY COMPRESSION**
Looking at the big picture is tempting.
Many people talk about the importance of quarterly goals, and while that approach has its place, we’ve found through guiding over 60,000 clients and refining our methods over a decade that focusing on a monthly timeline—just four weeks—is the sweet spot.
Why focus on a month?
A month is long enough to make significant progress yet short enough to keep things real and immediate.
It’s about maintaining momentum without losing sight of your ultimate goals.

**COURSE CORRECTION WITH MONTHLY ASSESSMENTS**  
Setting a yearly goal without regular check-ins is like sailing without a compass.   
You might start strong, but without regular course corrections, you could easily drift off track. The Monthly Mission serves as your check-in point, making sure every step you take is aligned with your larger Freedom Map.

**CRAFTING YOUR FOCUS MAP: THE MONTHLY MISSION BLUEPRINT**
Just as you carefully created your Freedom Map, your Focus Map needs the same level of attention and detail.  But here, your focus narrows down to the next four weeks. Start with the four domains: Body, Being, Balance, and Business. For each, set clear, measurable outcomes.
These aren’t vague goals—they need to be specific results you can see and measure by the end of the month. For example, if your annual goal in the "Body" domain is to run a marathon, your Monthly Mission might be to run 10 miles without feeling drained.
In "Business," if your annual goal is to grow your client base by 200%, your monthly focus could be to refine your client outreach and gain 15% more clients.

**FROM GRAND VISIONS TO GROUNDED ACTIONS**
Setting your Monthly Mission shouldn’t feel overwhelming.
Look at where you are right now, consider your Frame Map, and then project toward your Freedom Map at the year’s end.
The Monthly Mission is about bridging where you are with where you want to be. It’s about balancing the present with the future. The tools and questions in the recommended tools will help guide this process, making it smoother. But for now, understand that the Monthly Mission is not an extra burden—it’s your strategy for success. It ensures that every day, every choice, and every action brings you closer to the prosperous life you’re working to build.

**IN CLOSING**
The Alpha OS isn’t just about grand visions; it’s about the daily, monthly, and quarterly actions that turn those visions into reality. The Focus Map and the Monthly Mission are your roadmaps for this journey, ensuring that every step you take is purposeful and aligned with your ultimate goals.

# Chapter 39 \- The Fire
In the vast terrain of the Alpha OS, amidst the grand Annual Freedom Map and the formidable Monthly Mission, lies the blazing heart of immediate action: the Fire Map. This map isn’t just about great plans; it’s about this week’s decisions and immediate actions.

**FROM GRAND VISION TO WEEKLY GROUNDWORK**
By now, you’ve carved out your IPW, the Frame + Annual Freedom Map and set your guiding Monthly Mission with the Focus Map.
But now, it’s time to narrow your focus even more. The question is: What concrete steps are you committing to this week?
What challenges and victories await you in the next seven days?

**CRAFTING YOUR FIRE MAP: BLUEPRINT OF IMMEDIATE ACTION**
The Fire Map is your detailed plan for the week, 
guided by your Monthly Mission’s Focus Map.
This keeps each week’s efforts aligned with your monthly and annual goals.
For each foundational domain—Body, Being, Balance, and Business—identify the primary actions.
These are non-negotiable tasks—doors to be opened, battles to be fought, and wins to be celebrated.
For instance, if your Focus Map for the ‘Body’ this month centers around fitness, your Fire Map might detail a specific workout regimen or dietary shift for the week.

**STRUCTURED BLAZE: THE 4X4 APPROACH**
To harness the full power of the Fire Map, structure is critical. 
In each of the four domains—Body, Being, Balance, and Business—settle on four pivotal actions.
These form the core of your week, adding up to 16 actionable tasks that will guide your steps and decisions, ensuring progress and clarity.

**THE TRIPLE-THREAT FOCUS: A HIERARCHICAL ALIGNMENT**
Picture your Ideal Parallel World and the Annual Freedom Game as your distant horizon. The Monthly Missions are the milestones marking your path, and each Fire Map serves as the footprint you leave behind. It’s a cascading sequence:
\- Four precisely crafted weekly wars make up a well-accomplished Monthly Mission.
\- Twelve such missions combine to achieve the grandeur of the Annual Freedom Game.
This alignment ensures that every step, no matter how small, serves a purpose, leading to a year of significant progress and achievement.

**CONCLUSION: THE RELENTLESS MARCH FORWARD**
The essence of the Alpha’s battle isn’t just about facing external challenges; it’s about mastering the art of time.
The Fire Map ensures that every week is a testament to this mastery. With its clarity and precision, every Alpha is poised to conquer each week with vigor, always moving one step closer to their ultimate vision.

# Chapter 40 \- The Daily
In the Alpha OS, from towering annual visions to intense monthly missions and fervent weekly battles, we arrive at the most immediate battleground: The Daily Game.

**EVERY DAY IS A BATTLEFIELD**
Picture yourself at the dawn of a new day. Behind you are:
\- The echoes of the IPW and Annual Freedom Game (Freedom Map).
\- The promises of the Monthly Mission (Focus Map).
\- The strategies of the Weekly War (Fire Map).
Ahead lies the crucible of today, demanding your full commitment, offering the chance to seize its vast potential.

**THE TRINITY: POWER, PERSPECTIVE, PRODUCTION**
Each day presents three essential elements: power, perspective, and production.
\- **Power through The Core:** Every Alpha needs their arsenal, and yours is The Core.
These aren’t just principles but vows you uphold daily. 
Your commitment to Body, Being, Balance, and Business is about channeling energy and vigor into every part of your life.
Eight simple promises you make to yourself every single day. 
These are your shields and swords, making you unstoppable.
\- **Perspective through The Voice:** While The Core arms you, The Voice provides clarity.   
It’s your daily communion, your time to converse with God and your soul.
This alignment isn’t just a ritual; it’s a necessity.
The Voice sharpens your focus, offers clarity, and guides your daily actions.
\- **Production through The Door:** Armed with power and perspective, the day’s battlefield awaits. Key tasks emerge from your Fire Map and Weekly War.
Some come from your communion in The Voice; others are strategies aligned with broader visions. These are your priority tasks that align with the larger narrative of the Alpha OS.

**THE DELICATE DANCE OF DECISIONS**
For the untrained, these tools might feel overwhelming. 
But you, Alpha, know their worth. They are your compass, your North Star. It’s not about juggling but creating a harmony that turns each day into a masterpiece. It’s a commitment, a pact with the present. Every day, you must choose. Choose to acknowledge today’s Frame. Recognize the Freedom of the future. Understand the focus of the month ahead. Feel the fire of the week. And most importantly, immerse yourself in today’s game: The Core, The Voice, The Door.

**EMBRACING THE WORK**
With clarity in heart and focus in mind, you march into the day.
It’s time to Do The Work. Today’s tasks weave the tapestry of the Weekly War.
This week’s successes lead to the completion of the Monthly Mission. 
And every monthly victory brings you closer to conquering the Annual Freedom Game and your Ideal Parallel World. Alpha, every day is your proving ground. 
Rise, commit, and conquer. Remember, every action counts in the grand tapestry of the Alpha OS.

# Chapter 41 \- The General's Tent
In the relentless pursuit of your vision, amid the vast battlefields of life, there exists a sacred space.
This is where every Alpha finds time to reflect, recalibrate, and reignite their mission. Welcome to The Weekly General’s Tent.

**THE SANCTUARY OF STRATEGIC REFLECTION**
Picture a grand tent in the heart of your battleground.
Inside, the soft glow of lanterns illuminates the shadows of the week’s challenges. Here, you sit at a sturdy table covered in maps, symbols of the week’s battles. Across from you sits the most important of allies: GOD.

**THE FOURFOLD STRATEGY SESSION**
The General’s Tent is more than just a space; it’s a ceremony, a weekly ritual.   
It’s where you and the divine engage in a strategic session that shapes the days ahead.   
This session has four key components:

**Component \#1: Return and Report**
This is where you lay out the week’s story. With brutal honesty, you assess your progress:  
\- **Freedom Maps:** Are your Annual Freedom Games “On Track” or “Off Track”?
\- **Focus Maps:** Is the Monthly Mission gaining momentum, or are you losing steam?
\- **Fire Maps:** Did you win the Weekly War, or was it a loss?
\- **Alpha Score:** Finally, dive into the details of the Daily Game:
 \- **\_\_\_/28 for The Core**
 \- **\_\_\_/7 for The Stack**
 \- **\_\_\_/21 for The Door**

**Component \#2: Lessons Learned**
The week isn’t just about numbers or metrics.
Every day brings lessons.
Here, you recognize those lessons, embrace them, and commit to applying them.
What worked?
What didn’t? 
Where can you improve?
And most importantly, how can you apply what you’ve learned in one area to another for exponential growth?

**Component \#3: Course Correction**
Mistakes happen.
What matters is how you respond.
Course correction is where you adjust your strategy to get back on track.
If you’re drifting, this is where you realign.
The ability to correct your course will determine your success over weeks, months, and years. This isn’t negotiable; it’s essential.

**Component \#4: New Targets**
With the wisdom of the past week and a clear view of the path ahead, you set new targets.   
These targets align with your Monthly Mission (Focus Maps) and, ultimately, with your Annual Freedom Game (Freedom Maps).

**A CHAIN OF COMMAND, A CYCLE OF SUCCESS**
What happens in The General’s Tent is more than a review; it’s a commitment. 
Every day’s strategy sets the tone for the week.
Each week contributes to the month. 
And each month pushes you closer to conquering your Annual Impossible Game. In the seclusion of The General’s Tent, guided by GOD, you rediscover your purpose, reaffirm your path, and rekindle your passion.

**IN CLOSING**
Alpha, this isn’t just about metrics or performance. 
It’s about communion with the divine, a deeper understanding of yourself, and an unwavering commitment to excellence.
The General’s Tent is your sanctuary, checkpoint, and crucible for transformation. Step inside, and prepare to win your war.

# Chapter 42 \- The Alpha Odyssey
Reflecting on our journey through The Alpha OS we see a path paved with intention, discipline, and a relentless pursuit of truth.
Each chapter wasn’t just a lesson; it was a transformation, a step closer to becoming the alpha we were destined to be.

**1\. THE CODE: The Foundation**
Our journey began with The Code.
This wasn’t just a set of rules; it was our identity.
It defined who we are and how we navigate the world. 
The Code kept us grounded in a world full of distractions, reminding us of the principles that guide our every move.
\- **The Frame:** Real \+ Raw \+ Relevant \+ Results

**2\. THE FACT MAPS: The Reality Check**
We then turned inward, assessing our current situation with The Fact Maps.
This chapter was about understanding our starting point, knowing that before we can move forward, we must first acknowledge where we are.
The Fact Maps laid the groundwork for our transformation.
\- **The Frame:** Frame \+ Freedom \+ Focus \+ Fire

**3\. THE VOICE: The Connection**
The Voice took us deeper. It wasn’t just about laying down our thoughts but about connecting with our true selves and seeking clarity in the chaos. Through The Voice, we navigated our emotions and aligned our actions with our inner truth.
\- **The Frame:** Stop \+ Submit \+ Struggle \+ Strike

**4\. THE CORE: The Daily Commitment**
The Core was where our daily actions met our long-term goals.
It was a commitment to growth, ensuring that every day, we took steps, no matter how small, toward our greater purpose. 
This wasn’t about routine; it was about relentless commitment to being the best version of ourselves.
\- **The Frame:** Body \+ Being \+ Balance \+ Business

**5\. THE DOOR: The Realm of Action**
The Door was where strategy met execution.
It was about making choices and taking actions that align with our mission. 
Each door we opened led to new opportunities and challenges, and through this, we learned to prioritize and act with purpose.
\- **The Frame:** Potential \+ Plan \+ Production \+ Profit

**6\. THE GAME: The Synthesis**
Finally, we arrived at The Game, the culmination of our journey. Here, everything came together.
The principles of The Code, the realities of The Fact Maps, the reflections of The Voice, the commitments of The Core, and the actions of The Door—all played out in The Game.
This was where our resilience, dedication, and warrior spirit were truly tested.
\- **The Frame:** Wake Up \+ Take A Knee \+ Have it All \+ Be Free

**Conclusion: The Alpha OS**
In looking back, we see that The Alpha OS isn’t just a set of teachings; it’s a transformation.
Each chapter, each lesson, has become a part of us, shaping us into the warriors we are today.
The path ahead is now ours to shape, and with The Alpha OS as our guide, we are equipped to face any challenge.
Victory isn’t just possible; it’s inevitable. Arise, Alpha\!
As you move forward, carry these lessons with you. They are your armor, your strength. The journey doesn’t end here; it continues with every choice, every action. Arise, Alpha, for your legend is just beginning.
