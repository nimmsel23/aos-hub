/**
 * GAS Tent Centre - Script Properties Setup
 *
 * Run this function ONCE in GAS editor after deployment
 * to set all required Script Properties.
 */

function setupTentProperties() {
  PropertiesService.getScriptProperties().setProperties({
    // TickTick API
    'TICKTICK_TOKEN': 'YOUR_TICKTICK_TOKEN_HERE',
    'TICKTICK_PROJECT_ID': 'inbox',  // or your project ID

    // Telegram Bot
    'TELEGRAM_BOT_TOKEN': 'YOUR_TELEGRAM_BOT_TOKEN_HERE',
    'TELEGRAM_CHAT_ID': 'YOUR_TELEGRAM_CHAT_ID_HERE',

    // Integration (Tailscale Funnel - PUBLIC URLs)
    'BRIDGE_URL': 'https://ideapad.tail7a15d6.ts.net/bridge',  // Bridge via Funnel
    'INDEX_NODE_URL': 'https://ideapad.tail7a15d6.ts.net',     // Index Node via Funnel

    // Vault (Google Drive root path, NOT local path)
    // Local: ~/vault/Alpha_Tent
    // Drive: Alpha_Tent (root folder, synced via rclone)
    'VAULT_PATH': 'Alpha_Tent',

    // Centre URLs (optional, for links)
    'DOOR_CENTRE_URL': 'https://ideapad.tail7a15d6.ts.net/door',
    'GAME_CENTRE_URL': 'https://ideapad.tail7a15d6.ts.net/game'
  });

  Logger.log('✅ Script Properties configured');
  Logger.log('Next: Deploy as Web App, then run saveWebappUrl()');
}

/**
 * Save WebApp URL after deployment
 * Copy your deployment URL from: Deploy → Manage deployments → Web app URL
 */
function saveWebappUrl() {
  const url = 'PASTE_YOUR_DEPLOYMENT_URL_HERE';
  // Example: 'https://script.google.com/macros/s/ABC123.../exec'

  PropertiesService.getScriptProperties().setProperty('TENT_WEBAPP_URL', url);

  Logger.log('✅ WebApp URL saved: ' + url);
  Logger.log('Next: Run setTentWebhook() to configure Telegram');
}

/**
 * Verify all properties are set
 */
function checkTentProperties() {
  const props = PropertiesService.getScriptProperties();
  const required = [
    'TICKTICK_TOKEN',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'BRIDGE_URL',
    'TENT_WEBAPP_URL'
  ];

  const missing = [];
  const present = [];

  required.forEach(key => {
    const val = props.getProperty(key);
    if (!val || val.includes('YOUR_') || val.includes('PASTE_')) {
      missing.push(key);
    } else {
      present.push(key);
    }
  });

  Logger.log('✅ Configured: ' + present.join(', '));
  if (missing.length > 0) {
    Logger.log('⚠️ Missing: ' + missing.join(', '));
  }

  return {
    ok: missing.length === 0,
    present: present,
    missing: missing
  };
}

/**
 * Quick smoke test after setup
 */
function tentSetupSmokeTest() {
  Logger.log('🧪 Running Tent Setup Smoke Test...\n');

  // 1. Check properties
  Logger.log('1️⃣ Checking properties...');
  const propCheck = checkTentProperties();
  if (!propCheck.ok) {
    Logger.log('❌ Properties incomplete. Run setupTentProperties() first.');
    return;
  }
  Logger.log('✅ All properties set\n');

  // 2. Test backend
  Logger.log('2️⃣ Testing backend...');
  const status = statusTent();
  if (!status.ok) {
    Logger.log('❌ Backend error: ' + status.error);
    return;
  }
  Logger.log('✅ Backend operational\n');

  // 3. Test TickTick
  Logger.log('3️⃣ Testing TickTick connection...');
  const tt = ticktickSmokeTest();
  if (!tt.ok) {
    Logger.log('❌ TickTick error: ' + tt.error);
    Logger.log('⚠️ Check TICKTICK_TOKEN is valid');
    return;
  }
  Logger.log('✅ TickTick connected\n');

  // 4. Test webhook (if WebApp URL is set)
  const webappUrl = PropertiesService.getScriptProperties().getProperty('TENT_WEBAPP_URL');
  if (webappUrl && !webappUrl.includes('PASTE_')) {
    Logger.log('4️⃣ Checking Telegram webhook...');
    try {
      const webhookInfo = getTentWebhookInfo();
      if (webhookInfo && webhookInfo.result) {
        const info = webhookInfo.result;
        if (info.url === webappUrl) {
          Logger.log('✅ Webhook configured: ' + info.url);
          Logger.log('   Pending updates: ' + info.pending_update_count);
        } else {
          Logger.log('⚠️ Webhook URL mismatch');
          Logger.log('   Expected: ' + webappUrl);
          Logger.log('   Actual: ' + info.url);
          Logger.log('   Run setTentWebhook() to fix');
        }
      }
    } catch (err) {
      Logger.log('⚠️ Could not check webhook: ' + err);
    }
  } else {
    Logger.log('⚠️ WebApp URL not set. Run saveWebappUrl() after deployment.');
  }

  Logger.log('\n✅ Setup smoke test complete!');
  Logger.log('\nNext steps:');
  Logger.log('1. Deploy as Web App (if not done)');
  Logger.log('2. Run saveWebappUrl()');
  Logger.log('3. Run setTentWebhook()');
  Logger.log('4. Test bot: /start in Telegram');
}
