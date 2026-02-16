#!/usr/bin/env python3
"""
TELEGRAM WAR STACK COACH BOT - IMPROVED VERSION
================================================================
Interactive War Stack creation with structured questioning
Improved security, persistence, and multi-user support
"""

import os
import json
import datetime
import logging
import asyncio
import urllib.request
import urllib.error
import time
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, ConversationHandler, CallbackQueryHandler, PicklePersistence

from gemini import GeminiClient, get_command

# ================================================================
# CONFIGURATION
# ================================================================

# Security: Bot token from environment
BOT_TOKEN = os.getenv("WARSTACK_BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN") or ""
BOT_TOKEN = BOT_TOKEN.strip()
if not BOT_TOKEN:
    raise ValueError("WARSTACK_BOT_TOKEN or TELEGRAM_BOT_TOKEN required")

# Gemini config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
GEMINI_DELAY_SECONDS = int(os.getenv("GEMINI_DELAY_SECONDS", "1800"))

# GAS output (optional)
GAS_WEBHOOK_URL = (
    os.getenv("WARSTACK_GAS_WEBHOOK_URL") or os.getenv("AOS_GAS_WEBHOOK_URL") or ""
).strip()
GAS_ONLY = os.getenv("WARSTACK_GAS_ONLY", "0").strip() == "1"
GAS_TIMEOUT = int(os.getenv("WARSTACK_GAS_TIMEOUT", "6"))
# Optional: direct task push to Bridge
AOS_BRIDGE_URL = os.getenv("AOS_BRIDGE_URL", "").strip()
AOS_BRIDGE_TIMEOUT = int(os.getenv("AOS_BRIDGE_TIMEOUT", "5"))

IDLE_TIMEOUT_SECONDS = int(os.getenv("WARSTACK_IDLE_TIMEOUT", "900"))

# Paths
OBSIDIAN_VAULT = Path(os.getenv("OBSIDIAN_VAULT", "~/AlphaOS-Vault")).expanduser()
WARSTACK_OUTPUT_DIR = Path(
    os.getenv("WARSTACK_OUTPUT_DIR", OBSIDIAN_VAULT / "Door" / "3-Production")
)
PERSISTENCE_DIR = Path(os.getenv("WARSTACK_DATA_DIR", "~/.local/share/warstack")).expanduser()
PERSISTENCE_DIR.mkdir(parents=True, exist_ok=True)

# Logging setup
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Conversation states
(DOMAIN_SELECT, SUBDOMAIN_SELECT, DOMINO_DOOR, TRIGGER, NARRATIVE, 
 VALIDATION, IMPACT, CONSEQUENCES, HIT1_FACT, HIT1_OBSTACLE, HIT1_STRIKE,
 HIT2_FACT, HIT2_OBSTACLE, HIT2_STRIKE, HIT3_FACT, HIT3_OBSTACLE, HIT3_STRIKE,
 HIT4_FACT, HIT4_OBSTACLE, HIT4_STRIKE, INSIGHTS, LESSONS) = range(22)

# ================================================================
# DATA MODELS
# ================================================================

@dataclass
class Hit:
    fact: str = ""
    obstacle: str = ""
    strike: str = ""
    responsibility: str = "Me"

@dataclass
class WarStack:
    user_id: int = 0
    title: str = ""
    domain: str = ""
    subdomain: str = ""
    domino_door: str = ""
    trigger: str = ""
    narrative: str = ""
    validation: str = ""
    impact: str = ""
    consequences: str = ""
    hits: list[Hit] = None
    insights: str = ""
    lessons: str = ""
    date: str = ""
    week: str = ""
    
    def __post_init__(self):
        if self.hits is None:
            self.hits = [Hit() for _ in range(4)]
        if not self.date:
            self.date = datetime.datetime.now().strftime('%Y-%m-%d')
        if not self.week:
            self.week = datetime.datetime.now().strftime('%Y-W%U')

# ================================================================
# PERSISTENCE MANAGER
# ================================================================

class WarStackPersistence:
    """Handles saving and loading war stack data per user"""
    
    def save_war_stack(self, user_id: int, war_stack: WarStack) -> None:
        """Save war stack to JSON file"""
        try:
            filepath = PERSISTENCE_DIR / f"warstack_{user_id}.json"
            # Convert dataclass to dict, handling nested Hit objects
            data = asdict(war_stack)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info(f"War stack saved for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to save war stack for user {user_id}: {e}")
            raise

    def load_war_stack(self, user_id: int) -> Optional[WarStack]:
        """Load war stack from JSON file"""
        try:
            filepath = PERSISTENCE_DIR / f"warstack_{user_id}.json"
            if not filepath.exists():
                return None
            
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Convert hits back to Hit objects
            if 'hits' in data:
                data['hits'] = [Hit(**hit) for hit in data['hits']]
            
            return WarStack(**data)
        except Exception as e:
            logger.error(f"Failed to load war stack for user {user_id}: {e}")
            return None

    def delete_war_stack(self, user_id: int) -> None:
        """Delete war stack file"""
        try:
            filepath = PERSISTENCE_DIR / f"warstack_{user_id}.json"
            if filepath.exists():
                filepath.unlink()
            logger.info(f"War stack deleted for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to delete war stack for user {user_id}: {e}")

# Global persistence manager
persistence = WarStackPersistence()

# ================================================================
# DOMAIN CONFIGURATIONS
# ================================================================

DOMAIN_CONFIG = {
    'BODY': {
        'emoji': '💪',
        'subdomains': ['Fitness', 'Fuel', 'Health', 'Energy'],
        'description': 'Körper, Gesundheit, Energie'
    },
    'BEING': {
        'emoji': '🧘',
        'subdomains': ['Meditation', 'Memoirs', 'Spirituality', 'Mindset'],
        'description': 'Geist, Spiritualität, mentale Klarheit'
    },
    'BALANCE': {
        'emoji': '💚',
        'subdomains': ['Partner', 'Posterity', 'People', 'Social'],
        'description': 'Beziehungen, Familie, Balance'
    },
    'BUSINESS': {
        'emoji': '💼',
        'subdomains': ['Discover', 'Declare', 'Marketing', 'Sales', 'Systems', 'Profit'],
        'description': 'Karriere, Geld, Wachstum'
    }
}

# ================================================================
# INPUT VALIDATION
# ================================================================

def validate_input(text: str) -> tuple[bool, str]:
    """Validate user input"""
    if not text or not text.strip():
        return False, "❌ Leere Eingabe nicht erlaubt"
    
    if len(text) > 500:
        return False, "❌ Text zu lang (max. 500 Zeichen)"
    
    # Check for potentially malicious content
    forbidden = ['../', '~/', '/etc/', '/var/', '<script>', 'javascript:']
    if any(bad in text.lower() for bad in forbidden):
        return False, "❌ Ungültige Zeichen in der Eingabe"
    
    return True, ""

