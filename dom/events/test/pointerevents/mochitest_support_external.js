// This file supports translating W3C tests
// to tests on auto MochiTest system with minimum changes.
// Author: Maksim Lebedev <alessarik@gmail.com>

// Function allows to prepare our tests after load document
addEventListener("load", function(event) {
  console.log("OnLoad external document");
  prepareTest();
}, false);

// Function allows to initialize prerequisites before testing
function prepareTest() {
  SimpleTest.waitForExplicitFinish();
  SimpleTest.requestCompleteLog();
  turnOnPointerEvents(startTest);
}

function setImplicitPointerCapture(capture, callback) {
  console.log("SET dom.w3c_pointer_events.implicit_capture as " + capture);
  SpecialPowers.pushPrefEnv({
    "set": [
      ["dom.w3c_pointer_events.implicit_capture", capture]
    ]
  }, callback);
}

function turnOnPointerEvents(callback) {
  console.log("SET dom.w3c_pointer_events.enabled as TRUE");
  console.log("SET layout.css.touch_action.enabled as TRUE");
  SpecialPowers.pushPrefEnv({
    "set": [
      ["dom.w3c_pointer_events.enabled", true],
      ["layout.css.touch_action.enabled", true]
    ]
  }, callback);
}

function enableSynthesizeEventsFromChrome(enable, callback) {
  console.log("SET test.events.async.enabled as TRUE");
  SpecialPowers.pushPrefEnv({
    "set": [
      ["test.events.async.enabled", enable]
    ]
  }, callback);
}

var utils = SpecialPowers.Ci.nsIDOMWindowUtils;

// Mouse Event Helper Object
var ME = (function() {
  return {
    // State
    MOUSE_ID: utils.DEFAULT_MOUSE_POINTER_ID,
    PEN_ID:   utils.DEFAULT_PEN_POINTER_ID,
    // TODO: Sperate this to support mouse and pen simultaneously.
    BTNS_STATE: utils.MOUSE_BUTTONS_NO_BUTTON,

    // Button
    BTN_NONE:   -1, // Used by test framework only. (replaced before sending)
    BTN_LEFT:   utils.MOUSE_BUTTON_LEFT_BUTTON,
    BTN_MIDDLE: utils.MOUSE_BUTTON_MIDDLE_BUTTON,
    BTN_RIGHT:  utils.MOUSE_BUTTON_RIGHT_BUTTON,

    // Buttons
    BTNS_NONE:   utils.MOUSE_BUTTONS_NO_BUTTON,
    BTNS_LEFT:   utils.MOUSE_BUTTONS_LEFT_BUTTON,
    BTNS_MIDDLE: utils.MOUSE_BUTTONS_MIDDLE_BUTTON,
    BTNS_RIGHT:  utils.MOUSE_BUTTONS_RIGHT_BUTTON,
    BTNS_4TH:    utils.MOUSE_BUTTONS_4TH_BUTTON,
    BTNS_5TH:    utils.MOUSE_BUTTONS_5TH_BUTTON,

    // Utils
    computeButtonsMaskFromButton: function(aButton) {
      // Since the range of button values is 0 ~ 2 (see nsIDOMWindowUtils.idl),
      // we can use an array to find out the desired mask.
      var mask = [
        this.BTNS_NONE,   // -1 (ME.BTN_NONE)
        this.BTNS_LEFT,   // 0
        this.BTNS_MIDDLE, // 1
        this.BTNS_RIGHT   // 2
      ][aButton + 1];

      ok(mask !== undefined, "Unrecognised button value caught!");
      return mask;
    },

    checkExitState: function() {
      ok(!this.BTNS_STATE, "Mismatched mousedown/mouseup caught.");
    }
  };
}) ();

