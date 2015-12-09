var socket = require('socket.io');
var Game = require('./game.js');
var Player = require("./player.js");
var Board = require("./board.js");
var Messaging = require('./messaging.js');
var Table = require('./table.js');
var Room = require('./room.js');
var Utils = require('./utils.js');
utils = new Utils();

//setup an Express server to serve the content
var http = require("http");
var express = require("express");
var app = express();

app.use("/", express.static(__dirname + "/"));
app.use("/resources", express.static(__dirname + "/resources"));
var server = http.createServer(app);
server.listen(8080);
var io = socket.listen(server);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
//io.set("log level", 1);

//creating the messaging object & testroom with sample table
var messaging = new Messaging();
var room = new Room("Test Room");
//room.tables = messaging.createSampleTables(1);

//starting the socket and awaiting connections
io.sockets.on('connection', function (socket) {

  /*
  When a player connects to the server,  we immediately create the player object.
    - the Player's name comes from frontend.
    - the player ID is the socket.ID
    - every player by default will be added to a room ("lounge")
  Message is shown in the logging board
  */
  socket.on('connectToServer',function(data) {
    var player = new Player(socket.id);
    if (data.name) player.setName(data.name);
    player.setAvatar(data.avatar);
    room.addPlayer(player); //add to room -- all players go to a room first
    io.sockets.emit("logging", {message: data.name + " has connected."});
    console.log(data.name + " has connected.");
  });

  socket.on('createTable', function(data) {

    var game = new Game();
    var table = new Table(socket.id);
    table.name = data.name;
    table.key = room.generateKey();
    table.playerLimit = 2;//data.playerLimit;
    table.gameObj = game;
    if (table.name == "chezmoi") {
      table.pack = game._getPack("first");
    } else {
      table.pack = game.pack;//adds the shuffled pack from the constructor
    }
    table.setStatus("available");

    // Connect a board with its socket.id
    var board = new Board(socket.id);
    board.setTableID(table.tableID);
    board.setStatus("connected");
    table.assignBoard(board);

    room.addTable(table);
    socket.emit("key", {key:table.key});
    socket.emit("logging", {message: "Waiting for " + table.playerLimit + " players to join. <strong>" + table.key + "</strong>"});
    console.log("Table " + Table.name + " has been successfully created with " + table.key + " as key!");
  });

  socket.on('pause',function(data) {
    console.log("pause");
    var player = room.getPlayer(socket.id);
    io.sockets.emit("pause", {player:player});

});

socket.on('reprise',function(data) {
    console.log("reprise");
    var player = room.getPlayer(socket.id);
    io.sockets.emit("reprise", {player:player});

});

  /*
  When someone connects to a table we need to do a few things:
  These include:
    - check if there's space at the table where they want to connect
    - assign the player to a table (if available)
    - change the player's status from 'available' to 'in table'
    - save the player's name, and ID (socket client ID) in the appropriate arrays at the table.
  If a table has 2 players, we need to do more:
    - set the table's status from 'available' to 'unavailable'
    - create a pack (instantiate the game object)
    - send a time counter of 3 seconds to both connected clients
    - after the 3 second delay, emit a 'PLAY' message
  */
  socket.on('connectToTable',function(data) {
    var table = room.getTableByKey(data.key);

    if (table == null) {
      socket.emit("logging", {message: "There exists no table with this key!" });
      return;
    }

    if (!table.isAvailable()) {
      socket.emit("logging", {message: "Too late, the table is full!"});
      return;
    }

    var player = room.getPlayer(socket.id);

    if (table.addPlayer(player)) {
      player.tableID = table.id;
      player.status = "intable";

      io.sockets.emit("logging", {message: player.name + " has connected to table: " + table.name + "."});
      messaging.sendEventToABoard("playerConnected", {name: player.name, id: player.id, avatar: player.avatar }, io, table.board);
      if (table.players.length < table.playerLimit) {
        messaging.sendEventToAllPlayers("logging", {message: "There are " + table.players.length + " players at this table. The table requires " + table.playerLimit + " players to join." }, io, table.players);
        //io.sockets.emit("waiting", {message: "Waiting for "+ table.getRemainingSpots() +" other player(s) to join."});
      } else {
        messaging.sendEventToAllPlayers("logging", {message: "There are " + table.players.length + " players at this table. Play will commence shortly."}, io, table.players);
        //emit counter
        //var countdown = 5; //3 seconds in reality...
        //setInterval(function() {
          //countdown--;
          //messaging.sendEventToAllPlayers('timer', { countdown: countdown }, io, table.players);
          messaging.sendEventToAllPlayers('areYouReady', {}, io, table.players);
        //io.sockets.emit('timer', { countdown: countdown });
        //}, 1000);
      }
    } else {
      console.log("for whatever reason player can't be added to table."); //needs looking at
    }
  });

  /*
  Once the counter has finished both clients will emit a "readyToPlay" message
  Upon the receival of this message, we check against a local variable (never trust data from the client) and
  we setup the play environment:
    - change the table's state to "unavailable"
    - change the player's status to "playing"
    - assign 5 cards to each player
    - flip the first card
      - we are going to check if this card is an action card
      - if it is, we will call the appropriate action
    - otherwise we are going to assign the start priviledge to a random player at the table
  */
  socket.on("readyToPlay", function(data) {
    console.log("Ready to play called");
    console.log(socket.id);
    var player = room.getPlayer(socket.id);
    var table = room.getTableById(player.tableID);
    player.status = "playing";
    table.readyToPlayCounter++;

    var randomNumber = Math.floor(Math.random() * table.playerLimit);
    if (table.name == "chezmoi") {
      randomNumber = 0;
    }
    if (table.readyToPlayCounter == table.playerLimit) {
      table.status = "unavailable"; //set the table status to unavailable
      var firstCardOnTable = table.cardsOnTable = table.gameObj.playFirstCardToTable(table.pack); //assign first card on table
      console.log(firstCardOnTable);
      console.log(firstCardOnTable[0]);
      for (var i = 0; i < table.players.length; i++) { //go through the players array (contains all players sitting at a table)
        var cards = table.players[i].hand = table.gameObj.drawCard(table.pack, 5, "", 1); //assign initial 5 cards to players
        messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: table.players[i], nbCards: table.players[i].hand.length}, io, table.board);// update all players cards (count) on table
        var startingPlayerID = table.players[randomNumber].id; //get the ID of the randomly selected player who will start
        if (table.players[i].id === startingPlayerID) { //this player will start the turn
          table.players[i].turnFinished = false;
          console.log(table.players[i].name + " starts the game.");
          io.sockets.connected[table.players[i].id].emit("play", { hand: cards }); //send the cards in hands to player
          io.sockets.connected[table.players[i].id].emit("turn", { myturn: true }); //send the turn-signal to player
          io.sockets.connected[table.players[i].id].emit("ready", { ready: true }); //send the 'ready' signal
          if (table.gameObj.isActionCard(firstCardOnTable)) { //Is the first card on the table an action card?
            table.actionCard = true; //we are setting the action card flag to true -- this is required as the preliminary check is going to use this
          }
          io.sockets.connected[table.players[i].id].emit("cardInHandCount", {cardsInHand: table.players[i].hand.length});
        } else {
          table.players[i].turnFinished = true;
          console.log(table.players[i].name + " will not start the game.");
          io.sockets.connected[table.players[i].id].emit("play", { hand: cards }); //send the card in hands to player
          io.sockets.connected[table.players[i].id].emit("turn", { myturn: false }); //send the turn-signal to player
          messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: table.players[i].id}, io, table.board);
          io.sockets.connected[table.players[i].id].emit("ready", { ready: true }); //send the 'ready' signal
          io.sockets.connected[table.players[i].id].emit("cardInHandCount", {cardsInHand: table.players[i].hand.length});
        }
      }
      //sends the cards to the table.
      //messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: table.cardsOnTable}, io, table.players);
      messaging.sendEventToABoard('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: table.cardsOnTable, table: true}, io, table.board);
      messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: table.cardsOnTable, table: false}, io, table.players);

      messaging.sendEventToABoard('updatePackCount', { packCount: table.pack.length , table: true}, io, table.board);
      messaging.sendEventToAllPlayers("updatePackCount", { packCount: table.pack.length, table: false}, io, table.players);
    }
  });

