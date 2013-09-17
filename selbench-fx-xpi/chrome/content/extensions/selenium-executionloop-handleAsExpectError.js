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
        // command succeeded, but an error was expected
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
        try {
          if (isErrorMatch(e)) {
            // was an expected error
            $$.LOG.debug("Expected error confirmed: " + e.message);
            isHandled = true;
          }
          else {
            // was an unexpected error
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

    //- error message matcher
    function isErrorMatch(e) {
      var errMsg = e.message;
      if ($$.expectedError instanceof RegExp) {
        return (errMsg.match($$.expectedError));
      }
      return (errMsg.indexOf($$.expectedError) != -1);
    }
  };

}(selbench));
