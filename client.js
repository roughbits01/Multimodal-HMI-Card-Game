var socket = io.connect("http://localhost:8080");

hand = [];

var myShakeEvent = new Shake({
    threshold: 15, // optional shake strength threshold
    timeout: 1000 // optional, determines the frequency of event generation
});

myShakeEvent.start();

window.addEventListener('shake', shakeEventDidOccur, false);

//function to call when shake occurs
function shakeEventDidOccur () {
  shuffle();
  //put your own code here etc.
  alert('shake!');
}

function shuffle() {
  cleanHand();
  /*hand.sort(function(a, b) {
    return parseInt(a) - parseInt(b);
  });*/
  var i = hand.length, j, tempi, tempj;
  if (i === 0) return;
  while (--i) {
     j = Math.floor(Math.random() * (i + 1));
     tempi = hand[i]; tempj = hand[j]; hand[i] = tempj; hand[j] = tempi;
   }
  $.each(hand, function(k, v) {
    carteHand("resources/" + v + ".png", v);
  });
}

var canVibrate = "vibrate" in navigator || "mozVibrate" in navigator;

//if (canVibrate && !("vibrate" in navigator))
//    navigator.vibrate = navigator.mozVibrate;

//var socket = io.connect("http://ec2-54-229-63-210.eu-west-1.compute.amazonaws.com:8080");
socket.on("logging", function(data) {
  $("#updates").append("<li>"+ data.message + "</li>");
  var log = document.getElementById('footer');
  log.scrollTop = log.scrollHeight;
});

socket.on("timer", function (data) {
  $('#counter').html("<span class='label label-info'>" + data.countdown + "</span>");
  if (data.countdown === 0) {
    socket.emit("readyToPlay", {});
    $("#counter").hide();
  }
});

socket.on("areYouReady", function (data) {
  socket.emit("readyToPlay", {});
});

socket.on("playOption", function(data){
  $("#playOption").html(data.message);
  if (data.value) {
    $("#penalising").show();
  } else {
    $("#penalising").hide();
    $("#playOption").hide();
  }
});

socket.on("showRequestCardDialog", function(data) {
  console.log("showRequestCardDialog");
  if (data.option == "suite") {
    $("#suiteRequest").show();
  }
});

function cleanHand() {
  var myNode = document.getElementById("cartes");
  while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
  }
}

function cleanPlayerHandOnTable(player) {
  var myNode = document.getElementById("cardsOfPlayer"+player.id);
  while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
  }
}

function playCard(value) {
  socket.emit("playCard", {playedCard: value});
}

function refreshHand() {
  cleanHand();
  $.each(hand, function(k, v) {
    carteHand("resources/" + v + ".png", v);
  });
}

socket.on("play", function(data) {
  cleanHand();
  $("#hand").text("");
  $('#cards').find('option').remove().end();

  hand = hand.concat(data.hand);
  console.log(hand);
  $.each(hand, function(k, v) {
    carteHand("resources/" + v + ".png", v);
  });
});

socket.on("cardAccepted", function(data) {
  var index = hand.indexOf(data.playedCard);
  if (index !== -1)
  {
    hand.splice(index, 1);
    console.log(hand);
    cleanHand();
    $.each(hand, function(k, v) {
      carteHand("resources/" + v + ".png", v);
    });
  }

});

socket.on("updatePackCount", function(data) {
  $("#pack").text("");
  $("#pack").html("<span class='label label-info'>" + data.packCount + " card(s)</span>");

  // Update deck view
  $("#tableDeck").text("");
  if(data.packCount > 1) // si au moins 2 cartes, afficher une image en background représentant la 2ème carte (et les autres derrière)
    $("#tableDeck").html("<img width='100%' src='resources/redBack.png' style='float:left'>");
  /*else
    $("#tableDeck").html("<img width='100%' src='resources/redBack.png' style='float:left; visibility:hidden'>");*/
  if(data.packCount >= 1) // si au moins 1 carte, afficher une image hammerjs représentant la 1ère carte
    carteDeck();

});

