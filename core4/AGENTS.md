# Core4 Guidelines

Core4 ist im Kern ein **Habit Tracker** (8 Habits / 4 Domains) mit mehreren UIs und Sync-/Export-Integrationen.

Wichtig für Änderungen:
- **Habit-tracker-first:** Daily logging/status/weekly score hat Vorrang vor Ops-/Mount-/Export-Komplexität.
- **Frontdoors zuerst:** Bevorzugte Daily-Commands sind `core4`, `c4`, `c4d`, `wcore4`.
- **`core4ctl` ist Kompatibilitäts-/Ops-Shim:** nicht als primäre Daily-UX behandeln.
- **AGENTS.md knapp halten:** Arbeitsregeln hier, lange Blueprint-/Kapiteltexte lieber in `CORE4.md` / `DOCS/core4.md`.

## Scope
- `core4/` owns Core4 domain logic, data flow, and tooling behavior.
- Keep Core4-specific implementation in this pillar.
- `scripts/` may orchestrate Core4 actions but must not host Core4 business logic.

## Entrypoints
- Primary daily frontdoors:
  - `core4` (dashboard + tracker pass-through)
  - `c4` (fast ledger-only status)
  - `c4d` (explicit dashboard shortcut)
  - `wcore4` (Taskwarrior week + core4 week score)
- Compatibility / ops shim: `core4/python-core4/core4ctl`
- Frontdoors:
  - Production overview via `aosctl core4 ...`
  - Dev/operator usage via `hubctl core4 ...`
- API probe helper (Bridge/Index smoke):
  - `core4ctl probe today`
  - `core4ctl probe week 2026-W07`
  - `core4ctl probe all`

## Coding Rules
- Reuse shared ctl helpers where applicable (`scripts/ctl-lib.sh`, `scripts/lib/aos-env.sh`).
- Avoid duplicate wrappers for Core4 commands; keep one canonical command path.
- Keep paths and env names explicit (`AOS_*`) and documented near usage.

## Blueprint-First Rule
- Core4 development should start from local blueprint/chapter artifacts placed in this pillar.
- Use these artifacts as intent; implement behavior in canonical Core4 code paths.
- If a file is not literally named `blueprint`, still treat chapter/spec files in `core4/` as source intent.
- If chapter symlinks are added in `core4/`, treat them as primary references (same policy as other pillars, pointing to `AlphaOS-blueprints/`).
- Keep blueprint-to-code mapping explicit in commit/PR notes for behavioral changes.

## Lint In Plain Language
- `scripts/scripts-lint.sh` checks ctl wiring conventions across the repo.
- `ERROR` means broken integration and must be fixed.
- `WARN` usually means legacy compatibility debt, not always a hard blocker.

## Validation
- Run `bash -n` on changed shell scripts.
- Run `scripts/scripts-lint.sh` when touching any `*ctl` integration.

# The Core Four

# Chapter 13 \- Dominion
## THE COMMAND TO GOVERN: A GIFT OF DOMINION
From the beginning, humanity was given a divine gift—dominion.   
This wasn’t just a command to control the world around us, but a deeper call to master ourselves. "Multiply and replenish the earth" wasn’t just about creating life; it was about expanding our potential and renewing our inner strength.   
True power isn’t about ruling others but mastering yourself.

---
## THE FOUR DOMAINS: PILLARS OF SELF-DOMINION

### Body
**Fitness:** Taking care of our physical health through activity, strength, and endurance.  
**Fuel:** Choosing the right nutrition to energize and sustain us.

### Being
**Meditation:** Connecting with God, deepening our spiritual bond, and seeking guidance.
**Memoirs:** Reflecting on our life, using practices like journaling to capture the essence of your soulful experiences.

### Balance
**Partner:** Nurturing our marriage, understanding our spouse, and strengthening that bond.
**Posterity:** Guiding our children, shaping their future, and ensuring they carry forward our legacy.
**People:** Building and maintaining meaningful relationships with friends, mentors, and those who influence our journey.

### Business
**Discover:** Learning the rules of the game of money—how to make it, keep it, and grow it.
**Declare:** Taking action based on our knowledge, ensuring we move forward in our financial goals.

## THE CHALLENGE
The challenge is to elevate each of these domains and weave them into a balanced and abundant life.
Our mission is to dominate in all of these areas daily, reaching for the highest levels of prosperity.

In mastering these four domains—Body, Being, Balance, and Business—we not only achieve success but also transcend it, becoming the strongest version of ourselves.