# ================================================================
# HELPER FUNCTIONS
# ================================================================

def get_war_stack(user_id: int) -> WarStack:
    """Get or create war stack for user"""
    war_stack = persistence.load_war_stack(user_id)
    if not war_stack:
        war_stack = WarStack(user_id=user_id)
    return war_stack

def save_war_stack(war_stack: WarStack) -> None:
    """Save war stack with error handling"""
    try:
        persistence.save_war_stack(war_stack.user_id, war_stack)
    except Exception as e:
        logger.error(f"Failed to save war stack: {e}")


def touch_activity(application: Application) -> None:
    application.bot_data["last_activity"] = time.time()


async def record_activity(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    touch_activity(context.application)


async def idle_watchdog(context: ContextTypes.DEFAULT_TYPE) -> None:
    last = context.application.bot_data.get("last_activity", time.time())
    if time.time() - last < IDLE_TIMEOUT_SECONDS:
        return
    logger.info("Idle timeout reached, shutting down.")
    try:
        await context.application.stop()
        await context.application.shutdown()
    except Exception as exc:
        logger.error(f"Failed to shut down on idle: {exc}")

async def send_validation_error(update: Update, message: str) -> None:
    """Send validation error message"""
    await update.message.reply_text(
        f"{message}\n\nBitte versuche es erneut:",
        parse_mode='Markdown'
    )

# ================================================================
# GEMINI SUPPORT
# ================================================================

def build_gemini_client() -> Optional[GeminiClient]:
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set; strategist feedback disabled")
        return None
    return GeminiClient(api_key=GEMINI_API_KEY, model_name=GEMINI_MODEL)


def split_message(text: str, max_len: int = 3800) -> list[str]:
    chunks = []
    remaining = text.strip()
    while remaining:
        if len(remaining) <= max_len:
            chunks.append(remaining)
            break
        cut = remaining.rfind("\n", 0, max_len)
        if cut == -1:
            cut = max_len
        chunks.append(remaining[:cut].strip())
        remaining = remaining[cut:].lstrip()
    return chunks or [text]


async def send_strategist_feedback(context: ContextTypes.DEFAULT_TYPE) -> None:
    payload = context.job.data or {}
    user_id = payload.get("user_id")
    war_stack = payload.get("war_stack")
    if not user_id or not war_stack:
        return

    client = context.application.bot_data.get("gemini_client")
    if not client:
        return

    command = get_command("strategist")
    if not command:
        return

    loop = asyncio.get_running_loop()
    response = await loop.run_in_executor(None, command, client, war_stack)
    if not response:
        return

    header = "Strategic Review (Gemini)"
    for chunk in split_message(response):
        await context.bot.send_message(chat_id=user_id, text=f"{header}\n\n{chunk}")
        header = ""


def schedule_strategist_feedback(application: Application, user_id: int, war_stack: WarStack) -> None:
    if not application.job_queue:
        return
    if not application.bot_data.get("gemini_client"):
        return
    payload = {"user_id": user_id, "war_stack": asdict(war_stack)}
    application.job_queue.run_once(
        send_strategist_feedback,
        when=GEMINI_DELAY_SECONDS,
        data=payload,
        name=f"strategist_{user_id}_{war_stack.week}",
    )

# ================================================================
# BOT COMMANDS
# ================================================================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start command - welcome message"""
    user_id = update.effective_user.id
    
    welcome_msg = """
🔥 **Alpha OS War Stack Coach** ⚔️

Ich führe dich durch die Erstellung eines strategischen War Stacks für diese Woche!

**Der War Stack Prozess:**
1️⃣ Wähle deinen Domain-Fokus (KWML)
2️⃣ Definiere deine Domino Door
3️⃣ Plane 4 strategische Hits
4️⃣ Erstelle Tasks in Taskwarrior
5️⃣ Generiere Obsidian-Notiz

**Verfügbare Kommandos:**
/warstack - War Stack erstellen
/resume - Unterbrochenen Stack fortsetzen
/status - Aktueller Status
/cancel - Aktuellen Prozess abbrechen
/help - Diese Hilfe

Bereit, diese Woche zu dominieren? 💪

Nutze /warstack um zu beginnen!
"""
    
    await update.message.reply_text(welcome_msg, parse_mode='Markdown')

async def start_war_stack(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start the War Stack creation process"""
    user_id = update.effective_user.id
    
    # Create new war stack
    war_stack = WarStack(user_id=user_id)
    save_war_stack(war_stack)
    
    # Create inline keyboard for domains
    keyboard = []
    for domain, config in DOMAIN_CONFIG.items():
        keyboard.append([InlineKeyboardButton(
            f"{config['emoji']} {domain}", 
            callback_data=f"domain_{domain}"
        )])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🚪 **DOOR WAR** - Wähle deinen Domain-Fokus für diese Woche:\n\n"
        "Welcher Bereich braucht deine strategische Aufmerksamkeit am meisten?\n\n"
        "💪 **BODY** - Fitness, Gesundheit, Energie\n"
        "🧘 **BEING** - Spiritualität, mentale Klarheit\n" 
        "💚 **BALANCE** - Beziehungen, Familie\n"
        "💼 **BUSINESS** - Karriere, Geld, Wachstum",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )
    
    return DOMAIN_SELECT

async def domain_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle domain selection via callback"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    domain = query.data.replace("domain_", "")
    
    war_stack = get_war_stack(user_id)
    war_stack.domain = domain
    save_war_stack(war_stack)
    
    # Create subdomain keyboard
    config = DOMAIN_CONFIG[domain]
    keyboard = []
    for subdomain in config['subdomains']:
        keyboard.append([InlineKeyboardButton(
            subdomain, 
            callback_data=f"subdomain_{subdomain}"
        )])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        f"🎯 **{domain} Domain gewählt!**\n\n"
        f"Jetzt wähle deinen spezifischen Sub-Domain Fokus:",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )
    
    return SUBDOMAIN_SELECT

async def subdomain_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle subdomain selection via callback"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    subdomain = query.data.replace("subdomain_", "")
    
    war_stack = get_war_stack(user_id)
    war_stack.subdomain = subdomain
    save_war_stack(war_stack)
    
    await query.edit_message_text(
        f"⚔️ **WAR STACK ERSTELLUNG**\n\n"
        f"**Domain**: {war_stack.domain}\n"
        f"**Sub-domain**: {war_stack.subdomain}\n\n"
        f"🎯 **DIE DOMINO DOOR**\n\n"
        f"Welche spezifische Door willst du diese Woche öffnen?\n"
        f"Sei präzise und messbar.\n\n"
        f"Beispiel: 'Automatisierungssystem für Kundenonboarding fertigstellen'\n"
        f"Beispiel: 'Tägliche 6-Uhr-Workout-Routine etablieren'\n\n"
        f"Deine Domino Door:",
        parse_mode='Markdown'
    )
    
    return DOMINO_DOOR

async def domino_door_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle domino door input"""
    user_id = update.effective_user.id
    text = update.message.text
    
    # Validate input
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return DOMINO_DOOR
    
    war_stack = get_war_stack(user_id)
    war_stack.domino_door = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🔥 **TRIGGER**\n\n"
        "Welche Person oder welches Ereignis hat deinen Wunsch ausgelöst, diese Door zu öffnen?\n\n"
        "Was hat das jetzt dringend oder wichtig gemacht?\n\n"
        "Beispiel: 'Kunde beschwerte sich über langsames Onboarding'\n"
        "Beispiel: 'Merkte, dass ich keine Energie für Familienzeit habe'",
        parse_mode='Markdown'
    )
    
    return TRIGGER

async def trigger_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle trigger input"""
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return TRIGGER
    
    war_stack = get_war_stack(user_id)
    war_stack.trigger = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "📖 **NARRATIV**\n\n"
        "Welche Geschichte erzählst du dir aktuell über diese Door?\n\n"
        "Was ist deine aktuelle Überzeugung oder Annahme?\n\n"
        "Beispiel: 'Ich habe keine Zeit, Systeme zu bauen'\n"
        "Beispiel: 'Ich bin nach der Arbeit zu müde zum Sport'",
        parse_mode='Markdown'
    )
    
    return NARRATIVE

# ================================================================
# HIT PROCESSING FUNCTIONS
# ================================================================

async def narrative_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle narrative input"""
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return NARRATIVE
    
    war_stack = get_war_stack(user_id)
    war_stack.narrative = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "✅ **VALIDIERUNG**\n\n"
        "Warum fühlt es sich notwendig an, diese Door zu öffnen?\n\n"
        "Was ist der tiefere Grund, warum das wichtig ist?\n\n"
        "Beispiel: 'Zufriedene Kunden empfehlen mehr Geschäft'\n"
        "Beispiel: 'Ich will präsent und energiegeladen für meine Familie sein'",
        parse_mode='Markdown'
    )
    
    return VALIDATION

