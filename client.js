var socket = io.connect("http://localhost:8080");
var Pause_sent = false ;

window.addEventListener('deviceorientation', function(evenement) {
    
    
    var x ;
    var y ;
    
    
    
    if ((evenement.beta > 165 ) || (evenement.beta < -165 &&  evenement.gamma < 40 )){
        
        if ( Pause_sent==false) {
            
             clearTimeout(y); 
            
           x = setTimeout(socket.emit("pause", {}), 5000); 
       
            Pause_sent = true ; 
                   
          
        }
      
        
        
        }else if ((evenement.beta < 95 ) || (evenement.beta > -115 &&  evenement.gamma > 80 )) {
           
            if ( Pause_sent==true) {
                
                clearTimeout(x);
            //alert('reprise');
            y = setTimeout(socket.emit("reprise", {}), 5000);
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

/*window.addEventListener('deviceorientation', function(e) {
  if (Math.abs(e.beta) > 165 ){// The smartphone is facedown (180)
      setTimeout(socket.emit("pause", {}), 5000);
      pauseSent = true;
    }
  } else if (Math.abs(e.beta) < 65 ) {
    pauseSent = false;

    //alert('reprise');
    setTimeout(socket.emit("reprise", {}), 5000);
  }
},false);*/

socket.on("pause", function (data) {
  $("#updates").append("<li>joueur en pause </li>");
});

socket.on("reprise", function (data) {
  $("#updates").append("<li>joueur reprise </li>");
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

function sortHandBySuit() {
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
}

function sortHandByValue() {
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
}

function refreshHand() {
  cleanHand();
  $.each(hand, function(k, v) {
    carteHand("resources/" + v + ".png", v);
  });

  if (hand.length > 3) {
    var audio = new Audio('resources/cardFan1.wav');
    audio.play();
  }
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

function sendSuiteRequest(suite) {
  socket.emit("suiteRequest", {request: suite});
  console.log("called with request ==> " + suite);
  $("#suiteRequest").hide();
};

socket.on("play", function(data) {
  cleanHand();
  $("#hand").text("");
  $('#cards').find('option').remove().end();

  hand = hand.concat(data.hand);
  console.log(hand);
	refreshHand();
});

socket.on("cardAccepted", function(data) {
  clearTimeout(timer);
  var index = hand.indexOf(data.playedCard);
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
      navigator.vibrate([30,100,30,100]);
      var audio = new Audio('resources/win.ogg');
      audio.play();
    } else {
      navigator.vibrate(500);
      var audio = new Audio('resources/boo.wav');
      audio.play();
      $("#progressUpdate").html("<span class='label label-info'>You lost - better luck next time. Game over.</span>");
    }
  } else {
    if(data.myturn) {
      navigator.vibrate(100);
      $("#progressUpdate").html("<span class='label label-info'>It's your turn.</span>");
      timer = setTimeout(function() {
       navigator.vibrate([50,200,50]);
      }, 15000);
      navigator.vibrate([30,150,30]);
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

    if (key.length == 4) {
			var file = document.querySelector('input[type=file]').files[0];
			console.log(file);
			if (file) {
				var reader = new FileReader();
				reader.readAsDataURL(file);
				reader.onloadend = function () {
					console.log("PHOTO:"  + reader.result);
					socket.emit("connectToServer", {name:name, avatar : reader.result });
					socket.emit('connectToTable', {key:key});
					$("#joinForm").hide();
					$("#takePhoto").hide();
					$("#createForm").hide();
					$("#tableFull").hide();
					$("#waiting").show();
					socket.on("ready", function(data){
						$("#waiting").hide();
						$("#playArea").show();
						$("#progressUpdate").show();
					});
				}
			} else {
				socket.emit("connectToServer", {name:name, avatar : "" });
				socket.emit('connectToTable', {key:key});
				$("#joinForm").hide();
				$("#takePhoto").hide();
				$("#createForm").hide();
				$("#tableFull").hide();
				$("#waiting").show();
				socket.on("ready", function(data){
					$("#waiting").hide();
					$("#playArea").show();
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

  $("#sortHand").click(function() {
    sortHandByValue();
  });

  /*penalising card taken button*/
  $("#penalising").click(function() {
    navigator.vibrate(100);
    socket.emit("penalisingTaken", {});
    $("#penalising").hide();
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