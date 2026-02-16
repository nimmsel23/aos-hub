# Core4 Per-Habit Configurations

This directory contains YAML configs for each of the 8 Core4 habits, allowing **day-of-week personalization** of task titles and descriptions.

## How It Works

**seed_week.py** reads these configs to create personalized Taskwarrior tasks:

1. For each day of the week (Monday–Sunday)
2. For each habit (fitness, fuel, meditation, memoirs, partner, posterity, discover, declare)
3. Check if a `schedule.{day}` override exists
4. Use override title/description, or fall back to `default`

## File Structure

```yaml
# habits/{habit}.yaml

default:
  title: "{display} — {date}"
  description: "Default description"

schedule:
  monday:
    title: "Custom Monday Title — {date}"
    description: "Monday-specific description"

  friday:
    title: "Custom Friday Title — {date}"
    description: "Friday-specific description"

  # Days without override use default
```

## Available Placeholders

- `{display}` - Habit display name (e.g., "Fitness", "Fuel")
- `{date}` - ISO date (e.g., "2026-02-06")
- `{domain}` - Domain name (body/being/balance/business)

## Example: Personalized Training Week

**fitness.yaml:**
```yaml
schedule:
  monday:    title: "Upper Body — {date}"
  wednesday: title: "Lower Body — {date}"
  friday:    title: "Full Body — {date}"
  sunday:    title: "Rest — {date}"
```

Result: Instead of generic "Fitness — 2026-02-03" every day, you get:
- Monday: "Upper Body — 2026-02-03"
- Wednesday: "Lower Body — 2026-02-05"
- Friday: "Full Body — 2026-02-07"
- Sunday: "Rest — 2026-02-09"

## Customization Notes

⚠️  **IMPORTANT:** The provided configs contain **dummy/example data**. You should customize them to match your actual routines:

**Dummy Personalization (replace):**
- `fitness.yaml` - Example training split (Upper/Lower/Full Body)
- `fuel.yaml` - Example meal prep schedule
- `partner.yaml` - Example date night (Friday) + chill day (Sunday)
- `posterity.yaml` - Example content creation (Saturday)

**αOS Standards (adjust timings if needed):**
- `declare.yaml` - Weekly Strike (Monday) + Weekly Review (Friday)
- `discover.yaml` - Deep Learning (Sunday)

**Generic (optionally add schedules):**
- `meditation.yaml` - Default daily practice (could add: Sunday = Deep Meditation)
- `memoirs.yaml` - Default daily journaling (could add: Sunday = Weekly Review)

## Testing Your Configs

Preview tasks without creating them:

```bash
cd ~/aos-hub/core4/python-core4
python3 seed_week.py --dry-run
```

This shows all 56 tasks with personalized titles based on your configs.

## Applying Changes

After editing configs:

```bash
# Force reseed (recreates all tasks for current week)
python3 seed_week.py --force

# Or via wrapper
~/aos-hub/core4/python-core4/core4ctl seed-week --force
```

**Note:** Without `--force`, seed_week.py is idempotent and won't recreate existing tasks.
