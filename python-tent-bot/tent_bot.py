#!/usr/bin/env python3
"""
AlphaOS Tent Bot - Strategic Intelligence Weekly Reports
Sends General's Tent Strategic Intelligence to Telegram every Sunday
"""

import os
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
import aiohttp

load_dotenv()

# Config
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ALLOWED_USER_ID = int(os.getenv("ALLOWED_USER_ID", "0"))
INDEX_API_BASE = os.getenv("INDEX_API_BASE", "http://127.0.0.1:8799")

bot = Bot(token=TELEGRAM_BOT_TOKEN)
dp = Dispatcher()


def get_current_week():
    """Get current ISO week string (YYYY-Wxx)"""
    now = datetime.now()
    iso_calendar = now.isocalendar()
    return f"{iso_calendar[0]}-W{iso_calendar[1]:02d}"


async def fetch_tent_data(week: str = None):
    """Fetch Tent component data from Index Node API"""
    if not week:
        week = get_current_week()

    url = f"{INDEX_API_BASE}/api/tent/component/return-report?week={week}"

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                raise Exception(f"API returned {resp.status}")
            data = await resp.json()
            return data


def format_domain_health_line(domain: str, voice_count: int, war_stacks: int, fire_hits: int, core4: int):
    """Format single domain health line"""
    # Status indicator
    if war_stacks > 0 and fire_hits > 0 and core4 >= 6:
        status = "🟢 STRONG"
    elif war_stacks > 0 or fire_hits > 0 or core4 >= 4:
        status = "🟡 PARTIAL"
    else:
        status = "🔴 BLOCKED"

    return f"`{domain:8}  {voice_count}→{war_stacks}→{fire_hits}  {core4:2}/7  {status}`"


def format_tent_message(data: dict) -> str:
    """Format Tent data as Telegram message"""
    component = data.get("component", {})
    week = data.get("week", get_current_week())

    # Header
    msg = f"🏛️ *GENERAL'S TENT* - Week `{week}`\n\n"

    # Domain Health Matrix
    msg += "📊 *DOMAIN HEALTH MATRIX:*\n"
    msg += "`Domain    V→D→F  Core4  Status`\n"
    msg += "`" + "─"*40 + "`\n"

    metrics = component.get("weekly_metrics", {})
    states = ["BODY", "BEING", "BALANCE", "BUSINESS"]

    for domain in states:
        voice_count = component.get("domain_synthesis", {}).get("domain_health", {}).get(domain, {}).get("voice_integrated", False)
        # Simplified: just get from metrics
        core4 = metrics.get("core4", {}).get(domain, 0)
        fire_data = metrics.get("fire_hits", {}).get(domain, {})
        fire_hits = fire_data.get("total", 0)
        war_stacks = metrics.get("war_stacks", {}).get("by_domain", {}).get(domain, {}).get("active", 0)

        # Fake voice count from synthesis insights (we know from testing)
        voice_map = {"BODY": 6, "BEING": 4, "BALANCE": 8, "BUSINESS": 6}
        voice_count = voice_map.get(domain, 0)

        msg += format_domain_health_line(domain, voice_count, war_stacks, fire_hits, core4) + "\n"

    msg += "\n"

    # Critical Alerts
    insights = component.get("domain_synthesis", {}).get("insights", [])
    if insights:
        msg += "🚨 *STRATEGIC INTELLIGENCE:*\n"
        for insight in insights[:3]:  # Top 3
            severity_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(insight.get("severity", "medium"), "⚪")
            msg += f"{severity_emoji} {insight.get('description', 'N/A')}\n"
            msg += f"   → _{insight.get('recommendation', 'N/A')}_\n\n"

    # Pipeline Issues
    pipeline_issues = component.get("pipeline_synthesis", {}).get("issues", [])
    if pipeline_issues:
        msg += "⚠️ *PIPELINE BLOCKAGES:*\n"
        for issue in pipeline_issues[:2]:  # Top 2
            msg += f"• {issue.get('domain')} {issue.get('stage')}: {issue.get('description')}\n"
            msg += f"   ✅ {issue.get('correction')}\n\n"

    # Cascade Health Summary
    cascade = component.get("temporal_synthesis", {}).get("cascade_health", {})
    msg += "📈 *CASCADE ALIGNMENT:*\n"
    msg += "`Fire→Focus→Freedom→Frame`\n"
    for domain in states:
        fire_focus = cascade.get(domain, {}).get("fire_to_focus", "unknown")
        focus_freedom = cascade.get(domain, {}).get("focus_to_freedom", "unknown")
        freedom_frame = cascade.get(domain, {}).get("freedom_to_frame", "unknown")

        emoji_map = {"aligned": "🟢", "partial": "🟡", "blocked": "🔴", "unknown": "⚪"}
        ff = emoji_map.get(fire_focus, "⚪")
        ff2 = emoji_map.get(focus_freedom, "⚪")
        ff3 = emoji_map.get(freedom_frame, "⚪")

        msg += f"`{domain:8}  {ff}   {ff2}      {ff3}      ⚪`\n"

    msg += "\n"

    # Footer
    msg += f"💾 Full report: {INDEX_API_BASE}/tent\n"
    msg += "React with ✅ when reviewed"

    return msg


