/*******************************
 * αOS DOOR CENTRE – Main Bot
 * Hierarchischer Bot für 4P Flow
 *******************************/

const DOOR_BOT_TOKEN_PROP = 'DOOR_BOT_TOKEN';

// =====================================================
// Telegram Bot Handler (Main /door command)
// =====================================================

function door_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim().toLowerCase();
  if (!text) return false;

  if (text === '/door') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('DOOR_WEBAPP_URL')
      || ScriptApp.getService().getUrl() + '?page=door';

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💡 Potential', callback_data: 'door:potential' },
          { text: '📋 Plan', callback_data: 'door:plan' }
        ],
        [
          { text: '⚒️ Production', callback_data: 'door:production' },
          { text: '✅ Profit', callback_data: 'door:profit' }
        ],
        [
          { text: '⚔️ Create War Stack', callback_data: 'door:warstack' }
        ],
        [
          { text: '🌐 Open WebApp', web_app: { url: webUrl } }
        ]
      ]
    };

    door_sendMessage_(chatId,
      '🚪 *DOOR Centre*\n\n' +
      '4P Flow: Potential → Plan → Production → Profit\n\n' +
      '💡 *Potential* - Hot List (Capture ideas)\n' +
      '📋 *Plan* - War Stack creation\n' +
      '⚒️ *Production* - Hit List execution\n' +
      '✅ *Profit* - Achieved & Done review\n\n' +
      '_Wähle eine Phase:_',
      keyboard
    );
    return true;
  }

  if (text === '/doorweb') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('DOOR_WEBAPP_URL')
      || ScriptApp.getService().getUrl() + '?page=door';
    door_sendMessage_(chatId, `🚪 Door Centre: ${webUrl}`);
    return true;
  }

  if (text === '/warstack') {
    door_sendMessage_(chatId,
      '⚔️ *War Stack Creation*\n\n' +
      'Use the War Stack Bot or Door Centre WebApp to create your War Stack.\n\n' +
      'WebApp: ' + (PropertiesService.getScriptProperties().getProperty('DOOR_WEBAPP_URL') || ScriptApp.getService().getUrl() + '?page=door')
    );
    return true;
  }

  return false;
}

function door_sendMessage_(chatId, text, keyboard) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty(DOOR_BOT_TOKEN_PROP) || props.getProperty('BOT_TOKEN');

  if (!token) return;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  if (keyboard) {
    payload.reply_markup = keyboard;
  }

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
