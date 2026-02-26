# AOS Hub

Single control surface for αOS services, scripts, and centres.

## Core Entry Points

- `aosctl` — unified dispatcher (menu + status + doctor + component routing)
- `hubctl` — alias to `aosctl`
- `nodectl` — Index Node operator (status/health/open/dev/autoreload)
- `indexctl` — Index Node systemd install/env/health
- `routerctl` — Router bot control
- `bridgectl` — Bridge service control
- `syncctl` — Rclone sync control (targets + vault copy)
- `gitctl` — Git sync control (vault/vitaltrainer/fadaro)
- `syncvaultctl` — Legacy wrapper to `syncctl`
- `firectl` — Fire tooling wrapper (bot + installers)
- `envctl` — Environment manager (`~/.env` service files)
- `aos-aliasctl` — Alias manager (multi‑shell)

## Quick Start

```bash
# Menu (Gum if available)
aosctl

aosctl menu

aosctl status

aosctl ping

aosctl doctor

# Index UI
aosctl index status
nodectl open
nodectl dev

# Router / Bridge
aosctl router status
aosctl bridge status

# Sync
aosctl sync status
syncctl status
gitctl status

# Env / Aliases
aosctl env list
aosctl alias ui
```

## Command Map (What To Type)

- **One‑stop menu**: `aosctl` or `hubctl`
- **Status (no logs + heartbeat ping)**: `aosctl status`
- **Heartbeat ping only**: `aosctl ping`
- **System health**: `aosctl doctor`
- **Index UI**: `nodectl` (or `aosctl index status`)
- **Router Bot**: `routerctl`
- **Bridge**: `bridgectl`
- **Sync (rclone)**: `syncctl` (legacy: `syncvaultctl`)
- **Git Sync**: `gitctl`
- **Env manager**: `envctl` or `aosctl env`
- **Alias manager**: `aos-aliasctl` or `aosctl alias`

## Aliases (Zsh)

Defined in `~/.dotfiles/config/zsh/system-aliases.zsh`:

```bash
alias aos='~/aos-hub/aos'
alias aosctl='~/aos-hub/aosctl'
alias hubctl='~/aos-hub/aosctl'
alias syncctl='~/aos-hub/scripts/syncctl'
alias gitctl='~/aos-hub/scripts/gitctl'
alias vaultctl='~/aos-hub/scripts/syncvaultctl'
alias vaultct='~/aos-hub/scripts/syncvaultctl'
alias indexctl='~/aos-hub/scripts/indexctl'
alias bridgectl='~/aos-hub/bridgectl'
alias routerctl='~/aos-hub/routerctl'
alias nodectl='~/aos-hub/nodectl'
```

If `~/aos-hub` is already in `PATH`, aliases are optional but provide consistent names.

## Services & Units

- Index Node: `aos-index-dev.service`
- Index auto‑reload watchers:
  - `aos-index-dev-menu.path` (watches `menu.yaml`)
  - `aos-index-dev-public.path` (watches `public/` assets)
- Restart helper: `aos-index-dev-restart.service`

Status examples:

```bash
systemctl --user status aos-index-dev.service
systemctl --user status aos-index-dev-menu.path aos-index-dev-public.path
```

## Index Node (Port 8799)

- Working dir: `~/aos-hub/index-node`
- Service file: `~/.config/systemd/user/aos-index-dev.service`
- Health: `http://127.0.0.1:8799/health`
- Menu: `http://127.0.0.1:8799/menu`
- Service runs `npm run dev` (nodemon) for live reload

Hot‑reload control:

```bash
nodectl autoreload on
nodectl autoreload off
```

Dev vs service:
- `nodectl dev` runs `npm run dev` in the foreground (no systemd)
- `nodectl start|stop|restart` controls the systemd service

## Env Management (`envctl`)

`envctl` manages the global env file under `~/.env/`.

Common file:

- `~/.env/aos.env`

Examples:

```bash
envctl list
envctl get aos
envctl set aos TELEGRAM_BOT_TOKEN <token>
envctl edit aos
```

## Alias Management (`aos-aliasctl`)

Multi‑shell alias manager for zsh/fish/bash configs.

```bash
aos-aliasctl ui
```

## Paths

- Index Node: `~/aos-hub/index-node`
- Scripts: `~/aos-hub/scripts`
- Systemd units: `~/.config/systemd/user/`

## Troubleshooting

- Port 8799 stuck: `nodectl fix`
- Index unit: `indexctl status`
- Full health: `aosctl doctor`
- Quick status: `aosctl status`
- Heartbeat ping: `aosctl ping`
- Env issues: `envctl doctor`

