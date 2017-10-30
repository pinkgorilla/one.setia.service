'use strict';
const express = require('express');
const line = require('@line/bot-sdk');
const apiai = require("apiai");
const agent = apiai(process.env.APIAI_CLIENT_ACCESSTOKEN);

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESSTOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});

const client = new line.Client(config);

function handleEvent(event) {

    var mention = /^(@|!)?mia(:|,)? /i;

    if (event.type !== 'message' || event.message.type !== 'text' || (event.source.type === "group" && !event.message.text.match(mention))) {
        // ignore non-text-message event
        return Promise.resolve(null);
    }

    var message = event.message.text.replace(mention, "");

    var userId = event.source.userId;
    var groupId = event.source.groupId;

    var session = {
        name: 'session',
        parameters: {
            'userid': userId,
            'groupid': groupId,
            'agent': "line"
        }
    };

    var data = {
        sessionId: userId,
        contexts: [session]
    };
    if (!session.parameters.groupid)
        delete session.parameters.groupid;

    var request = agent.textRequest(message, data);
    request.on('response', (response) => {
        var message = response.result.fulfillment.speech;
        var messages = [];
        var chunk;
        while (message.length > 0) {
            var offset = message.indexOf("\n", 1500);
            if (offset < 0) {
                chunk = message;
                message = "";
            }
            else {
                chunk = message.substr(0, offset);
                message = message.substr(offset);
            }
            chunk = chunk.replace(/^[\n\s\r]*|[\n\s\r]*$/g, '');
            messages.push({ type: 'text', text: chunk });
        }
        return client.replyMessage(event.replyToken, messages);
    });

    request.on('error', (error) => {
        console.log(error);
    });

    request.end();
}

var port = process.env.PORT || 1337;
app.listen(port); 