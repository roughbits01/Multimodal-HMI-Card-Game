var socket = io.connect("http://localhost:8080");

var audioDraw = new Audio('resources/cardSlide7.wav');
var audioSort = new Audio('resources/cardFan1.wav');
var audioWin = new Audio('resources/win.ogg');
var audioLose = new Audio('resources/boo.wav');

var Pause_sent = false ;

window.addEventListener('deviceorientation', function(evenement) {

  var t1 ;
  var t2 ;

  if ((evenement.beta > 165 ) || (evenement.beta < -165 &&  evenement.gamma < 40 )){
    if ( Pause_sent==false) {
      //clearTimeout(t2);
      console.log("onPause ==> OUT");
      //t1 = setTimeout(socket.emit("pause", {}), 5000);
      socket.emit("pause", {});
      Pause_sent = true ;
    }
  }else if ((evenement.beta < 95 ) || (evenement.beta > -115 &&  evenement.gamma > 80 )) {
    if ( Pause_sent==true) {
      //clearTimeout(t1);
        console.log("onPause ==> IN");
      //alert('reprise');
      //t2 = setTimeout(socket.emit("reprise", {}), 5000);
      socket.emit("reprise", {});
      Pause_sent = false ;
    }
  }
},false);

hand = [];

var timer;

var myShakeEvent = new Shake({
    threshold: 15, // optional shake strength threshold
    timeout: 1000 // optional, determines the frequency of event generation
});

myShakeEvent.start();

window.addEventListener('shake', shakeEventDidOccur, false);

touched = false;

window.addEventListener('touchstart', function(e){
  touched = true;
  console.log("touchstart");
  //e.preventDefault()
}, false)

window.addEventListener('touchmove', function(e){
  //e.preventDefault()
}, false)

window.addEventListener('touchend', function(e){
  console.log("touchend");
  touched = false;
  //e.preventDefault()
}, false)

socket.on("pause", function (data) {
 /*if ($('#boxPlayer1').attr("playerId")== data.player.name){
    $('#boxPlayer1').hide();
  }else if($('#boxPlayer2').attr("playerId")== data.player.name){
    $('#boxPlayer2').hide();
  }*/
  $("#avatar"+data.player.id+"Pause").show();
  $("#updates").append("<li>"+ data.player.name +" is on pause ... </li>");
});

socket.on("reprise", function (data) {
  /*if ($('#boxPlayer1').attr("playerId")== data.player.name{
    $('#boxPlayer1').show();
  }else if($('#boxPlayer2').attr("playerId")== data.player.name){
    $('#boxPlayer2').show();
  }*/
  $("#avatar"+data.player.id+"Pause").hide();
  $("#updates").append("<li>"+ data.player.name +" came back ...</li>");
});

//function to call when shake occurs
function shakeEventDidOccur () {
  if (touched) sortHandByValue();
  else sortHandBySuit();
}

function shuffleHand() {
  var i = hand.length, j, tempi, tempj;
  if (i === 0) return;
  while (--i) {
    j = Math.floor(Math.random() * (i + 1));
    tempi = hand[i]; tempj = hand[j]; hand[i] = tempj; hand[j] = tempi;
  }
  refreshHand();
}

function sortHandByValue() {
  hand.sort(function(a, b) {
    var x = parseInt(a);
    var y = parseInt(b);

    if (x < y) {
      return -1;
    } else if (x > y) {
      return 1;
    } else {
      var aSuit = a.substr(a.length - 1);
      var bSuit = b.substr(b.length - 1);
      if (aSuit < bSuit) {
        return -1;
      } else if (aSuit > bSuit) {
        return 1;
      } else {
        return 0;
      }
    }
  });
  refreshHand();
  if (hand.length > 3) {
    audioSort.pause();
    audioSort.play();
  }
}

function sortHandBySuit() {
  hand.sort(function(a, b) {
    var aSuit = a.substr(a.length - 1);
    var bSuit = b.substr(b.length - 1);
    if (aSuit < bSuit) {
      return -1;
    } else if (aSuit > bSuit) {
      return 1;
    } else {
      var x = parseInt(a);
      var y = parseInt(b);
      if (x < y) {
        return -1;
      } else if (x > y) {
        return 1;
      } else {
        return 0;
      }
    }
  });
  refreshHand();
  if (hand.length > 3) {
    audioSort.pause();
    audioSort.play();
  }
}

