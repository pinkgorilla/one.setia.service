'use strict';
const express = require('express');
var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();

const app = express();
const Bible = require('./src/intents/bible-read-intent');
const bible = new Bible();

app.post('/fulfillment', jsonParser, bible.middleware(),
    function (req, res) {
        var response = "i cannot process the information you provided";
        res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
        res.send(JSON.stringify({
            "speech": response,
            "displayText": response
        }));
    });

var port = process.env.PORT || 1337;
app.listen(port); 