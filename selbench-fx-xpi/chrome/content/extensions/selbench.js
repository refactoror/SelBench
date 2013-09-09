/**
 * SelBench 0.0
 *
 * Utilities for testing and debugging selenium tests and extensions
 *
 * Add this file to Selenium: Options -> Options... "Selenium Core extensions"
 *   (not "Selenium IDE extensions", because we are accessing the Selenium object)
 * 
 * Features
 *  - Commands: emit/assertEmitted/resetEmitted, expectError, alert, timer/timerElapsed
 *  - The emit commands provide a way to validate sequencing and accumulated state.
 *  - The expectError command facilitates negative testing by handling command failure as success.
 *  - The alert command is equivalent to getEval|alert()
 *  - The timer commands provide interval timing of scripts.
 *  - $w() and $d() are shorthand references to the window and document objects.
 *
 * Wishlist:
 *  - Timer formatting options
 *   
 */

function $w() { return selenium.browserbot.getCurrentWindow(); }
function $d() { return selenium.browserbot.getDocument(); }

// selbench name-space
(function(_){

  function evalWithVars(expr) {
    return eval("with (storedVars) {" + expr + "}");
  }

  // ================================================================================
  // tail intercept Selenium.reset()

  (function () {
   // called when Selenium IDE opens / on Dev Tools [Reload] button / upon first command execution
    var orig_reset = Selenium.prototype.reset;
    Selenium.prototype.reset = function() {
      orig_reset.call(this);
      // called before each: execute a single command / run a testcase / run each testcase in a testsuite
      _.LOG.debug("In SelBench tail intercept :: selenium.reset()");

      try {
        compileSelbenchCommands();
      }
      catch (err) {
        throw new Error("In " + err.fileName + " @" + err.lineNumber + ": " + err);
      }
      storedVars.emitted = "";
    };
  })();

  function compileSelbenchCommands()
  {
    // scan for any Selbench commands ending in AndWait
    for (var i = 0; i < testCase.commands.length; i++)
    {
      if (testCase.commands[i].type == "command")
      {
        var curCmd = testCase.commands[i].command;
        var stemLength = curCmd.indexOf("AndWait");
        if (stemLength == -1)
          stemLength = curCmd.length;

        switch (curCmd.substring(0, stemLength)) {
          case "emit": case "assertEmitted": case "resetEmitted":
          case "timer": case "timerElapsed":
          case "alert":
            if (curCmd.indexOf("AndWait") != -1)
              notifyFatal(fmtCmdRef(i) + ", AndWait suffix is not valid for SelBench commands");
        }
      }
    }
  }

  // ================================================================================
  // emit execution tracing

  function evalWithVars(expr) {
    return eval("with (storedVars) {" + expr + "}");
  }


  // ================================================================================
  Selenium.prototype.doExpectError = function(target) {
    _.pushFn(editor.selDebugger.runner.IDETestLoop.prototype, "resume", _.handleAsExpectError);
    _.expectedError = eval(target);
  };

  // ================================================================================
  Selenium.prototype.doEmit = function(target)
  {
    if (storedVars.emitted)
      storedVars.emitted += "~";
    storedVars.emitted += evalWithVars(target);
  };
  Selenium.prototype.doAssertEmitted = function(target, value)
  {
    _.LOG.info("emitted: " + storedVars.emitted);
    var expecting = eval(target);
    if (expecting != storedVars.emitted) {
      var errmsg = " expected: " + expecting + "\nbut found: " + storedVars.emitted;
      alert(errmsg);
      throw new Error(errmsg);
    }
  };
  Selenium.prototype.doResetEmitted = function()
  {
    storedVars.emitted = "";
  };

  // ================================================================================
  // utility commands

  // log the evaluated expression
  Selenium.prototype.doLog = function(expr) {
    _.LOG.info(evalWithVars(expr));
  };

  // display alert message with the evaluated expression
  Selenium.prototype.doAlert = function(expr) {
      alert(evalWithVars(expr));
  };


  // ========= error handling =========

  function notifyFatal(msg) {
    _.LOG.error("SelBench error " + msg);
    throw new Error(msg);
  }

  function fmtCmdRef(idx) { return ("@" + (idx+1) + ": " + fmtCommand(testCase.commands[idx])); }
  function fmtCommand(cmd) {
    var c = cmd.command;
    if (cmd.target) c += "|" + cmd.target;
    if (cmd.value)  c += "|" + cmd.value;
    return '[' + c + ']';
  }

  // ================================================================================
  // Timers

  var timers = {};

  Selenium.prototype.doTimer = function(name, description) {
    timers[name] = new Timer(description);
  };

  Selenium.prototype.doTimerElapsed = function(name, script)
  {
    if (script) {
      storedVars._elapsed = timers[name].elapsed();
      eval(script);
    }
    else
      _.LOG.info(timers[name].elapsed());
  };

  function Timer(desc, logLevel) {
    var msStart = +new Date();
    this.elapsed = function() {
      var msElapsed = +new Date() - msStart;
      var msg = formatDuration(msElapsed) + " elapsed: " + (desc || "");
      if (logLevel) _.LOG[logLevel](msg);
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