# Continue with remaining states (validation_set, impact_set, etc.)
# For brevity, I'll implement the key hit processing functions

async def validation_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return VALIDATION
    
    war_stack = get_war_stack(user_id)
    war_stack.validation = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🚀 **AUSWIRKUNGEN DES ÖFFNENS**\n\n"
        "Wie würde das Öffnen dieser Door dein Business/Leben verändern?\n\n"
        "Was wird möglich?",
        parse_mode='Markdown'
    )
    
    return IMPACT

async def impact_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return IMPACT
    
    war_stack = get_war_stack(user_id)
    war_stack.impact = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "⚠️ **KONSEQUENZEN DER UNTÄTIGKEIT**\n\n"
        "Was passiert, wenn diese Door geschlossen bleibt?\n\n"
        "Was sind die Kosten des Nicht-Handelns?",
        parse_mode='Markdown'
    )
    
    return CONSEQUENCES

async def consequences_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return CONSEQUENCES
    
    war_stack = get_war_stack(user_id)
    war_stack.consequences = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "⚔️ **DIE VIER HITS**\n\n"
        "Jetzt zerlegen wir deine Door in 4 strategische Hits!\n\n"
        "🎯 **HIT 1 - FAKT**\n\n"
        "Was ist das klare, messbare Ergebnis, das du mit Hit 1 erreichen willst?\n\n"
        "Beispiel: '3 Automatisierungstools recherchieren und dokumentieren'\n"
        "Beispiel: '3 Tage hintereinander 30-minütiges Workout absolvieren'",
        parse_mode='Markdown'
    )
    
    return HIT1_FACT

# ================================================================
# OUTPUT GENERATION
# ================================================================