function refreshHand() {
  cleanHand();
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

socket.on("badCard", function (data) {
  navigator.vibrate(200);
});

socket.on("notYouTurn", function (data) {
  navigator.vibrate(200);
});

socket.on("playOption", function(data){
  $("#playOption").html(data.message);
  if (data.value) {
    $("#penalising").html("Piocher"+data.nbPenality);
    $("#penalising").show();
    $("#drawCard").hide();
  } else {
    $("#penalising").html("");
    $("#penalising").hide();
    $("#playOption").hide();
    $("#drawCard").show();
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
  socket.emit("playCard", {playedCard: value, index: hand.indexOf(value)});
}

function sendSuiteRequest(suite) {
  socket.emit("suiteRequest", {request: suite});
  console.log("called with request ==> " + suite);
  $("#suiteRequest").hide();
};

var firstCall = true;

socket.on("play", function(data) {
  $("#hand").text("");
  $('#cards').find('option').remove().end();

  hand = hand.concat(data.hand);
  console.log(hand);
	refreshHand();
  if(data.hand.length == 1) {
    audioDraw.pause();
    audioDraw.play();
  }

  if (firstCall)
  {
    setTimeout(function() {
     refreshHand();
   }, 100);
    firstCall = false;
  }
});

socket.on("cardAccepted", function(data) {
  clearTimeout(timer);
  //var index = hand.indexOf(data.playedCard);
  var index = data.index;
  console.log(data.playedCard+" : "+index)
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

  if(data.table){ // si on dessine sur une table alors image width = 100%
    if(data.packCount > 1) // si au moins 2 cartes, afficher une image en background représentant la 2ème carte (et les autres derrière)
      $("#tableDeck").html("<img width='100%' src='resources/redBack.png' style='float:left'>");
    /*else
      $("#tableDeck").html("<img width='100%' src='resources/redBack.png' style='float:left; visibility:hidden'>");*/
  }
  else{ // sinon on dessine sur une main alors image height = 100%
    if(data.packCount > 1) // si au moins 2 cartes, afficher une image en background représentant la 2ème carte (et les autres derrière)
      $("#tableDeck").html("<img height='100%' src='resources/redBack.png' style='float:left'>");
  }

  if(data.packCount >= 1) // si au moins 1 carte, afficher une image hammerjs représentant la 1ère carte
    carteDeck(data.table);// suivant si on dessine sur une table ou non, la def de l'image change

});

socket.on("updateCardsOnTable", function(data){
  console.log(data);
  $("#tableInfoForm").hide();
  $("#playArea").show();
  $("#table").text("");
  if (data.lastCardOnTable == "") {
    $("#table").text("");
  } else {
    if(data.table) // si on dessine sur une table alors image width = 100%
      $("#table").append("<img width=100% src=resources/" + data.lastCardOnTable + ".png>");
    else // sinon on dessine sur une main alors image height = 100%
      $("#table").append("<img height=100% src=resources/" + data.lastCardOnTable + ".png>");
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
    $(".triggerTableInHand").hide();
    $(".triggerLoggs").hide();
    if (data.won == "yes") {
      $("#youWinLose").html('<img class="fullWidth" src="resources/Vous-avez-gagne.png"/>');
      $("#youWinLose").show();
      navigator.vibrate([30,100,30,100]);
      audioWin.pause();
      audioWin.play();
    } else {
      navigator.vibrate(500);
      audioLose.pause();
      audioLose.play(); 
      $("#youWinLose").html('<img class="fullWidth" src="resources/Vous-avez-perdu.png"/>');
      $("#youWinLose").show();
    }
  } else {
    if(data.myturn) {
      navigator.vibrate([50,100,50]);
      $("#progressUpdate").html("<h4><span class='label label-info'>It's your turn.</span></h4>");
      $("#handActionButtons").show();

      timer = setTimeout(function() {
       navigator.vibrate([50,200,50]);
      }, 15000);
      socket.emit("preliminaryRoundCheck", {}); //When a player has a turn, we need to control a few items, this is what enables us to make it happen.
    } else {
      $("#progressUpdate").html("<h4><span class='label label-default'>It's not your turn.</span></h4>");
      $("#handActionButtons").hide();
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

socket.on("endPlayerTurnView", function(data){
  for(var i = 0; i < data.allPlayers.length; i++){
    if(data.allPlayers[i].id == data.playerIdEndTurn)
      $("#avatar"+data.allPlayers[i].id).parent().removeClass("label-primary").addClass("label-default");
    else
      $("#avatar"+data.allPlayers[i].id).parent().removeClass("label-default").addClass("label-primary");
  }
});


socket.on("showRequestedSuite", function(data){
  $("#requestedSuite").text("");

  if(data.table)
    $("#requestedSuite").html("<img width='100%' style='background-color: rgba(255, 255, 255, 0.8);' src='resources/requested"+data.suite+".png'>");
  else
    $("#requestedSuite").html("<img width='24%'  src='resources/"+data.suite+".png'>");

  $("#requestedSuite").show();
});

socket.on("hideRequestedSuite", function(data){
  $("#requestedSuite").text("");
  $("#requestedSuite").hide();
});

socket.on("key", function(data){
  $("#infoKey").html(data.key);
  console.log(data.key);
});

socket.on("winner", function(data){
  $('#avatar'+data.id).attr("src", "resources/flatshadow_medal.png");
  console.log("winner"+data.id);
});

$(document).ready(function() {
  $(".triggerTableInHand").hide();
  $(".triggerLoggs").hide();
  $("#youWinLose").hide();
  $("#tableFull").hide();
  $("#playArea").hide();
  $("#waiting").hide();
  $("#error").hide();
  $("#joinPlayerName").focus();
  $("#progressUpdate").hide();
  $("#penalising").hide();
  $("#numberRequest").hide();
  $("#suiteRequest").hide();
  $("#requestedSuite").hide();
  $("#tableInfoForm").hide();
  $("form").submit(function(event){
    event.preventDefault();
  });

$("#create").click(function() {
  var name = $("#createTableName").val();
  var count = $("#count").val();
  socket.emit("createTable", {name:name, playerLimit:count});
  $("#createForm").hide();
  $("#infoName").html(name);
  $("#tableInfoForm").show();
});

$("#join").click(function() {
    var name = $("#joinPlayerName").val();
    var key = $("#joinTableKey").val();

    if (key.length == 4) {
			var file = document.querySelector('input[type=file]').files[0];
			console.log(file);
			if (file) {
				var reader = new FileReader();
				reader.readAsDataURL(file);
				reader.onloadend = function () {
					socket.emit("connectToServer", {name:name, avatar : reader.result });
					socket.emit('connectToTable', {key:key});
					$("#joinForm").hide();
					$("#createForm").hide();
					$("#tableFull").hide();
					$("#waiting").show();
					socket.on("ready", function(data){
						$("#waiting").hide();
						$("#playArea").show();
            $(".triggerTableInHand").show();
            $(".triggerLoggs").show();
						$("#progressUpdate").show();
					});
				}
			} else {
				socket.emit("connectToServer", {name:name, avatar : "" });
				socket.emit('connectToTable', {key:key});
				$("#joinForm").hide();
				$("#createForm").hide();
				$("#tableFull").hide();
				$("#waiting").show();
				socket.on("ready", function(data){
					$("#waiting").hide();
					$("#playArea").show();
          $(".triggerTableInHand").show();
          $(".triggerLoggs").show();
					$("#progressUpdate").show();
				});
			}
    } else {
      $("#error").show();
      $("#error").html('<p class="text-error">Please enter a valid key.</p>');
    }
  });

  $("#drawCard").click(function() {
    navigator.vibrate(30);
    clearTimeout(timer);
    socket.emit("drawCard", {});
  });

  $("#sortHandByValue").click(function() {
    sortHandByValue();
  });

  $("#sortHandBySuit").click(function() {
    sortHandBySuit();
  });

  /*penalising card taken button*/
  $("#penalising").click(function() {
    navigator.vibrate(100);
    socket.emit("penalisingTaken", {});
    $("#penalising").html("");
    $("#penalising").hide();
    $("#drawCard").show();
  });

});


// Fonction d'activation des divs laterales masquées
$(document).ready(function(){
  $(".triggerLoggs").on('touchstart touchend click', function(){
    $(".loggs").toggle("fast");
    $(this).toggleClass("active");
    return false;
  });
});


// Fonction d'activation des divs laterales masquées
$(document).ready(function(){
  $(".triggerTableInHand").on('touchstart touchend click', function(){
    console.log("heyyyy");
    $(".tableInHand").toggle("fast");
    $(this).toggleClass("active");
    return false;
  });
});
