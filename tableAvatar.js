function addAvatar(player) {

  var i = 1
  while( $('#boxPlayer'+i).children().length>0 && i<=4 ) i++;

  $('#boxPlayer'+i).attr("playerId", player.id);

  $('#boxPlayer'+i).html("<div class='row fullHeight'>"+
                            "<div class='col-xs-1 col-md-1 fullHeight'>"+
                            "</div>"+
                            "<div class='col-xs-10 col-md-10 fullHeight'>"+
                              "<div class='outerDiv'>"+
                                "<div class='innerDivMiddleTableAvatar'>"+
                                  "<div class='row fullHeight'>"+
                                    "<div class='col-xs-3 col-md-3 fullHeight label label-default'>"+
                                      "<img id='avatar"+player.id+"' height='80%' width='100%' src=''>"+
                                      "</br><h5>"+player.name+"</h5>" +
                                    "</div>"+
                                    "<div class='col-xs-9 col-md-9 fullHeight'>"+
                                      "<div class='fullHeight' id='cardsOfPlayer"+player.id+"'>"+
                                        "<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>"+
                                        "<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>"+
                                        "<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>"+
                                        "<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>"+
                                        "<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>"+
                                        "<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>"+
                                        "<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>"+
                                        "<img height='100%' src='resources/redBack.png' class='cardImgHorizontalAvatar'>"+
                                      "</div>"+
                                    "</div>"+
                                  "</div>"+
                                "</div>"+
                              "</div>"+
                            "</div>"+
                            "<div class='col-xs-1 col-md-1 fullHeight'>"+
                            "</div>"+
                          "</div>");

    var avatars = ["elephant.png", "giraffe.png", "hippo.png", "monkey.png", "panda.png", "parrot.png", "penguin.png", "pig.png", "rabbit.png", "snake.png"];
    if(player.avatar == "") {
      $('#avatar'+player.id).attr("src", "resources/avatars/"+avatars[Math.floor(Math.random() * 10)]);
    }
    else {
      $('#avatar'+player.id).attr("src", player.avatar);
    }
}
