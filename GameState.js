import {Map, List} from 'immutable';


/*
 this class contains the state of the game, both what should be exposed to the client and what should stay on the server
 it should not contain:
 specific game rules / logic
 communication with the client (sockets, etc)
 */
export default class GameState {
    constructor(){
        //State should contain data that will be exposed to the player
        //other data is kept outside of state
        this.state = Map({
            players : Map(),
            numberOfPlayersNeededToStart : 2,
            maxNumberOfPlayers : 2,
            discard : [],  //todo: refactor these to be board hands.
            draw : [],
            activePlayer : null
        });
        this.boardHands = {
            discard : true,
            draw : true
        }
        this.abandonedPlayers = [];
        this.sockets = {}; //should not be in this class
        this.gameHasStarted = false;
    }
    getSockets() {
        return this.sockets;
    }
    addSocket(socket){
        this.sockets[socket.id] = socket;
    }
    addPlayer(socket){
        if(state.get("players").keySeq().toArray().length < state.get("maxNumberOfPlayers")) {
            mergeState(addNewPlayer(socket.id));
            return true;
        }
        else return false;
    }
    getActivePlayer(){
        return state.get("activePlayer");
    }
    setActivePlayer(socket) {
        setState("activePlayer", socket.id); //this is foobar if we have multiple players going and coming
        //we need a better system for tracking players, login, session, etc
    }
    setState(key, value) {
        state = state.set(key, value);
    }
    mergeState(value) {
        state = state.merge(value);
    }
    getNextPlayer() {
        let nextPlayerIndex = Object.keys(sockets).indexOf(socket.id) !== Object.keys(sockets).length - 1 ? Object.keys(sockets).indexOf(socket.id) + 1 : 0;
        return Object.keys(sockets)[nextPlayerIndex];
    }
    endCurrentActivePlayersTurn() {
        this.setActivePlayer(this.getNextPlayer());
    }
    removePlayer(playerId) {
        this.abandonedPlayers.push(
            state.get("players").get(playerId)
        );
        let activePlayer = state.get("activePlayer");
        if(activePlayer === playerId) {
            activePlayer = null;
            //**** If we want to pass the active player to the next player***
            // console.log('Active player has left...')
            // var activePlayerIndex = state.get("players").keySeq().indexOf(playerId) + 1;
            // if(activePlayerIndex >= state.get("players").keySeq().length) {
            //     activePlayerIndex = 0;
            // }
            // console.log('Active player info ', activePlayerIndex, state.get("players").keySeq());
            // activePlayer = state.get("players").keySeq().toArray()[activePlayerIndex];
            // console.log('Active player is now: ', activePlayer);

        }
        this.mergeState({
            players : this.state.get("players").remove(playerId),
            activePlayer : activePlayer
        });
    }
    addToEachPlayersPrimaryHand(cardGetter) { //these adders currently overwrite
        let players = this.state.get("players");
        players.keySeq().forEach(key => {
            players = players.set(key, players.get(key).set("primaryHand", List(cardGetter())));
        });
        state = state.set("players", players);
    }
    applyToEachPlayersHand(modifier) { //hands are just arrays for the sake of modifiers
        let players = this.state.get("players");
        players.keySeq().forEach(key => {
            players = players.set(key, players.get(key).set("primaryHand", List(modifier(players.get(key).get("primaryHand").toJS()))));
        });
        setState("players", players);
    }
    addToDiscard(cardGetter) { //these adders currently overwrite
        setState("discard", cardGetter())
    }
    addToDraw(cardGetter) { //these adders currently overwrite
        setState("draw", cardGetter())
    }
    randomizeActivePlayer() {
        setState('activePlayer', Object.keys(sockets)[Math.floor(Math.random() * Object.keys(sockets).length)])
    }
    startGame() {
        setState('gameStarted', true);
    }
    getGameHasStarted() {
        return this.state.get("gameHasStarted");
    }
    getNumberOfPlayers() {
        return getMapLength(state.get("players"));
    }
    getMapLength(map) {
        return map.keySeq().toArray().length;
    }
    getNumberOfPlayersNeededToStart() {
        this.state.get("numberOfPlayersNeededToStart")
    }
    moveCardBetweenHands(fromHand, toHand, card) {  // needs to be more dynamic
        //todo: make everything a player: draw, discard, etc.
        let players =  state.get("players");
        let primaryHand = players.get(fromHand).get("primaryHand");
        let toHandResult = null;
        let fromHandResult = null;
        if(this.boardHands[toHand]) {
            toHandResult = this.state.get(toHand).push(card);
        } else {
            players = players.set(toHand, players.get(toHand).set("primaryHand",
                primaryHand.push(card)));
        }
        if (boardHands[fromHand]) {
            fromHandResult = this.state.get(fromHand).pop();
        } else {
            players = players.set(fromHand, players.get(fromHand).set("primaryHand",
                primaryHand.splice(primaryHand.indexOf(card), 1)))
        }
        setState("players", players);
        if(toHandResult) {
            setState(toHand, toHandResult);
        }
        if(fromHand) {
            setState(fromHand, fromHandResult);
        }

    }
    getLastCard(pile) {
        return state.get(pile).last();
    }
    getCensoredStateForPlayer(playerId) {
        let players = state.get("players");
        let opponent = 0;
        players.keySeq().forEach(key => {
            if(key === playerId) {
                const playerState = players.get(key);
                players = players.set("playerState", playerState)
                    .remove(key);
            } else {
                const opponentState = players.get(key);
                players = players.set("opponentState" + opponent++, opponentState)
                    .remove(key); //todo: guarantee that this is the same order all the time
            }
        });
        return state.set("players", players);
    }
}