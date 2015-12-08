
  function marginCards() {

    var element = $('.cardDivHorizontal');
    var elementParent = element.parent();
    var parentChildNumber = element.size()+1;
    var parentWidth = element.parent().width();
    var childWidth = element.width();
    var finalCardAreaWidth = parentWidth - 3*childWidth/5;

    var coef = 1-1/Math.ceil(childWidth*parentChildNumber/finalCardAreaWidth);

    element.css("margin-left", -1*Math.ceil(element.width()*coef));
    elementParent.css("margin-left", 1*Math.ceil(element.width()*coef));

  }


  $( document ).ready(function() {
    marginCards();
  });  

  
  $('#cartes').on('DOMSubtreeModified', function(e) {
    marginCards();
  });


  // Necessary to watch show and hide events on elements
  /*(function ($) {
    $.each(['show', 'hide'], function (i, ev) {
      var el = $.fn[ev];
      $.fn[ev] = function () {
        this.trigger(ev);
        return el.apply(this, arguments);
      };
    });
  })(jQuery);*/