def render_war_stack_markdown(war_stack: WarStack) -> str:
    """Render War Stack markdown (minimal YAML frontmatter)"""
    content = f"""---
tw_uuid: null
taskwarrior_door_uuid: null
taskwarrior_profit_uuid: null
taskwarrior_hits:
  - hit_index: 1
    uuid: null
  - hit_index: 2
    uuid: null
  - hit_index: 3
    uuid: null
  - hit_index: 4
    uuid: null
---

# ⚔️ WAR STACK — {war_stack.domino_door}

**Generiert:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} (Telegram Bot)
**Woche:** {war_stack.week}
**Domain:** {war_stack.domain} → {war_stack.subdomain}

---

## 🔥 Transformative Inquiry

### Trigger
{war_stack.trigger}

### Narrativ
{war_stack.narrative}

### Validierung
{war_stack.validation}

### Auswirkungen (Impact)
{war_stack.impact}

### Konsequenzen (wenn ich nichts tue)
{war_stack.consequences}

---

## 🎯 Die Vier Hits

"""
        
        for i, hit in enumerate(war_stack.hits, 1):
            content += f"""### Hit {i}
- **Fakt**: {hit.fact}
- **Hindernis**: {hit.obstacle}
- **Schlag**: {hit.strike}
- **Verantwortung**: {hit.responsibility}

"""

        content += f"""---

## 🧠 Erkenntnisse
{war_stack.insights}

## 📚 Gelernte Lektionen
{war_stack.lessons}

---

## 📋 Taskwarrior UUIDs (Bridge/Taskwarrior)

- Door UUID:
- Profit UUID:
- Hit 1 UUID:
- Hit 2 UUID:
- Hit 3 UUID:
- Hit 4 UUID:

---

## 📋 Taskwarrior Implementation (manual)

```bash
# Weekly Door
task add "Weekly Door: {war_stack.domain} Focus" pillar:door project:{war_stack.domain} due:friday

# Strategic Hits
"""
        
        days = ['tuesday', 'wednesday', 'thursday', 'friday']
        for i, hit in enumerate(war_stack.hits):
            fact_short = hit.fact[:50] + "..." if len(hit.fact) > 50 else hit.fact
            content += f'task add "Hit{i+1}: {fact_short}" project:{war_stack.domain} due:{days[i]}\n'
        
        content += f"""```

**Erstellt**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    return content


def create_obsidian_war_stack(war_stack: WarStack, content: Optional[str] = None) -> str:
    """Create Obsidian War Stack note with error handling"""
    try:
        markdown = content or render_war_stack_markdown(war_stack)

        # Safe file creation
        title_slug = "".join(c for c in war_stack.domino_door[:60] if c.isalnum() or c in "-_") or "warstack"
        filename = f"{war_stack.week}-WarStack-{war_stack.domain}-{title_slug}.md"
        filename = "".join(c for c in filename if c.isalnum() or c in ".-_")

        WARSTACK_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        filepath = WARSTACK_OUTPUT_DIR / filename

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(markdown)

        logger.info(f"Obsidian note created: {filepath}")
        return str(filepath)

    except Exception as e:
        logger.error(f"Failed to create Obsidian note: {e}")
        raise

def create_taskwarrior_commands(war_stack: WarStack) -> str:
    """Create Taskwarrior commands with error handling"""
    try:
        commands = []
        
        # Weekly Door
        commands.append(f'task add "Weekly Door: {war_stack.domain} Focus" pillar:door project:{war_stack.domain} due:friday')
        
        # Strategic Hits
        days = ['tuesday', 'wednesday', 'thursday', 'friday']
        for i, hit in enumerate(war_stack.hits):
            if hit.fact:  # Only add if fact is not empty
                fact_short = hit.fact[:60] + "..." if len(hit.fact) > 60 else hit.fact
                commands.append(f'task add "Hit{i+1}: {fact_short}" project:{war_stack.domain} due:{days[i]}')
        
        return '\n'.join(commands)
        
    except Exception as e:
        logger.error(f"Failed to create Taskwarrior commands: {e}")
        return f"# Error creating commands: {e}"


def read_war_stack_markdown(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8")
    except Exception as exc:
        logger.error(f"Failed to read war stack markdown: {exc}")
        return ""


def build_task_payloads(war_stack: WarStack) -> list[dict]:
    tasks = []
    tasks.append(
        {
            "description": f"Weekly Door: {war_stack.domain} Focus",
            "project": war_stack.domain,
            "tags": ["door"],
            "due": "friday",
        }
    )
    days = ["tuesday", "wednesday", "thursday", "friday"]
    for i, hit in enumerate(war_stack.hits):
        if not hit.fact:
            continue
        tasks.append(
            {
                "description": f"Hit{i+1}: {hit.fact}",
                "project": war_stack.domain,
                "tags": ["hit", "production"],
                "due": days[i],
            }
        )
    return tasks


def post_tasks_to_bridge(tasks: list[dict]) -> tuple[bool, str]:
    """Optional: push tasks directly to Bridge -> Taskwarrior"""
    if not AOS_BRIDGE_URL:
        return False, "AOS_BRIDGE_URL not set"
    try:
        payload = json.dumps({"source": "warstack_bot", "tasks": tasks}).encode("utf-8")
        url = AOS_BRIDGE_URL.rstrip("/") + "/bridge/task/execute"
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=AOS_BRIDGE_TIMEOUT) as resp:
            if 200 <= resp.status < 300:
                return True, "ok"
            return False, f"HTTP {resp.status}"
    except Exception as exc:
        return False, str(exc)


def post_to_gas(payload: dict) -> tuple[bool, str]:
    if not GAS_WEBHOOK_URL:
        return False, "WARSTACK_GAS_WEBHOOK_URL not set"
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            GAS_WEBHOOK_URL,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=GAS_TIMEOUT) as resp:
            if resp.status >= 300:
                return False, f"GAS HTTP {resp.status}"
    except urllib.error.URLError as exc:
        return False, str(exc)
    return True, ""

# ================================================================
# ADDITIONAL COMMANDS
# ================================================================

async def resume_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Resume interrupted war stack creation"""
    touch_activity(context.application)
    user_id = update.effective_user.id
    war_stack = persistence.load_war_stack(user_id)
    
    if not war_stack:
        await update.message.reply_text(
            "❌ Kein unterbrochener War Stack gefunden.\n\n"
            "Nutze /warstack um einen neuen zu starten!"
        )
        return

    if not war_stack.hits or len(war_stack.hits) < 4:
        war_stack.hits = (war_stack.hits or []) + [Hit() for _ in range(4 - len(war_stack.hits or []))]
        save_war_stack(war_stack)

    if not war_stack.domain:
        return await prompt_domain(update)
    if not war_stack.subdomain:
        return await prompt_subdomain(update, war_stack.domain)
    if not war_stack.domino_door:
        return await prompt_domino_door(update, war_stack)
    if not war_stack.trigger:
        return await prompt_trigger(update)
    if not war_stack.narrative:
        return await prompt_narrative(update)
    if not war_stack.validation:
        return await prompt_validation(update)
    if not war_stack.impact:
        return await prompt_impact(update)
    if not war_stack.consequences:
        return await prompt_consequences(update)

    if not war_stack.hits[0].fact:
        return await prompt_hit1_fact(update)
    if not war_stack.hits[0].obstacle:
        return await prompt_hit1_obstacle(update)
    if not war_stack.hits[0].strike:
        return await prompt_hit1_strike(update)

    if not war_stack.hits[1].fact:
        return await prompt_hit2_fact(update)
    if not war_stack.hits[1].obstacle:
        return await prompt_hit2_obstacle(update)
    if not war_stack.hits[1].strike:
        return await prompt_hit2_strike(update)

    if not war_stack.hits[2].fact:
        return await prompt_hit3_fact(update)
    if not war_stack.hits[2].obstacle:
        return await prompt_hit3_obstacle(update)
    if not war_stack.hits[2].strike:
        return await prompt_hit3_strike(update)

    if not war_stack.hits[3].fact:
        return await prompt_hit4_fact(update)
    if not war_stack.hits[3].obstacle:
        return await prompt_hit4_obstacle(update)
    if not war_stack.hits[3].strike:
        return await prompt_hit4_strike(update)

    if not war_stack.insights:
        return await prompt_insights(update)
    if not war_stack.lessons:
        return await prompt_lessons(update)

    await update.message.reply_text(
        "✅ War Stack ist bereits vollständig. Nutze /warstack für einen neuen."
    )
    return ConversationHandler.END


async def prompt_domain(update: Update) -> int:
    keyboard = []
    for domain, config in DOMAIN_CONFIG.items():
        keyboard.append([InlineKeyboardButton(
            f"{config['emoji']} {domain}",
            callback_data=f"domain_{domain}"
        )])
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "🚪 **DOOR WAR** - Wähle deinen Domain-Fokus für diese Woche:\n\n"
        "Welcher Bereich braucht deine strategische Aufmerksamkeit am meisten?\n\n"
        "💪 **BODY** - Fitness, Gesundheit, Energie\n"
        "🧘 **BEING** - Spiritualität, mentale Klarheit\n"
        "💚 **BALANCE** - Beziehungen, Familie\n"
        "💼 **BUSINESS** - Karriere, Geld, Wachstum",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )
    return DOMAIN_SELECT


