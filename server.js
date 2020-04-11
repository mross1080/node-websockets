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



let websocketIds = []
wss.on('connection', function connection(ws, req) {
  var userID = parseInt(req.url.substr(1), 10)
  console.log(req.url)
  // console.log(ws)
  console.log('Client connected');
  webSockets[userID] = ws
  websocketIds.push(userID)
  console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(webSockets))
  //


  ws.on('message', message => {

    try {
      console.log(`Received message => ${message}`)
      console.log('received from ' + userID + ': ' + message)


      // var toUserWebSocket = webSockets[userID]
      // console.log(toUserWebSocket)

      websocketIds.forEach(function(clientId) {
        console.log(clientId)
        if (clientId != userID) {
          console.log("Sending to id " + clientId)
          webSockets[clientId].send(message)
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
    websocketIds = arr.filter(e => e !== userID); // will return ['A', 'C']



  });
});

// wss.on("message", (ws) => {
//   console.log("got message!!")
//   ws.clients.forEach((client) => {
//     client.send(new Date().toTimeString());
//   });
//
//
// })

// setInterval(() => {
//   wss.clients.forEach((client) => {
//     client.send(new Date().toTimeString());
//   });
// }, 1000);
