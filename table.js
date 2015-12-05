Game = require('./game.js');

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

function Table(tableID) {
	this.id = tableID;
	this.name = "";
  this.key = "";
	this.status = "available";
	this.players = [];
  this.board = null;
	this.readyToPlayCounter = 0;
	this.playerLimit = 2;
	this.pack = [];
	this.cardsOnTable = [];

	this.actionCard = false;
	this.requestActionCard = false;
	this.penalisingActionCard = false;
	this.forcedDraw = 0;

	this.suiteRequest = "";
	this.numberRequest = "";

	this.gameObj = null;
};

Table.prototype.progressRound = function(player) {
  if(player){ // if a player is defined in parameters, then progress round on table
    for(var i = 0; i < this.players.length; i++) {
  	  this.players[i].turnFinished = false;
  	  if(this.players[i].id == player.id) { //when player is the same that plays, end their turn
		player.turnFinished = true;
	  }
    }
  }else{ // if not; we are in suite request case, we need to block the round until a suite request is made
  	for(var i = 0; i < this.players.length; i++) {
  	  this.players[i].turnFinished = false;
  	}
  }
}

Table.prototype.setName = function(name){
	this.name = name;
};

Table.prototype.getName = function(){
	return this.name;
};

Table.prototype.setKey = function(key){
	this.key = key;
};

Table.prototype.getKey = function(){
	return this.key;
};

Table.prototype.setStatus = function(status){
	this.status = status;
};

Table.prototype.isPrivate = function(){
	return this.key !== "";
};

Table.prototype.isAvailable = function(){
	return this.status === "available";
};

Table.prototype.isFull = function(){
	return this.status === "full";
};

Table.prototype.isPlaying = function(){
	return this.status === "playing";
};

Table.prototype.getRemainingSpots = function(){
	return this.playerLimit - this.players.length;
};

Table.prototype.addPlayer = function(player) {
	if (this.status === "available") {
		var found = false;
		for(var i = 0; i < this.players.length; i++) {
			if(this.players[i].id == player.id){
				found = true;
				break;
			}
		}
		if(!found){
			this.players.push(player);
			if(this.players.length == this.playerLimit){
				//this.status = "playing";
				for(var i = 0; i < this.players.length; i++){
					this.players[i].status = "intable";
				}
			}
			return true;
		}
	}
	return false;
};

Table.prototype.removePlayer = function(player){
	var index = -1;
	for(var  i = 0; i < this.players.length; i++){
		if(this.players[i].id === player.id){
			index = i;
			break;
		}
	}
	if(index != -1){
		this.players.remove(index);
	}
};

Table.prototype.assignBoard = function(board) {
	if (this.board === null) {
    this.board = board;
		return true;
	}
	return false;
};

Table.prototype.isAvailable = function() {
	if((this.playerLimit >= this.players.length) && (this.status === "available")) {
		return true;
	} else {
		return false;
	}
	//return (this.playerLimit > this.players.length);
};

Table.prototype.hasBoard = function() {
	return this.board !== null;
};

Table.prototype.createMessageObject = function() {
	var table = this;
	var TableMessage = function(){
		this.id = table.id;
		this.name = table.name;
		this.status = table.status;
		this.players = table.players;
		this.playerLimit = table.playerLimit;
    this.board = table.board;
	};

	return new TableMessage();
};

module.exports = Table;
