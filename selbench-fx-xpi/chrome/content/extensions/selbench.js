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

  // log the evaluated expression
  Selenium.prototype.doClearLog = function(expr, level) {
    // only applicable for IDE
    if (typeof editor != "undefined")
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
