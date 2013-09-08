SETLOCAL

:: Pre-requisites:
::   Hand-edit selbench-fx-xpi/install.rdf: <em:version>x.y.z
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
zip -r "%STAGING%selbench-%SU_VER%-fx.xpi" * -x@"%STAGING%xpi-excludes.lst"
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