## Notes

- `aosctl` defaults to Gum menu when available; otherwise prints help.
- `hubctl` is intentionally the same as `aosctl` so either name works.
- `nodectl` is index‑only, but can surface router/bridge/index doctors in `nodectl all`.
- `aosctl status` performs a heartbeat ping via `routerctl heartbeat ping`.


# The Alpha Code

# Chapter 8 \- Real
## The Facts   
Facing reality is tough, especially when it clashes with the stories we’ve told ourselves.
Accepting the raw facts of where we are takes courage.
It means stripping away the excuses and defenses that have become part of who we think we are.   Letting go of these layers can feel like a kind of death.

## 1\. UNDERSTANDING THE SPIRITUAL DILEMMA
Your relationship with God or your spiritual beliefs might be clouded by lies you’ve been telling yourself for years.
It’s important to face this uncertainty.
What do you really believe?
What beliefs have you just inherited from your family or society?
Lay out your spiritual truths without judgment.
If you can’t do this, you’ll be stuck from the start.

## 2\. THE POWER OF ACKNOWLEDGING FACTS
Businesses succeed on facts, numbers, and data. The key to progress and growth is knowing where you truly stand. Avoiding facts leads to mistakes, but embracing them can guide you to success, no matter how tough they are to face. The facts will set you free — but only if you’re willing to own them completely.

## 3\. THE REALITY IN BODY, BALANCE & BUSINESS
**Here are some questions to ask yourself:**
\- What does your body say about you? Are you fat or fit?
\- What does your marriage say about you? Are you having regular, passionate sex? Can you communicate openly? Do you have meaningful intimacy?
\- Do your children listen to you as a leader?
\- What’s the current state of your finances? How much money do you make monthly? How much have you saved? What does your bank account say about your financial management? 
\- How skilled are you in marketing, sales, and leadership? How committed are you to becoming wealthy?
Accepting the facts about these areas, no matter how harsh, is the foundation for change.
Only by acknowledging where you really are can you start to chart a path forward.

**3.5. THE ILLUSION OF SOCIAL MEDIA**
Social media, with its filtered images and fake realities, has created a huge gap between what we show and what’s real. Relationships might be falling apart in real life while they look perfect online. This disconnect isn’t just harmful — it’s delusional.
A lot of what you see happening for others online isn’t real.
Social media is a land of liars, and letting yourself get sucked into that game is a death sentence. The facts can bridge this gap.

## 4\. ACCOUNTABILITY IS KEY
In the AlphaOS, you’re the master of your fate.
No one’s coming to save you.
You’re responsible for your actions, decisions, and outcomes.
Blaming others won’t change your situation.
Accepting the facts will start you on the path to real transformation from the inside out.

## 5\. THE FREEDOM OF FACTS
Facing the facts might seem scary, but it’s freeing.
Embracing reality, even when it’s uncomfortable, gives you clarity.
With clarity comes the power to change, adapt, and overcome.
There’s nothing more challenging than getting clear.
But once you are, the game opens up, and the path becomes clear.
That certainty is like rocket fuel for action, and it all starts with the facts.
Step into your truth, face the facts, and let them be the foundation for building your future.

----
# Chapter 9 \- Raw
Feelings aren’t just reactions; they’re the drivers behind what we do and how we see the world.   Deep-rooted in our minds, they’re a core part of being human, fueling both our darkest moments and our brightest joys. Your feelings are your connection to God, and if you’re not honest about them, real transformation will slip away from you every day.

## 1\. THE FUEL FOR SPIRITUAL CREATION
Feelings aren’t just fleeting moments—they’re powerful, intangible forces.
Just like the sun gives life, our feelings light up our inner world and guide our spiritual journey. They help us connect, empathize, and grow.
These feelings fuel our behaviors, and those behaviors shape our results.

## 2\. THE DUAL POWER OF FEELINGS
**Dark Feelings:** Rage, anger, pain, despair, and sadness often get a bad rap.
But it’s in these intense, dark feelings that we find some of the most powerful energy for change.   They push us to question, to seek out answers, and to make changes.
Dark feelings can be the catalyst for major shifts in your life.
The truth is, it’s often the dark feelings—not the light ones—that drive the biggest transformations.
**Light Feelings:** Happiness, joy, love, gratitude, and appreciation lift us up.
They inspire us, empower us, and show us the path to our highest potential.
While dark feelings provide potent fuel, light feelings are just as crucial.
Owning your light feelings with authority is just as important as owning your dark ones.

