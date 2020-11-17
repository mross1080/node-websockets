'use strict';
const express = require('express');
const {
  Server
} = require('ws');
console.log("Starting Server")
const url = require('url');
var { Timer } = require('./public/easytimer.min.js');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';
var webSockets = {} // userID: webSocket

const server = express()
  .use((req, res) => res.sendFile(INDEX, {
    root: __dirname
  }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({
  server
});


var timer = new Timer();

class ConnectionManager {

  constructor() {
    console.log("initializing class variables")
    this.websocketIds = []
    this.websockets = {}
    this.current_client_index = 0;
    this.display_sentence = ["Hello", "From", "The"]
    this.display_sentence_index = 0
    this.photoTimeout = 3000
    this.ordered_websockets = []
    this.sequential_interval = 2000
    this.timer = new Timer()
    this.sequence_active = false
    this.broadcastTimer = new Timer()
    this.animations = ["sequential", "animation"]
    this.current_animation = 0;
    this.word_animation_started = false;
    this.route = ""
    this.animationInProgress = false;



    this.timer.addEventListener('targetAchieved', function (e) {
      console.log("Restarting animation")
      // this.animationInProgress = true;
      for (var ws_connection of this.ordered_websockets) {
        ws_connection.send("RESET")
      }
      // this.broadcastTimer.start({countdown: true, startValues: {seconds: 1}});
      setTimeout(function () {

        if (this.route == "sequential") {
          console.log("Animation should now be in progress")
          this.animationInProgress = true
          this.startSequentialMessageAnimation(this.routeTable["websocketIds"][0], this.ordered_websockets[0])
        }

        if (this.route == "combined") {
          this.sendNextWord(this.routeTable["websocketIds"][0])
        }




      }.bind(this), 1000)
    }.bind(this));

    this.routeTable = {
      "websocketIds": [],
      "websockets": {}
    }
  }

  restartAnimation() {
    console.log("Im a proof of concept!")
    this.animationInProgress = true
  }


  // resetValues() {
  //   this.current_animation = 0;
  //   this.word_animation_started = false;
  //   this.current_client_index = 0;
  //   this.display_sentence_index = 0
  //   this.photoTimeout = 3000
  //   this.sequential_interval = 1000
  // }

  init() {
    wss.on('connection', function connection(ws, req) {

      var userID = req.url.split("/")[1]
      console.log("Incoming url is " + req.url)
      var route = req.url.split("/")[2]
      this.route = route

      console.log(route)
      // console.log(ws)
      console.log('Client connected');
      console.log("User ID : " + userID)
      this.broadcastTimer.start({ countdown: true, startValues: { seconds: 3 } });

      var id_to_index = Number(userID);
      this.ordered_websockets[id_to_index] = ws;


      //The Main Route for Incoming Clients to recieve register and start loops
      if (userID != null && userID != "ADMIN") {
        this.routeTable["websockets"][userID] = ws
        this.routeTable["websocketIds"].push(userID)
        console.log("Web ids ", this.routeTable["websocketIds"])

        if ((route == "sequential" || (route == "combined")) && this.animationInProgress == false) {
          // Start Messaging
          this.startSequentialMessageAnimation(userID, ws);
        }

        if (route == "travel" && !this.word_animation_started) {

          // Start First Animation 
          // Using a timeout just to give the socket extra time to establish connection
          setTimeout(function () {
            this.sendNextWord(userID)
          }.bind(this), 1000)

          this.word_animation_started = true;
        }



      } else {
        console.log("Could not process User ID")
      }

      ws.on('message', function (message) {

        try {
          console.log('received from ' + userID + ': ' + message)

          if (userID == "ADMIN") {
            // console.log("ADMINNNNN")
            console.log(`Received message => ${message}`)
            // console.log('received from ' + userID)

            if (route == "travel") {
              console.log("Got a request to update the scrolling words")
              console.log(message.split("|")[0])
              if (message.split("|")[0] == "WORDS") {
                var words = message.split("|")[1]
                console.log("Setting words to ", words)
                this.display_sentence = words.split(" ")
                this.display_sentence_index = 0

              }

            }
            else if (route == "sequential") {
              var msg_split = message.split("|")
              if (msg_split[1] == "msgInterval") {


                clearInterval(this.interval)
                this.interval = setInterval(function () {
                  this.broadcastMessages()
                }.bind(this), Number(message));
              }

              if (msg_split[1] == "photoInterval") {
                this.photoTimeout = Number(message)
              }
            }
          } else {

            if (route == "travel" || route == "combined") {
              if (message.split("|")[1] == "DONE") {
                this.processIncomingWordTravelMessage(userID)

              }
            }
          }


        } catch (e) {

          console.log(e)

        }
      }.bind(this))
      ws.on('close', function () {

        console.log('Client disconnected : ' + userID)
        this.routeTable["websocketIds"] = this.routeTable["websocketIds"].filter(e => e !== userID);
        console.log("Remaining Clients are : " + this.routeTable["websocketIds"])

      }.bind(this));
    }.bind(this));
  }

  startSequentialMessageAnimation(userID, ws) {
    console.log("In start sequential ")
   

    this.animationInProgress = true;
    


      console.log("going into async loop Iterating over ", this.routeTable["websocketIds"]);
      console.log(this.ordered_websockets.length);
    (async function loop() {

      try {
        for (let i = 0; i < (this.ordered_websockets.length); i++) {
          console.log("At index of promise ", i)
          await new Promise(resolve => setTimeout(resolve, this.sequential_interval));
          this.broadcastMessageToClient(i);

        }

        await  new Promise(resolve => setTimeout(resolve, 5000));
        // Send a Signal to Reset to All Clients 
        for (var ws_connection of this.ordered_websockets) {
          ws_connection.send("RESET")
        }
        await  new Promise(resolve => setTimeout(resolve, 4000));
        if (this.route == "sequential") {
          console.log("Animation should now be in progress")
          this.startSequentialMessageAnimation(this.routeTable["websocketIds"][0], this.ordered_websockets[0])
        }

        if (this.route == "combined") {
          this.sendNextWord(this.routeTable["websocketIds"][0])
        }

        console.log("here is another thing")
      } catch (err) {
        console.log(err)
      } finally {
        console.log("DONE WITH ASYNC FUNCTION YALL")
        // this.animationInProgress = false;


        //You've reached the end of the animation, start the timer that will black out all the screens and then reset the animation
        // this.timer.start({ countdown: true, startValues: { seconds: 5 } });
      }
    }.bind(this))();

  }

  processIncomingWordTravelMessage(userID) {


    console.log("Completed Animation for Connection ID : ", userID)
    console.log("Current Index of client when done", this.current_client_index)


    this.current_client_index++;
    if (this.current_client_index == this.routeTable["websocketIds"].length) {
      console.log("Resetting to 0")
      this.current_client_index = 0;
      // this.sequence_active = false;
      // return;

    }
    console.log("All IDS", this.routeTable["websocketIds"])
    console.log("Current Index id i will select from", this.current_client_index)
    console.log(`\ndisplay sentence index : ${this.display_sentence_index}\n`)

    var current_id = this.routeTable["websocketIds"][this.current_client_index]
    console.log("Triggering Web Socket with ID : ", current_id)
    if (this.display_sentence_index >= this.display_sentence.length) {
      console.log("Resetting to 0")
      this.display_sentence_index = 0;
      if (this.route == "combined") {
        console.log("reached the end of the sequence for this route so starting next one ")
        this.sequence_active = false;
        this.startSequentialMessageAnimation(this.userID, this.ordered_websockets[0]);

        return;
      }

    }

    this.sendNextWord(current_id)


  }
  sendNextWord(userID) {
    if (this.display_sentence.length > 0) {
      console.log("Telling socket to start", "WORDS|Start|" + this.display_sentence[this.display_sentence_index])
      this.routeTable["websockets"][userID].send("WORDS|Start|" + this.display_sentence[this.display_sentence_index])

      console.log("Sent word", this.display_sentence[this.display_sentence_index])
      this.display_sentence_index++

      // if (this.display_sentence_index >= this.display_sentence.length) {
      //   console.log("Resetting to 0")
      //   this.display_sentence_index = 0;
      // }


    }
  }

  broadcastMessageToClient(current_index) {

    console.log("current id of seq animation ", this.routeTable["websocketIds"][current_index])
    this.ordered_websockets[current_index].send("IMGS" + "|" + current_index + "|" + this.photoTimeout + "|" + current_index)

  }


}



var connectionManager = new ConnectionManager()
connectionManager.init()
// let myFirstPromise = new Promise((resolve, reject) => {
//   // We call resolve(...) when what we were doing asynchronously was successful, and reject(...) when it failed.
//   // In this example, we use setTimeout(...) to simulate async code. 
//   // In reality, you will probably be using something like XHR or an HTML5 API.
//   setTimeout( function() {
//     resolve("Success!")  // Yay! Everything went well!
//   }, 250) 
// }) 

// myFirstPromise.then((successMessage) => {
//   // successMessage is whatever we passed in the resolve(...) function above.
//   // It doesn't have to be a string, but if it is only a succeed message, it probably will be.
//   console.log("Yay! " + successMessage) 
// });

// (async function loop() {
//   for (let i = 0; i < 10; i++) {
//       await new Promise(resolve => setTimeout(resolve, 500));
//       console.log(i);
//   }
// })();
