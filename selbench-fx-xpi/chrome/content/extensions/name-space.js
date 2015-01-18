// SelBench name-space
var selbench = {
   name: "selbench"
  ,seleniumEnv: "ide"
  ,globalContext: this // alias for global Selenium scope
};

(function($$){
  /* Starting with FF4 lots of objects are in an XPCNativeWrapper,
   * and we need the underlying object for == and for..in operations.
   */
  $$.unwrapObject = function(obj) {
    if (typeof(obj) === "undefined" || obj == null)
      return obj;
    if (obj.wrappedJSObject)
      return obj.wrappedJSObject;
    return obj;
  };

}(selbench));