## 3\. LIFE BEYOND FACTS
Facts give us a solid foundation to understand the world, but feelings are what give life movement and meaning. Living only by facts is like a ship without wind—static and unmoving. Feelings are the winds that fill our sails, making life unpredictable but enriching. 
When you blend facts and feelings, you tap into the full depth of the human experience, exactly as God intended.

## 4\. STRENGTH IN VULNERABILITY
Being in touch with your feelings isn’t a sign of weakness — it’s a sign of strength. It takes courage to acknowledge, process, and express your feelings, especially in a world that often undervalues emotional intelligence. Embracing your feelings means understanding and accepting your humanity. It’s a declaration: “I feel, therefore I am.”
Your daily feelings are proof that you’re alive. By embracing the wide range of dark and light feelings we experience each day, we unlock the full spectrum of what it means to be human. From the depths of sorrow to the heights of joy, every feeling is a part of your unique story, pushing you toward growth, understanding, and transcendence.

----
# Chapter 10 \- Relevant
In today’s world, we’re constantly hit with choices, distractions, and dilemmas. Our senses are overloaded, our minds are cluttered, and we’re often pulled in too many directions. Even if we’ve got our facts straight and our feelings in check, without focus, everything can spiral out of control. That’s where the power of focus comes into play.

## 1\. INTERWEAVING FACTS AND FEELINGS
In life, facts and feelings are like the two steps in a dance.
They show us where we are and add passion to our actions.
But to move with purpose and precision, you need focus.
Focus is what channels all that energy into a specific target with specific actions. It’s like turning a wide beam of light into a powerful laser.

## 2\. FUELING CREATION WITH FOCUS
Owning your facts gives you a solid foundation. Embracing your feelings adds depth and life. But its focus that turns this combination into a force for creation.
With steady focus, the energy from your facts and feelings is channeled in the right direction, paving the way toward your goals.

## 3\. THE RELEVANCE OF FOCUS
Focus makes your facts and feelings relevant by zooming in on what truly matters. It acts like a filter, blocking out distractions and highlighting what aligns with your desires. Focus is the spotlight that lights up your goals in the darkness of uncertainty, helping you dodge the distractions that pop up every second.

## 4\. MASTERING OUR STORIES
We’re all storytellers, constantly narrating the story of our lives.
Focus ensures that this story isn’t just a random collection of events but a powerful narrative driven by purpose. It shapes our actions and, in turn, shapes our results. Focus lets you grab those destructive stories by the throat, choke them out, and replace them with narratives that support your new focus.

## 5\. THE ESSENTIALITY OF NARROWING DOWN
In a world full of options, the real challenge is cutting out what’s unnecessary. Focus is the tool that separates the essential from the trivial. It simplifies, sharpens, and streamlines your path, making sure every step you take is deliberate and meaningful. Yes, doing less can actually create more, and the discipline of focus allows you to achieve exactly that.

## 6\. EMBRACING THE HARD WORK
Owning your facts takes work. Digging into your feelings is its own journey. But honing your focus? That’s a relentless pursuit.   Like carving a masterpiece out of stone, it requires you to chip away at distractions, refine your goals, and keep realigning your vision.
You’ll never fully master it, and every day it’ll demand a renewed effort to shake off distractions and focus on lethal action. While facts set the rhythm and feelings provide the melody in the symphony of life, focus orchestrates the harmony. Embracing this trio—facts, feelings, and focus —empowers you to live a life that’s not just ordinary but extraordinary. It becomes the backbone of your pursuit of Dominion across Body, Being, Balance, and Business.

----
# Chapter 11 \- Results
In the grand tapestry of life, where facts lay the foundation, feelings breathe life into us, and focus directs our steps, the final undeniable truth is revealed through our fruit—our results.
These are the tangible outcomes of our choices, actions, and intentions. The fruit we bear tells our story, even when we’d rather keep some chapters hidden.

## 1\. THE TESTAMENT OF YOUR EFFORTS
Every farmer knows the truth—what you get from the land reflects the time, care, and attention you’ve put in.   In the same way, the fruits of your life show the world the authenticity of your facts, the depth of your feelings, and the clarity of your focus.
Your results don’t lie. They tell the story of your journey, your successes, and your missteps.

## 2\. THE BIBLICAL BAROMETER
When God said, “By their fruit, you shall know them,” it was a clear declaration: results are the ultimate measure of character and commitment. It’s a reminder that while we can sometimes fool ourselves or others with words or pretenses, the outcomes of our actions reveal our true nature.   The fruit of our lives is the ultimate measuring stick for success.

