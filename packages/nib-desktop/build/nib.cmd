@echo off
rem Nib CLI launcher. The installer copies this to %LOCALAPPDATA%\Nib\bin and
rem puts that directory on the user PATH, so `nib --version` works in any new
rem terminal without a Node.js installation: the CLI runs through the desktop
rem app's own Electron runtime in Node mode.
rem
rem NOTE: this points at the default per-user install directory
rem (%LOCALAPPDATA%\Programs\Nib). If Nib was installed to a custom directory,
rem re-run the installer so it rewrites the launcher.
setlocal
set "ELECTRON_RUN_AS_NODE=1"
"%LOCALAPPDATA%\Programs\Nib\Nib.exe" "%LOCALAPPDATA%\Nib\bin\cli\index.js" %*
endlocal & exit /b %ERRORLEVEL%
