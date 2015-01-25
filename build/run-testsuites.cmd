SETLOCAL
@echo off

pushd "%~dp0"

set UE=user-extensions-min

CALL createSelbenchUserExtensions.cmd

:: for each browser, run each test suite
> browsers.heredoc (
  @echo firefox
)
FOR /F %%B IN (browsers.heredoc) do (
  CALL :s_run_suites %%B
)
del *.heredoc

popd

ENDLOCAL

goto :eof

:s_run_suites
:: <browser-name>
  :: combine the required extensions into lib\user-extensions.js
  del lib\user-extensions.js
  > js.heredoc (
    @echo ..\%UE%.js
  )
  FOR /F %%J IN (js.heredoc) do (
    type %%J >> lib\user-extensions.js
    echo.>> lib\user-extensions.js
  )

  CALL :s_run_suite %1 ..\selbenchTests\_SelBench-regression.html
  CALL :s_run_suite %1 ..\selbenchTests\negativeTests\_SelBench-regression-negative.html
goto :eof

:s_run_suite
:: <browser-name> <test-suite-html>
  @echo on
  "%JAVA_HOME%\bin\java" ^
    -jar "lib\selenium-server-standalone-2.44.0.jar" ^
    -debug ^
    -singleWindow ^
    -log server.log ^
    -logLongForm ^
    -userExtensions lib/user-extensions.js ^
    -htmlSuite "*%1" ^
    "http://www.google.com" ^
    "%2" "%~p2\_results.html"
  @echo off
  CALL "%~p2\_results.html"
goto :eof

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  @echo googlechrome
  @echo piiexplore
  @echo opera
  @echo safari
