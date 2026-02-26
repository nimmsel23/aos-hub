# Fire Map Bot Guidelines (Legacy Path)

Canonical Fire bot tooling now lives in `game/fire/` (`firectl`, `firemap_bot.py`, `firemap.py`).
This folder is kept as a compatibility path/wrapper for older references.

Das zugehörige `firectl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet und bei Bedarf weiterentwickelt.

## Project Structure & Purpose
- `firemap_bot.py` sends Fire Map snapshots from Taskwarrior.
- `README.md` documents env vars and on-demand usage.

## Run & Ops
- Manual: `python firemap_bot.py daily|weekly|listen`
- On-demand: router `/fire` should trigger it locally.

## Output Behavior
- Prefers Telegram Bot API (`AOS_FIREMAP_BOT_TOKEN` + `AOS_FIREMAP_CHAT_ID`) for delivery.
- Falls back to `tele` (`AOS_TELE_BIN`) only if API send fails or API config is missing.
- No local vault writes by default (output is messages).

# Fire

# Chapter 35 - Fire

**1 EMBRACING THE WEEKLY WAR**  
After pinpointing your current position with the “Frame Map,” dreaming big with the “Freedom Map,” and setting your immediate goals with the “Focus Map,” it’s time to take action—it’s time to light “The Fire.”   
The “Fire Map” is your weekly guide, highlighting the specific tasks you need to tackle right now. It’s where your journey truly begins, where the rubber meets the road. Every great quest is made up of small, deliberate steps, and the “Fire Map” helps you take those steps.

**2 THE WEEKLY WAR: TACTICAL PRECISION**  
Calling this stage the “Weekly War” isn’t just for effect.   
Wars aren’t won in one big move; they’re won through a series of decisive battles. The same goes for achieving your big dream.   
It’s not about one giant leap but about winning, week by week.  
So, what does this look like in real life?  
Think of it like preparing to set sail on a long journey. Before you face the open seas, you need to check your supplies, make sure your crew is ready, and ensure your ship is in top shape.   
The “Fire Map” is your weekly checklist, your plan to make sure you’re fully prepared when you set sail.

**3 WHY SIMPLICITY IS GENIUS**  
When you create your first “Fire Map,” you might be surprised by how simple it is. The tasks are straightforward, almost too simple. But that’s the point.   
Breaking your big goals into small, weekly tasks makes the impossible feel doable.  
It’s not about making things easy—it’s about making things clear. And when things are clear, they become easier to tackle.   
Each week, you’ll know exactly what needs to get done.   
There’s no confusion, no overwhelming decisions to make.   
When your weekly tasks are clear and direct, the path to success becomes straight.

**4 THE POWER OF CUMULATIVE ACTION**  
Each “Weekly War” might seem small compared to the grandeur of your “Freedom Map” or the “Impossible Game,” but remember, winning these small battles adds up.   
Fifty-two “Weekly Wars” equal one victorious year. People often think that for something to be life-changing, it has to be complicated. But the “Fire Map” proves this wrong. Its power lies in its simplicity and its focus on what needs to be done right now.

**5 A WINNING STRATEGY**  
Some might say, “This seems too easy.” But this method has helped countless people achieve their Ideal Parallel World. When you align your daily actions with your long-term vision, success is only a matter of time. In the end, “The Fire Map” is your guiding light, leading you through the week, keeping you on track while you aim for your big goals.   
It ensures that while your eyes are on the horizon (Focus and Freedom Maps), your feet stay firmly on the ground, moving step by step toward your dream.  
Remember, achieving the impossible isn’t about grand gestures. It’s about small, deliberate, and consistent actions. Light your FIRE, win your “Weekly War,” and let the world see the blaze of your success.
