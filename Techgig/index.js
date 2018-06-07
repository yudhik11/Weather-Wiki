
var http = require('http');
//const iso = require('iso-3166-1');

exports.handler = function (event, context) {
    try {
        //console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

// session starts
function onSessionStarted(sessionStartedRequest, session) {
    //console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId);
}

// when not specified what to do
function onLaunch(launchRequest, session, callback) {
    // console.log("onLaunch requestId=" + launchRequest.requestId);

    // skill launch
    getWelcomeResponse(callback);
}

// user specifies intent
function onIntent(intentRequest, session, callback) {
    // console.log("onIntent requestId=" + intentRequest.requestId);
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // skill's intent handlers
    if ("Weatherintent" === intentName) {
        getSyn(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

// user ends session
function onSessionEnded(sessionEndedRequest, session) {
    //console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId);
}

// skill's behaviour

function getWelcomeResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to Weather Wiki. " +
        "I can find weather of any city you would like me to, please name one city at a time.";
    var repromptText = "You can get help by saying help and stop by saying stop and cancel by saying cancel.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    var speechOutput = "To use Weather Wiki you can ask the weather information about the city name you specify. How else can I help you?";
    var repromptText = "Go ahead, say a name of a city.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for using Weather Wiki. Stay updated. Have a nice day!";
    var shouldEndSession = true;//exiting the skill

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function makeTheoRequest(word, theoResponseCallback) {

   if (word===undefined) {
     theoResponseCallback(new Error('undefined'));
   }
  // api here
  //iso_country = iso.whereCountry(country).alpha2.toLowerCase();
  word_encoded = encodeURI(word); 
  var query_url ='http://api.openweathermap.org/data/2.5/weather?q='+word_encoded+'&appid=bb8465425bcec2557c9836f4f0da7594';
  var body = '';
  var jsonObject;

  http.get(query_url, (res) => {
    if (res.statusCode==200) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          body += chunk;
        });
        res.on('end', () => {
          jsonObject = JSON.parse(body);

           theoResponseCallback(null, body);

        });
    }
    else if (res.statusCode==303) {
        query_url ='http://api.openweathermap.org/data/2.5/weather?q='+ res.statusMessage +'&appid=bb8465425bcec2557c9836f4f0da7594';
        http.get(query_url, (res2) => {
            res2.setEncoding('utf8');
            res2.on('data', function (chunk) {
              body += chunk;
            });
            res2.on('end', () => {
              jsonObject = JSON.parse(body);
               theoResponseCallback(null, body);
            });
        });
    }
    else {
      theoResponseCallback(new Error(res.statusCode));
    }
  }).on('error', (e) => {
     theoResponseCallback(new Error(e.message));
  });
}

function getSyn(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var maxLength = 0;

    makeTheoRequest( intent.slots.queryword.value, function theoResponseCallback(err, theoResponseBody) {
        var speechOutput;

        if (err) {
            if (err=='undefined'){
                 speechOutput = "Sorry, this service can better handle a single city name at a time. Multiple city name such as Delhi London will not work.";
            }
            else {
                speechOutput = "Sorry, this service is experiencing a problem with your request. Try again or try a different city name.";
            }

        } else {

        	var theoResponse = JSON.parse(theoResponseBody);

            speechOutput = "Here's what I found: ";
            var celsius = (theoResponse.main.temp-273.15).toFixed(2);
            var fahrenheit = (celsius*1.8+32).toFixed(2);
			var max_temp = ((theoResponse.main.temp_max - 273.15)*1.8 + 32.0).toFixed(2);
            var min_temp = ((theoResponse.main.temp_min - 273.15)*1.8 + 32.0).toFixed(2);

        	speechOutput += "we have " + theoResponse.weather[0].description + ". The temperature is " + celsius +" degree celsius or " + fahrenheit + " degree fahrenheit." + " The max temperature is " + max_temp + " fahrenheit and the min temperature is " + min_temp + " fahrenheit, the pressure is " + theoResponse.main.pressure +" mili bar."
        	//speechOutput += "we have " + theoResponse.weather[0].description + ". The temperature is " + celsius +" degree celsius or " + fahrenheit + " degree fahrenheit."

            

            // if (theoResponse.hasOwnProperty('noun')) {
            //     speechOutput += intent.slots.queryword.value + ', used as a noun, ';
            //     maxLength = Object.keys(theoResponse.noun.syn).length;
            //     if (Object.keys(theoResponse.noun.syn).length>5)
            //     {
            //         maxLength = 5;
            //     }

            //     for(var i=0;i<maxLength;i++) {
            //     if (i>0){
            //         speechOutput += ", or ";
            //     }
            //     speechOutput +=  theoResponse.noun.syn[i];

            //     }
            //     speechOutput += '. '
            // }

            // if (theoResponse.hasOwnProperty('verb')){
            //     speechOutput += intent.slots.queryword.value + ', used as a verb, ';
            //     maxLength = Object.keys(theoResponse.verb.syn).length;
            //     if (Object.keys(theoResponse.verb.syn).length>5)
            //     {
            //         maxLength = 5;
            //     }

            //     for(var i=0;i<maxLength;i++) {
            //     if (i>0){
            //         speechOutput += ", or ";
            //     }
            //     speechOutput +=  theoResponse.verb.syn[i];

            //     }
            //     speechOutput += '. '
            // }

            // if (theoResponse.hasOwnProperty('adverb')){
            //     speechOutput += intent.slots.queryword.value + ', used as an adverb, ';
            //     maxLength = Object.keys(theoResponse.adverb.syn).length;
            //     if (Object.keys(theoResponse.adverb.syn).length>5)
            //     {
            //         maxLength = 5;
            //     }

            //     for(var i=0;i<maxLength;i++) {
            //     if (i>0){
            //         speechOutput += ", or ";
            //     }
            //     speechOutput +=  theoResponse.adverb.syn[i];

            //     }
            //     speechOutput += '. '
            // }

            // if (theoResponse.hasOwnProperty('adjective')){
            //     speechOutput += intent.slots.queryword.value + ', used as an adjective, ';
            //     maxLength = Object.keys(theoResponse.adjective.syn).length;
            //     if (Object.keys(theoResponse.adjective.syn).length>5)
            //     {
            //         maxLength = 5;
            //     }

            //     for(var i=0;i<maxLength;i++) {
            //     if (i>0){
            //         speechOutput += ", or ";
            //     }
            //     speechOutput +=  theoResponse.adjective.syn[i];

            //     }
            //     speechOutput += '. '
            // }


        }
        callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    });

}


//Helper functions

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "Weather Wiki",
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