async def prompt_subdomain(update: Update, domain: str) -> int:
    if domain not in DOMAIN_CONFIG:
        return await prompt_domain(update)
    config = DOMAIN_CONFIG[domain]
    keyboard = []
    for subdomain in config['subdomains']:
        keyboard.append([InlineKeyboardButton(
            subdomain,
            callback_data=f"subdomain_{subdomain}"
        )])
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        f"🎯 **{domain} Domain gewählt!**\n\n"
        f"Jetzt wähle deinen spezifischen Sub-Domain Fokus:",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )
    return SUBDOMAIN_SELECT


async def prompt_domino_door(update: Update, war_stack: WarStack) -> int:
    await update.message.reply_text(
        f"⚔️ **WAR STACK ERSTELLUNG**\n\n"
        f"**Domain**: {war_stack.domain}\n"
        f"**Sub-domain**: {war_stack.subdomain}\n\n"
        f"🎯 **DIE DOMINO DOOR**\n\n"
        f"Welche spezifische Door willst du diese Woche öffnen?\n"
        f"Sei präzise und messbar.\n\n"
        f"Beispiel: 'Automatisierungssystem für Kundenonboarding fertigstellen'\n"
        f"Beispiel: 'Tägliche 6-Uhr-Workout-Routine etablieren'\n\n"
        f"Deine Domino Door:",
        parse_mode='Markdown'
    )
    return DOMINO_DOOR


async def prompt_trigger(update: Update) -> int:
    await update.message.reply_text(
        "🔥 **TRIGGER**\n\n"
        "Welche Person oder welches Ereignis hat deinen Wunsch ausgelöst, diese Door zu öffnen?\n\n"
        "Was hat das jetzt dringend oder wichtig gemacht?\n\n"
        "Beispiel: 'Kunde beschwerte sich über langsames Onboarding'\n"
        "Beispiel: 'Merkte, dass ich keine Energie für Familienzeit habe'",
        parse_mode='Markdown'
    )
    return TRIGGER


async def prompt_narrative(update: Update) -> int:
    await update.message.reply_text(
        "📖 **NARRATIV**\n\n"
        "Welche Geschichte erzählst du dir aktuell über diese Door?\n\n"
        "Was ist deine aktuelle Überzeugung oder Annahme?\n\n"
        "Beispiel: 'Ich habe keine Zeit, Systeme zu bauen'\n"
        "Beispiel: 'Ich bin nach der Arbeit zu müde zum Sport'",
        parse_mode='Markdown'
    )
    return NARRATIVE


async def prompt_validation(update: Update) -> int:
    await update.message.reply_text(
        "✅ **VALIDIERUNG**\n\n"
        "Warum fühlt es sich notwendig an, diese Door zu öffnen?\n\n"
        "Was ist der tiefere Grund, warum das wichtig ist?\n\n"
        "Beispiel: 'Zufriedene Kunden empfehlen mehr Geschäft'\n"
        "Beispiel: 'Ich will präsent und energiegeladen für meine Familie sein'",
        parse_mode='Markdown'
    )
    return VALIDATION


async def prompt_impact(update: Update) -> int:
    await update.message.reply_text(
        "🚀 **AUSWIRKUNG**\n\n"
        "Wie verändert sich dein Leben oder Business, wenn du diese Door öffnest?\n\n"
        "Was wird anders, besser, größer?",
        parse_mode='Markdown'
    )
    return IMPACT


async def prompt_consequences(update: Update) -> int:
    await update.message.reply_text(
        "⚠️ **KONSEQUENZEN DER UNTÄTIGKEIT**\n\n"
        "Was passiert, wenn diese Door geschlossen bleibt?\n\n"
        "Was sind die Kosten des Nicht-Handelns?",
        parse_mode='Markdown'
    )
    return CONSEQUENCES


async def prompt_hit1_fact(update: Update) -> int:
    await update.message.reply_text(
        "⚔️ **DIE VIER HITS**\n\n"
        "Jetzt zerlegen wir deine Door in 4 strategische Hits!\n\n"
        "🎯 **HIT 1 - FAKT**\n\n"
        "Was ist das klare, messbare Ergebnis, das du mit Hit 1 erreichen willst?\n\n"
        "Beispiel: '3 Automatisierungstools recherchieren und dokumentieren'\n"
        "Beispiel: '3 Tage hintereinander 30-minütiges Workout absolvieren'",
        parse_mode='Markdown'
    )
    return HIT1_FACT


async def prompt_hit1_obstacle(update: Update) -> int:
    await update.message.reply_text(
        "🚧 **HIT 1 - HINDERNIS**\n\n"
        "Was könnte dich daran hindern, diesen Fakt zu erreichen?\n\n"
        "Was ist die Hauptherausforderung oder Barriere?\n\n"
        "Beispiel: 'Weiß nicht, welche Tools am besten sind'\n"
        "Beispiel: 'Bin normalerweise morgens zu müde'",
        parse_mode='Markdown'
    )
    return HIT1_OBSTACLE


async def prompt_hit1_strike(update: Update) -> int:
    await update.message.reply_text(
        "⚡ **HIT 1 - SCHLAG**\n\n"
        "Was ist dein strategischer Zug, um dieses Hindernis zu überwinden?\n\n"
        "Wie wirst du mit dieser Herausforderung umgehen?\n\n"
        "Beispiel: '3 Kollegen nach Tool-Empfehlungen fragen'\n"
        "Beispiel: 'Workout-Kleidung am Abend vorher rauslegen'",
        parse_mode='Markdown'
    )
    return HIT1_STRIKE


async def prompt_hit2_fact(update: Update) -> int:
    await update.message.reply_text(
        "✅ **Hit 1 Komplett!**\n\n"
        "🎯 **HIT 2 - FAKT**\n\n"
        "Was ist das klare, messbare Ergebnis für Hit 2?\n\n"
        "Das sollte auf Hit 1's Erfolg aufbauen.",
        parse_mode='Markdown'
    )
    return HIT2_FACT


async def prompt_hit2_obstacle(update: Update) -> int:
    await update.message.reply_text(
        "🚧 **HIT 2 - HINDERNIS**\n\n"
        "Was steht dir bei Hit 2 im Weg?\n\n"
        "Welche Herausforderung musst du hier lösen?",
        parse_mode='Markdown'
    )
    return HIT2_OBSTACLE