---
# Chapter 14 \- Body
## THE SACRED VESSEL: APPRECIATING THE BODY
In the vast universe of our existence, we have one irreplaceable asset: our body.
This vessel, made of muscle, bone, and life, isn’t just a tool to interact with the world — it’s a temple.
It reflects our respect, discipline, and commitment to the gift of life.
Without our bodies, we’re just observers, unable to truly experience the wonders of existence.
Sadly, many of us take our bodies for granted. 
We only realize its importance when something goes wrong—a backache that stops us, a heart that skips a beat, or lungs that struggle for air.
It’s in these moments that we recognize how much we’ve neglected this incredible gift.

## DIVIDING THE BODY GAME: FITNESS & FUEL
To ensure our bodies support us rather than hold us back, we must engage with them in two key ways: **Fitness and Fuel.**

**SEGMENT \#1: FITNESS – "DID YOU SWEAT TODAY?"**
Movement is life.
Just like stagnant water breeds disease, a body that doesn’t move starts to break down.
Our bodies are built to move—to run, jump, push, pull, and dance.
So, the question you should ask yourself every day is, “Did I sweat today?”
Daily physical activity isn’t about chasing some perfect image.
It’s about showing respect for this amazing machine and keeping it in top condition.
Whether it’s running, yoga, or a brisk walk, the goal is the same: to commit to moving your body every day.
**In the Core Four Game of Alpha Body, each day you honor this commitment, you earn Fitness \= .5 points.** 
This isn’t just a score — it’s a reminder that you’re taking care of your physical self.
Fitness makes up 50% of the total points in the Body domain.

**SEGMENT \#2: FUEL – "WHAT DID I NOURISH MY BODY WITH TODAY?"**
Once your body is moving, it needs the right fuel.
What you eat directly affects your energy, mood, brainpower, and overall health.
But in the hustle of daily life, many of us neglect this, filling our bodies with junk.
What if, instead, you made a conscious choice every day?
A simple act of putting good food in the right proportions into our body.
It’s not about strict diets or denying yourself; it’s about making a small, intentional choice to care for yourself.
**For this daily act, you earn Fuel \= .5 points.**
This is your proof that you’ve nourished your sacred vessel.
**Fuel makes up the other 50% of the total 1 point in the Body domain.**

**THE TOTALITY OF BODY: EARNING YOUR POINT**
When you combine Fitness and Fuel, you get BODY \= 1 point.
But this point isn’t just a number — it’s a daily commitment.
It’s a pact with yourself, a way to acknowledge that you’ve taken care of your body in a way that amplifies its potential.
There are many ways to approach Fitness and Fuel.
The key is to be conscious of your choices.
Your body can be your greatest ally or your biggest obstacle.
But like any relationship, it needs attention, care, and love.

**EARNING YOUR POINTS IN BODY**
So, every day, as the sun rises, make two deliberate choices:
\- An act of movement for Fitness \= .5 points.
\- An act of nourishment for Fuel \= .5 points.
**TOTAL BODY POINT \= 1 point.**
In these two commitments, you’ll discover the incredible power of your BODY, your lifelong companion on this journey.

# Chapter 15 \- Being
**THE SOUL: THE SILENT PILOT**
In the journey of life, it’s not just about what we experience on the outside; it’s about who we are on the inside.
At the core of our being is the soul—our silent guide.
It’s easy to overlook, but the soul is what drives our actions, emotions, and thoughts.
We are not just bodies living in a world; we are souls experiencing life.
To fully tap into the power of our soul, we need to connect with it.
This connection happens through two main practices: **Meditation and Memoirs.**

**MEDITATION: THE SOUL'S SOLACE**
Meditation is more than just a mental exercise—it’s a way to connect with your soul.
When you meditate, you step away from the noise of the world and take a journey inward.
This journey brings peace, insight, and a deeper understanding of yourself.
**Why Meditate?**
Meditation centers you. It grounds you. It aligns you with your internal compass.
When you quiet your mind, you can hear your soul’s voice.
The form of meditation doesn’t matter—what matters is that you do it.
Whether it’s active meditation, mental prayer, or mindfulness, the key is to practice it daily.
Aim for 20 minutes a day.
**When you do, you earn .5 points in the Being domain.**

