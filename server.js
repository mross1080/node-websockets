'use strict';
const express = require('express');
const {
  Server
} = require('ws');
console.log("Starting Server")
const url = require('url');

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


class ConnectionManager {

  constructor() {
    console.log("initializing class variables")
    this.websocketIds = []
    this.websockets = {}
    this.count = 0;
    this.current_index = 0;
    this.routeTable = {

      "websocketIds": [],
      "websockets": {}

    }





  }
  init() {

    this.interval = setInterval(function () {
      this.broadcastMessages()
    }.bind(this), 1000);

    wss.on('connection', function connection(ws, req) {






      var userID = req.url.split("/")[1]
      console.log("Incoming url is " + req.url)
      // var route = req.url.split("/")[2]
      // console.log(ws)
      console.log('Client connected');
      console.log("User ID : " + userID)

      if(userID =="STOP") {
        clearInterval(this.interval)
        this.interval = setInterval(function () {
          this.broadcastMessages()
        }.bind(this), 300);
      }

      if (userID != null) {

        if (userID == "ADMIN") {
          console.log("ADMINNNNN")
          // console.log(`Received message => ${message}`)
          console.log('received from ' + userID)


        }

        this.routeTable["websockets"][userID] = ws
        this.routeTable["websocketIds"].push(userID)
        console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(this.routeTable["websockets"]))
        console.log("Web ids ",this.routeTable["websocketIds"])
        //
      } else {
        console.log("Could not process User ID")
      }

      this.routeTable["websockets"][userID].send("HELLO FROM SERVER")




      ws.on('message', function (message) {

        try {
          console.log(`Received message => ${message}`)
          console.log('received from ' + userID + ': ' + message)

          if (userID == "ADMIN") {
            console.log("ADMINNNNN")
            console.log(`Received message => ${message}`)
            // console.log('received from ' + userID)
  
              clearInterval(this.interval)
              this.interval = setInterval(function () {
                this.broadcastMessages()
              }.bind(this), Number(message));
  
  
          }
  


          // console.log(toUserWebSocket)

          this.routeTable["websocketIds"].forEach(function (clientId) {
            console.log(clientId)
            if (clientId != userID) {
              console.log("Sending to id " + clientId)
              this.routeTable["websockets"][clientId].send(message)
            }
          }.bind(this))

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

  broadcastMessages() {
    // console.log(this.routeTable)

    if (this.routeTable["websocketIds"].length > 0 ) {
      console.log("current index", this.current_index)
    var current_id = this.routeTable["websocketIds"][this.current_index]
    console.log("current id ", current_id)
    console.log("web socket ids",this.routeTable["websocketIds"])
    this.routeTable["websockets"][current_id].send(this.count)
    this.count++;
    this.current_index++;

    if (this.current_index > this.routeTable["websocketIds"].length -1) {
      this.current_index = 0;
    }

    
    // this.routeTable["websocketIds"].forEach(function (clientId) {
    //   console.log(clientId)

    //   this.routeTable["websockets"][clientId].send(this.count)
    //   this.count++;

    // }.bind(this))
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