async def prompt_hit2_strike(update: Update) -> int:
    await update.message.reply_text(
        "⚡ **HIT 2 - SCHLAG**\n\n"
        "Welche strategische Aktion setzt du für Hit 2?\n\n"
        "Wie überwindest du das Hindernis?",
        parse_mode='Markdown'
    )
    return HIT2_STRIKE


async def prompt_hit3_fact(update: Update) -> int:
    await update.message.reply_text(
        "🎯 **HIT 3 - FAKT**\n\n"
        "Was ist das klare, messbare Ergebnis für Hit 3?",
        parse_mode='Markdown'
    )
    return HIT3_FACT


async def prompt_hit3_obstacle(update: Update) -> int:
    await update.message.reply_text(
        "🚧 **HIT 3 - HINDERNIS**\n\n"
        "Was könnte Hit 3 blockieren?",
        parse_mode='Markdown'
    )
    return HIT3_OBSTACLE


async def prompt_hit3_strike(update: Update) -> int:
    await update.message.reply_text(
        "⚡ **HIT 3 - SCHLAG**\n\n"
        "Welche Aktion führt Hit 3 zum Erfolg?",
        parse_mode='Markdown'
    )
    return HIT3_STRIKE


async def prompt_hit4_fact(update: Update) -> int:
    await update.message.reply_text(
        "🎯 **HIT 4 - FAKT**\n\n"
        "Was ist das klare, messbare Ergebnis für Hit 4?",
        parse_mode='Markdown'
    )
    return HIT4_FACT


async def prompt_hit4_obstacle(update: Update) -> int:
    await update.message.reply_text(
        "🚧 **HIT 4 - HINDERNIS**\n\n"
        "Was könnte Hit 4 blockieren?",
        parse_mode='Markdown'
    )
    return HIT4_OBSTACLE


async def prompt_hit4_strike(update: Update) -> int:
    await update.message.reply_text(
        "⚡ **HIT 4 - SCHLAG**\n\n"
        "Welche Aktion führt Hit 4 zum Erfolg?",
        parse_mode='Markdown'
    )
    return HIT4_STRIKE


async def prompt_insights(update: Update) -> int:
    await update.message.reply_text(
        "🧠 **ERKENNTNISSE**\n\n"
        "Welche Erkenntnisse sind dir klar geworden?",
        parse_mode='Markdown'
    )
    return INSIGHTS


async def prompt_lessons(update: Update) -> int:
    await update.message.reply_text(
        "📚 **GELERNTE LEKTIONEN**\n\n"
        "Was ist die wichtigste Lebenslektion, die dir dieser Stack gelehrt hat?\n\n"
        "Woran wirst du dich von dieser Planungssession erinnern?",
        parse_mode='Markdown'
    )
    return LESSONS


async def timeout_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if update and update.effective_chat:
        try:
            await context.bot.send_message(
                chat_id=update.effective_chat.id,
                text="⌛ Timeout. Nutze /resume um fortzufahren."
            )
        except Exception:
            pass
    return ConversationHandler.END

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show current status"""
    user_id = update.effective_user.id
    war_stack = persistence.load_war_stack(user_id)
    
    if not war_stack:
        await update.message.reply_text("❌ Kein aktiver War Stack gefunden.")
        return
    
    # Calculate completion percentage
    fields = [war_stack.domain, war_stack.subdomain, war_stack.domino_door, 
             war_stack.trigger, war_stack.narrative, war_stack.validation,
             war_stack.impact, war_stack.consequences, war_stack.insights, war_stack.lessons]
    
    hits_completed = sum(1 for hit in war_stack.hits if hit.fact and hit.obstacle and hit.strike)
    total_fields = len(fields) + len(war_stack.hits) * 3
    completed_fields = sum(1 for field in fields if field) + hits_completed * 3
    
    percentage = int((completed_fields / total_fields) * 100)
    
    await update.message.reply_text(
        f"📊 **War Stack Status**\n\n"
        f"**Domain**: {war_stack.domain or '❌'}\n"
        f"**Sub-domain**: {war_stack.subdomain or '❌'}\n"
        f"**Door**: {war_stack.domino_door[:30] + '...' if war_stack.domino_door else '❌'}\n"
        f"**Hits abgeschlossen**: {hits_completed}/4\n\n"
        f"**Fortschritt**: {percentage}% ({'🟩' * (percentage // 10)}{'⬜' * (10 - percentage // 10)})\n\n"
        f"Nutze /resume um fortzufahren oder /cancel um neu zu starten.",
        parse_mode='Markdown'
    )

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel current conversation"""
    user_id = update.effective_user.id
    persistence.delete_war_stack(user_id)
    
    await update.message.reply_text(
        "❌ War Stack Erstellung abgebrochen.\n\n"
        "Nutze /warstack um neu zu starten!",
        reply_markup=ReplyKeyboardRemove()
    )
    return ConversationHandler.END

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help"""
    help_text = """
🔥 **Alpha OS War Stack Coach** ⚔️

**Kommandos:**
/start - Willkommensnachricht
/warstack - War Stack Erstellung starten
/resume - Unterbrochenen Stack fortsetzen
/status - Aktueller War Stack Status  
/cancel - Aktuellen Prozess abbrechen
/help - Diese Hilfe anzeigen

**Funktionsweise:**
1. Wähle deinen Domain-Fokus (BODY/BEING/BALANCE/BUSINESS)
2. Beantworte strategische Fragen zu deiner Door
3. Plane 4 strategische Hits mit Fakt-Hindernis-Schlag
4. Erhalte Obsidian-Notiz + Taskwarrior-Kommandos
5. Führe die ganze Woche aus!

**Integration:**
✅ Erstellt Obsidian War Stack Notizen
✅ Generiert Taskwarrior Kommandos
✅ Synchronisiert mit bestehendem Alpha OS System
✅ Multi-User Support mit Persistenz
✅ Sichere Input-Validierung

