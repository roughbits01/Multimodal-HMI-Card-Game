var socket = io.connect("http://localhost:8080");

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

/*socket.on("showRequestCardDialog", function(data) {
  if (data.option == "suite") {
    $("#suiteRequest").show();
  }
});*/

function cleanHand() {
  var myNode = document.getElementById("cartes");
  while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
  }
}

function playCard(key, value) {
  index = key;
  playedCard = value;
  socket.emit("playCard", {playedCard: playedCard, index: index});
}

socket.on("play", function(data) {
  cleanHand();
  $("#hand").text("");
  $('#cards').find('option').remove().end();
  pixel = 0;
  $.each(data.hand, function(k, v) {
    index = k + 1;
    carte("resources/"+v+".png",k ,v);
    /*$("#hand").append("<div style='margin-top:2px; margin-left:" + pixel + "px; float: left; z-index:" + index + "''><img class='card"+k+"' width=100 src=resources/"+v+".png /></div>");
    $(".card"+k).click(function() { playCard(k, v); return false; });
    if (pixel >= 0) {
      pixel = (pixel + 40) * -1;
    } else {
      if (pixel <= -40)
        pixel = pixel -1;
      }*/
  });
});

socket.on("updatePackCount", function(data) {
  $("#pack").text("");
  $("#pack").html("Size of pack is: <span class='label label-info'>" + data.packCount + "</span>");
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

/*$("#suiteRequestBtn").click(function() {
  var request = $("#suiteRequestTxt").val();
  socket.emit("suiteRequest", {request: request});
  console.log("called with request ==> " + request);
});*/

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

  /*penalising card taken button*/
  $("#penalising").click(function() {
    socket.emit("penalisingTaken", {});
    $("#penalising").hide();
  });

});