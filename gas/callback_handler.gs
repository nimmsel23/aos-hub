/*******************************
 * αOS Callback Query Handler
 * Verarbeitet Inline Button Klicks
 *******************************/

function handleCallbackQuery_(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data || '';
  const queryId = query.id;

  // Answer callback query (removes "loading" indicator)
  answerCallbackQuery_(queryId);

  // Parse callback data (format: "pillar:action")
  const parts = data.split(':');
  if (parts.length < 2) return;

  const pillar = parts[0];
  const action = parts[1];

  switch (pillar) {
    case 'core':
      handleCoreCallback_(chatId, action);
      break;
    case 'voice':
      handleVoiceCallback_(chatId, action);
      break;
    case 'door':
      handleDoorCallback_(chatId, action);
      break;
    case 'game':
      handleGameCallback_(chatId, action);
      break;
    default:
      Logger.log('Unknown callback pillar: ' + pillar);
  }
}

function answerCallbackQuery_(queryId, text) {
  const props = PropertiesService.getScriptProperties();
  const token = (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (props.getProperty('BOT_TOKEN') || '');
  if (!token) return;

  const payload = { callback_query_id: queryId };
  if (text) payload.text = text;

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// =====================================================
// Pillar-Specific Callback Handlers
// =====================================================

function handleCoreCallback_(chatId, action) {
  // Handle journal actions: core:journal:*
  if (action.startsWith('journal:')) {
    if (action === 'journal:pick') {
      // Back to domain picker
      core4_handleJournalCommand_(chatId);
      return;
    }
    core4_handleJournalCallback_(chatId, action);
    return;
  }

  // Handle log actions: core:log:domain:task
  if (action.startsWith('log:')) {
    const parts = action.split(':');
    if (parts.length === 3) {
      const domain = parts[1];
      const task = parts[2];

      try {
        if (typeof core4_log === 'function') {
          const result = core4_log(domain, task, null, 'telegram_callback', {
            id: String(chatId),
            username: '',
            first_name: 'User'
          });

          if (result.ok) {
            const label = core4_getHabitLabel_(domain, task);
            sendCallbackMessage_(chatId, `✅ ${label} logged\n\nToday: ${result.total_today} points`);
          } else {
            sendCallbackMessage_(chatId, `❌ Log failed: ${result.error}`);
          }
        } else {
          sendCallbackMessage_(chatId, '⚠️ Core4 tracking not available');
        }
      } catch (e) {
        sendCallbackMessage_(chatId, `❌ Error: ${e}`);
      }
      return;
    }
  }

  // Special action: Today's points
  if (action === 'today') {
    try {
      if (typeof core4_getToday === 'function') {
        const result = core4_getToday();
        sendCallbackMessage_(chatId,
          `📊 *Today's Core4*\n\n` +
          `Date: ${result.date}\n` +
          `Points: ${result.total}\n\n` +
          `Goal: 4 points/day = 28/week`
        );
      } else {
        sendCallbackMessage_(chatId, '⚠️ Core4 tracking not available');
      }
    } catch (e) {
      sendCallbackMessage_(chatId, `❌ Error: ${e}`);
    }
    return;
  }

  const domainMap = {
    body: '💪 BODY',
    being: '🧘 BEING',
    balance: '⚖️ BALANCE',
    business: '💼 BUSINESS'
  };

  const domain = domainMap[action];
  if (!domain) return;

  let keyboard;
  let message = `*${domain} Domain*\n\n`;

  if (action === 'body') {
    message += 'Shortcuts:\n/fit - Fitness\n/fue - Fuel';
    keyboard = {
      inline_keyboard: [
        [
          { text: '🏋️ /fit', callback_data: 'core:log:body:fitness' },
          { text: '🍽️ /fue', callback_data: 'core:log:body:fuel' }
        ],
        [{ text: '← Back', callback_data: 'core:main' }]
      ]
    };
  } else if (action === 'being') {
    message += 'Shortcuts:\n/med - Meditation\n/mem - Memoirs';
    keyboard = {
      inline_keyboard: [
        [
          { text: '🧘 /med', callback_data: 'core:log:being:meditation' },
          { text: '📝 /mem', callback_data: 'core:log:being:memoirs' }
        ],
        [{ text: '← Back', callback_data: 'core:main' }]
      ]
    };
  } else if (action === 'balance') {
    message += 'Shortcuts:\n/par - Person 1\n/pos - Person 2';
    keyboard = {
      inline_keyboard: [
        [
          { text: '👤 /par', callback_data: 'core:log:balance:person1' },
          { text: '👥 /pos', callback_data: 'core:log:balance:person2' }
        ],
        [{ text: '← Back', callback_data: 'core:main' }]
      ]
    };
  } else if (action === 'business') {
    message += 'Shortcuts:\n/dis - Discover\n/dec - Declare';
    keyboard = {
      inline_keyboard: [
        [
          { text: '🔍 /dis', callback_data: 'core:log:business:discover' },
          { text: '📢 /dec', callback_data: 'core:log:business:declare' }
        ],
        [{ text: '← Back', callback_data: 'core:main' }]
      ]
    };
  } else if (action === 'main') {
    message = '*🎯 CORE4*\n\nThe 4 Domains - 28-or-Die:\n\nWähle eine Domain:';
    keyboard = {
      inline_keyboard: [
        [
          { text: '💪 Body', callback_data: 'core:body' },
          { text: '🧘 Being', callback_data: 'core:being' }
        ],
        [
          { text: '⚖️ Balance', callback_data: 'core:balance' },
          { text: '💼 Business', callback_data: 'core:business' }
        ],
        [{ text: '🌐 Open WebApp', web_app: { url: ScriptApp.getService().getUrl() + '?page=core4' } }]
      ]
    };
  }

  sendCallbackMessage_(chatId, message, keyboard);
}

function handleVoiceCallback_(chatId, action) {
  let message = '';
  let keyboard;

  if (action === 'save') {
    message = '💾 *Save VOICE Session*\n\nSende mir deine VOICE Session als Markdown Text.';
    keyboard = { inline_keyboard: [[{ text: '← Back', callback_data: 'voice:main' }]] };
  } else if (action === 'list') {
    message = '📋 *Recent VOICE Sessions*\n\n_Feature coming soon..._';
    keyboard = { inline_keyboard: [[{ text: '← Back', callback_data: 'voice:main' }]] };
  } else if (action === 'main') {
    message = '*🎙️ VOICE Centre*\n\nMental Mastery - STOP→SUBMIT→STRUGGLE→STRIKE\n\nWas möchtest du tun?';
    keyboard = {
      inline_keyboard: [
        [
          { text: '💾 Save Session', callback_data: 'voice:save' },
          { text: '📋 List Sessions', callback_data: 'voice:list' }
        ],
        [{ text: '🌐 Open WebApp', web_app: { url: ScriptApp.getService().getUrl() + '?page=voice' } }]
      ]
    };
  }

  sendCallbackMessage_(chatId, message, keyboard);
}

function handleDoorCallback_(chatId, action) {
  let message = '';
  let keyboard;

  if (action === 'potential') {
    message = '💡 *POTENTIAL Phase*\n\nHot List - Capture ideas\n\nUse /hot to manage your Hot List.';
    keyboard = { inline_keyboard: [[{ text: '← Back', callback_data: 'door:main' }]] };
  } else if (action === 'plan') {
    message = '📋 *PLAN Phase*\n\nWar Stack creation\n\nUse /warstack to create a War Stack.';
    keyboard = { inline_keyboard: [[{ text: '← Back', callback_data: 'door:main' }]] };
  } else if (action === 'production') {
    message = '⚒️ *PRODUCTION Phase*\n\nHit List execution\n\nUse /hits to view your hits.';
    keyboard = { inline_keyboard: [[{ text: '← Back', callback_data: 'door:main' }]] };
  } else if (action === 'profit') {
    message = '✅ *PROFIT Phase*\n\nAchieved & Done review\n\nUse /review to review completed Doors.';
    keyboard = { inline_keyboard: [[{ text: '← Back', callback_data: 'door:main' }]] };
  } else if (action === 'main') {
    message = '*🚪 DOOR Centre*\n\n4P Flow: Potential → Plan → Production → Profit\n\nWähle eine Phase:';
    keyboard = {
      inline_keyboard: [
        [
          { text: '💡 Potential', callback_data: 'door:potential' },
          { text: '📋 Plan', callback_data: 'door:plan' }
        ],
        [
          { text: '⚒️ Production', callback_data: 'door:production' },
          { text: '✅ Profit', callback_data: 'door:profit' }
        ],
        [{ text: '🌐 Open WebApp', web_app: { url: ScriptApp.getService().getUrl() + '?page=door' } }]
      ]
    };
  }

  sendCallbackMessage_(chatId, message, keyboard);
}

function handleGameCallback_(chatId, action) {
  const webUrl = ScriptApp.getService().getUrl();

  if (action === 'main') {
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
          { text: '🌐 Open WebApp', web_app: { url: webUrl + '?page=game' } }
        ]
      ]
    };

    sendCallbackMessage_(chatId,
      '*🎮 GAME CENTRE*\n\n' +
      'Strategic Navigation - Maps für alle Domains:\n\n' +
      '🗺️ *Frame* - Where am I now?\n' +
      '🌍 *Freedom* - Annual vision\n' +
      '🎯 *Focus* - Monthly mission\n' +
      '🔥 *Fire* - Weekly war\n' +
      '⛺ *Tent* - General\'s Tent review\n\n' +
      '_Wähle eine Map:_',
      keyboard
    );
    return;
  }

  let message = '';
  let pageUrl = '';

  switch (action) {
    case 'frame':
      message = '🗺️ *FRAME MAP*\n\nWhere am I now?\n\nUse /frame or open the WebApp to create a Frame Map.';
      pageUrl = webUrl + '?page=frame';
      break;
    case 'freedom':
      message = '🌍 *FREEDOM MAP*\n\nAnnual vision - Where do I want to be?\n\nUse /freedom or open the WebApp.';
      pageUrl = webUrl + '?page=freedom';
      break;
    case 'focus':
      message = '🎯 *FOCUS MAP*\n\nMonthly mission - What do I need to do to stay on track?\n\nUse /focus or open the WebApp.';
      pageUrl = webUrl + '?page=focus';
      break;
    case 'fire':
      message = '🔥 *FIRE MAP*\n\nWeekly war - Execution\n\nUse /fire or open the WebApp.';
      pageUrl = webUrl + '?page=fire';
      break;
    case 'tent':
      message = '⛺ *GENERAL\'S TENT*\n\nWeekly review - Where am I in the war?\n\nUse /tent or open the WebApp.';
      pageUrl = webUrl + '?page=tent';
      break;
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: '🌐 Open ' + action.toUpperCase(), web_app: { url: pageUrl } }],
      [{ text: '← Back to Game', callback_data: 'game:main' }]
    ]
  };

  sendCallbackMessage_(chatId, message, keyboard);
}

function sendCallbackMessage_(chatId, text, keyboard) {
  const props = PropertiesService.getScriptProperties();
  const token = (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (props.getProperty('BOT_TOKEN') || '');
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