**MEMOIRS: CONVERSATIONS WITH THE SOUL**
While meditation lets you listen to your soul, writing memoirs gives you a way to express what you’ve heard.
This isn’t about writing a book for others; it’s about creating a private space for your thoughts and reflections.
It’s about getting what’s inside out.
Whether it’s basic journaling or strategic stacking, writing helps you see your journey more clearly.
**The Power of Journaling:** Writing down your experiences—whether they’re challenges, victories, or daily thoughts—reflects your inner world.
It brings clarity and offers guidance.
Your memoirs are like footprints left by your soul, showing the path you’ve taken through life.
**The Power of Stacking:** For many, strategic journaling through stacking is how they earn their .5 points in this domain.
It’s a powerful way to process and progress.
**EARNING YOUR POINTS IN BEING**
Every day, commit to two actions:
**An act of connection through Meditation \= .5 points.**
**An act of creation through Memoirs \= .5 points.**
**TOTAL BEING POINT \= 1 point**
Just as the Body chapter focused on your physical existence, this chapter on Being emphasizes nurturing your intangible essence.
Your body is the vessel, but your soul is the compass guiding your journey.
Meditation and memoirs are the tools that help you navigate life’s voyage.
To truly live, you must connect with, understand, and empower your soul.
This is where true fulfillment and power lie in the grand game of life.

# Chapter 16 \- Balance
## **LIFE'S INTRICATE DANCE**
Life can often pull us away from the people who should be at the center of our world: our women and children.
These relationships are vital, but they can get overshadowed by the demands and distractions life throws at us.
The Balance aspect of CORE 4 brings us back to these connections, reminding us of the daily need to express gratitude and appreciation.

**1\. THE CHALLENGE OF CONNECTIVITY**
Even with the best intentions, our women and children can sometimes feel like they’re in the background of our lives.
This isn’t always intentional.
We might assume that love is understood and doesn’t need to be shown.
But love, like any valuable treasure, needs to be expressed and celebrated.

**2\. DAILY DEPOSITS OF APPRECIATION**
Think of each relationship as a bank account.
Gratitude and appreciation are the currency.
A simple gesture, a kind word, or a moment of acknowledgment is a deposit into this account.
It’s not about big, dramatic gestures.
It’s about daily reminders of why someone matters.
And, just like with any bank account, the goal is to keep it full and balanced.

**3\. THE MECHANICS OF DAILY DEPOSITS**
Use these statements in some form:
\- **"I love you."**
\- **"I honor you."**
\- **"I appreciate you."**
For your partner: Each day, ask yourself, "What makes me grateful for this person today?"   
Find a specific reason and express it.
Send a message like, “I honor you,” “I appreciate you,” or “I love you” via text, email, voice note, or video. 

**This act earns you .5 points.**
For your children: Do the same with one of your children.
Find a specific reason to be grateful and express it.
Send a message like, “I honor you,” “I appreciate you,” or “I love you.” 
**This act also earns you .5 points.**
You can write a handwritten note if you prefer, but the key is that you make the deposit with no expectation of a response.
It’s a one-way act of love into the lives of those you care about.

**4\. BEYOND PARTNER AND POSTERITY**
If you don’t have a wife or children, or if you want to expand your gratitude to others, choose any two people in your life.
They could be friends, colleagues, or new acquaintances.
Expressing “I honor you,” “I appreciate you,” or “I love you” can make a significant impact.
The foundation remains the same: two deliberate deposits of gratitude every day.
You’ll be amazed at how these simple acts can light up the lives of those around you.

**5\. THE TRANSFORMATIVE POWER OF GRATITUDE AND APPRECIATION POINTS**
Genuine, regular gratitude can be transformative.
By making these daily deposits, you replace feelings of distance with love and connection.   
The point system isn’t just about keeping track—it’s a tangible sign of your commitment to strengthening the relationships that matter most.
Each day you give yourself 1 point for your actions in the Balance aspect of The Core.
You’re not just scoring points—you’re acknowledging your effort to nurture the essential relationships in your life.
With every point, you’re moving towards a more connected, appreciative, and balanced life.  
**EARNING YOUR POINTS IN BALANCE**
So, every day, make two deliberate actions:
\- **An act of connection for Person \#1 \= .5 points.**
\- **An act of connection for Person \#2 \= .5 points.**
**TOTAL BALANCE POINT \= 1 point**

# Chapter 17 \- Business
## THE BUSINESS OF LIFE
Life is a complex game, and as we reach the final part of The Core journey, we face a reality we can't ignore: Business. And by business, we’re talking about money—making it, keeping it, and growing it.

