function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var events = body.events;

    if (!events || events.length === 0) {
      return _ok();
    }

    var event = events[0];

    if (event.type !== 'message' || event.message.type !== 'text') {
      return _ok();
    }

    var replyToken = event.replyToken;
    var text = event.message.text;

    Line.reply(replyToken, [Line.buildTextMessage(text)]);
  } catch (err) {
    console.error('doPost error: ' + err.message);
  }

  return _ok();
}

function doGet(e) {
  return ContentService.createTextOutput('JotHai webhook is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function _ok() {
  return ContentService.createTextOutput('OK')
    .setMimeType(ContentService.MimeType.TEXT);
}