## 3\. THE TRAP OF REASONS OVER RESULTS
Today’s society makes it easy to prioritize excuses over results. We’ve become experts at justifying why we didn’t achieve our goals, hiding behind a wall of reasons. This isn’t just a personal issue—it’s creating a culture where mediocrity is accepted. Where victimhood and entitlement become the default excuses for a lack of commitment to do what’s needed to produce real fruit. But those who want more, who strive to rise above, understand that true power comes from owning failures and using them as stepping stones.

## 4\. FROM VICTIM TO VICTOR
Staying in a victim mindset chains you to past mistakes and current challenges. It’s an anchor that keeps you from moving toward brighter horizons. True power, true freedom, comes from shifting from being a victim of circumstances to a victor through your choices. It’s about realizing that your fruit—whether sweet or bitter—is a direct result of your actions.

## 5\. THE SYNERGY OF KNOWING AND ACHIEVING
Knowing where you are gives you a starting point.
It’s represented by the fruit you have now, which embodies the facts of your situation. Knowing where you want to go gives you purpose and direction. This is where your focus sharpens your vision, guiding you toward the outcomes you desire. Getting what you want is the ultimate reward. The new fruit grows from seeds of determination, nurtured by persistence, and harvested by relentless effort.

## 6\. CLOSING REFLECTION:
Your life is an orchard. Each tree represents a part of your existence, each fruit the result of your efforts. Some trees bear rich, sweet fruit, while others might be barren or bear bitter produce. But with the right mix of recognizing facts, channeling feelings, and sharpening focus, you have the tools to cultivate the results you want.
Don’t be discouraged by a poor harvest; let it be a lesson.
In the next season, with wisdom and effort, your orchard can yield fruit that not only satisfies but also stands as a testament to the master farmer you’ve become. Don’t quit this pursuit of prosperity’s peak until you’ve achieved the Dominion and Freedom we’re all after.

----
# Chapter 12 \- Review
In a world full of illusions and endless distractions, the power of living authentically is everything. The journey through Chapters 8 to 11 isn’t just about principles—it’s about a way of life, a method rooted in truth.
This is the essence of the AlphaOS, a guiding light for those lost in the fog of lies, both self-imposed and external. When we say, “I live by a CODE,” we’re talking about a transformative journey. A journey that brings clarity, builds courage, and creates consistency. It’s a blueprint for steering your life through chaos. Let’s break down the essence of this code.

## 1\. REAL \+ FACTS
In an age where misinformation runs rampant, mistaking mirages for reality is all too common. The first step is to anchor yourself in undeniable, unfiltered facts.
Embracing reality frees you from the chains of delusion. Recognizing facts is like finding North on a compass; it’s the starting point of any meaningful journey. When the world feels like it’s spiraling out of control, facts are the lighthouses that guide you home.

## 2\. RAW \+ FEELINGS 
Feelings are often seen as weaknesses, but in truth, they’re our most powerful allies.
They are our soul’s raw, unfiltered reactions to the world around us.
Embracing feelings means we acknowledge and respect our humanity.
It’s not just about feeling them—it’s about harnessing their power. To feel deeply is to live fully. Our feelings, both light and dark, fuel our spirit and drive us forward.

## 3\. RELEVANT \+ FOCUS
Facts lay the foundation, and feelings provide the fuel, but focus is what determines your direction. In a noisy world, the ability to focus on what truly matters is priceless. Focus acts like a filter, sifting out distractions and ensuring that every ounce of your energy goes toward your goals. It’s like a magnifying glass that intensifies the sun’s rays, turning light into fire.

## 4\. RESULTS \+ FRUIT
At the end of the day, life is a reflection of our actions and their outcomes.
The fruits we bear are proof of our efforts, whether in our personal lives, relationships, or careers. Results are the mirror of our authenticity.
They are the tangible evidence of living by the code, the metric by which we measure the worth of our journey.

## The power of the CODE lies in its cycle. 
The fruits of our actions create new facts, stir our feelings, sharpen our focus, and lead to better results. It’s a spiral of continuous growth and expansion.
The Alpha OS isn’t just a path—it’s a way of being.
Living by the CODE means navigating life authentically, powerfully, and with purpose. 
It means standing in your truth, feeling deeply, focusing intently, and producing results that reflect your efforts.
As warriors, we challenge not just the world but ourselves, constantly striving for a higher standard and living by the CODE in deeper and deeper ways every day.
