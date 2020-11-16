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
// timer.start({countdown: true, startValues: {seconds: 2}});
// timer.addEventListener('targetAchieved', function (e) {
//   console.log("Done with this shit")
// });
class ConnectionManager {

  constructor() {
    console.log("initializing class variables")
    this.websocketIds = []
    this.websockets = {}
    this.count = 0;
    this.current_index = 0;
    this.current_word_index = 0;
    this.display_sentence = ["Hello","From","The","Server"]
    this.display_sentence_index = 0
    this.photoTimeout = 3000
    this.ordered_websockets = []
    this.animationInProgress = false;
    this.sequential_interval = 1000
    this.timer = new Timer()
    this.sequence_active = false
    this.broadcastTimer = new Timer()
    // this.broadcastTimer.addEventListener('targetAchieved', this.restartAnimation());

    this.timer.addEventListener('targetAchieved', function (e) {
      console.log("Restarting animation")
      // this.animationInProgress = true;
      for (var ws_connection of this.ordered_websockets) {
        ws_connection.send("RESET")
      }
      // this.broadcastTimer.start({countdown: true, startValues: {seconds: 1}});
      setTimeout(function(){this.animationInProgress = true}.bind(this), 1000)
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
  init() {
    wss.on('connection', function connection(ws, req) {

      var userID = req.url.split("/")[1]
      console.log("Incoming url is " + req.url)
      var route = req.url.split("/")[2]

      console.log(route)
      // console.log(ws)
      console.log('Client connected');
      console.log("User ID : " + userID)
      this.broadcastTimer.start({countdown: true, startValues: {seconds: 3}});

      if (userID != null && userID != "ADMIN")  {
        this.routeTable["websockets"][userID] = ws
        this.routeTable["websocketIds"].push(userID)
        console.log("Web ids ", this.routeTable["websocketIds"])
        this.routeTable["websockets"][userID].send("PING FROM SERVER")         

      console.log("Setting up route")

      if (route == "sequential") {
        var id_to_index = Number(userID);
        this.ordered_websockets[id_to_index] = ws

        console.log("Setting up sequential timer")
        this.animationInProgress = true;
        if (!this.sequence_active) {
          this.sequence_active = true;
        this.interval = setInterval(function () {
          this.broadcastMessages()
        }.bind(this), this.sequential_interval);
      }}

      if (route == "travel") {
        console.log("Sending message to start")
        console.log(this.display_sentence)
        console.log(this.display_sentence_index)

        this.sendNextWord(userID)
      }



      } else {
        console.log("Could not process User ID")
      }


      console.log("Sent")
      
      ws.on('message', function (message) {

        try {
          // console.log(`Received message => ${message}`)
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
            else if (route=="sequential"){
              var msg_split = message.split("|")
              if (msg_split[1] == "msgInterval") {
      

              clearInterval(this.interval)
              this.interval = setInterval(function () {
                this.broadcastMessages()
              }.bind(this), Number(message));
            }

            if(msg_split[1] == "photoInterval"){
              this.photoTimeout = Number(message)
            }
          }
          } else {


          if (route == "travel") {
            if (message.split("|")[1] == "DONE") {
              console.log("Completed Animation for Connection ID : ", userID)
              console.log("Current Index when done", this.current_word_index)


              this.current_word_index++;
              if (this.current_word_index == this.routeTable["websocketIds"].length) {
                console.log("Resetting to 0")
                this.current_word_index = 0;
              }
              console.log("All IDS", this.routeTable["websocketIds"])
              console.log("Current Index id i will select from", this.current_word_index)

              var current_id = this.routeTable["websocketIds"][this.current_word_index]
              console.log("Triggering Web Socket with ID : ", current_id)
              this.sendNextWord(current_id)
              // this.routeTable["websockets"][current_id].send("Start")

            }
          }
        }


        } catch (e) {

          console.log(e)

        }
      }.bind(this))
      ws.on('close', function () {

        console.log('Client disconnected : ' + userID)
        this.routeTable["websocketIds"] = this.routeTable["websocketIds"].filter(e => e !== userID); // will return ['A', 'C']
        console.log("Remaining Clients are : " + this.routeTable["websocketIds"])


      }.bind(this));
    }.bind(this));
  }

   sendNextWord (userID) {
    if (this.display_sentence.length > 0) {
      console.log("Telling socket to start", "Start|"+ this.display_sentence[this.display_sentence_index])
    this.routeTable["websockets"][userID].send("Start|"+ this.display_sentence[this.display_sentence_index])

    console.log("Sent word",this.display_sentence[this.display_sentence_index])
    this.display_sentence_index++

    if (this.display_sentence_index >= this.display_sentence.length) {
      console.log("Resetting to 0")
      this.display_sentence_index = 0;
    }


  }
}


  broadcastMessages() {
    // console.log(this.routeTable)

    if (this.routeTable["websocketIds"].length > 0) {
      



      
      if (this.current_index > this.ordered_websockets.length - 1 && this.animationInProgress == true) {
        this.animationInProgress = false;
        console.log("Aniamtion done setting restart")
        this.current_index = 0;
        this.count = 0;
        //You've reached the end of the animation, start the timer that will black out all the screens and then reset the animation
        this.timer.start({countdown: true, startValues: {seconds: 5}});

        
      } else{

        if(this.animationInProgress) {
        console.log("Running animation for index ", this.current_index)
        var current_id = this.routeTable["websocketIds"][this.current_index]
        console.log("current id ", current_id)
        console.log("web socket ids", this.routeTable["websocketIds"])
        this.ordered_websockets[this.current_index].send(this.count + "|" + this.photoTimeout + "|" + this.current_index)
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
// setInterval(function () {
//   connectionManager.broadcastMessages()
// }, 1000);

