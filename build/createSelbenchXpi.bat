SETLOCAL

:: Pre-requisites:
::   Hand-edit install.rdf: <em:version>x.y.z
::             about.xul: text box
::             selbench.js: header comment
:: Assumptions:
::   cygwin grep
::   cygwin zip

set BUILD_DIR=%~dp0
set ROOT=%BUILD_DIR%..

:: parse SelBench version # from its install.rdf
call :S_GET_ADDON_VER ..\selbench-fx-xpi
set SU_VER=%_ver%

echo SelBench: %SU_VER%


:: create SelBench xpi
pushd %BUILD_DIR%\..\selbench-fx-xpi
del "%ROOT%\selbench-%SU_VER%-fx.xpi"
zip -r "%ROOT:\=/%/../selbench-%SU_VER%-fx.xpi" * -x@"%BUILD_DIR%xpi-excludes.lst"
popd

:: assemble user-extensions.js file
CALL createSelbenchUserExtensions.cmd

:: create minified version of user-extensions.js
"%JAVA_HOME%\bin\java" -jar "yuicompressor-2.4.8.jar" ^
   ../user-extensions.js ^
-o ../user-extensions-min.js

ENDLOCAL

GOTO :done

:S_GET_ADDON_VER
  SETLOCAL
  FOR /F "tokens=1,2,3 delims=><" %%L IN ('grep "em:version" %1\install.rdf') DO (
    :: L-M-N
    echo %%L %%M %%N
    set _ver=%%N
  )
  ENDLOCAL & set _ver=%_ver%
  GOTO :eof

ENDLOCAL

ENDLOCAL

:done
::pause
