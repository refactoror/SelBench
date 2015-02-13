// To use Selblocks commands in Selenium Server, provide this file on the command line.
// Eg: -userExtensions "C:\somewhere\user-extensions.js"

// ================================================================================
// from: name-space.js

// SelBench name-space
var selbench = {
   name: "selbench"
  ,seleniumEnv: "ide"
  ,globalContext: this // alias for global Selenium scope
};

(function($$){
  $$.fn = {};

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

// ================================================================================
// from: logger.js

// selbench name-space
(function($$){

  /* LOG wrapper for Selblocks-specific behavior
   */
  function Logger()
  {
    this.error = function (msg) { this.logit("error", msg); };
    this.warn  = function (msg) { this.logit("warn", msg); };
    this.info  = function (msg) { this.logit("info", msg); };
    this.debug = function (msg) { this.logit("debug", msg); };
    this.trace = function (msg) { this.logit("debug", msg); }; // selenium doesn't have trace level

    this.logit = function (logLevel, msg) {
      LOG[logLevel]("[" + $$.name + "] " + msg);  // call the Selenium logger
    };

    // ==================== Stack Tracer ====================

    this.genStackTrace = function(err)
    {
      var e = err || new Error();
      var stackTrace = [];
      if (!e.stack)
        stackTrace.push("No stack trace, (Firefox only)");
      else {
        var funcCallPattern = /^\s*[A-Za-z0-9\-_\$]+\(/;
        var lines = e.stack.split("\n");
        for (var i=0; i < lines.length; i++) {
          if (lines[i].match(funcCallPattern))
            stackTrace.push(lines[i]);
        }
        if (!err)
          stackTrace.shift(); // remove the call to genStackTrace() itself
      }
      return stackTrace;
    };

    this.logStackTrace = function(err)
    {
      var t = this.genStackTrace(err);
      if (!err)
        t.shift(); // remove the call to logStackTrace() itself
      this.warn("__Stack Trace__");
      for (var i = 0; i < t.length; i++) {
        this.warn("@@ " + t[i]);
      }
    };

    // describe the calling function
    this.descCaller = function()
    {
      var t = this.genStackTrace(new Error());
      if (t.length == 0) return "no client function";
      t.shift(); // remove the call to descCaller() itself
      if (t.length == 0) return "no caller function";
      t.shift(); // remove the call to client function
      if (t.length == 0) return "undefined caller function";
      return "caller: " + t[0];
    };
  }

  $$.LOG = new Logger();

}(selbench));

// ================================================================================
// from: function-intercepting.js

// selbocks name-space
(function($$){

  /* Function interception
  */

  // execute the given function after each call of the specified function name
  $$.fn.interceptAfter = function(targetObj, targetFnName, _fnAfter) {
    var existing_fn = targetObj[targetFnName];
    targetObj[targetFnName] = function() {
      var args = Array.prototype.slice.call(arguments);
      existing_fn.apply(this, args);
      return _fnAfter.apply(this, args);
    };
  };

  $$.fn.interceptStack = [];

  // replace the specified function, saving the original function on a stack
  $$.fn.interceptPush = function(targetObj, targetFnName, _fnTemp, frameAttrs) {
    var frame = {
       targetObj: targetObj
      ,targetFnName: targetFnName
      ,savedFn: targetObj[targetFnName]
      ,attrs: frameAttrs
    };
    $$.fn.interceptStack.push(frame);
    targetObj[targetFnName] = _fnTemp;
  };
  // restore the most recent function replacement
  $$.fn.interceptPop = function() {
    var frame = $$.fn.interceptStack.pop();
    frame.targetObj[frame.targetFnName] = frame.savedFn;
  };

  // replace the specified function, but then restore the original function as soon as it is call
  $$.fn.interceptOnce = function(targetObj, targetFnName, _fn) {
    $$.fn.interceptPush(targetObj, targetFnName, function(){
      $$.fn.interceptPop(); // un-intercept
      var args = Array.prototype.slice.call(arguments);
      _fn.apply(this, args);
    });
  };

}(selbench));

// ================================================================================
// from: user-extensions-base.js

/*jslint
 indent:2
,maxerr:500
,plusplus:true
,white:true
,nomen:true
*/
/*globals
Selenium:true,
htmlTestRunner:true
*/
(function($$){
  $$.seleniumEnv = "server";
  // this flag is global so that SelBlocks and SelBench can be used together
  $$.globalContext.serverPatchApplied = $$.globalContext.serverPatchApplied || false;

  if (!$$.globalContext.serverPatchApplied) {
    $$.LOG.info("Applying testCase server patch for " + $$.name);
    $$.fn.interceptAfter(Selenium.prototype, "reset", initTestCase);
    $$.globalContext.serverPatchApplied = true;
  }

  // Selenium Core does not have the testCase object
  // but the currentTest object can be extended for our purposes
  function initTestCase()
  {
    if (!(typeof htmlTestRunner === "undefined" || htmlTestRunner === null)) {
      // TBD: map commands to real types instead of faking it
      htmlTestRunner.currentTest.commands = mapCommands(htmlTestRunner.currentTest.htmlTestCase.getCommandRows());
      $$.globalContext.testCase = htmlTestRunner.currentTest;
      // debugContext isn't on this object, but redirecting to the currentTest seems to work
      $$.globalContext.testCase.debugContext = htmlTestRunner.currentTest;
      // define pseudo properties with getters/setters on a hidden property,
      // so that they both maintain the same value.
      Object.defineProperties($$.globalContext.testCase, {
        "_nextCommandRowIndex" : {
          writable : true
        }
        ,"debugIndex" : { // for IDE
          enumerable : true
          ,get : function () { return this._nextCommandRowIndex; }
          ,set : function (idx) { this._nextCommandRowIndex = idx; }
        }
        ,"nextCommandRowIndex" : { // for Selenium Server
          enumerable : true
          ,get : function () { return this._nextCommandRowIndex; }
          ,set : function (idx) { this._nextCommandRowIndex = idx; }
        }
      });
    }

    function mapCommands(cmdRows) {
      var mappedCmds = [];
      for (var i = 0; i < cmdRows.length; ++i) {
        mappedCmds.push(importCommand(cmdRows[i]));
      }
      return mappedCmds;
    }

    function importCommand(cmdRow) {
      var cmd = cmdRow.getCommand();
      if (cmdRow.hasOwnProperty("trElement")) {
        cmd.type = "command";
      } else {
        cmd.type = "comment";
      }
      return cmd;
    }
  }
}(selbench));

// ================================================================================
// from: selbench.js

/*
 * SelBench 1.1
 *
 * Utilities for testing, validating, and benchmarking Selenium IDE tests and extensions
 *
 * Add this file to Selenium: Options -> Options... "Selenium Core extensions"
 *   (not "Selenium IDE extensions", because we are accessing the Selenium object)
 *
 * Features
 *  - Commands: alert/log/clearLog, expectError, emit/assertEmitted/resetEmitted, startTimer/timerElapsed, deleteVar/deleteVars
 *  - The emit commands provide a way to validate sequencing and accumulated state.
 *  - The expectError command facilitates negative testing by handling command failure as success.
 *  - The alert command is equivalent to getEval|alert()
 *  - The timer commands provide interval timing of scripts.
 *  - $w() and $d() are shorthand references to the Selenium IDE window, the browser window, and browser document.
 *
 * Wishlist:
 *  - Timer formatting options
 */

// browser window (eg: $w().history .navigator .location .menubar .toolbar .statusbar .sidebar)
function $w() { return selenium.browserbot.getCurrentWindow(); }
// document (eg: $d().title)
function $d() { return selenium.browserbot.getDocument(); }

// selbench name-space
(function($$){

  // ================================================================================
  // tail intercept Selenium.reset()

  // called when Selenium IDE opens / on Dev Tools [Reload] button / upon first command execution
  $$.fn.interceptAfter(Selenium.prototype, "reset", function()
  {
    // called before each: execute a single command / run a testcase / run each testcase in a testsuite
    $$.LOG.debug("In SelBench tail intercept :: selenium.reset()");
    $$.seleniumTestLoop = ($$.seleniumEnv == "server")
      ? HtmlRunnerTestLoop                     // Selenium Server
      : editor.selDebugger.runner.IDETestLoop; // Selenium IDE

    try {
      compileSelbenchCommands();
    }
    catch (err) {
      throw new Error("In " + err.fileName + " @" + err.lineNumber + ": " + err);
    }
    storedVars.emitted = "";
  });

  function compileSelbenchCommands()
  {
    // scan for any Selbench commands ending in AndWait
    for (var i = 0; i < testCase.commands.length; i++)
    {
      if (testCase.commands[i].type == "command")
      {
        var curCmd = testCase.commands[i].command;
        var aw = curCmd.indexOf("AndWait");
        if (aw !== -1) {
          // just ignore the suffix for now, this may or may not be a SelBench command
          curCmd = curCmd.substring(0, aw);
        }

        switch(curCmd) {
          case "emit": case "assertEmitted": case "resetEmitted":
          case "timer": case "timerElapsed":
          case "alert": case "log": case "clearLog":
            assertNotAndWaitSuffix(i);
        }
      }
    }
    //- command validation
    function assertNotAndWaitSuffix(cmdIdx) {
      assertCmd(cmdIdx, (aw === -1),
        ", AndWait suffix is not valid for SelBench commands");
    }
  }

  // ================================================================================
  Selenium.prototype.doExpectError = function(target) {
    $$.expectedError = $$.evalWithVars(target);
    $$.fn.interceptOnce($$.seleniumTestLoop.prototype, "resume", $$.handleAsExpectError);
  };

  // ================================================================================
  // emit execution tracing

  // ================================================================================

  // appends the given string to current emitted state, (a ~ is inserted between each append)
  Selenium.prototype.doEmit = function(target)
  {
    if (storedVars.emitted)
      storedVars.emitted += "~";
    storedVars.emitted += $$.evalWithVars(target);
  };
  // verifies that the accumulated emit state matches the given string
  // if an array is specified, then matches for a ~ between each element
  Selenium.prototype.doAssertEmitted = function(target, value)
  {
    var expectedValue = $$.evalWithVars(target);
    if (expectedValue instanceof Array) {
      expectedValue = expectedValue.join("~");
    }
    if (expectedValue != storedVars.emitted) {
      var errmsg = " expected: " + expectedValue + "\nbut found: " + storedVars.emitted;
      throw new Error(errmsg);
    }
  };
  // clears the accumulated emitted state
  Selenium.prototype.doResetEmitted = function()
  {
    storedVars.emitted = "";
  };

  // ================================================================================
  // utility commands

  // display alert message with the evaluated expression
  Selenium.prototype.doAlert = function(expr) {
    alert($$.evalWithVars(expr));
  };

  // log the evaluated expression
  Selenium.prototype.doLog = function(expr, level) {
    if (!level)
      level = "info";
    if (!$$.LOG[level])
      throw new Error("'" + level + "' is not a valid logging level");
    $$.LOG[level]($$.evalWithVars(expr));
  };

  // clear the IDE log window
  Selenium.prototype.doClearLog = function() {
    if ($$.seleniumEnv != "ide") {
      $$.LOG.warn("clearLog command ignored in non-IDE environment");
      return;
    }
    editor.getUserLog().clear();
  }

  // remove a selenium variable
  Selenium.prototype.doDeleteVar = function(name) {
    $$.LOG.warn("The deleteVar command has been deprecated as of SelBench 1.0.1 and will be removed in future releases."
      + " Please use deleteVars instead.");
    delete storedVars[name];
  };

  // remove selenium variables
  Selenium.prototype.doDeleteVars = function(namesSpec) {
    var names = namesSpec.split(",");
    for (var i = 0; i < names.length; i++) {
      delete storedVars[names[i].trim()];
    }
  };


  // ========= error handling =========

  function notifyFatal(msg) {
    $$.LOG.error("SelBench error " + msg);
    throw new Error(msg);
  }
  function notifyFatalCmdRef(idx, msg) { notifyFatal(fmtCmdRef(idx) + msg); }
  function assertCmd(idx, cond, msg) { if (!cond) { notifyFatalCmdRef(idx, msg); } }
  function assertNotAndWaitSuffix(idx) {
    var aw = testCase.commands[idx].command.indexOf("AndWait");
    assertCmd(idx, (aw === -1),
      ", AndWait suffix is not valid for SelBench commands");
  }

  function fmtCmdRef(idx) { return ("@" + (idx+1) + ": " + fmtCommand(testCase.commands[idx])); }
  function fmtCommand(cmd) {
    var c = cmd.command;
    if (cmd.target) c += "|" + cmd.target;
    if (cmd.value)  c += "|" + cmd.value;
    return '[' + c + ']';
  }

  //================= utils ===============

  $$.evalWithVars = function(expr) {
    // EXTENSION REVIEWERS: Use of eval is consistent with the Selenium extension itself.
    // Scripted expressions run in the Selenium window, isolated from any web content.
    return eval("with (storedVars) {" + expr + "}");
  }

  function getIdeLogLevel() {
    return parseInt(editor.getOptions().logLevel);
  }

  // ================================================================================
  // Timers

  var timers = {};

  Selenium.prototype.doStartTimer = function(name, description) {
    timers[name] = new Timer(description);
  };

  Selenium.prototype.doTimerElapsed = function(name, script)
  {
    if (script) {
      storedVars._elapsed = timers[name].elapsed();
      $$.evalWithVars(script);
    }
    else
      $$.LOG.info(timers[name].elapsed());
  };

  function Timer(desc, logLevel) {
    var msStart = +new Date();
    this.elapsed = function() {
      var msElapsed = +new Date() - msStart;
      var msg = formatDuration(msElapsed) + " elapsed: " + (desc || "");
      if (logLevel) $$.LOG[logLevel](msg);
      return msg;
    };
  }

  var SEC  = 1;
  var MIN  = 60 * SEC;
  var HOUR = 60 * MIN;
  var DAY  = 24 * HOUR;

  function formatDuration(millis)
  {
    var sec = millis / 1000;
    var fmt = "";

    if (sec > DAY) {
      fmt = (sec / DAY).toFixed() + " day ";
      sec %= DAY;
    }
    if (sec > (1.5 * HOUR) || fmt.length > 0) {
      fmt += (sec / HOUR).toFixed() + " hour ";
      sec %= HOUR;
    }
    if (sec > (1.5 * MIN) || fmt.length > 0) {
      fmt += (sec / MIN).toFixed() + " min ";
      sec %= MIN;
    }
    /*
    breakDown(1.0, DAY,  "day");
    breakDown(1.5, HOUR, "hour");
    breakDown(1.5, MIN,  "min");
    //-
    function breakDown(threshold, unit, unitName) {
      if (sec > (threshold * unit) || fmt.length > 0) {
        fmt += (sec / unit).toFixed() + " " + unitName + " ";
        sec %= unit;
      }
    }
    */

    return fmt + sec.toFixed(3) + " sec";
  }

}(selbench));

// ================================================================================
// from: selenium-executionloop-handleAsExpectError.js

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
