SelBench
=========

SelBench is a collection of utility commands for testing, validating, and benchmarking Selenium IDE scripts. This is especially useful for instrumenting scripts that are in turn used to test Selenium IDE extensions.

Commands
* <code>$w()</code> and <code>$d()</code> are shorthand references to the window and document objects.
* The <code>alert</code> command is equivalent to <code>getEval|alert()</code>
* The <code>expectError</code> command facilitate negative testing by handling command failure as success.
* The <code>emit</code>/<code>assertEmitted</code>/<code>resetEmitted</code> commands provide a way to validate sequencing and accumulated state.
* The <code>timer</code>/<code>timerElapsed</code> commands provide interval timing of scripts.

[Firefox Installer](https://addons.mozilla.org/en-US/firefox/addon/selenium-ide-selbench/)