/*
Before the players have a chance to play in their respective turns
i.e. draw or play a card, we are going to do preliminary checks
These checks will determine whether there are (active) requests  or
(active) penalising cards on the table
*/
socket.on("preliminaryRoundCheck", function(data) {
  console.log("preliminary round check called.");
  var player = room.getPlayer(socket.id);
  var table = room.getTableById(player.tableID);
  var last = table.gameObj.lastCardOnTable(table.cardsOnTable); //last card on Table
  console.log('Last card on table ==>' + last);
  console.log('table.gameObj.isActionCard(last) ==>' + table.gameObj.isActionCard(last));
  console.log('table.actionCard) ==>' + table.actionCard);

    if (table.gameObj.isActionCard(last) && table.actionCard) { //Is the card on the table an action card?
      if (table.gameObj.isActionCard(last, true)) { //Is the first card on the table a penalising card? (2*) (checked by the true flag)
        table.forcedDraw += 2; //add 2 cards to the forcedDraw function
        table.penalisingActionCard = true;
        console.log("FORCED DRAW ==>" + table.forcedDraw);
        console.log("it's a penalising card");
        if (table.gameObj.isInHand(last, player.hand)) { //Does the starting player have a response in hand?
          console.log("I have a 2, optionally i can play it"); //GIVE OPTIONS
          socket.emit("playOption", { message: "You have a 2 card in your hand, you can either play it or take " + table.forcedDraw + " cards.", value: true, nbPenality: table.forcedDraw}); //OPTION - TRUE
        } else {
          console.log("no 2 in hand, force me to draw"); //No penalising action card in hand, force draw
          console.log("HAND ==> " + player.hand);
          socket.emit("playOption", { value: false }); //OPTION - TRUE
          var cards = table.gameObj.drawCard(table.pack, table.forcedDraw, player.hand, 0);
          messaging.sendEventToAPlayer("play", {hand: cards}, io, table.players, player); //send the card in hands to player
          //socket.emit("play", { hand: cards }); //send the card in hands to player

          messaging.sendEventToABoard('updatePackCount', { packCount: table.pack.length , table: true}, io, table.board);
          messaging.sendEventToAllPlayers("updatePackCount", { packCount: table.pack.length, table: false}, io, table.players);
          table.forcedDraw = 0; //reset forced Draw variable
          table.actionCard = false; //set the action card to false
          table.penalisingActionCard = false; //reset the penalising action card variable

          /*PROGRESS ROUND*/
          console.log("==========================> PrelRound1");
          console.log("==========================> PR7");
          table.progressRound(player); //end of turn
          socket.emit("turn", {myturn: false}); //????
          messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
          messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
          messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);

        }
      } else { //Is the first card on the table a request card (1*, 13*)
        console.log("it is a request card, player to make a request"); //SHOW REQUEST WINDOW
        var option = "number";
        if(parseInt(last) === 1 || parseInt(last) === 13) {
          console.log("parseInt(last) ===> "+parseInt(last) );
          option = "suite";
        }

          console.log("table.firstRound == "+table.firstRound);

        if (table.firstRound) {
          socket.emit("showRequestCardDialog", { option: option });
        }
        if (table.suiteRequest && table.requestActionCard) {//request has already been made
          console.log("asked for a suite ==> " + table.suiteRequest);
          messaging.sendEventToAllPlayersButPlayer("logging", {message: "Your opponent has asked for a suite ==>" + table.suiteRequest}, io, table.players, player);
          if (table.gameObj.isSuiteInHand(table.suiteRequest, player.hand)) {
            io.sockets.emit("logging", {message: "Your opponent has asked for a suite ==>" + table.suiteRequest});
            console.log("The requested suite is in your hand ==> " + table.suiteRequest);
          } else { //the suite is not in the hand
            if (table.gameObj.isInHand(last, player.hand)) { //give option for the player to play the same type of a request card
              socket.emit("playOption", { message: "You have a request action card in your hand you can optionally play it.", value: false}); //OPTION - TRUE
              console.log("You have an answer in your hand");
            } else { //no requested suite nor contra-action card in hand, force draw
              console.log("Forced draw");
              var cards = table.gameObj.drawCard(table.pack, 1, player.hand, 0);
              messaging.sendEventToAPlayer("play", {hand: cards}, io, table.players, player); //send the card in hands to player
              //socket.emit("play", { hand: cards }); //send the card in hands to player
              //table.gameObj.drawCard(table.pack, 1, player.hand, 0);
              //socket.emit("play", { hand: player.hand }); //send the card in hands to player
              messaging.sendEventToABoard('updatePackCount', { packCount: table.pack.length , table: true}, io, table.board);
              messaging.sendEventToAllPlayers("updatePackCount", { packCount: table.pack.length, table: false}, io, table.players);
              table.requestActionCard = null; //reset request
              table.actionCard = false; //set the action card to false

              //PROGRESS ROUND
              console.log("==========================> PrelRound2");
              console.log("==========================> PR8");
              table.progressRound(player); //end of turn
              socket.emit("turn", {myturn: false}); //????
              messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
              messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
              messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);

            }
          }
        }
        else{ // suite request have not been done yet

                //BLOCK ROUND
                console.log("==========================> BLOCK ROUND PrelRound2");
                table.progressRound(); //end of turn
                //notify frontend
                //messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
                messaging.sendEventToAllPlayers("turn", {myturn: false}, io, table.players, player);
                //messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
                messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);

        }
      }

      /*PROGRESS ROUND*/
      /*table.progressRound(player); //end of turn
      socket.emit("turn", {myturn: false}); //????
      messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
      messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);*/
    } else { //The first card on the table is not an action card at all
      console.log(last + " is not an action card or we don't care about it anymore");
    }

    // Every one (players and table) have to update cards they show : player show it own card, and table show every player cards (count)
    messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: player, nbCards: player.hand.length}, io, table.board);// update player cards (count) on table
    //for(var i=0; i<table.players.length; i++){
    //  messaging.sendEventToAllPlayers('play', {hand: table.players[i].hand}, io, table.players, table.players[i]);// update player's cards (count) on hand
    //}

  //console.log("Table ==> " + JSON.stringify(table));
  table.firstRound  =false;
});

  /*
  A player can decide to the penalty as a result of a penalising card (2*), if he does
  then we need to reset the right variables and also end this player's turn.
  */
  socket.on("penalisingTaken", function(data) {
    var player = room.getPlayer(socket.id);
    var table = room.getTableById(player.tableID);
    if (table.actionCard) {
      var cards = table.gameObj.drawCard(table.pack, table.forcedDraw, player.hand, 0);
      messaging.sendEventToAPlayer("play", {hand: cards}, io, table.players, player); //send the card in hands to player
      //socket.emit("play", { hand: cards }); //send the card in hands to player
      messaging.sendEventToABoard('updatePackCount', { packCount: table.pack.length , table: true}, io, table.board);
      messaging.sendEventToAllPlayers("updatePackCount", { packCount: table.pack.length, table: false}, io, table.players);
      table.forcedDraw = 0; //reset forced Draw variable
      table.actionCard = false; //set the action card to false
      table.penalisingActionCard = false; //set the penalising action card to false;
      /*PROGRESS ROUND*/
      console.log("==========================> PR1");
      table.progressRound(player); //end of turn
      socket.emit("turn", {myturn: false}); //????
      messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
      messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
      messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);
      messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: player, nbCards: player.hand.length}, io, table.board);// update player cards (count) on table
    }
  });

  socket.on("disconnect", function() {
    var player = room.getPlayer(socket.id);
    if (player && player.status === "intable") { //make sure that player either exists or if player was in table (we don't want to remove players)
      //Remove from table
      var table = room.getTableById(player.tableID);
      table.removePlayer(player);
      table.status = "available";
      player.status = "available";
      io.sockets.emit("logging", {message: player.name + " has left the table."});
      messaging.sendEventToABoard("playerDisconnected", {name: player.name, id: player.id, }, io, table.board);
    }
  });

  socket.on("drawCard", function(data) {

    /*var player = room.getPlayer(socket.id);
    var table = room.getTableById(player.tableID);*/

    var player;
    var table;

    if(data.playerId){ // si data contient un champs playerId, alors "drawCard" est emis par la table avec une demande de carte pour le joueur identifié par son Id
      console.log("drawcard: "+data.playerId);
      table = room.getTableById(socket.id);
      for(var i=0; i<table.players.length; i++){
        if(table.players[i].id == data.playerId) player = table.players[i];
      }
    }else{ // sinon, "drawCard" est emis par un joueur directement sur sa tablette et donc on l'identifie par la socket Id
      console.log("drawcard: no playerId in data");
      player = room.getPlayer(socket.id);
      if(player)table = room.getTableById(player.tableID);
    }

    if(player){ // si c'est bien un player qui envoie la demande, alors on lui donne une carte sinon, c'est une table !!!
      if (!player.turnFinished) {
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>"+table.suiteRequest);
        if(!table.suiteRequest){ // pas de suite request sur la table
          if (!table.actionCard) { //action card start (listener), if there's an action card, we disable drawing
            var card = table.gameObj.drawCard(table.pack, 1, player.hand, 0);
            if (table.pack.length < 1) { //when we drew the last card
              var newPack = table.cardsOnTable; //remember the last card
              if (table.pack.length != 1) {
                newPack.pop(); //create new pack
              }
              var last = table.gameObj.lastCardOnTable(newPack); //last card on Table
              table.pack = table.gameObj._shufflePack(table.cardsOnTable); //shuffle the new pack
              table.cardsOnTable = last; //add the last card back on the table
            }
            messaging.sendEventToAPlayer("play", {hand: card}, io, table.players, player); //send the card in hands to player
            //socket.emit("play", {hand: card});
            messaging.sendEventToAPlayer("logging", {message: "You took " + card + " from the pack."}, io, table.players, player);

            messaging.sendEventToABoard('updatePackCount', { packCount: table.pack.length , table: true}, io, table.board);
            messaging.sendEventToAllPlayers("updatePackCount", { packCount: table.pack.length, table: false}, io, table.players);

            //PROGRESS ROUND
            console.log("==========================> PR2");
            table.progressRound(player); //end of turn
            messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
            messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
            messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
            messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);
            messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: player, nbCards: player.hand.length}, io, table.board);// update player cards (count) on table

          }//end of actioncard
        }
        else{ // il y a une suite request (je peut decider de draw une carte quand même)
          var card = table.gameObj.drawCard(table.pack, 1, player.hand, 0);
          if (table.pack.length < 1) { //when we drew the last card
            var newPack = table.cardsOnTable; //remember the last card
            if (table.pack.length != 1) {
              newPack.pop(); //create new pack
            }
            var last = table.gameObj.lastCardOnTable(newPack); //last card on Table
            table.pack = table.gameObj._shufflePack(table.cardsOnTable); //shuffle the new pack
            table.cardsOnTable = last; //add the last card back on the table
          }
          messaging.sendEventToAPlayer("play", {hand: card}, io, table.players, player); //send the card in hands to player
          //socket.emit("play", {hand: card});
          messaging.sendEventToAPlayer("logging", {message: "You took " + card + " from the pack."}, io, table.players, player);

          messaging.sendEventToABoard('updatePackCount', { packCount: table.pack.length , table: true}, io, table.board);
          messaging.sendEventToAllPlayers("updatePackCount", { packCount: table.pack.length, table: false}, io, table.players);

          //PROGRESS ROUND
          console.log("==========================> PR10");
          table.progressRound(player); //end of turn
          messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
          messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
          messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
          messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);
          messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: player, nbCards: player.hand.length}, io, table.board);// update player cards (count) on table

        }

      } else { // player.turnFinished
        messaging.sendEventToAPlayer("logging", {message: "It's your opponent's turn."}, io, table.players, player);
      }

    }

  });

  socket.on("playCard", function(data) {
      /*
      server needs to check:
      - if it's the player's turn
      - if the played card is in the owner's hand
      - if the played card is valid to play
      */
      var errorFlag = false;
      var player = room.getPlayer(socket.id);

      if( player == null  ){ console.log( "Error on socket playCard : player is null (it can't be found) !"); return;}

      var table = room.getTableById(player.tableID);
      var last = table.gameObj.lastCardOnTable(table.cardsOnTable); //last card on Table

      if (!player.turnFinished) {
        var playedCard = data.playedCard;
        var playedCardIndex = data.index;
        var index = utils.indexOf(player.hand, data.playedCard);// L'indice dans la main
        if (index > -1) {
          errorFlag = false;
          playedCard = data.playedCard; //overwrite playedCard
        } else {
          errorFlag = true;
          playedCard = null;
          messaging.sendEventToAPlayer("logging", {message: "The card is not in your hand."}, io, table.players, player);
          socket.emit("play", {});
        }

        console.log("actionCard ==> "+table.actionCard);
        console.log("penalisingActionCard ==> "+table.penalisingActionCard);
        console.log("isPenalisingActionCardPlayable ==> "+table.gameObj.isPenalisingActionCardPlayable(playedCard, last));
        console.log("suiteRequest ==> "+table.suiteRequest);
        if (!errorFlag) {
          if (table.actionCard) { //if the action card varialbe is already set ...
            if (table.penalisingActionCard) {// penalisingActionCard is true
              if (!table.gameObj.isPenalisingActionCardPlayable(playedCard, last)) {
                //messaging.sendEventToAPlayer("logging", {message: "The selected card cannot be played - please read the rules."}, io, table.players, player);

                if(table.suiteRequest){
                  if (!table.gameObj.isCardPlayable(playedCard, last, table)) {
                    console.log("Error1 : can't play that card : "+playedCard);
                    messaging.sendEventToAPlayer("badCard", {}, io, table.players, player);
                  }else{

                    // send message to all players and table to end the suite request
                    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>END SUITE REQUEST 1");
                    messaging.sendEventToAllPlayers("hideRequestedSuite", {}, io, table.players);
                    messaging.sendEventToABoard('hideRequestedSuite', {}, io, table.board);

                    var option = false;
                    if (parseInt(playedCard) === 2) { //if player plays a 2 we add the right flags
                      console.log("if player plays a 2 we append the forced card limit");
                      table.actionCard = true;
                      table.penalisingActionCard = true;
                    }
                    if (parseInt(playedCard) === 1 || parseInt(playedCard) === 13) {
                      console.log("if player plays an ACE or Kings we activate the suite option");
                      option = "suite"
                      table.actionCard = true;
                      table.requestActionCard = true;
                      //messaging.sendEventToAPlayer("logging", {message: player.name+" played an Ace"}, io, table.players, player);
                      messaging.sendEventToAPlayer("showRequestCardDialog", {option: option}, io, table.players, player);
                    }

                    /*if (parseInt(playedCard) === 13) {
                      table.actionCard = true;
                      table.requestActionCard = true;
                    } */
                    table.gameObj.playCard(index, player.hand, table.cardsOnTable);
                    //messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard}, io, table.players);
                    messaging.sendEventToABoard('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard, table: true}, io, table.board);
                    messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard, table: false}, io, table.players);
                    messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: player, nbCards: player.hand.length}, io, table.board);// update player cards (count) on table
                    io.sockets.emit("logging", {message: player.name + " plays a card: " + playedCard});

                    if(!option){ // si pas d'option activée, on peu passer le tour
                      //PROGRESS ROUND
                      console.log("==========================> PR9");
                      table.progressRound(player); //end of turn
                      //notify frontend
                      messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
                      messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
                      messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
                      messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);

                    }else{ // si pas option activée(suite request), alors bloquer le jeu en attendant la request

                      //BLOCK ROUND
                      console.log("==========================> BLOCK ROUND 2");
                      table.progressRound(); //end of turn
                      //notify frontend
                      //messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
                      messaging.sendEventToAllPlayers("turn", {myturn: false}, io, table.players, player);
                      //messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
                      messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);

                    }
                    if (!winner) {
                      socket.emit("cardAccepted", {playedCard: playedCard, index: playedCardIndex});
                    } else {
                    //game is finished
                    socket.emit("cardAccepted", {playedCard: playedCard, index: playedCardIndex});
                    messaging.sendEventToAPlayer("turn", {won: "yes"}, io, table.players, player);
                    messaging.sendEventToAllPlayersButPlayer("turn", {won: "no"}, io, table.players, player);
                    messaging.sendEventToABoard("winner", {id: player.id}, io, table.board);
                    socket.emit("gameover", {gameover: true});
                    io.sockets.emit("logging", {message: player.name + " is the WINNER!"});
                    }
                  }
                }else{
                  console.log("Error : unknown case !");
                  messaging.sendEventToAPlayer("badCard", {}, io, table.players, player);
                }


              } else {
                  console.log("Penalising action card is playable");
                  if (parseInt(playedCard) === 2) { //if there's a penalising action card, the player can only play another penalising action card.
                    console.log("if player plays a 2 we append the forced card limit");
                    //we are going to hide the option
                    socket.emit("playOption", { value: false }); //OPTION - FALSE
                    table.actionCard = true;
                    table.penalisingActionCard = true;
                  }
                table.gameObj.playCard(index, player.hand, table.cardsOnTable);
                //messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard}, io, table.players);
                messaging.sendEventToABoard('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard, table: true}, io, table.board);
                messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard, table: false}, io, table.players);
                messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: player, nbCards: player.hand.length}, io, table.board);// update player cards (count) on table
                io.sockets.emit("logging", {message: player.name + " plays a card: " + playedCard});

                //PROGRESS ROUND
                console.log("==========================> PR3");
                table.progressRound(player); //end of turn
                //notify frontend
                messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
                messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
                messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
                messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);
                var winner = table.gameObj.isWinning(player.hand);
                if (!winner) {
                  socket.emit("cardAccepted", {playedCard: playedCard, index: playedCardIndex});
                } else {
                //game is finished
                socket.emit("cardAccepted", {playedCard: playedCard, index: playedCardIndex});
                messaging.sendEventToAPlayer("turn", {won: "yes"}, io, table.players, player);
                messaging.sendEventToAllPlayersButPlayer("turn", {won: "no"}, io, table.players, player);
                socket.emit("gameover", {gameover: true});
                io.sockets.emit("logging", {message: player.name + " is the WINNER!"});
                }
              }
            } //end of penalising action card
            else{// action variable set true but penalisingActionCard is false => requestCardSuite situation !$
                console.log("action variable set true but penalisingActionCard is false => requestCardSuite situation !");
                if (!table.gameObj.isCardPlayable(playedCard, last, table)) {
                  console.log("Error2 : can't play that card : "+playedCard);
                  messaging.sendEventToAPlayer("logging", {message: "The selected card cannot be played - please read the rules."}, io, table.players, player);
                  messaging.sendEventToAPlayer("badCard", {}, io, table.players, player);
                } else {

                  // send message to all players and table to end the suite request
                  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>END SUITE REQUEST 2");
                  messaging.sendEventToAllPlayers("hideRequestedSuite", {}, io, table.players);
                  messaging.sendEventToABoard('hideRequestedSuite', {}, io, table.board);

                  var option = false;
                  if (parseInt(playedCard) === 2) { //if player plays a 2 we add the right flags
                    console.log("if player plays a 2 we append the forced card limit");
                    table.actionCard = true;
                    table.penalisingActionCard = true;
                  }
                  if (parseInt(playedCard) === 1 || parseInt(playedCard) === 13) {
                    var option = "suite";
                    table.actionCard = true;
                    table.requestActionCard = true;
                    messaging.sendEventToAPlayer("logging", {message: player.name+" played an Ace"}, io, table.players, player);
                    messaging.sendEventToAPlayer("showRequestCardDialog", {option: option}, io, table.players, player);
                  }
                  table.gameObj.playCard(index, player.hand, table.cardsOnTable);
                  //messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard}, io, table.players);
                  messaging.sendEventToABoard('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard, table: true}, io, table.board);
                  messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard, table: false}, io, table.players);
                  messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: player, nbCards: player.hand.length}, io, table.board);// update player cards (count) on table
                  io.sockets.emit("logging", {message: player.name + " plays a card: " + playedCard});

                  if(!option){
                    //PROGRESS ROUND
                    console.log("==========================> PR4");
                    table.progressRound(player); //end of turn
                    //notify frontend
                    messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
                    messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
                    messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
                    messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);
                  }

                  var winner = table.gameObj.isWinning(player.hand);
                  if (!winner) {
                    socket.emit("cardAccepted", {playedCard: playedCard, index: playedCardIndex});
                  } else {
                    //game is finished
                    socket.emit("cardAccepted", {playedCard: playedCard, index: playedCardIndex});
                    messaging.sendEventToAPlayer("turn", {won: "yes"}, io, table.players, player);
                    messaging.sendEventToAllPlayersButPlayer("turn", {won: "no"}, io, table.players, player);
                    socket.emit("gameover", {gameover: true});
                    io.sockets.emit("logging", {message: player.name + " is the WINNER!"});
                  }

              }
              if (table.gameObj.isActionCard(playedCard)) {
                socket.emit("playOption", { value: false }); //OPTION - FALSE
                table.actionCard = true;
                table.penalisingActionCard = true;
              }

            }
          }else { //no action card variable is set at the moment
            //var requestMade = false;
            if (!table.gameObj.isCardPlayable(playedCard, last, table)) {
              messaging.sendEventToAPlayer("logging", {message: "The selected card cannot be played - please read the rules."}, io, table.players, player);
              messaging.sendEventToAPlayer("badCard", {}, io, table.players, player);
            } else {

              // send message to all players and table to end the suite request
              console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>END SUITE REQUEST 3");
              messaging.sendEventToAllPlayers("hideRequestedSuite", {}, io, table.players);
              messaging.sendEventToABoard('hideRequestedSuite', {}, io, table.board);

              var option = false;
              if (parseInt(playedCard) === 2) { //if player plays a 2 we add the right flags
                console.log("if player plays a 2 we append the forced card limit");
                table.actionCard = true;
                table.penalisingActionCard = true;
              }
              if (parseInt(playedCard) === 1 || parseInt(playedCard) === 13) {
                console.log("if player plays an ACE or Kings we activate the suite option");
                option = "suite"
                table.actionCard = true;
                table.requestActionCard = true;
                messaging.sendEventToAPlayer("logging", {message: player.name+" played an Ace"}, io, table.players, player);
                messaging.sendEventToAPlayer("showRequestCardDialog", {option: option}, io, table.players, player);
              }

              /*if (parseInt(playedCard) === 13) {
                table.actionCard = true;
                table.requestActionCard = true;
              } */
              table.gameObj.playCard(index, player.hand, table.cardsOnTable);
              //messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard}, io, table.players);
              messaging.sendEventToABoard('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard, table: true}, io, table.board);
              messaging.sendEventToAllPlayers('updateCardsOnTable', {cardsOnTable: table.cardsOnTable, lastCardOnTable: playedCard, table: false}, io, table.players);
              messaging.sendEventToABoard('updatePlayerCardsOnTable', {player: player, nbCards: player.hand.length}, io, table.board);// update player cards (count) on table
              io.sockets.emit("logging", {message: player.name + " plays a card: " + playedCard});

              if(!option){ // si pas d'option activée, on peu passer le tour
                //PROGRESS ROUND
                console.log("==========================> PR5");
                table.progressRound(player); //end of turn
                //notify frontend
                messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
                messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
                messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
                messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);

              }else{ // si pas option activée(suite request), alors bloquer le jeu en attendant la request

                //BLOCK ROUND
                console.log("==========================> BLOCK ROUND 1");
                table.progressRound(); //end of turn
                //notify frontend
                //messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
                messaging.sendEventToAllPlayers("turn", {myturn: false}, io, table.players, player);
                //messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
                messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);

              }


              var winner = table.gameObj.isWinning(player.hand);
              if (!winner) {
                socket.emit("cardAccepted", {playedCard: playedCard, index: playedCardIndex});
              } else {
                //game is finished
                socket.emit("cardAccepted", {playedCard: playedCard, index: playedCardIndex});
                messaging.sendEventToAPlayer("turn", {won: "yes"}, io, table.players, player);
                messaging.sendEventToAllPlayersButPlayer("turn", {won: "no"}, io, table.players, player);
                socket.emit("gameover", {gameover: true});
                io.sockets.emit("logging", {message: player.name + " is the WINNER!"});
              }
            }
          }
        } else {
          io.sockets.emit("logging", {message: "Error flag is TRUE, something went wrong"});
        }
      } else { //end of turn
        messaging.sendEventToAPlayer("logging", {message: "It's your opponent's turn."}, io, table.players, player);
        messaging.sendEventToAPlayer("notYouTurn", {}, io, table.players, player)
      }
  });

  socket.on("suiteRequest", function(data) {
    console.log("================> in server.js 'suiteRequest'");
    if (data) {
      var player = room.getPlayer(socket.id);
      var table = room.getTableById(player.tableID);
      messaging.sendEventToAllPlayersButPlayer("logging", {message: "Request for Suite: " + data.request}, io, table.players, player);
      table.actionCard = true;
      table.requestActionCard = true;
      table.suiteRequest = data.request;

      // send message to all players and table about the suite request
      messaging.sendEventToAllPlayers("showRequestedSuite", {suite: data.request, table: false}, io, table.players);
      messaging.sendEventToABoard('showRequestedSuite', {suite: data.request, table: true}, io, table.board);


      //PROGRESS ROUND
      console.log("==========================> PR6");
      table.progressRound(player); //end of turn
      socket.emit("turn", {myturn: false}); //????
      messaging.sendEventToAPlayer("turn", {myturn: false}, io, table.players, player);
      messaging.sendEventToAllPlayersButPlayer("turn", {myturn: true}, io, table.players, player);
      messaging.sendEventToABoard('endPlayerTurnView', {allPlayers: table.players, playerIdEndTurn: player.id}, io, table.board);
      messaging.sendEventToAllPlayersButPlayer("cardInHandCount", {cardsInHand: player.hand.length}, io, table.players, player);
    }
  });



  /*socket.on("suiteRequest", function(data) {
    var player = room.getPlayer(socket.id);
    var table = room.getTableById(player.tableID);
    table.suiteRequest = data.request;
    console.log("request: " + data.request);
  });*/


});//end of socket.on
