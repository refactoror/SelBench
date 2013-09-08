var selbench = {};

/* Function interception stack.
*/
(function(_){
  _.fnStack = [];
  _.pushFn = function(targetObj, targetFnName, fn) {
    var frame = { targetObj: targetObj, targetFnName: targetFnName, savedFn: targetObj[targetFnName] };
    _.fnStack.push(frame);
    targetObj[targetFnName] = fn;
  };
  _.popFn = function() {
    var frame = _.fnStack.pop();
    frame.targetObj[frame.targetFnName] = frame.savedFn;
  };
}(selbench));
