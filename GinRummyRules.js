export default class GinRummyRules {
    constructor(){
        // this.cards = this.initDeck();
    }
    isDrawAllowed(state, playerId) {
        if(state.get("activePlayer") !== playerId) {
            console.log("Not your turn ", playerId, " it is ", state.get("activePlayer"), "'s turn")
        }
        if(state.get("players").get(playerId).get("primaryHand").size !== 10) {
            console.log("Can't do that, your hand length is: ", state.get("players").get(playerId).get("primaryHand").size)
        }
        return state.get("activePlayer") === playerId
            && state.get("players").get(playerId).get("primaryHand").size === 10;
    }
    isDiscardAllowed(state, playerId) {
        return state.get("activePlayer") === playerId
            && state.get("players").get(playerId).get("primaryHand").size === 11;
    }
    handHasGin(hand) {
        //collect array of straights and kinds over 3
        //see if combo of any without overlapping cards add to 10
        function getStraights(hand) {
            var straights = [];
            //iterate sorted hand
            //if suits in row > 3 add to array
            return straights;
        }
        function getKinds(hand) {
            var kinds = [];
            //iterate kind sorted hand
            //if over 3 add to array
            return kinds;
        }
        //look at every combo that adds up to 10
        // && !firstArray.some(v => secondArray.includes(v)) //they don't share

    }
}