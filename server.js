import Deck from "./Deck";
import GinRummyRules from "./GinRummyRules";
const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 8000;
const INDEX = path.join(__dirname, 'build');

console.log("index: ", INDEX);

//start server
const server = express()
    .use(express.static(INDEX, { maxAge: 86400000 }))
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const { Map, List } = require('immutable')

var io = socketIO(server);
let deck = new Deck();
let rules = new GinRummyRules();

// get immutable keys: const [ ...keys ] = map.keys();
//1. on connection add player to players array
//2. if player array is === number of players,start
//3. set player's turn player 1
//4. listen for player 1 to make move
//4a. verify move
//5. set state (change player, apply move)
//6. send state (filter out cards that aren't visible)
let state = Map({
    players : Map(),
    playersNeededToStart : 2,
    discard : [],
    draw : [],
    activePlayer : null
});
let abandonedPlayers = [];
let sockets = {};
let gameHasStarted = false;

io.on('connection', (socket) => {
    console.log('***new connection***')
    sockets[socket.id] = socket;
    addNewPlayer(socket.id);
    if(gameIsReadyToStart()) {
        console.log('starting game............');
        startGame();
        setTimeout(function(){
            sortHands();
            sendStateUpdate(sockets);
        }, 2000)

        console.log('state just before sending: ', state);
    }
    sendStateUpdate(sockets);
    console.log(socket.id);
    console.log("state: ", state);

    socket.on('disconnect', (reason) => {
        console.log("remove: ", socket.id);
        removePlayer(socket.id);
        delete sockets[socket.id];
        console.log("state: ", state);
    });

    socket.on('discard', card => {
        if(rules.isDiscardAllowed(state, socket.id)) {
            console.log("discarding: ", card)
            discard(card, socket.id);
            var nextPlayerIndex = Object.keys(sockets).indexOf(socket.id) !== Object.keys(sockets).length - 1 ? Object.keys(sockets).indexOf(socket.id) + 1 : 0;
            state = state.set("activePlayer", Object.keys(sockets)[nextPlayerIndex]);
            sortHands();
            sendStateUpdate(sockets);
        }
    });

    socket.on('draw',  function() {
        console.log("drawing");
        if(rules.isDrawAllowed(state, socket.id)) {
            draw(socket.id, "draw");
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
    var players =  state.get("players");
    var primaryHand = players.get(socketId).get("primaryHand");
    console.log("primaryHand: ", primaryHand)
    var draw = state.get(pile);
    var drawnCard = draw.last();
    console.log("drawnCard: ", drawnCard);
    state = state.set(
        "players", players.set(socketId, players.get(socketId).set("primaryHand",
            primaryHand.push(drawnCard))));
    state = state.set(pile, draw.pop())
}

function discard(card, socketId) {
    var players =  state.get("players");
    var primaryHand = players.get(socketId).get("primaryHand");
    console.log("spliced: ", primaryHand.splice(primaryHand.indexOf(card), 1));
    state = state.merge({
        players : players.set(socketId, players.get(socketId).set("primaryHand",
            primaryHand.splice(primaryHand.indexOf(card), 1))),
        discard : state.get("discard").push(card)
    })
    console.log("state after discard: ", JSON.stringify(state));
}
function sendStateUpdate(sockets) {
    for (var socketId in sockets) {
        var socket = sockets[socketId];
        // do something with key|value
        var players = state.get("players");
        var opponents = 1;
        players.keySeq().forEach(key => {
            console.log('key: ', key);
            if(key === socket.id) {
                var playerState = players.get(key);
                players = players.set("playerState", playerState)
                    .remove(key);
            } else {
                var opponentState = players.get(key);
                players = players.set("opponentState" + opponents, opponentState)
                    .remove(key);
            }
        });
        var censoredState = state.set("players", players);
        socket.emit('state', censoredState);
    };
}
function getMapLength(map) {
    return map.keySeq().toArray().length;
}

function gameIsReadyToStart() {
    return !gameHasStarted && getMapLength(state.get("players")) === state.get("playersNeededToStart");
}
function startGame() {
    let players = state.get("players");
    deck.shuffle();
    players.keySeq().forEach(key => {
        console.log('key: ', key);
        players = players.set(key, players.get(key).set("primaryHand", List(deck.deal(10))));
    });
    console.log("players: ", players);

    state = state.merge({
        "players": players,
        "discard": deck.deal(1),
        "draw": deck.deal(999),
        "activePlayer" : Object.keys(sockets)[Math.floor(Math.random() * Object.keys(sockets).length)]
    });
    gameHasStarted = true;
}
function sortHands() {
    let players = state.get("players");
    players.keySeq().forEach(key => {
        players = players.set(key, players.get(key).set("primaryHand", List(deck.sort(players.get(key).get("primaryHand").toJS()))));
    });
    state = state.set("players", players);

}
function removePlayer(playerId) {
    abandonedPlayers.push(
        state.get("players").get(playerId)

    );
    state = state.merge({
        players : state.get("players").remove(playerId)
    });
}

function addNewPlayer(playerId) {
    var playerState = Map();
    if(abandonedPlayers.length) {
        playerState = abandonedPlayers.pop();
    }
    state = state.merge({
        players : state.get("players").set(playerId, playerState)
    });
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

