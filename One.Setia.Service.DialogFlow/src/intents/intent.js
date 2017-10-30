'use strict';
const apiai = require('apiai');
var apiaiClient = apiai(process.env.APIAI_CLIENT_ACCESSTOKEN);

const shortid = require('shortid');

class Intent {
    constructor(action) {
        this.execute = this.execute.bind(this);
        this.triggerEvent = this.triggerEvent.bind(this);
        this.action = action;
    }

    middleware() {
        var func = function (req, res, next) {
            var payload = req.body;
            if (!payload.result.action.match(this.action) || payload.result.actionIncomplete)
                next();
            else {
                res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type

                this.execute(payload)
                    .then(result => {
                        res.send(JSON.stringify(result));
                    })
                    .catch(e => {
                        var response = e;
                        res.send(JSON.stringify({
                            "speech": response,
                            "displayText": response
                        }));
                    });
            }
        };
        return func.bind(this);
    }

    loadSessionContext(payload) {
        var parameters = payload.result.parameters;
        var sessionContext = {
            "name": "session",
            "lifespan": 0,
            "parameters": {
                "userid": parameters.userid,
                "groupid": parameters.groupid,
                "agent": parameters.agent
            }
        };
        return Promise.resolve(sessionContext);
    }

    execute(payload) {
        return this.loadSessionContext(payload)
            .then(sessionContext => {
                payload.session = sessionContext;

                return this.getResponse(payload)
                    .then(response => {
                        response.contextOut = response.contextOut || [];
                        if (response.contextOut.indexOf(sessionContext) < 0)
                            response.contextOut.push(sessionContext);
                        return response;
                    });
            });
    }

    getResponse(payload) {
        return Promise.reject("not implemented");
    }

    triggerEvent(event, sessionId) {
        return new Promise((resolve, reject) => {
            var request = apiaiClient.eventRequest(event, { sessionId: sessionId });

            request.on('response', (response) => {
                resolve(response);
            });

            request.on('error', (error) => {
                reject(error);
            });

            request.end();
        });
    }
}

module.exports = Intent;