// Helper function to send MouseEvent with different parameters
function sendMouseEvent(int_win, elemId, mouseEventType, params) {
  var elem = int_win.document.getElementById(elemId);
  if(!!elem) {
    var rect = elem.getBoundingClientRect();
    var eventObj = {type: mouseEventType};

    // Default to mouse.
    eventObj.inputSource =
      (params && "inputSource" in params) ? params.inputSource :
                                            MouseEvent.MOZ_SOURCE_MOUSE;
    // Compute pointerId
    eventObj.id =
      (eventObj.inputSource === MouseEvent.MOZ_SOURCE_MOUSE) ? ME.MOUSE_ID :
                                                               ME.PEN_ID;
    // Check or generate a |button| value.
    eventObj.button = (function() {
      var isButtonEvent = mouseEventType === "mouseup" ||
                          mouseEventType === "mousedown";

      // |button| is passed, use and check it.
      if (params && "button" in params) {
        var hasButtonValue = params.button !== ME.BTN_NONE;
        ok(!isButtonEvent || hasButtonValue,
           "Inappropriate |button| value caught.");
        return params.button;
      }

      // Using the default value.
      return isButtonEvent ? ME.BTN_LEFT : ME.BTN_NONE;
    }) ();

    // Generate a |buttons| value and update buttons state
    eventObj.buttons = (function() {
      var buttonsMask = ME.computeButtonsMaskFromButton(eventObj.button);
      switch(mouseEventType) {
        case "mousedown":
          ME.BTNS_STATE |= buttonsMask; // Set button flag.
          break;
        case "mouseup":
          ME.BTNS_STATE &= ~buttonsMask; // Clear button flag.
          break;
      }

      return ME.BTNS_STATE;
    }) ();

    // Replace the button value for mousemove events.
    // Since in widget level design, even when no button is pressed at all, the
    // value of WidgetMouseEvent.button is still 0, which is the same value as
    // the one for mouse left button.
    if (mouseEventType === "mousemove") {
      eventObj.button = ME.BTN_LEFT;
    }

    // Default to the center of the target element but we can still send to a
    // position outside of the target element.
    var offsetX = params && "offsetX" in params ? params.offsetX : rect.width / 2;
    var offsetY = params && "offsetY" in params ? params.offsetY : rect.height / 2;

    console.log(elemId, eventObj);
    synthesizeMouse(elem, offsetX, offsetY, eventObj, int_win);

  } else {
    is(!!elem, true, "Document should have element with id: " + elemId);
  }
}

// Touch Event Helper Object
var TE = {
  // State
  TOUCH_ID: utils.DEFAULT_TOUCH_POINTER_ID,
  TOUCH_STATE: false,

  // Utils
  checkExitState: function() {
    ok(!this.TOUCH_STATE, "Mismatched touchstart/touchend caught.");
  }
}

// Helper function to send TouchEvent with different parameters
// TODO: Support multiple touch points to test more features such as
// PointerEvent.isPrimary and pinch-zoom.
function sendTouchEvent(int_win, elemId, touchEventType, params) {
  var elem = int_win.document.getElementById(elemId);
  if(!!elem) {
    var rect = elem.getBoundingClientRect();
    var eventObj = {
      type: touchEventType,
      id: TE.TOUCH_ID
    };

    // Update touch state
    switch(touchEventType) {
      case "touchstart":
        TE.TOUCH_STATE = true; // Set touch flag.
        break;
      case "touchend":
        TE.TOUCH_STATE = false; // Clear touch flag.
        break;
    }

    // Default to the center of the target element but we can still send to a
    // position outside of the target element.
    var offsetX = params && "offsetX" in params ? params.offsetX : rect.width / 2;
    var offsetY = params && "offsetY" in params ? params.offsetY : rect.height / 2;

    console.log(elemId, eventObj);
    synthesizeTouch(elem, offsetX, offsetY, eventObj, int_win);
  } else {
    is(!!elem, true, "Document should have element with id: " + elemId);
  }
}

// Helper function to run Point Event test in a new tab.
function runTestInNewWindow(aFile) {
  var testURL = location.href.substring(0, location.href.lastIndexOf('/') + 1) + aFile;
  var testWindow = window.open(testURL, "_blank");
  var testDone = false;

  window.addEventListener("message", function(aEvent) {
    switch(aEvent.data.type) {
      case "START":
        // Update constants
        ME.MOUSE_ID = aEvent.data.message.mouseId;
        ME.PEN_ID   = aEvent.data.message.penId;
        TE.TOUCH_ID = aEvent.data.message.touchId;

        turnOnPointerEvents(() => {
          enableSynthesizeEventsFromChrome(true, () => {
            executeTest(testWindow);
          })
        });
        return;
      case "RESULT":
        // Should not perform checking after SimpleTest.finish().
        if (!testDone) {
          ok(aEvent.data.result, aEvent.data.message);
        }
        return;
      case "FIN":
        testDone = true;
        ME.checkExitState();
        TE.checkExitState();
        testWindow.close();
        SimpleTest.finish()
        return;
    }
  });
}
