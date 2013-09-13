var selbench = {};

/* Function interception stack.
*/
(function($$){
  $$.fnStack = [];
  $$.pushFn = function(targetObj, targetFnName, fn) {
    var frame = { targetObj: targetObj, targetFnName: targetFnName, savedFn: targetObj[targetFnName] };
    $$.fnStack.push(frame);
    targetObj[targetFnName] = fn;
  };
  $$.popFn = function() {
    var frame = $$.fnStack.pop();
    frame.targetObj[frame.targetFnName] = frame.savedFn;
  };
}(selbench));
