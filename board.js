function Board(boardID) {
	this.id = boardID;
	this.tableID = "";
	this.discardPile = [];
	this.status = "";
};

Board.prototype.setTableID = function(tableID) {
	this.tableID = tableID;
};

Board.prototype.getTableID = function() {
	return this.tableID;
};

Board.prototype.setDiscardPile = function(discardPile) {
	this.discardPile = discardPile;
};

Board.prototype.getDiscardPile = function() {
	return this.discardPile;
};

Board.prototype.setStatus = function(status){
	this.status = status;
};

Board.prototype.isAvailable = function(){
	return this.status === "available";
};

module.exports = Board;