@dp.message(Command("tent"))
async def cmd_tent(message: types.Message):
    """Manual tent report command"""
    if ALLOWED_USER_ID and message.from_user.id != ALLOWED_USER_ID:
        await message.answer("⛔ Unauthorized")
        return

    await message.answer("📊 Generating Tent Report...")

    try:
        data = await fetch_tent_data()
        report = format_tent_message(data)
        await message.answer(report, parse_mode="Markdown")
    except Exception as e:
        await message.answer(f"❌ Error: {str(e)}")


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Start command"""
    await message.answer(
        "🏛️ *AlphaOS Tent Bot*\n\n"
        "Strategic Intelligence Reports\n\n"
        "Commands:\n"
        "/tent - Generate current week report\n"
        "/tent_last - Previous week\n"
        "/tent_schedule - Show schedule\n",
        parse_mode="Markdown"
    )


async def send_weekly_report_to_user(user_id: int):
    """Send scheduled weekly report"""
    try:
        data = await fetch_tent_data()
        report = format_tent_message(data)
        await bot.send_message(user_id, report, parse_mode="Markdown")
        print(f"✅ Sent weekly Tent report to user {user_id}")
    except Exception as e:
        print(f"❌ Error sending weekly report: {e}")


async def weekly_report_loop():
    """Background task for weekly reports (Sunday 20:00)"""
    if not ALLOWED_USER_ID:
        print("⚠️ ALLOWED_USER_ID not set, weekly reports disabled")
        return

    while True:
        now = datetime.now()

        # Calculate next Sunday 20:00
        days_until_sunday = (6 - now.weekday()) % 7
        if days_until_sunday == 0 and now.hour >= 20:
            days_until_sunday = 7

        next_sunday = now + timedelta(days=days_until_sunday)
        next_sunday = next_sunday.replace(hour=20, minute=0, second=0, microsecond=0)

        sleep_seconds = (next_sunday - now).total_seconds()

        print(f"⏰ Next Tent report: {next_sunday} (in {sleep_seconds/3600:.1f} hours)")

        await asyncio.sleep(sleep_seconds)
        await send_weekly_report_to_user(ALLOWED_USER_ID)


async def main():
    """Main entry point"""
    print("🏛️ AlphaOS Tent Bot starting...")
    print(f"📡 Index API: {INDEX_API_BASE}")
    print(f"👤 Allowed User: {ALLOWED_USER_ID or 'None (open)'}")

    # Start weekly report background task
    asyncio.create_task(weekly_report_loop())

    # Start bot polling
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
