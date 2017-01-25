// 'use strict';

var Alexa = require('alexa-sdk');
var request = require ('request');

var APP_ID = 'amzn1.ask.skill.92ca1fbc-56d2-4a73-bcf8-805fc43e7147';

const PROD = true;
const OPENING_DAY = "March 26, 2017";

var ServerBaseURL = "http://localhost:3000/cigarsbaseball";
if (PROD)
{
        ServerBaseURL = "https://cigarsbaseballserver.herokuapp.com/cigarsbaseball";
}

const ServerURLNextGame = ServerBaseURL + "/nextgame";
const ServerURLPrevGame = ServerBaseURL + "/prevgame";

const ServerURLTopHitter = ServerBaseURL + "/tophitter";
const ServerURLTopPitcher = ServerBaseURL + "/toppitcher";

const ServerURLRecord = ServerBaseURL + "/record";


exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers (handlers);
    alexa.execute();
};

/*
** this function requests data via a json request to the Cigars Baseball Node Server
*/
function requestData (url, alexa, emitFunction)
{
    console.log ("requestData from url: " + url);
    var result = null;

    request.get(
        {
            url: url,
            json: true,
            headers: {'User-Agent': 'request'}
        }, 
        (err, res, data) => {
            if (err) {
                console.log('Error:', err);
            }
            else if (res.statusCode !== 200) {
                console.log('Status:', res.statusCode);
            } 
            else {
                // success, call the emit function and pass in the link to alexa and the data
                console.log (data);
                emitFunction (alexa, data);
            }
        }
    )
};

/*
** Alexa emitter functions; these functions are passed in as paramters to the requestData function above
** they are invoked once a valid response is received from the Cigars Baseball node server
*/
/*
        ** sample have Alexa ask for some more info
        this.emit(‘:ask’, ’What would you like to do?’, ’Please say that again?’);
*/
function emitNextGame (alexa, data)
{
    console.log ("emitting next game: " + data.date + " vs: " + data.opponent);

    var nextGameMsg = "The Cigars next game is on " + data.date;
    if (data.opponent === "T B D")
    {
        nextGameMsg = nextGameMsg + ". Time, place and opponent are yet to be determined";
    }
    else
    {
        nextGameMsg = nextGameMsg + " versus the " + data.opponent + " at " + data.field + 
            ". Game time is " + data.time;
    }
    alexa.emit(':tell', nextGameMsg);
}

function emitPrevGame (alexa, data)
{
    console.log ("emitting prev game: " + data.date);

    var wonLoss = "won";
    if (data.result.indexOf ("L") > -1)
    {
        wonLoss = "lost";
    }

    // remove the 'W' or 'L' and just get the score
    var score = data.result.substring(2);
    alexa.emit(':tell', 'The Cigars played the ' + data.opponent + " on " + data.date + ". The Cigars " + wonLoss + "," + score);
}

function emitRecord (alexa, data)
{
    alexa.emit(':tell', "In " + data.year + ", the Atlanta Cigars won " + data.wins + " games and lost " + data.losses + " during the season including playoff games");
}

function emitTopHitter (alexa, data)
{
    alexa.emit(':tell', 'The Cigars top hitter is ' + data.player + " with an O P S of " + data.ops + 
        " and a batting average of " + data.avg);
}

function emitTopPitcher (alexa, data)
{
    alexa.emit(':tell', 'The Cigars top pitcher is ' + data.player + " with a wip of " + 
                        data.whip + ", an E R A of " + data.era + 
                        ", and " + data.pitchingKs + " strikeouts");
    
    // test with ES6 template strings; not working right now for some reason
    /*
    alexa.emit(':tell',
        'The Atlanta Cigars ace pitcher is ${data.player} with a wip of ${data.whip}, an E R A of ${data.era}, and $(data.pitchingKs} strikeouts');
    */                
}

function emitOpeningDay (alexa, data)
{
    console.log ("emitting opening day: " + data.date);

    var oneDayMS = 1000*60*60*24; //Get 1 day in milliseconds
    var openingDayMS = Date.parse (data.date);
    var todayMS = (new Date()).getTime();
    var differenceMS = openingDayMS - todayMS;
    var numDays = 0;
    
    console.log (openingDayMS + " " + todayMS + " " +  differenceMS);

    if (differenceMS > 0)
    {
        // opening day is coming up
        numDays = Math.round(differenceMS/oneDayMS);
        alexa.emit(':tell', "Cigars baseball opening day is on " + data.date + ". There are " + numDays + " days remaining until the season opener");
    }
    else
    {
        // opening day has passed
        alexa.emit(':tell', "Opening day was on " + data.date);
    }

}


/*
** Alexa intent handlers
*/
var handlers = {

    // using "ask" for launchRequest so that the skill remains open for user to ask a question
    'LaunchRequest': function () {
        this.emit(':ask', 'Welcome to the Atlanta Cigars Baseball app. Go ahead and ask me something about Cigars Baseball.', 'What would you like to know about Cigars Baseball');
    },

    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Ok, see you at the ballpark');
    },

    'AMAZON.HelpIntent': function () {
        this.emit(':ask', 'Go ahead and ask me something about Cigars Baseball. For example, you can say ask Cigars Baseball when is the next game, or ask Cigars Baseball who is the leading hitter or pitcher, or say ask Cigars Baseball, what is the team record? You may need to say ask Cigars Baeball prior to your question unless the app is just opened and active', 'What would you like to know about Cigars Baseball');
    },

    'NextGameIntent': function () {
        requestData (ServerURLNextGame, this, emitNextGame);
    },

    'PrevGameIntent': function () {
        requestData (ServerURLPrevGame, this, emitPrevGame);
    },

    'LeadingHitterIntent': function () {
        requestData (ServerURLTopHitter, this, emitTopHitter);

    },

    'LeadingPitcherIntent': function () {
        requestData (ServerURLTopPitcher, this, emitTopPitcher);
    },

    'RecordIntent': function () {
        // get team record
        requestData (ServerURLRecord, this, emitRecord);
    },

    'OpeningDayIntent': function () {
        emitOpeningDay (this, {"date": OPENING_DAY});
    }
};
