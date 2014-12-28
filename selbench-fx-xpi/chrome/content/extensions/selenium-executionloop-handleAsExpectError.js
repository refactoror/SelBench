// selbench name-space
(function($$){
  /* This function replaces native Selenium command-handling for the command following expectError.
   * (See TestLoop.prototype.resume() in chrome/content/selenium-core/scripts/selenium-executionloop.js.)
   * This alters command completion such that:
   *   If the command throws the given error message, then the script continues.
   *   if it succeeds or throws a different error, then the script stops with an error.
   */
  $$.expectedError = null; // will have been set by the expectError command

  $$.handleAsExpectError = function()
  {
    try {
      selenium.browserbot.runScheduledPollers();
      this._executeCurrentCommand();
      if (this.result.failed) {
        if (isErrorMatch(this.result)) {
          $$.LOG.info("The expected verify-failure is confirmed : " + this.result.failureMessage);
          // overall test status is not affected
          this.continueTest();
        }
        else {
          // encountered a different verify-failure than expected, or no failure at all
          $$.LOG.error("Expected error : " + $$.expectedError);
          // continuing - but command is marked in red, and overall test status is failed
          this.continueTestWhenConditionIsTrue();
        }
      }
      else {
        this._handleCommandError(new Error("Command succeeded, while expecting error : " + $$.expectedError));
        // command is marked in red, and overall test status is failed
        this.testComplete();
      }
    }
    catch (e) {
      if (isErrorMatch(e)) {
        $$.LOG.info("The expected error is confirmed : " + e.message);
        // overall test status is not affected
        this.continueTest();
      }
      else {
        // encountered a different error than expected
        $$.LOG.error("Expected error : " + $$.expectedError);
        $$.LOG.error("but encountered : " + e.message);
        // normal Selenium behavior
        if (!this._handleCommandError(e)) {
          // command is marked in red, and overall test status is failed
          this.testComplete();
        }
        else {
          // error has been otherwise handled by TestLoop.prototype._handleCommandError()
          // (not sure what the possibilities are, other than stopping and failing the script)
          this.continueTest();
        }
      }
    }

    //- error message matcher
    function isErrorMatch(e) {
      var errMsg = (e.constructor.name == "AssertResult")
        ? e.failureMessage   // verify failure
        : errMsg = e.message // thrown Error
      ;
      if ($$.expectedError instanceof RegExp) {
        return (errMsg.match($$.expectedError));
      }
      return (errMsg.indexOf($$.expectedError) != -1);
    }
  };

}(selbench));
