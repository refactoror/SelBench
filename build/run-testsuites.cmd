SETLOCAL
:: Dependencies:
::   cygwin sed

@echo off

pushd "%~dp0"
md logs 2>nul

set UE=user-extensions-min

CALL createSelbenchUserExtensions.cmd

:: for each browser, run each test suite
CALL :s_run_suites "*firefox"
CALL :s_run_suites "*googlechrome"
CALL :s_run_suites "*opera"
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

  CALL :s_run_suite "%~1" ..\selbenchTests\_SelBench-regression.html
  CALL :s_run_suite "%~1" ..\selbenchTests\negativeTests\_SelBench-regression-negative.html
goto :eof

:s_run_suite
:: <browser-spec> <test-suite-html>
  :: parse browser name, (eliminate leading *, and path if any)
  FOR /F "tokens=1 delims=*^ " %%B IN ("%~1") DO set BROWSER_SPEC=%%B
  @echo on
  "%JAVA_HOME%\bin\java" ^
    -jar "lib\selenium-server-standalone-2.44.0.jar" ^
    -singleWindow ^
    -debug ^
    -log logs\server.log ^
    -logLongForm ^
    -browserSideLog ^
    -userExtensions lib/user-extensions.js ^
    -htmlSuite "%~1" ^
    "http://refactoror.net/" ^
    "%2" ^
    "%~d2%~p2\_results_%BROWSER_SPEC%.html"
  @echo off
  :: strip out randomly generated Selenium depecation warnings
  sed "/Please update to WebDriver ASAP/d" "%~d2%~p2\_results_%BROWSER_SPEC%.html" > "%~d2%~p2\_results_%BROWSER_SPEC%.tmp"
  del "%~d2%~p2\_results_%BROWSER_SPEC%.html"
  ren "%~d2%~p2\_results_%BROWSER_SPEC%.tmp" "_results_%BROWSER_SPEC%.html"
  CALL "%~d2%~p2\_results_%BROWSER_SPEC%.html"
goto :eof

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
TBD browsers
CALL :s_run_suites "*iexplore"
CALL :s_run_suites "*safari"

    -proxyInjectionMode ^
