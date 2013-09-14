// selbench name-space
(function($$){

  /* This function replaces native Selenium command handling a command following expectError.
   * This alters command completion such that:
   *   If the command throws the given error message, then the script continues.
   *   if it succeeds or throws a different error, then the script stops with an error.
   */
  $$.expectedError = null;
  $$.handleAsExpectError = function()
  {
// $$.LOG.warn("cmd: " + this.currentCommand.command);
    try {
      selenium.browserbot.runScheduledPollers();
      this._executeCurrentCommand();
      // the command has not thrown an error
      if ($$.expectedError == null)
        this.continueTestWhenConditionIsTrue();
      else {
        // detect if the command succeeds while an error is expected
        $$.LOG.error("Expected the error: " + $$.expectedError);
        $$.LOG.error("But command succeeded");
        $$.expectedError = null;
        this._handleCommandError(new Error("Error due to command success"));
        //throw new Error(msg);
        this.testComplete();
      }
    } catch (e) {
      var isHandled = false;
      if ($$.expectedError == null)
        isHandled = this._handleCommandError(e);
      else {
        // verify that the expected kind of error has occurred
        try {
          if (isErrorMatch(e)) {
            $$.LOG.debug("Expected error confirmed: " + e.message);
            isHandled = true;
          }
          else {
            $$.LOG.error("Expected the error: " + $$.expectedError);
            $$.LOG.error(e.message);
            isHandled = this.commandError(msg);
          }
        }
        finally {
          $$.expectedError = null;
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
      if ($$.expectedError instanceof RegExp) {
        return (msg.match($$.expectedError));
      }
      return (msg.indexOf($$.expectedError) != -1);
    }
  };
}(selbench));
