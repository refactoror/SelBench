SETLOCAL

:: Pre-requisites:
::   Hand-edit install.rdf: <em:version>x.y.z
::             about.xul: text box
::             selbench.js: header comment
:: Assumptions:
::   cygwin grep
::   cygwin zip

set STAGING=%~dp0

:: parse SelBench version # from its install.rdf
call :S_GET_ADDON_VER ..\selbench-fx-xpi
set SU_VER=%_ver%

echo SelBench: %SU_VER%


:: create SelBench xpi
pushd ..\selbench-fx-xpi
del "%STAGING%selbench-%SU_VER%-fx.xpi"
zip -r "%STAGING%/../../historical-xpi/selbench-%SU_VER%-fx.xpi" * -x@"%STAGING%xpi-excludes.lst"
popd

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
pause
