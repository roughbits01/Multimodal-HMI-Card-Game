var cartes = document.getElementById('cartes');

  function carte(url, pos){
    var reqAnimationFrame = (function () {
        return window[Hammer.prefixed(window, 'requestAnimationFrame')] || function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    })();
    //var log = document.createElement('div');
    var el = document.createElement('div');

    /* Mock : Make an img element but hide it to initialize 'el'(div) size */
    var img = document.createElement('img');
    el.appendChild(img);
    img.setAttribute("src", url);
    img.setAttribute("style", "visibility:hidden");
    //document.getElementsByTagName('body')[0].appendChild(log);
    /* End of Mock */

    cartes.appendChild(el);
    el.style.backgroundImage= "url("+url+")";
    el.style.backgroundSize= "contain";
    el.START_X = 0;
    el.START_Y = 0;
    el.START_Z = 0;
    var ticking = false;
    var transform;
    var timer;
    //el.style.width = "200px";
    //el.style.height = "200px";
    //el.START_X = Math.round((window.innerWidth - el.offsetWidth) / pos);
    //el.START_Y = Math.round((window.innerHeight - el.offsetHeight) / pos);
    el.classList.add("cardDivHorizontal");
  
    var mc = new Hammer.Manager(el);
    mc.add(new Hammer.Pan({ threshold: 0, pointers: 0 }));
    mc.add(new Hammer.Swipe()).recognizeWith(mc.get('pan'));
    mc.add(new Hammer.Rotate({ threshold: 0 })).recognizeWith(mc.get('pan'));
    mc.add(new Hammer.Pinch({ threshold: 0 })).recognizeWith([mc.get('pan'), mc.get('rotate')]);
    mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
    mc.add(new Hammer.Tap());
    mc.on("panstart panmove", onPan);
    mc.on("panend pancancel", onPanEnd);
    mc.on("rotatestart rotatemove", onRotate);
    mc.on("pinchstart pinchmove", onPinch);
    mc.on("swipe", onSwipe);
    mc.on("tap", onTap);
    mc.on("doubletap", onDoubleTap);
    mc.on("hammer.input", function(ev) {
        if(ev.isFinal) {
            el.resetElement();
        }
    });
    el.resetElement = function() {
        if(!el.classList.contains('animate'))el.classList.add('animate');
        transform = {
            translate: { x: el.START_X, y: el.START_Y, z: el.START_Z },
            scale: 1,
            angle: 0,
            rx: 0,
            ry: 0,
            rz: 0
        };

        requestElementUpdate();
        /*if (log.textContent.length > 2000) {
            log.textContent = log.textContent.substring(0, 2000) + "...";
         
        }
        */
        

    }
    function updateElementTransform() {
        var value = [
                    'translate3d(' + transform.translate.x + 'px, ' + transform.translate.y + 'px, ' + transform.translate.z + 'px)',
                    'scale(' + transform.scale + ', ' + transform.scale + ')',
                    'rotate3d('+ transform.rx +','+ transform.ry +','+ transform.rz +','+  transform.angle + 'deg)'
        ];
        value = value.join(" ");
        //el.textContent = value;
        el.style.webkitTransform = value;
        el.style.mozTransform = value;
        el.style.transform = value;
        ticking = false;
    }
    function requestElementUpdate() {
        if(!ticking) {
            reqAnimationFrame(updateElementTransform);
            ticking = true;
        }
    }
    function logEvent(str) {
        //log.insertBefore(document.createTextNode(str +"\n"), log.firstChild);
    }
    function onPan(ev) {
        console.log("onPan");

        // make div on front of others
        el.classList.add('showOnTop');

        if(el.classList.contains('animate'))el.classList.remove('animate');
        transform.translate = {
            x: el.START_X + ev.deltaX,
            y: el.START_Y + ev.deltaY,
            z: 0
        };
        requestElementUpdate();
        logEvent(ev.type);
    }
    function onPanEnd(ev) {
        console.log("onPanEnd");
        el.classList.remove('showOnTop');
        requestElementUpdate();

    }
    var initScale = 1;
    function onPinch(ev) {
        console.log("onPinch");
        if(ev.type == 'pinchstart') {
            initScale = transform.scale || 1;
        }
        if(el.classList.contains('animate'))el.classList.remove('animate');
        transform.scale = initScale * ev.scale;
        requestElementUpdate();
        logEvent(ev.type);
    }
    var initAngle = 0;
    function onRotate(ev) {
        console.log("onRotate");
        if(ev.type == 'rotatestart') {
            initAngle = transform.angle || 0;
        }
        if(el.classList.contains('animate'))el.classList.remove('animate');
        transform.rz = 1;
        transform.angle = initAngle + ev.rotation;
        requestElementUpdate();
        logEvent(ev.type);
    }
    function onSwipe(ev) {
        console.log("onSwipe");
        var angle = 50;
        transform.ry = (ev.direction & Hammer.DIRECTION_HORIZONTAL) ? 1 : 0;
        transform.rx = (ev.direction & Hammer.DIRECTION_VERTICAL) ? 1 : 0;
        transform.angle = (ev.direction & (Hammer.DIRECTION_RIGHT | Hammer.DIRECTION_UP)) ? angle : -angle;
        clearTimeout(timer);
        timer = setTimeout(function () {
            el.resetElement();
        }, 300);
        requestElementUpdate();
        logEvent(ev.type);
    }
    function onTap(ev) {
        console.log("onTap");
        transform.rx = 1;
        transform.angle = 25;
        clearTimeout(timer);
        timer = setTimeout(function () {
            el.resetElement();
        }, 200);
        requestElementUpdate();
        logEvent(ev.type);
    }
    function onDoubleTap(ev) {
        console.log("onDoubleTap");
        transform.rx = 1;
        transform.angle = 80;
        clearTimeout(timer);
        timer = setTimeout(function () {
            el.resetElement();
        }, 500);
        requestElementUpdate();
        logEvent(ev.type);
    }
    el.resetElement();    
  }