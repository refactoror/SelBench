SETLOCAL
:: Dependencies:
::   cygwin sed

::@echo off

pushd "%~dp0"
del ..\user-extensions.js

SET SRC_DIR=..\selbench-fx-xpi\chrome\content\extensions

:: get .js file names from extension-loader.xul
sed -n "/addPluginProvidedUserExtension/p" "%SRC_DIR%/extension-loader.xul" | sed -e "s~[^\x22]*\x22/~~" -e "s/\x22.*//" > jsFilenames.txt

:: concatenate .js files
echo // To use Selblocks commands in Selenium Server, provide this file on the command line.>> ..\user-extensions.js
echo // Eg: -userExtensions "C:\somewhere\user-extensions.js">> ..\user-extensions.js
FOR /F %%L IN (jsFilenames.txt) DO (
  CALL :s_concat %SRC_DIR% %%L
)
del jsFilenames.txt

:: create minified version of user-extensions.js
"%JAVA_HOME%\bin\java" -jar "lib/yuicompressor-2.4.8.jar" ^
     ../user-extensions.js ^
  -o ../user-extensions-min.js
IF NOT ERRORLEVEL 1 goto :checked
echo ERRORLEVEL=%ERRORLEVEL%
pause
:checked

popd

ENDLOCAL
goto :done

:s_concat
  IF "%2" == "selbench.js" (
    CALL :s_concat . user-extensions-base.js
  )
  echo.>> ..\user-extensions.js
  echo // ================================================================================>> ..\user-extensions.js
  echo // from: %2>> ..\user-extensions.js
  echo.>> ..\user-extensions.js
  type %1\%2 >> ..\user-extensions.js
  goto :eof

:done
::pause
