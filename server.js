import Deck from "./Deck";
import GinRummyRules from "./GinRummyRules";
import s3Proxy from 's3-proxy';
import awsKey from './awsKey';
import express from 'express';
import socketIO from 'socket.io';
import GameState from './GameState';

const PORT = process.env.PORT || 8000;

const app = express()
    //Allow CORS for sockets
    .all('/', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    })
    //Use /* as a pass-through to S3
    .get('/*', s3Proxy({
        bucket: 'aws-website-playingcards-cqzb8',
        accessKeyId: awsKey.accessKeyId,
        secretAccessKey: awsKey.secretAccessKey,
        overrideCacheControl: 'max-age=100000'
    }))
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(app);
let deck = new Deck();
let rules = new GinRummyRules();
const gameState = new GameState();

// get immutable keys: const [ ...keys ] = map.keys();
//1. on connection add player to players array
//2. if player array is === number of players,start
//3. set player's turn player 1
//4. listen for player 1 to make move
//4a. verify move
//5. set state (change player, apply move)
//6. send state (filter out cards that aren't visible)

function onNewConnection(socket) {
    gameState.addSocket(socket);

    if(!gameState.addPlayer(socket)) {
        console.log('disconnecting')
        socket.disconnect();
        return;
    }
    console.log('***new connection***');
    if(gameState.gameHasStarted && !gameState.getActivePlayer()) {
        gameState.setActivePlayer(socket);
    }
    if(gameIsReadyToStart()) { //move this to rules
        console.log('starting game............');
        startGame();
        setTimeout(function(){
            sortHands();
            sendStateUpdate(gameState.sockets);
        }, 2000)
    }
    sendStateUpdate(gameState.sockets);
}
io.on('connection', (socket) => {
   onNewConnection(socket);

    socket.on('disconnect', (reason) => {
        gameState.removePlayer(socket.id);
        delete sockets[socket.id];
    });

    socket.on('discard', card => {
        if(rules.isDiscardAllowed(state, socket.id)) {
            sortHands();
            mergeState(discard(socket.id, card));
            endCurrentActivePlayersTurn();
            sendStateUpdate(sockets);
        }
    });

    socket.on('draw',  function() {
        console.log("drawing");
        if(rules.isDrawAllowed(state, socket.id)) {
            mergeState(draw(socket.id, "draw"));
            sortHands();
            sendStateUpdate(sockets);
        }
    });

    socket.on('drawFromDiscard',  function() {
        console.log("drawing from discard")
        if(rules.isDrawAllowed(state, socket.id)) {
            draw(socket.id, "discard");
            sortHands();
            sendStateUpdate(sockets);
        }
    });
});

function draw(socketId, pile) {
    gameState.moveCardBetweenHands(pile, socketId, gameState.getLastCard(pile))
}

function discard(socketId, card) {
    gameState.moveCardBetweenHands(socketId, "discard", card);
}
function sendStateUpdate() {  //This still needs refactoring!
    const sockets = gameState.getSockets();
    for (let socketId in sockets) {
        const socket = sockets[socketId];
        // do something with key|value
        socket.emit('state', gameState.getCensoredStateForPlayer(socketId));
    }
}


function gameIsReadyToStart() {
    return !gameState.getGameHasStarted() && gameState.getNumberOfPlayers() === gameState.getNumberOfPlayersNeededToStart();
}
function startGame() {
    deck.shuffle();
    gameState.addToEachPlayersPrimaryHand(function() {
        deck.deal(10);
    });
    gameState.addToDiscard(function() {
        deck.deal(1);
    });
    gameState.addToDraw(function() {
        deck.deal(999);
    });
    gameState.randomizeActivePlayer();
    gameState.startGame();
}
function sortHands() {
    gameState.applyToEachPlayersHand(function(hand) {
        deck.sort(hand);
    })
}


// handN: deck.deal(10),
//     handS: deck.deal(10),
//     discard: {
//     handId: "discard",
//         hide: false,
//         hand: deck.deal(1)
// },
// draw: {
//     handId: "draw",
//         hide: true,
//         hand: deck.deal(999)
// }

  //
  //   client.emit('state', state);
  // client.on('setState', (newState) => {
  //
  //   console.log('client is moving card ', newState);
  //   if(JSON.stringify(newState) !== state){
  //       state = JSON.stringify(newState);
  //       client.emit('state', newState);
  //       console.log('sending new state: ', newState);
  //   }

 // });

