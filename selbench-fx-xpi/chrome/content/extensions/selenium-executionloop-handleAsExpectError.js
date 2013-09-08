/* This function replaces native Selenium command handling a command following expectError.
 * This alters command completion such that:
 *   If the command throws the given error message, then the script continues.
 *   if it succeeds or throws a different error, then the script stops with an error.
 */
// selbench name-space
(function(_){
  _.expectedError = null;

  _.handleAsExpectError = function()
  {
    _.popFn(); // un-intercept TestLoop.resume
    try {
      selenium.browserbot.runScheduledPollers();
      this._executeCurrentCommand();
      // detect if the command succeeds while an error is expected
      if (_.expectedError != null) {
        var msg = "Command succeeded while expecting error: " + _.expectedError;
        _.expectedError = null;
        throw new Error(msg);
      }
      this.continueTestWhenConditionIsTrue();
    } catch (e) {
      var isHandled = false;
      if (_.expectedError == null)
        isHandled = this._handleCommandError(e);
      else {
        // verify that the expected kind of error has occurred
        try {
          if (isErrorMatch(e)) {
            _.LOG.debug("Expected error confirmed: " + e.message);
            isHandled = true;
          }
          else {
            _.LOG.error("Expected error: " + _.expectedError);
            _.LOG.error("Instead caught: " + e.message);
            isHandled = this.commandError(msg);
          }
        }
        finally {
          _.expectedError = null;
        }
      }
      if (!isHandled) {
           this.testComplete();
      } else {
           this.continueTest();
      }
    }
    //- match for error message
    function isErrorMatch(e) {
      var msg = e.message;
      if (_.expectedError instanceof RegExp) {
        return (msg.match(_.expectedError));
      }
      return (msg.indexOf(_.expectedError) != -1);
    }
  };
}(selbench));
