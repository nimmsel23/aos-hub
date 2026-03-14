function doPost(e) {
  const token = "DEIN_BOT_TOKEN";
  const payload = JSON.parse(e.postData.contents);
  const msg = payload.message.text;
  const chatId = payload.message.chat.id;

  if (msg === "/score") {
    const result = getCore4Summary();
    sendTelegram(chatId, result, token);
  }
}

function sendTelegram(chatId, text, token) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text
  };
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}