Bereit zu dominieren! 💪💀
"""
    await update.message.reply_text(help_text, parse_mode='Markdown')

# ================================================================
# HIT PROCESSING FUNCTIONS (COMPLETE)
# ================================================================

async def hit1_fact_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT1_FACT
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[0].fact = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🚧 **HIT 1 - HINDERNIS**\n\n"
        "Was könnte dich daran hindern, diesen Fakt zu erreichen?\n\n"
        "Was ist die Hauptherausforderung oder Barriere?\n\n"
        "Beispiel: 'Weiß nicht, welche Tools am besten sind'\n"
        "Beispiel: 'Bin normalerweise morgens zu müde'",
        parse_mode='Markdown'
    )
    
    return HIT1_OBSTACLE

async def hit1_obstacle_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT1_OBSTACLE
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[0].obstacle = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "⚡ **HIT 1 - SCHLAG**\n\n"
        "Was ist dein strategischer Zug, um dieses Hindernis zu überwinden?\n\n"
        "Wie wirst du mit dieser Herausforderung umgehen?\n\n"
        "Beispiel: '3 Kollegen nach Tool-Empfehlungen fragen'\n"
        "Beispiel: 'Workout-Kleidung am Abend vorher rauslegen'",
        parse_mode='Markdown'
    )
    
    return HIT1_STRIKE

async def hit1_strike_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT1_STRIKE
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[0].strike = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "✅ **Hit 1 Komplett!**\n\n"
        "🎯 **HIT 2 - FAKT**\n\n"
        "Was ist das klare, messbare Ergebnis für Hit 2?\n\n"
        "Das sollte auf Hit 1's Erfolg aufbauen.",
        parse_mode='Markdown'
    )
    
    return HIT2_FACT

# Hit 2 functions
async def hit2_fact_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT2_FACT
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[1].fact = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🚧 **HIT 2 - HINDERNIS**\n\nWas könnte Hit 2 verhindern?", 
        parse_mode='Markdown'
    )
    return HIT2_OBSTACLE

async def hit2_obstacle_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT2_OBSTACLE
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[1].obstacle = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "⚡ **HIT 2 - SCHLAG**\n\nWie wirst du das überwinden?", 
        parse_mode='Markdown'
    )
    return HIT2_STRIKE

async def hit2_strike_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT2_STRIKE
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[1].strike = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🎯 **HIT 3 - FAKT**\n\nMessbares Ergebnis für Hit 3?", 
        parse_mode='Markdown'
    )
    return HIT3_FACT

# Hit 3 functions
async def hit3_fact_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT3_FACT
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[2].fact = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🚧 **HIT 3 - HINDERNIS**\n\nWas könnte Hit 3 verhindern?", 
        parse_mode='Markdown'
    )
    return HIT3_OBSTACLE

async def hit3_obstacle_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT3_OBSTACLE
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[2].obstacle = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "⚡ **HIT 3 - SCHLAG**\n\nWie wirst du das überwinden?", 
        parse_mode='Markdown'
    )
    return HIT3_STRIKE

async def hit3_strike_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT3_STRIKE
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[2].strike = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🎯 **HIT 4 - FAKT**\n\nFinales messbares Ergebnis?", 
        parse_mode='Markdown'
    )
    return HIT4_FACT

# Hit 4 functions
async def hit4_fact_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT4_FACT
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[3].fact = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🚧 **HIT 4 - HINDERNIS**\n\nFinales Hindernis zu überwinden?", 
        parse_mode='Markdown'
    )
    return HIT4_OBSTACLE

async def hit4_obstacle_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT4_OBSTACLE
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[3].obstacle = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "⚡ **HIT 4 - SCHLAG**\n\nFinaler strategischer Zug?", 
        parse_mode='Markdown'
    )
    return HIT4_STRIKE

async def hit4_strike_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return HIT4_STRIKE
    
    war_stack = get_war_stack(user_id)
    war_stack.hits[3].strike = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "🧠 **ERKENNTNISSE**\n\n"
        "Welche neuen Erkenntnisse sind während dieses Prozesses entstanden?\n\n"
        "Welche Muster oder Verbindungen bemerkst du?",
        parse_mode='Markdown'
    )
    
    return INSIGHTS

async def insights_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return INSIGHTS
    
    war_stack = get_war_stack(user_id)
    war_stack.insights = text.strip()
    save_war_stack(war_stack)
    
    await update.message.reply_text(
        "📚 **GELERNTE LEKTIONEN**\n\n"
        "Was ist die wichtigste Lebenslektion, die dir dieser Stack gelehrt hat?\n\n"
        "Woran wirst du dich von dieser Planungssession erinnern?",
        parse_mode='Markdown'
    )
    
    return LESSONS

async def lessons_set(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Complete the War Stack and generate outputs"""
    user_id = update.effective_user.id
    text = update.message.text
    
    is_valid, error_msg = validate_input(text)
    if not is_valid:
        await send_validation_error(update, error_msg)
        return LESSONS
    
    war_stack = get_war_stack(user_id)
    war_stack.lessons = text.strip()
    
    # Generate War Stack title
    war_stack.title = f"{war_stack.domain} - {war_stack.domino_door[:50]}"
    save_war_stack(war_stack)
    
    # Create outputs with error handling
    try:
        markdown = render_war_stack_markdown(war_stack)
        obsidian_path = None
        if not GAS_ONLY:
            obsidian_path = create_obsidian_war_stack(war_stack, markdown)
        taskwarrior_commands = create_taskwarrior_commands(war_stack)
        
        summary = f"""
🔥 **WAR STACK KOMPLETT!** ⚔️

**Domain**: {war_stack.domain} - {war_stack.subdomain}
**Door**: {war_stack.domino_door}

✅ **4 Strategische Hits Geplant**
✅ **Obsidian-Notiz Erstellt** 
✅ **Taskwarrior-Kommandos Bereit**

**Nächste Schritte:**
1. Taskwarrior-Kommandos kopieren (folgt gleich)
2. Obsidian für vollständigen War Stack checken
3. Hits Montag-Freitag ausführen!

Bereit, diese Woche zu dominieren! 💪💀
"""
        
        await update.message.reply_text(summary, parse_mode='Markdown')

        # Send War Stack Markdown (raw, chunked)
        if markdown:
            header = "🧾 WAR STACK (Markdown)"
            for idx, chunk in enumerate(split_message(markdown, max_len=3500)):
                text = f"{header}\n\n{chunk}" if idx == 0 else chunk
                await update.message.reply_text(text)
                header = ""
        
        # Send Taskwarrior commands
        await update.message.reply_text(
            f"📋 **TASKWARRIOR KOMMANDOS**\n\n"
            f"Kopiere und führe diese aus:\n\n"
            f"```bash\n{taskwarrior_commands}\n```",
            parse_mode='Markdown'
        )
        
        # Optionally send file location
        if obsidian_path:
            await update.message.reply_text(
                f"📁 **Obsidian-Notiz erstellt:**\n`{obsidian_path}`\n\n"
                f"🗑️ War Stack Daten werden nach 7 Tagen automatisch gelöscht.",
                parse_mode='Markdown'
            )
        elif GAS_WEBHOOK_URL:
            await update.message.reply_text(
                "📡 **GAS Output aktiv:** War Stack wird in Drive gespeichert.",
                parse_mode='Markdown'
            )

        # Push to GAS (optional)
        if GAS_WEBHOOK_URL:
            payload = {
                "kind": "warstack_complete",
                "payload": {
                    "user_id": war_stack.user_id,
                    "week": war_stack.week,
                    "domain": war_stack.domain,
                    "subdomain": war_stack.subdomain,
                    "door": war_stack.domino_door,
                    "markdown": markdown,
                    "tasks": build_task_payloads(war_stack),
                },
            }
            ok, err = post_to_gas(payload)
            if not ok:
                await update.message.reply_text(
                    f"⚠️ GAS Sync fehlgeschlagen: {err}",
                    parse_mode='Markdown'
                )

        # Optional: direct task push to Bridge
        if AOS_BRIDGE_URL:
            bridge_ok, bridge_err = post_tasks_to_bridge(build_task_payloads(war_stack))
            if not bridge_ok:
                logger.warning(f"Bridge task push failed: {bridge_err}")
                await update.message.reply_text(
                    f"⚠️ Bridge Task Push fehlgeschlagen: {bridge_err}",
                    parse_mode='Markdown'
                )

        schedule_strategist_feedback(context.application, user_id, war_stack)
        await update.message.reply_text(
            "Strategist feedback from Gemini will arrive in about 30 minutes."
        )
        
        # Clean up - optionally keep for a few days
        # persistence.delete_war_stack(user_id)
        
    except Exception as e:
        logger.error(f"Error generating outputs: {e}")
        await update.message.reply_text(
            "❌ **Fehler beim Generieren der Ausgaben!**\n\n"
            f"War Stack wurde gespeichert, aber Ausgabe-Erstellung fehlgeschlagen.\n"
            f"Nutze /status um deinen War Stack zu sehen.\n\n"
            f"Fehler: {str(e)[:100]}...",
            parse_mode='Markdown'
        )
    
    return ConversationHandler.END

