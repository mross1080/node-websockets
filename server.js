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
    this.count = 0;
    this.current_index = 0;
    this.current_client_index = 0;
    this.display_sentence = ["Hello", "From", "The"]
    this.display_sentence_index = 0
    this.photoTimeout = 3000
    this.ordered_websockets = []
    this.animationInProgress = false;
    this.sequential_interval = 1000
    this.timer = new Timer()
    this.sequence_active = false
    this.broadcastTimer = new Timer()
    this.animations = ["sequential", "animation"]
    this.current_animation = 0;
    this.word_animation_started = false;
    this.route = ""



    this.timer.addEventListener('targetAchieved', function (e) {
      console.log("Restarting animation")
      // this.animationInProgress = true;
      for (var ws_connection of this.ordered_websockets) {
        ws_connection.send("RESET")
      }
      // this.broadcastTimer.start({countdown: true, startValues: {seconds: 1}});
      setTimeout(function () { 
         
        if (this.route == "sequential") {
          this.animationInProgress = true
        }
        
        if(this.route == "combined") {
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


  resetValues() {
    this.current_animation = 0;
    this.word_animation_started = false;
    this.count = 0;
    this.current_index = 0;
    this.current_client_index = 0;
    this.display_sentence_index = 0
    this.photoTimeout = 3000
    this.animationInProgress = false;
    this.sequential_interval = 1000
    this.sequence_active = false
  }

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


      //The Main Route for Incoming Clients to recieve register and start loops
      if (userID != null && userID != "ADMIN") {
        this.resetValues()
        this.routeTable["websockets"][userID] = ws
        this.routeTable["websocketIds"].push(userID)
        console.log("Web ids ", this.routeTable["websocketIds"])
        
        if (route == "sequential" || (route == "combined")) {
          this.processIncomingSequentialMessage(userID, ws);
        }

        if (route == "travel" && !this.word_animation_started) {
          
          // Start First Animation
          setTimeout(function(){
            this.sendNextWord(userID)
          }.bind(this),1000)
         
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

            if (route == "travel" || route =="combined") {
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

  processIncomingSequentialMessage(userID, ws) {
    var id_to_index = Number(userID);
    this.ordered_websockets[id_to_index] = ws;

    this.animationInProgress = true;
    if (!this.sequence_active) {
      this.sequence_active = true;
      this.interval = setInterval(function () {
        this.broadcastMessages();
      }.bind(this), this.sequential_interval);
    }
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
        this.processIncomingSequentialMessage(this.userID, this.ordered_websockets[0]);

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


  broadcastMessages() {
    

    if (this.routeTable["websocketIds"].length > 0) {

      // You've gone through all your clients so start the reset process
      if (this.current_index > this.ordered_websockets.length - 1 && this.animationInProgress == true) {
        this.animationInProgress = false;
        console.log("Aniamtion done setting restart")
        this.current_index = 0;
        this.count = 0;
        //You've reached the end of the animation, start the timer that will black out all the screens and then reset the animation
        this.timer.start({ countdown: true, startValues: { seconds: 5 } });


      } else {
        // Main Animation Loop, tell the next client to take their action one at a time asynchronously 
        if (this.animationInProgress) {
          console.log("Running animation for index ", this.current_index)
          var current_id = this.routeTable["websocketIds"][this.current_index]
          console.log("current id ", current_id)
          console.log("web socket ids", this.routeTable["websocketIds"])
          this.ordered_websockets[this.current_index].send("IMGS" + "|" + this.count + "|" + this.photoTimeout + "|" + this.current_index)
          // this.routeTable["websockets"][current_id].send(this.count + "|" + this.photoTimeout)
          this.count++;
          this.current_index++;
        }

      }


    }
  } catch(e) {

    console.log(e)

  }


}



var connectionManager = new ConnectionManager()
connectionManager.init()
