'use strict';
//https://stackoverflow.com/questions/16280747/sending-message-to-a-specific-connected-users-using-websocket
const express = require('express');
const { Server } = require('ws');
console.log("Starting Server")
const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';
var webSockets = {} // userID: webSocket

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

wss.on('connection', (ws) => {
  var userID = parseInt(webSocket.upgradeReq.url.substr(1), 10)
  console.log('Client connected');
  webSockets[userID] = webSocket
  console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(webSockets))


  ws.on('message', message => {
    console.log(`Received message => ${message}`)
    console.log('received from ' + userID + ': ' + message)
    var messageArray = JSON.parse(message)
    var toUserWebSocket = webSockets[messageArray[0]]
    if (toUserWebSocket) {
      console.log('sent to ' + messageArray[0] + ': ' + JSON.stringify(messageArray))
      messageArray[0] = userID
      toUserWebSocket.send(JSON.stringify(messageArray))
    }
  })
  ws.on('close', () => console.log('Client disconnected'));
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
