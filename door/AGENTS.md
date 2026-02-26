# door/ - Door Management Component

Das zugehörige `doorctl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet und bei Bedarf weiterentwickelt.

Component for Door lifecycle, War Stacks, Hit tracking, and 4P Flow.

## Blueprint-First Rule

- Door development must start from local chapter/blueprint artifacts in this pillar before adding new logic.
- Treat chapter files as intent/behavior reference, then map changes into canonical Door code paths (`door/lib/*`, `door/cli/doorctl`, `door/api/*`).
- Keep this alignment explicit in PR/commit notes when behavior changes.
- Primary chapter references are local symlinks in `door/` (e.g. `25 - Door.md` ... `31 - Door Summary.md`) pointing to `AlphaOS-blueprints/`.
- Additional chapter source: `door/gas-door-dev/Door_Chapters.html`.
- If additional blueprint files are added, keep them in `door/` and extend this section instead of scattering rules elsewhere.

## Lint In Plain Language

- `scripts/scripts-lint.sh` checks wiring/style consistency for ctl scripts.
- `ERROR` means the change is broken and must be fixed.
- `WARN` means migration debt or compatibility notes; not always blocking.
- For this repo: aim for zero errors first, then reduce warnings step by step.

## Architecture

```
door/
├── lib/                      # Core logic (reusable)
│   ├── door_data.sh          # Task export parsing, door fetching
│   ├── door_phase.sh         # Phase detection (potential/plan/production/profit)
│   ├── door_health.sh        # Health checks, stalled detection, time ago
│   └── door_format.sh        # Pretty printing, tables, progress bars
├── cli/
│   └── doorctl               # CLI interface (sources lib/*)
├── api/                      # Node.js API handlers (for Index Node)
│   ├── list.js               # GET /api/door/list
│   ├── show.js               # GET /api/door/show/:name
│   └── health.js             # GET /api/door/health
└── AGENTS.md                 # This file
```

## Design Principles

### 1. Separation of Concerns

**Shell Libraries (lib/\*):**
- Pure data/logic functions
- No UI dependencies
- Reusable by CLI + Node.js API
- Testable in isolation

**CLI (cli/doorctl):**
- User interface layer
- Sources lib/* for logic
- Uses ctl-lib.sh for UI helpers
- Handles user interaction

**API (api/\*):**
- Node.js wrappers
- Calls shell libs via child_process.spawn()
- Returns JSON for web UI
- No business logic (delegates to lib/*)

### 2. Data Flow

```
Taskwarrior
    ↓
door_data.sh (task export → JSON)
    ↓
door_phase.sh (phase detection)
    ↓
door_health.sh (stalled/attention checks)
    ↓
door_format.sh (pretty printing)
    ↓
CLI (doorctl) OR API (Index Node)
```

### 3. No Duplication

**BAD:**
- Parsing logic in both doorctl and Node.js
- Health checks duplicated in CLI and API
- Phase detection hardcoded in multiple places

**GOOD:**
- One source of truth (lib/*.sh)
- CLI and API both source the same libs
- Update once, affects all consumers

## Usage Patterns

### CLI Usage

```bash
# Direct invocation
door/cli/doorctl list

# Via wrapper (backwards compat)
door/cli/doorctl list

# Sources:
# - door/lib/door_data.sh
# - door/lib/door_phase.sh
# - door/lib/door_health.sh
# - door/lib/door_format.sh
```

### API Usage (Node.js)

```javascript
// door/api/list.js
const { spawn } = require('child_process');
const path = require('path');

const LIB_DIR = path.join(__dirname, '..', 'lib');

async function getDoors() {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', ['-c', `
      source ${LIB_DIR}/door_data.sh
      get_doors
    `]);

    let stdout = '';
    proc.stdout.on('data', data => stdout += data);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('Failed'));
      resolve(JSON.parse(stdout));
    });
  });
}

// Express route
app.get('/api/door/list', async (req, res) => {
  const doors = await getDoors();
  res.json(doors);
});
```

### Index Node Integration

```javascript
// index-node/routes/door.js
const doorAPI = require('../../door/api');

router.get('/api/door/list', doorAPI.list);
router.get('/api/door/show/:name', doorAPI.show);
router.get('/api/door/health', doorAPI.health);
```

## Adding New Features

### 1. Add to lib/ first

```bash
# door/lib/door_velocity.sh
get_door_velocity() {
  local door_name="$1"
  local weeks="${2:-4}"

  # Calculate hits per week for last N weeks
  # ...
}
```

### 2. Use in CLI

```bash
# door/cli/doorctl
source "$DOOR_DIR/lib/door_velocity.sh"

cmd_velocity() {
  local door_name="$1"
  get_door_velocity "$door_name"
}
```

### 3. Use in API

```javascript
// door/api/velocity.js
async function getVelocity(doorName, weeks = 4) {
  const proc = spawn('bash', ['-c', `
    source ${LIB_DIR}/door_velocity.sh
    get_door_velocity "${doorName}" ${weeks}
  `]);
  // ...
}
```

## Testing

### Unit Test (lib/)

```bash
# Test door_health.sh functions
source door/lib/door_health.sh

# Test time_ago
result=$(time_ago "20260209T100000Z")
echo "Time ago: $result"

# Test is_stalled
if is_stalled "20260101T000000Z"; then
  echo "✅ Stalled detection works"
fi
```

### Integration Test (CLI)

```bash
# Smoke test
door/cli/doorctl list
door/cli/doorctl show Ausbildung
door/cli/doorctl health
```

### API Test (Node.js)

```bash
# Start Index Node
npm start

# Test API
curl http://localhost:8799/api/door/list | jq
curl http://localhost:8799/api/door/health | jq
```

## Environment Variables

```bash
# Task binary
export TASK_BIN=task

# Vault location
export AOS_VAULT_DIR=~/AlphaOS-Vault

# Health thresholds
export AOS_DOOR_STALLED_DAYS=7      # Days before stalled
export AOS_DOOR_ATTENTION_DAYS=3    # Days before needs attention
```

## Coding Style

### Shell (lib/ + cli/)

- Use `set -euo pipefail`
- Shellcheck clean (no errors)
- Functions return JSON when possible
- No hardcoded paths (use env vars)
- Error handling with `|| return 1`
- Comments for complex logic

### Node.js (api/)

- Async/await for all I/O
- Spawn bash with explicit source
- Parse JSON from stdout
- Return 500 on errors
- No business logic (delegate to lib/)

## Dependencies

**Required:**
- bash 4.0+
- jq (JSON parsing)
- bc (percentage calculations)
- Taskwarrior 2.6+ (with door_name UDA)

**Optional:**
- Node.js 18+ (for API)
- gum (enhanced UI in CLI)

## Future Additions

**Phase 2:**
- War Stack integration (lib/door_war.sh)
- 4P Flow tracking (lib/door_flow.sh)
- Velocity reports (lib/door_velocity.sh)
- Forecast calculations (lib/door_forecast.sh)

**Phase 3:**
- Domino Door detection (lib/door_domino.sh)
- Weekly reports (lib/door_report.sh)
- Export to vault (lib/door_export.sh)
- Import from vault (lib/door_import.sh)

## Common Gotchas

1. **jq parsing**: Always check for null/empty arrays
2. **Timestamp formats**: Taskwarrior uses `20260209T105635Z` format
3. **Door name spaces**: Use `door_name:"Name With Spaces"` in task commands
4. **Subshell isolation**: Variables in while loops are scoped (use `mapfile` instead)
5. **Phase detection**: Tags determine phase (hit = production, potential = potential, etc.)

## Claude Code Guidelines

**When working on this component:**

1. **Read AGENTS.md first** (this file)
2. **Modify lib/ for logic changes** (never put logic in CLI/API)
3. **Test with real Taskwarrior data** before committing
4. **Keep CLI and API in sync** (both should support same features)
5. **Document new env vars** in this file
6. **Update README.md** for user-facing changes

**Don't:**
- Duplicate logic between CLI and API
- Hardcode paths or configs
- Skip error handling
- Break backwards compatibility without reason

# The Door

# Chapter 25 \- Door
As we wrap up our journey through the foundational principles of The Code, the transformative power of The Voice, and the driving force of The Core, we find ourselves at the next crucial chapter: The Door.

## THE DOOR: A GATEWAY TO PERSPECTIVE AND ACTION
Picture an old, weathered door, full of mystery and promise. That’s The Door — a symbol of what lies beyond, waiting to be unlocked. It’s not just about opening the door but about understanding what lies on the other side and making the right choices once you do.

## THE CHAOS OF ABUNDANCE
When you’ve built up power and resources, the challenge isn’t scarcity anymore — it’s abundance. Too many choices, too many opportunities, and the real test is figuring out which ones are worth pursuing. It’s easy to get lost in the noise of possibilities, but the true challenge is deciding which doors to open and which to keep shut. This ability to make the right decisions will determine whether you win The Game and unlock your true freedom.

##  THE FOUR FRAMES OF THE DOOR
**1\. Potential – The Hot List:**
Every journey starts with potential—what could be.
The Hot List is where you jot down all these possibilities, the doors that could be opened but haven’t been yet.
**2\. Plan – The Door War:**
Planning isn’t just about setting goals; it’s about prioritizing the battles ahead.
The Door War is your strategy for making sure every door you open aligns with your ultimate goals.
**3\. Production – The Hit List & To-Do List:**
Execution is key.
The Hit List identifies your prime targets, and the To-Do List is your plan of action. This is where potential becomes reality.
**4\. Profit – The Achieved & Done List:**
Celebrate your victories.
The Achieved List recognizes your successes, and the Done List shows your commitment to completing what you set out to do.

## MOVING FORWARD
As we move into the next chapters, we’ll dive deeper into each of these frames, exploring how to navigate The Door and all its possibilities.
Remember, every door presents a choice, and those choices shape your destiny. The Door is more than just an entry point—it’s a test of your ability to discern and decide in a world full of opportunities.
Are you ready to choose the right doors and step into the life you’re meant to live?

# Chapter 26 \- Possibilities
## THE HOT LIST: GUARDIAN OF IDEAS
In a world brimming with endless inspiration, our minds are like eternal furnaces, constantly forging ideas that could reshape our lives. Some ideas come and go quickly, while others stick around, waiting for us to recognize their potential. These are the gems that can change destinies. But if left unchecked, they can easily slip away, lost in the noise of daily life. The Hot List is your tool to capture these fleeting thoughts, your treasure chest for keeping those gems safe.

## A PLACE FOR EVERY THOUGHT
When you follow the Alpha OS, you’re constantly flooded with ideas.
Whether they come from your deep reflections in The Voice, your dedication to the Core Four, or the random bursts of creativity throughout the day, there’s no shortage of thoughts to capture.
These ideas can hit you during meditation, in your dreams, or even in a moment of crisis. But without a proper system, they might disappear forever.
That’s where the Hot List comes in. It’s more than just a list; it’s a vault for your potential. Every idea, big or small, finds a place here. It doesn’t matter if the thought is a stroke of genius or a simple notion; they all get recorded.
It’s your way of ensuring that no idea is ever wasted.

## FROM THOUGHT TO REALITY
Take a look around you.
Every building, piece of technology, and even the book you’re reading started as an idea. Someone had a thought, wrote it down, and then took action.
That’s how ideas become reality. But an idea alone, no matter how brilliant, is just potential. It needs to be shaped, like a rough piece of marble waiting to be sculpted into something magnificent. The world is full of these rough ideas, but only a few get transformed into something meaningful. The Hot List helps you ensure that your ideas don’t just remain in the realm of potential but are ready to be turned into something real.

## SORTING THROUGH THE GEMS
While every idea deserves a spot on the Hot List, not all ideas are created equal. Once they’re on the list, it’s time to prioritize. It’s not about deciding which thought is better but understanding which ideas are most urgent, feasible, and aligned with your goals. Think of it as sorting through a pile of gems, figuring out which ones are the most valuable right now.
Your Hot List acts as both a guide and a foundation, helping you navigate through the endless possibilities that come your way. It ensures that you don’t just dream but also take the steps needed to make those dreams a reality.

## TURNING POTENTIAL INTO ACTION
In the vast universe of thoughts and ideas, each one has the potential to change the course of your life.
But only if you capture, prioritize, and act on them.
The Hot List is your starting point for doing just that.
Embrace your ideas, sort through them, and then get to work on turning that potential into real, tangible results.

# Chapter 27 \- Door War:
**BATTLE OF CHOICES**
Amidst the noise of countless ideas, there’s a battlefield where decisions are made.
This is the arena where you fight against distractions and determine which actions are truly worth your time and energy. 
This battle is what we call The Door War.

**WHAT IS THE DOOR WAR?**
The Door War isn’t about physical conflict; it’s a struggle with choices, priorities, and focus.
Your Hot List is full of potential actions, but the real challenge lies in choosing the most important one for the week.
This decision-making process is what we call The Door War. 
It’s a fight to stay focused on what truly matters, inspired by the time management principles of Stephen Covey and Dwight Eisenhower.

**THE ORIGINS OF THE QUADRANT SYSTEM**
The quadrant system used in The Door War traces its roots back to President Dwight Eisenhower.
As a general and later the U.S. President, Eisenhower needed a way to manage countless high-stakes decisions.
Stephen Covey popularized this system in his book, *The 7 Habits of Highly Effective People*, making it a cornerstone of productivity and management strategies.

**UNDERSTANDING THE QUADRANTS**
The Time Management Matrix divides tasks into four quadrants based on urgency and importance:
\- **Quadrant 1: Urgent and Important** – This quadrant often traps people in a cycle of crisis management. It’s all about putting out fires, but constantly living in this zone can prevent growth.
\- **Quadrant 2: Not Urgent but Important** – This is the sweet spot. Tasks in this quadrant are important but don’t have immediate deadlines. This is where strategic planning and long-term goals come to life.
 \- **Quadrant 3: Urgent but Not Important** – These tasks create the illusion of urgency. Answering non-essential emails or attending unnecessary meetings fall here, diverting you from what really matters.
\- **Quadrant 4: Neither Urgent nor Important** – This is the procrastination zone, where time-wasting activities like endless social media scrolling drain your productivity.

**WINNING THE DOOR WAR**
To win the Door War, you need to focus on Quadrant 2 - This is where you make proactive decisions, choosing tasks that are important but not yet urgent. By selecting tasks from this quadrant, you take control of your time and turn these tasks into priorities by choice, not by chance. Each week, when you review your Hot List, you enter the Door War. You must pick one key action from Quadrant 2 to focus on for the week. This chosen action becomes your “Door” for the week, representing your commitment to a task that’s crucial—not because you have to, but because you choose to.

**LIVING BY INTENTION, NOT REACTION**
By aligning your actions with the Door War strategy and the Quadrant system, you begin to live intentionally. Instead of reacting to whatever comes your way, you make deliberate choices that lead to meaningful progress. This shift is powerful: it moves you from a life controlled by urgent demands to one guided by thoughtful, intentional decisions. The Door War is more than just a weekly strategy—it’s a mindset shift. It reminds you that in the game of life, it’s not about having endless options but about making the right choices. Choose wisely, because these choices shape your future.

# Chapter 28 \- War Stack
In the last chapter, we explored the concept of the Door — a critical tool in making decisions that reflect our true priorities.
But simply choosing the Door is just the beginning.
The real work comes with preparing for the battle ahead.
This preparation happens through the “War Stack.”
The War Stack isn’t just a list of questions. It’s a focused system that brings clarity, direction, and momentum toward achieving your Door.
Its strength lies in taking broad ideas and narrowing them down into one central theme—the Door—and four clear objectives we call “Hits.”

## WHAT ARE HITS?
Hits are your key weekly tasks, spanning from Monday through Friday. They aren’t just items on a to-do list; they’re the outcomes of the War Stack. They break down your main goal—your Door—into measurable steps. While we’ll dig deeper into Hits in the next chapter, for now, think of them as milestones that move you closer to your ultimate goal.  
The War Stack helps you map out the path to success, identify the challenges you might face, and create strategies to overcome those challenges. Let’s break down how the War Stack works.

## THE WAR STACK QUESTIONS
\- **Title**: What will you call this stack?
\- **Domain & Sub-domain**: Which area of business does this stack fall under?
**Here are your options**

Power
 \- Body
 \- Being
 \- Balance
 \- Business

 Production
 \- Advertising
 \- Marketing
 \- Sales
 \- Systems
 \- Profit

Process
 \- People
 \- Optics

 Protection
 \- Accounting
 \- Taxes
 \- Legal
 \- Cash (Vaults)

\- **The Domino Door**: What specific Door are you aiming to unlock?
\- **Trigger**: What person or event has sparked your desire to open this Door?
\- **Narrative**: What story are you currently telling yourself about this Door?
\- **Validation**: Why does opening this Door feel necessary?
\- **Impact on Opening**: How would opening this Door change your business?
\- **Consequences of Inaction**: What happens if this Door stays closed?
After visualizing the end goal, you’ll identify measurable truths—facts that will confirm you’ve successfully opened the Door.
But with every truth comes potential obstacles, and for every obstacle, there’s a strategy to overcome it. This leads us to Facts, Obstacles, and Strategic Strikes.

## BREAKING DOWN THE HITS: FACT \- OBSTACLE \- STRIKE
For each Hit, you’ll define:
\- **The Fact**: The clear, measurable result you aim to achieve.
\- **The Obstacle**: What could prevent you from achieving this fact?
\- **The Strike**: What’s your strategic move to overcome the obstacle?
\- **Responsibility**: Who is responsible for executing this strike?
**Repeat this four times to create your Four Hits.**

## WRAPPING UP THE WAR STACK
As you finish the War Stack, take a moment to reflect:
\- **Insights**: What new realizations have come to light during this process?
\- **Lessons Learned**: What is the most important life lesson this stack has taught you?

**FINAL THOUGHTS**
By the end of this process, you won’t just have a plan; you’ll have a mission broken down into clear, actionable Hits. 
This isn’t just a strategy; it’s a warpath. 
With your Door selected and your War Stack completed, you’re ready to take on the week and steer your business and life toward a successful outcome.

# Chapter 29 \- Production
In the hustle and bustle of modern life, where we’re bombarded with tasks, notifications, and distractions, the real challenge isn’t just about getting things done. It’s about focusing on what truly matters.
That’s where the Door and Hits philosophy comes into play — a straightforward yet powerful way to prioritize and propel you toward your biggest goals, your Annual Game of Freedom. The concept is beautifully captured in the metaphor of a jar, rocks, and sand. Imagine you have to fit big rocks, small rocks, and sand into a jar. If you don’t do it in the right order, it won’t all fit. Here’s how this metaphor breaks down:
\- **The War Stack’s Big Rocks**: These are not just tasks; they are the most critical milestones, your Four Hits. They must be prioritized above all else. These are the big rocks you put in the jar first because they form the foundation of your weekly success.
 \- **Slotting in the Little Rocks**: After the Big Rocks are in place, it’s time to add the 16 smaller hits. While they might seem less significant, they are still crucial to your weekly achievements. They go into the jar second.
\- **Harmony of the Daily To-Dos**: These are the routine, essential tasks that might seem minor but keep everything running smoothly. Like sand, they fill the gaps between the rocks, fitting snugly around your priorities. These tasks go into the jar last, after you’ve secured the Big and Little Rocks.

**THERE IS AN ORDER TO THINGS**
Mess up this order, and you’ll find yourself overwhelmed, getting a lot done but missing out on what truly matters. 
If you start with the sand (the To-Dos), there won’t be enough room in the jar for the Big and Little Rocks.
When you let the daily tasks take precedence over your strategic priorities, you’ll miss out on the actions that drive real progress.
But if you start with the Big Rocks, then the Little Rocks, and finally the sand, you’ll get everything done—and done right.

**IN SUMMARY**
The Door methodology isn’t just about checking off a list; it’s a strategic approach to life.   
It’s a map that guides you toward your bigger goals, ensuring that every step you take brings you closer to victory.
By embracing this philosophy, you’re not just playing the game of life—you’re mastering it, one strategic hit at a time.

# Chapter 30 \- Profit
**REAPING THE FRUIT OF LABOR: ACHIEVED & DONE**
In a world obsessed with tracking every detail—from the steps you take to the calories you burn—it’s easy to get lost in a sea of data.
But the Door system is different. It’s not about counting everything but focusing on what truly matters: your goals and the steps you take to achieve them.
The Door is the ultimate tracker, cutting through the noise to reveal your true commitment and productivity.

**FROM POTENTIAL TO PROFIT**
We started our journey by identifying the potential, our Hot List—the ideas and ambitions that spark our drive.
Then, we moved to planning, setting our sights on specific goals through the Door and War Stack.
From there, we pushed into production, focusing our energy on the Hit List—the concrete actions that move us forward.
Now, we’ve arrived at the final stage: Profit, where we assess what we’ve actually achieved, the “Achieved and Done” stage.

**MEASURING THE WEEK'S YIELD**
As the week wraps up, it’s time to take stock of what you’ve accomplished. 
Your Hit List is in front of you, filled with checked-off tasks that show your progress.
\- **Did you open the Door?**
\- **Did you hit all targets on your Hit List?**

**FINAL REFLECTIONS ON THE FRUIT**
The Door system isn’t just about the score; it’s about understanding your rhythm and pace of work.
Looking at the week’s yield—the “fruit”—gives you a chance to see where you stood strong and where you might have faltered.
For some, this review will be a celebration of hard-earned victories. For others, it might highlight missed opportunities.
But here’s the bottom line: Winners keep score.
They thrive on seeing tangible progress and growth.
Those who avoid tracking often shy away from accountability, preferring to live in ambiguity.
The power of the Door system is its clear, unbiased reflection of your efforts.
It’s not just about counting tasks; it’s about understanding the value of what you’ve accomplished and using that knowledge to fuel your future success.

# Chapter 31 \- Door Summary
## THE ESSENCE OF THE DOOR
In the chaos of life, it's easy to get lost in endless tasks and distractions, leaving us feeling reactive instead of proactive.
We need a guide, a system to keep us focused on what truly matters.
This is where The Door comes in.
The Door isn’t just a method; it’s a philosophy—a way to achieve more by focusing on the essential.
It represents an entry point to a life where every action is intentional and every task serves a greater purpose.
The Door is structured to guide you from tapping into your potential, creating a clear plan, executing with precision, and finally, enjoying the results of your efforts.

## POTENTIAL
Every journey starts with recognizing your potential.
This stage is about identifying your Hot List—the key tasks and priorities that align with your deepest goals and aspirations.
Before you take action, you must understand your strengths and weaknesses and connect with your core objectives.
\- **Key Takeaway:** Your inner drive sets the stage for everything else.

## PLAN
Once you’ve tapped into your potential, it’s time to strategize.
This is where The Door and the War Stack come together.
The War Stack is the tactical plan that outlines the Four Hits—the major tasks you need to conquer.
The Plan phase is about aligning your daily targets with these key tasks, ensuring you’re not just busy but working with purpose.
\- **Key Takeaway:** Planning with precision means you’re focused on what truly matters.

## PRODUCTION
Execution is everything.
This is where your Hit List takes center stage.
The Hit List is a selection of Four crucial tasks each day, Monday through Friday — 20 hits in a week, each bringing you closer to your big goals.
It’s not about doing everything; it’s about doing the right things well.
\- **Key Takeaway:** Focus on quality, not quantity. It’s better to do fewer tasks excellently than many tasks poorly.

## PROFIT
At the end of the week, it’s time to reflect and recognize what you’ve achieved.
The Achieved List shows the Hit List items you’ve successfully completed, while the Done List tracks all the smaller tasks you’ve finished.
This phase is about more than just counting tasks; it’s about assessing your outcomes, learning from your efforts, and celebrating your wins.
\- **Key Takeaway:** Profit isn’t just financial; it’s the satisfaction, growth, and learning that come from consistent, focused effort.

## IN CLOSING
The Door is more than just a productivity tool; it’s a shift in how you live your life.
It helps you move from scattered efforts to focused achievements, from vague intentions to clear results.
By integrating Potential, Plan, Production, and Profit, The Door ensures that every action you take is a step towards a greater purpose, transforming the ordinary into the extraordinary.
Embrace The Door, and unlock a life of unparalleled productivity and fulfillment.