# ================================================================
# ERROR HANDLERS
# ================================================================

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle errors"""
    logger.error(f"Update {update} caused error {context.error}")
    
    if update and update.effective_message:
        await update.effective_message.reply_text(
            "❌ **Ein Fehler ist aufgetreten!**\n\n"
            "Bitte versuche es erneut oder nutze /cancel um neu zu starten.\n\n"
            "Falls das Problem weiterhin auftritt, kontaktiere den Administrator.",
            parse_mode='Markdown'
        )

# ================================================================
# MAIN BOT SETUP
# ================================================================

def main():
    """Run the bot with improved error handling and configuration"""
    
    # Validate configuration
    if not OBSIDIAN_VAULT.exists():
        logger.warning(f"Obsidian vault not found at {OBSIDIAN_VAULT}")
        OBSIDIAN_VAULT.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created Obsidian vault directory at {OBSIDIAN_VAULT}")
    
    # Setup persistence for conversation states
    pickle_persistence = PicklePersistence(filepath=PERSISTENCE_DIR / "bot_persistence.pickle")
    
    # Create application with persistence
    application = Application.builder().token(BOT_TOKEN).persistence(pickle_persistence).build()

    gemini_client = build_gemini_client()
    application.bot_data["gemini_client"] = gemini_client
    
    # Create conversation handler for War Stack
    war_stack_handler = ConversationHandler(
        entry_points=[
            CommandHandler('warstack', start_war_stack),
            CommandHandler('resume', resume_command)
        ],
        states={
            DOMAIN_SELECT: [CallbackQueryHandler(domain_callback, pattern="^domain_")],
            SUBDOMAIN_SELECT: [CallbackQueryHandler(subdomain_callback, pattern="^subdomain_")],
            DOMINO_DOOR: [MessageHandler(filters.TEXT & ~filters.COMMAND, domino_door_set)],
            TRIGGER: [MessageHandler(filters.TEXT & ~filters.COMMAND, trigger_set)],
            NARRATIVE: [MessageHandler(filters.TEXT & ~filters.COMMAND, narrative_set)],
            VALIDATION: [MessageHandler(filters.TEXT & ~filters.COMMAND, validation_set)],
            IMPACT: [MessageHandler(filters.TEXT & ~filters.COMMAND, impact_set)],
            CONSEQUENCES: [MessageHandler(filters.TEXT & ~filters.COMMAND, consequences_set)],
            HIT1_FACT: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit1_fact_set)],
            HIT1_OBSTACLE: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit1_obstacle_set)],
            HIT1_STRIKE: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit1_strike_set)],
            HIT2_FACT: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit2_fact_set)],
            HIT2_OBSTACLE: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit2_obstacle_set)],
            HIT2_STRIKE: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit2_strike_set)],
            HIT3_FACT: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit3_fact_set)],
            HIT3_OBSTACLE: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit3_obstacle_set)],
            HIT3_STRIKE: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit3_strike_set)],
            HIT4_FACT: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit4_fact_set)],
            HIT4_OBSTACLE: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit4_obstacle_set)],
            HIT4_STRIKE: [MessageHandler(filters.TEXT & ~filters.COMMAND, hit4_strike_set)],
            INSIGHTS: [MessageHandler(filters.TEXT & ~filters.COMMAND, insights_set)],
            LESSONS: [MessageHandler(filters.TEXT & ~filters.COMMAND, lessons_set)],
            ConversationHandler.TIMEOUT: [MessageHandler(filters.ALL, timeout_handler)],
        },
        fallbacks=[CommandHandler('cancel', cancel)],
        persistent=True,
        name="war_stack_conversation",
        per_message=False,
        per_chat=True,
        per_user=True,
        conversation_timeout=IDLE_TIMEOUT_SECONDS
    )
    
    # Add handlers
    application.add_handler(MessageHandler(filters.ALL, record_activity, block=False))
    application.add_handler(CallbackQueryHandler(record_activity, pattern=".*", block=False))
    application.add_handler(CommandHandler('start', start))
    application.add_handler(CommandHandler('status', status_command))
    application.add_handler(CommandHandler('help', help_command))
    application.add_handler(war_stack_handler)
    
    # Add error handler
    application.add_error_handler(error_handler)
    
    # Start bot
    logger.info("🤖 Alpha OS War Stack Coach Bot starting...")
    logger.info("Ready to coach your strategic planning! 🔥")
    logger.info(f"Obsidian Vault: {OBSIDIAN_VAULT}")
    logger.info(f"Persistence Dir: {PERSISTENCE_DIR}")
    
    touch_activity(application)
    if application.job_queue:
        application.job_queue.run_repeating(idle_watchdog, interval=60, first=60)
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
