// selbocks name-space
(function($$){

  /* Function interception
  */
  $$.fnStack = [];

  // replace the specified function, saving the original function on a stack
  $$.interceptPush = function(targetObj, targetFnName, _fn, frameAttrs) {
    var frame = {
       targetObj: targetObj
      ,targetFnName: targetFnName
      ,savedFn: targetObj[targetFnName]
      ,attrs: frameAttrs
    };
    $$.fnStack.push(frame);
    targetObj[targetFnName] = _fn;
  };
  // restore the most recent function replacement
  $$.interceptPop = function() {
    var frame = $$.fnStack.pop();
    frame.targetObj[frame.targetFnName] = frame.savedFn;
  };

  // replace the specified function, but then restore the original function as soon as it is call
  $$.interceptOnce = function(targetObj, targetFnName, _fn) {
    $$.interceptPush(targetObj, targetFnName, function(){
      $$.interceptPop(); // un-intercept
      _fn.call(this);
    });
  };

}(selbench));
