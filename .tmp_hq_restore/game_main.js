/*******************************
 * αOS GAME CENTRE – Main Bot
 * Hierarchischer Bot für alle Game Maps
 *******************************/

const GAME_BOT_TOKEN_PROP = 'GAME_BOT_TOKEN';

// =====================================================
// Telegram Bot Handler (Main /game command)
// =====================================================

function game_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim().toLowerCase();
  if (!text) return false;

  if (text === '/game') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('GAME_WEBAPP_URL')
      || ScriptApp.getService().getUrl() + '?page=game';

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🗺️ Frame', callback_data: 'game:frame' },
          { text: '🌍 Freedom', callback_data: 'game:freedom' }
        ],
        [
          { text: '🎯 Focus', callback_data: 'game:focus' },
          { text: '🔥 Fire', callback_data: 'game:fire' }
        ],
        [
          { text: '⛺ Tent', callback_data: 'game:tent' }
        ],
        [
          { text: '🌐 Open WebApp', web_app: { url: webUrl } }
        ]
      ]
    };

    game_sendMessage_(chatId,
      '*🎮 GAME CENTRE*\n\n' +
      'Strategic Navigation - Maps für alle Domains:\n\n' +
      '🗺️ *Frame* - Where am I now?\n' +
      '🌍 *Freedom* - Annual vision\n' +
      '🎯 *Focus* - Monthly mission\n' +
      '🔥 *Fire* - Weekly war\n' +
      '⛺ *Tent* - General\'s Tent review\n\n' +
      '_Wähle eine Map oder öffne das WebApp:_',
      keyboard
    );
    return true;
  }

  return false;
}

function game_sendMessage_(chatId, text, keyboard) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty(GAME_BOT_TOKEN_PROP) || props.getProperty('BOT_TOKEN');

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
