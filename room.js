function Room(name) {
	this.name = name;
	this.players = [];
	this.tables = [];
	this.tableLimit = 4;
};

Room.prototype.getPlayer = function(playerId) {
	var player = null;
	for(var i = 0; i < this.players.length; i++) {
		if(this.players[i].id == playerId) {
			player = this.players[i];
			break;
		}
	}
	return player;
};

Room.prototype.addPlayer = function(player) {
	this.players.push(player);
};

Room.prototype.removePlayer = function(player) {
	var playerIndex = -1;
	for(var i = 0; i < this.players.length; i++){
		if(this.players[i].id == player.id){
			playerIndex = i;
			break;
		}
	}
	this.players.remove(playerIndex);
};

Room.prototype.exists = function(key) {
	var found = false;
	for(var i = 0; i < this.tables.length; i++) {
		if(this.tables[i].key == key){
			found = true;
			break;
		}
	}
	// There exists a table with the same key! Try another one!
	return found;
};

Room.prototype.generateKey = function() {
	var key = this.randomKey();

	while (this.exists(key)) {
		key = this.randomKey();
	}

	return key;
}

Room.prototype.randomKey = function() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 4).toUpperCase();
};

Room.prototype.addTable = function(table) {
	this.tables.push(table);
};

Room.prototype.removeTable = function(table) {
	var tableIndex = -1;
	for(var i = 0; i < this.tables.length; i++){
		if(this.tables[i].id == table.id){
			tableIndex = i;
			break;
		}
	}
	this.tables.remove(tableIndex);
};

Room.prototype.getTableById = function(tableId) {
	var table = null;
	for(var i = 0; i < this.tables.length; i++){
		if(this.tables[i].id == tableId){
			table = this.tables[i];
			break;
		}
	}
	return table;
};

Room.prototype.getTableByKey = function(key) {
	var table = null;
	for(var i = 0; i < this.tables.length; i++){
		if(this.tables[i].key == key){
			table = this.tables[i];
			break;
		}
	}
	return table;
};

module.exports = Room;