socket.on("updateCardsOnTable", function(data){
  console.log(data);
  $("#playArea").show();
  $("#table").text("");
  if (data.lastCardOnTable == "") {
    $("#table").text("");
  } else {
    $("#table").append("<img width=100% src=resources/" + data.lastCardOnTable + ".png>");
  }
});

socket.on("updatePlayerCardsOnTable", function(data){
  console.log("updatePlayerCardsOnTable : hey")
  console.log(data)
  console.log(data.player.id)
  console.log(data.player.name)
  console.log(data.nbCards)
  cleanPlayerHandOnTable(data.player);
  for(var i=0; i<data.nbCards; i++){
    $("#cardsOfPlayer"+data.player.id).append("<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>");
  }
  marginCardsAvatar();
});


socket.on("turn", function(data) {
  if(data.won) {
    $("#playArea").hide();
    if (data.won == "yes") {
      $("#progressUpdate").html("<span class='label label-success'>You won - well done! Game over.</span>");
    } else {
      $("#progressUpdate").html("<span class='label label-info'>You lost - better luck next time. Game over.</span>");
    }
  } else {
    if(data.myturn) {
      navigator.vibrate(100);
      $("#progressUpdate").html("<span class='label label-info'>It's your turn.</span>");
      socket.emit("preliminaryRoundCheck", {}); //When a player has a turn, we need to control a few items, this is what enables us to make it happen.
    } else {
      $("#progressUpdate").html("<span class='label label-default'>It's not your turn.</span>");
    }
  }
});

socket.on("cardInHandCount", function(data) {
  var spanClass="badge-success";
  var plural = "s";
  if (data.cardsInHand <= 2) {
    spanClass = "badge-important";
  }
  if (data.cardsInHand <= 1) {
    plural = "";
  }
  $("#opponentCardCount").html("Your opponent has <span class='badge " + spanClass + "''>"+ data.cardsInHand + "</span> card"+plural+" in hand.");
});


socket.on("playerConnected", function(player) {
  console.log(player.id+" : "+player.name);
  addAvatar(player);
});

socket.on("playerDisconnected", function(data) {
  console.log(data.playerId + " : " + data.playerName);
});

socket.on("updateTableAvatars", function(data) {

});

socket.on("tableFull", function(){
  $("#tableFull").fadeIn("slow");
});

$(document).ready(function() {
  $("#tableFull").hide();
  $("#playArea").hide();
  $("#waiting").hide();
  $("#error").hide();
  $("#joinPlayerName").focus();
  $("#progressUpdate").hide();
  $("#penalising").hide();
  $("#numberRequest").hide();
  $("#suiteRequest").hide();
  $("form").submit(function(event){
    event.preventDefault();
  });

$("#suiteRequestBtn").click(function() {
  var request = $("#suiteRequestTxt").val();
  $("#suiteRequestTxt").val("")
  socket.emit("suiteRequest", {request: request});
  console.log("called with request ==> " + request);
});

$("#create").click(function() {
  var name = $("#createTableName").val();
  var count = $("#count").val();
  socket.emit("createTable", {name:name, playerLimit:count});
  $("#joinForm").hide();
  $("#createForm").hide();
});

$("#join").click(function() {
    var name = $("#joinPlayerName").val();
    var key = $("#joinTableKey").val();

    if (name.length > 0 && key.length == 4) {
      socket.emit("connectToServer", {name:name});
      socket.emit('connectToTable', {key:key});
      $("#joinForm").hide();
      $("#createForm").hide();
      $("#tableFull").hide();
      $("#waiting").show();
      socket.on("ready", function(data){
        $("#waiting").hide();
        $("#playArea").show();
        $("#progressUpdate").show();
      });
    } else {
      $("#error").show();
      $("#error").html('<p class="text-error">Please enter a name.</p>');
    }
  });

  $("#drawCard").click(function() {
    socket.emit("drawCard", {});
  });

  $("#sortHand").click(function() {
    shuffle();
  });

  /*penalising card taken button*/
  $("#penalising").click(function() {
    socket.emit("penalisingTaken", {});
    $("#penalising").hide();
  });

});
