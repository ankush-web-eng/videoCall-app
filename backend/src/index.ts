import { WebSocket, WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

let senderSocket: null | WebSocket = null;
let receiverSocket: null | WebSocket = null;

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data: any) {
    const message = JSON.parse(data);
    if (message.type === 'videoSender') {
      console.log("sender added");
      senderSocket = ws;
    } else if (message.type === 'videoReceiver') {
      console.log("receiver added");
      receiverSocket = ws;
    } else if (message.type === 'videoCreateOffer') {
      if (ws !== senderSocket) {
        return;
      }
      console.log("sending offer");
      receiverSocket?.send(JSON.stringify({ type: 'videoCreateOffer', sdp: message.sdp }));
    } else if (message.type === 'videoCreateAnswer') {
        if (ws !== receiverSocket) {
          return;
        }
        console.log("sending answer");
        senderSocket?.send(JSON.stringify({ type: 'videoCreateAnswer', sdp: message.sdp }));
    } else if (message.type === 'iceCandidate') {
      console.log("sending ice candidate")
      if (ws === senderSocket) {
        console.log("sender ice candidate");
        receiverSocket?.send(JSON.stringify({ type: 'videoIceCandidate', candidate: message.candidate }));
      } else if (ws === receiverSocket) {
        console.log("receiver ice candidate");
        senderSocket?.send(JSON.stringify({ type: 'videoIceCandidate', candidate: message.candidate }));
      }
    }
  });

});