'use strict';
//https://stackoverflow.com/questions/16280747/sending-message-to-a-specific-connected-users-using-websocket
const express = require('express');
const {
  Server
} = require('ws');
console.log("Starting Server")
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
  }
  init() {

    console.log(this.websockets)
    wss.on('connection', function connection(ws, req) {
      var userID = req.url.split("/")[1]
      console.log("Incoming url is " + req.url)
      // console.log(ws)
      console.log('Client connected');
      console.log("User ID : " + userID)
      if (userID != null) {
        
        this.websockets[userID] = ws
        this.websocketIds.push(userID)
        console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(this.websockets))
        //
      } else {
        console.log("Could not process User ID")
      }

      ws.on('message', message => {

        try {
          console.log(`Received message => ${message}`)
          console.log('received from ' + userID + ': ' + message)


          // var toUserWebSocket = this.websockets[userID]
          // console.log(toUserWebSocket)

          this.websocketIds.forEach(function(clientId) {
            console.log(clientId)
            if (clientId != userID) {
              console.log("Sending to id " + clientId)
              this.websockets[clientId].send(message)
            }
          })
          // if (toUserWebSocket) {
          //   console.log('sent to ' + messageArray[0] + ': ' + JSON.stringify(messageArray))
          //   messageArray[0] = userID
          //   toUserWebSocket.send(JSON.stringify(messageArray))
          // }
        } catch (e) {

          console.log(e)

        }
      })
      ws.on('close', () => {

        console.log('Client disconnected : ' + userID)
        this.websocketIds = this.websocketIds.filter(e => e !== userID); // will return ['A', 'C']
        console.log("Remaining Clients are : " + this.websocketIds)


      });
    }.bind(this));
  }
}



var connectionManager = new ConnectionManager()
connectionManager.init()
