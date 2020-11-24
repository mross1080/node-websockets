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
    this.display_sentence = ["These", "Are", "My", "Twisted", "Words", "!!!!!!!!!!"]
    this.display_sentence_index = 0
    this.photoTimeout = 3000
    this.ordered_websockets = [false,false,false,false,false,false]
    this.sequential_interval = 2000
    this.timer = new Timer()
    this.sequence_active = false
    this.broadcastTimer = new Timer()
    this.animations = ["sequential", "animation"]
    this.current_animation = 0;
    this.word_animation_started = false;
    this.route = ""
    this.animationInProgress = false;
    this.word_travel_wait_interval = 800
    this.id_lookup = {}
    this.word_speed = 4
    this.word_interval_incrementing = true

    this.routeTable = {
      "websocketIds": [],
      "websockets": {}
    }
    // [
    //   "sleepyjoe","trump","makeamericagreatagain","trump2020","constitution","womeninpolitics","creatinghapppy" 

    // ], 

    this.graphDestinations = [



      ["goodvibes", "monday", "jagd", "djt", "potustrump", "democratsdestroyamerica"],

      ["tiktokstar", "arbu11", "mashallah", "election", "trump2020landslide", "democratsdestroyamerica"],

      ["sly", "slystallone", "godblessamerica", "conservative", "redpill", "democratsdestroyamerica"],

      ["ocelot", "bigcats", "instagram", "commentforcomment", "allguncontrolisracist", "guncontrolisbullshit"],
      ["ig_mexico", "lookgoodfeelgood", "southoffrance", "quarantinelife", "allguncontrolisracist", "guncontrolisbullshit"]


    ]
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
      this.route = route

      console.log(route)
      // console.log(ws)
      console.log('Client connected');
      console.log("User ID : " + Number(userID))
      this.broadcastTimer.start({ countdown: true, startValues: { seconds: 3 } });

      var id_to_index = userID
      this.ordered_websockets[id_to_index] = ws
      this.id_lookup[id_to_index] = id_to_index
      console.log(this.id_lookup[id_to_index])

      // if (this.ordered_websockets[id_to_index] == null) {
      //   this.id_lookup[id_to_index] = (this.ordered_websockets.length - 1)
      //   this.ordered_websockets.push(ws);
      // } 

      // THis would be if you want anyone to be in the order, i want to be strict
        // If there already exists a client with the wrong ID in a spot, push it to the back then append that bad boy
        // this.ordered_websockets.push(this.ordered_websockets[id_to_index])
        // this.ordered_websockets[id_to_index] = ws;
        // this.id_lookup[id_to_index] = id_to_index
      


      //The Main Route for Incoming Clients to recieve register and start loops
      if (userID != null && userID != "ADMIN") {
        this.routeTable["websockets"][userID] = ws
        this.routeTable["websocketIds"].push(userID)
        console.log("Web ids ", this.id_lookup)

        if ((route == "sequential" || (route == "combined"))) {
          // Start Messaging


          setTimeout(function () {
            console.log("Sending Setup Message to client ", userID)
            this.sendSetupMessage(ws, this.ordered_websockets.length - 1)
          }.bind(this), 1000)


          if (this.animationInProgress == false) {

            console.log("\n\n------STARTING SEQUENTIAL ANIMATION------\n\n")
            this.startSequentialMessageAnimation(userID, ws);
          }


        }




        if (route == "travel" && !this.word_animation_started) {
          console.log("\n\nStarting travel\n\n")
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
            console.log(`Received message => ${message}`)

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
            console.log("")
            if (route == "travel") {
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

        // We're doing this because even though there is an order it isn't forced 
        // for (var index of this.ordered_websockets) {
        //   if (userID == this.ordered_websockets[index]) {
        //     this.ordered_websockets.filter(e => e !== this.ordered_websockets[index])
        //   }
        // }

        // Maybe for a different use case
        // this.ordered_websockets.splice(this.id_lookup[Number(userID)])
        console.log("removing", userID)
        this.ordered_websockets[userID] = false
        debugger;

        this.word_animation_started = false;
        // this.routeTable["websocketIds"] = this.routeTable["websocketIds"].filter(e => e !== userID);
        console.log("Remaining Clients are : " + this.routeTable["websocketIds"])
        console.log("THis many web sockets in ordered web sockets ", this.ordered_websockets.length)
        if (this.ordered_websockets.length == 0) {
          console.log("Reset word animation")
          this.word_animation_started = false;
        }

      }.bind(this));
    }.bind(this));
  }

  sendSetupMessage(ws, word_index) {

    ws.send("SETUP" + "|" + this.graphDestinations[this.current_animation][this.graphDestinations[this.current_animation].length - 1] + "|" + this.graphDestinations[this.current_animation][word_index])

  }


  startWordTravelMessageAnimation(userID, ws) {
    // console.log("In start sequential ")


    this.animationInProgress = true;



    // console.log("going into async loop Iterating over ", this.routeTable["websocketIds"]);
    console.log(this.ordered_websockets.length);
    (async function loop() {
      console.log("In Async loop sending seq messages to clients")
      for (let i = 0; i < (this.ordered_websockets.length); i++) {
        // console.log("At index of promise ", i)
        await new Promise(resolve => setTimeout(resolve, this.word_travel_wait_interval));
        this.sendNextWord(this.ordered_websockets[i], i)

      }
      console.log("Done sending Word Travel messages")
      // await new Promise(resolve => setTimeout(resolve, 5000));
      // This promise is here to leave the photos up for a specified amount of time
      await new Promise(resolve => setTimeout(resolve, 4000));



      if (this.route == "combined") {

        //Commented out for testing 
        //   this.current_animation++;
        //   if (this.current_animation == this.graphDestinations.length) {
        //     this.current_animation = 0;
        // }

        for (var ws_index in this.ordered_websockets) {

          if (this.ordered_websockets[ws_index]) {
            this.ordered_websockets[ws_index].send("RESET")

          }
          console.log("Completed Sequential Animatino, Sending Setup and Reset Messages ")
          if (this.ordered_websockets[ws_index]) {
            this.sendSetupMessage(this.ordered_websockets[ws_index], ws_index)
          }

        }
        console.log("reached the end of the sentence so starting Sequential ")
        this.sequence_active = false;
        this.startSequentialMessageAnimation(this.userID, this.ordered_websockets[0]);

        return;
      }




    }.bind(this))();

  }


  startSequentialMessageAnimation(userID, ws) {
    // console.log("In start sequential ")


    this.animationInProgress = true;



    // console.log("going into async loop Iterating over ", this.routeTable["websocketIds"]);
    console.log(this.ordered_websockets.length);
    (async function loop() {
      console.log("In Async loop sending seq messages to clients")
      console.log("IDS ", this.id_lookup)
      for (let i = 0; i < (this.ordered_websockets.length); i++) {
        // console.log("At index of promise ", i)
        await new Promise(resolve => setTimeout(resolve, this.sequential_interval));
        this.broadcastMessageToClient(i);

      }
      console.log("Done sending seq messages")
      // await new Promise(resolve => setTimeout(resolve, 5000));
      // This promise is here to leave the photos up for a specified amount of time
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.route == "sequential") {
        for (var ws_index in this.ordered_websockets) {
          if (this.ordered_websockets[ws_index]) {
            this.ordered_websockets[ws_index].send("RESET")
          }

          console.log("Completed Sequential Animatino, Sending Setup and Reset Messages ")
          this.sendSetupMessage(this.ordered_websockets[ws_index], ws_index)
        }
        await new Promise(resolve => setTimeout(resolve, 2000));



        // console.log("Animation should now be in progress")
        this.startSequentialMessageAnimation(this.routeTable["websocketIds"][0], this.ordered_websockets[0])
      }

      if (this.route == "combined") {
        console.log("\n\n------STARTING WORD TRAVEL ANIMATION------\n\n")
        console.log("\n\n Finished First Cycle Of Sequential, starting word cycle by sending animation to first client", this.routeTable["websocketIds"][0])
        this.startWordTravelMessageAnimation(userID, ws);

        // this.sendNextWord(this.routeTable["websocketIds"][0])
      }


    }.bind(this))();

  }

  // Method use for Travel and I animations 
  processIncomingWordTravelMessage(userID) {

    console.log("Completed Animation for Connection ID : ", userID)
    console.log("Current Index of client that just finished done", this.current_client_index)

    //If we get a message like this it means we recieved a done signal, and we want to trigger the next animation

    console.log(`Comparing ${this.current_client_index} to this many websockets   ${this.routeTable["websocketIds"].length}`)


    var current_id = this.routeTable["websocketIds"][this.current_client_index]
    // This needs to be refactored out for it's own functionality 
    // if (this.display_sentence_index >= this.display_sentence.length) {

    if (this.display_sentence_index >= this.graphDestinations[this.current_animation].length) {
      console.log("We've reached the end of the word phrase so Resetting to 0")
      this.display_sentence_index = 0;
      this.current_client_index = 0;
      if (this.word_interval_incrementing) {
        this.word_speed += 8
      } else {
        this.word_speed -= 8
      }


      if (this.word_speed > 60 && this.word_interval_incrementing) {
        this.word_interval_incrementing = false;
      }


      if (this.word_speed < 10 && !this.word_interval_incrementing) {
        this.word_interval_incrementing = true;
      }
      if (this.route == "combined") {

        this.current_animation++;
        if (this.current_animation == this.graphDestinations.length) {
          this.current_animation = 0;
        }

        for (var ws_index in this.ordered_websockets) {

          if (this.ordered_websockets[ws_index]) {
            this.ordered_websockets[ws_index].send("RESET")
          }

          console.log("Completed Sequential Animatino, Sending Setup and Reset Messages ")
          if (this.ordered_websockets[ws_index]) {
            this.sendSetupMessage(this.ordered_websockets[ws_index], ws_index)
          }
        }
        console.log("reached the end of the sentence so starting Sequential ")
        this.sequence_active = false;
        this.startSequentialMessageAnimation(this.userID, this.ordered_websockets[0]);

        return;
      }

    }

    console.log(`telling ${current_id} to run word animation`)
    this.sendNextWord(current_id)


  }
  sendNextWord(userID, word_index) {
    if (this.display_sentence.length > 0) {
      console.log("On hashtag animation ", this.current_animation)
      console.log("current client index ", this.current_client_index)
      console.log("Display sentence index ", this.display_sentence_index)
      console.log("current IDS ", this.id_lookup)

      if (this.route == "travel") {

        console.log("Telling socket to start", "WORDS|Start|" + this.graphDestinations[this.current_animation][this.display_sentence_index] + " of current index :" + this.current_client_index)

        this.ordered_websockets[this.current_client_index].send("WORDS|Start|" + this.display_sentence[this.display_sentence_index] + "|" + this.word_speed)

      } else {
        if (this.ordered_websockets[this.current_client_index] != false)  {
          this.ordered_websockets[word_index].send("WORDS|Start|" + this.graphDestinations[this.current_animation][word_index] + "|" + this.word_speed)
        }

      }

      // This is for previous functionality that may be used for another project so don't delete 
      // this.ordered_websockets[this.current_client_index].send("WORDS|Start|" + this.display_sentence[this.display_sentence_index])
      // this.ordered_websockets[this.current_client_index].send("WORDS|Start|" + this.graphDestinations[this.current_animation][word_index])

      this.display_sentence_index++
      this.current_client_index++;
      if (this.current_client_index == this.routeTable["websocketIds"].length) {
        this.current_client_index = 0;
      }

    }
  }

  broadcastMessageToClient(current_index) {

    console.log("Broadcasting message "+ this.graphDestinations[this.current_animation][current_index] + " to client for SEQ current index is ", current_index)

    // console.log("current id of seq animation ", this.routeTable["websocketIds"][current_index])
    // this.ordered_websockets[current_index].send("IMGS" + "|" + current_index + "|" + this.photoTimeout + "|" + current_index)

    if (this.ordered_websockets[current_index] != false) {
      this.ordered_websockets[current_index].send("IMGS" + "|" + current_index + "|" + this.photoTimeout + "|" + this.graphDestinations[this.current_animation][current_index])

    }



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
