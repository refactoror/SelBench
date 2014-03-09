SelBench
=========

SelBench is a collection of utilities for testing, validating, and benchmarking Selenium IDE scripts. This is especially useful for instrumenting scripts that are used to test Selenium IDE extensions.

Commands
* <code>$w()</code> and <code>$d()</code> are shorthand references to the window and document objects.
* The <code>log</code> command is equivalent to <code>getEval|LOG.info(message)</code>
* The <code>alert</code> command is equivalent to <code>getEval|alert(message)</code>
* The <code>expectError</code> command facilitates negative testing by handling command failure as success.
* The <code>emit</code>, <code>assertEmitted</code>, <code>resetEmitted</code> commands provide a way to validate sequencing and accumulated state.
* The <code>startTimer</code>, <code>timerElapsed</code> commands provide interval timing of scripts.
* The <code>deleteVar</code> commnad removes a Selenium variable

[Firefox Installer](https://addons.mozilla.org/en-US/firefox/addon/selenium-ide-selbench/)
