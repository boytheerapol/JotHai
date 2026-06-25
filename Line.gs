var Line = {
  reply: function(replyToken, messages) {
    var token = PropertiesService.getScriptProperties().getProperty(PROP_LINE_CHANNEL_TOKEN);
    var payload = JSON.stringify({ replyToken: replyToken, messages: messages });

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: payload,
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(LINE_REPLY_URL, options);
    if (response.getResponseCode() !== 200) {
      console.error('LINE reply failed: ' + response.getContentText());
    }
  },

  buildTextMessage: function(text) {
    return { type: 'text', text: text };
  }
};