## MONEY MATTERS
Let’s be real: Money matters. We might try to imagine a life without it, but the truth is, money fuels our dreams.
Without it, our hands are tied, limiting our ability to reach the life we want. Just like a healthy body is key to well-being, money is key to our quality of life.You might think you’ve got money figured out. After all, we deal with it every day. But there’s a big difference between just handling money and mastering the game of wealth. It’s more than just knowing about money; it’s about mastering the skills that grow it.

**Here’s how we break it down:**
\- **Making Money:** The skill of generating income.
\- **Keeping Money:** The discipline of not spending it all.
\- **Growing Money:** The strategy of investing to increase your wealth.
\- **Leaving a Legacy:** Passing on financial wisdom and resources to the next generation.  
We all play these four roles, just at different levels.
In the Business domain of The Core, our mission is clear: Discover and Declare.

**DISCOVER AND DECLARE**
\- **Discover:** Dive into the world of financial knowledge.
This isn’t about random learning. You’re on a mission to find something that clicks—an insight that sparks a revelation. When you find that insight, stop. The goal isn’t to finish the book or video but to learn until something connects.
\- **Declare:** Once you’ve found that key insight, share it.
This could be as simple as writing it down or as broad as posting it on social media. Teaching what you’ve learned makes it stick. By declaring, you turn insights into action, which can translate into real financial growth.

**THE DAILY BUSINESS POINTS**
Each day is a chance to earn:
\- **.5 points for Discover:** Engage with material that teaches you something new about money, marketing, sales, leadership, or any skill that can grow your wealth. Keep going until you have an "aha" moment.
\- **.5 points for Declare:** Share what you’ve learned. Whether it’s a personal note or a public post, the act of sharing solidifies your knowledge.

These daily actions add up to 1 point in the business domain.
By consistently discovering and declaring, you’re not just growing your wealth—you’re building a legacy of financial wisdom.
Track your progress and watch how the daily Business 1 point starts to show up in your life as increased wealth and prosperity.

**EARNING YOUR POINTS IN BUSINESS**
So, every day, make these two deliberate actions:
\- **An act of Study for Discover \= .5 points.**
\- **An act of Share for Declare \= .5 points.**
**TOTAL BUSINESS POINT \= 1 point**

## **Chapter 18 \- Begin**

**1 Point – Body – Fitness .5 \+ Fuel .5**
**1 Point – Being – Meditation .5 \+ Memoirs .5**
**1 Point – Balance – Bride/Person \#1 .5 \+ Blood/Person \#2 .5**
**1 Point – Business – Discover .5 \+ Declare .5**
**TOTAL POINTS \= 4**

A fulfilling and transformative life is embedded within the fabric of The Core. As we’ve journeyed through the domains of Body, Being, Balance, and Business, the intertwining threads of The Code, The Game, and The Stack have become evident. Now, it’s time to distill, understand, and act.

**1\. BODY**   
\- **Action:** Engage in daily physical activity—whether it’s lifting, running, swimming, or yoga.  
\- **Points:** .5 for your workout, .5 for consuming a green smoothie.  
\- **Goal:** Strengthen your physical health and boost your energy.

**2\. BEING**   
\- **Action:** Meditate daily to connect with your spiritual core. Write memoirs to capture the essence of your soulful experiences.  
\- **Points:** .5 for meditation, .5 for memoirs.  
\- **Goal:** Align with your soul and achieve inner peace.

**3\. BALANCE**   
\- **Action:** Send daily messages of gratitude to strengthen your relationships with your partner (spouse) and posterity (children).  
\- **Points:** .5 for expressing gratitude to your spouse, .5 for one child or two important people in your life.  
\- **Goal:** Build deeper emotional connections and strengthen your relationships.

**4\. BUSINESS**   
\- **Action:** Study financial topics or key business skills. Share the new knowledge you’ve gained.  
\- **Points:** .5 for discovery, .5 for declaring.  
\- **Goal:** Sharpen your entrepreneurial mindset and master the business game.

**Daily Total Points: 4**  
“Hit your four before the door to prep for war”

**Weekly Total Points: 28**  
“28 or die”

**Connecting to The Core with The Code**   
The Code is our moral anchor, guiding every step we take.   
When immersed in The Core daily, it’s crucial to stay aligned with this Code, ensuring our pursuits in Body, Being, Balance, and Business resonate with our deepest values.

**Power Tracking**  
Consistent tracking amplifies commitment.   
Every point you earn in The Core symbolizes personal growth, progress, and alignment with your life’s vision.   
It’s a journey of evolution—are you ready to take it on?
