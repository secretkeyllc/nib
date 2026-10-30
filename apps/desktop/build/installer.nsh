# Nib NSIS installer hooks.
#
# electron-builder's stock installer never verifies that the app payload made
# it onto disk. When 7-Zip extraction fails it still reports "Nib has been
# installed", still writes the desktop and Start-menu shortcuts, and Windows
# then greets the user with a bare "Missing Shortcut — Windows is searching for
# Nib.exe" dialog. That is exactly what happened with the 0.22.1 Windows-on-Arm
# build: the payload was compressed with 7-Zip's ARM64 branch filter, which the
# installer's bundled nsis7z plugin (7-Zip 19.00) cannot decode, so Nib.exe and
# every DLL were dropped while the rest of the files extracted fine.
#
# The payload is now built with the BCJ2 filter (see
# scripts/build-desktop-release.mjs). These hooks are the backstop: never
# finish an install whose executable is missing, and never let an Arm build be
# installed on an x64 machine.

# Refuse to install the Arm build on anything that is not a native Arm64
# machine. Without this the stock installer extracts nothing at all and still
# "succeeds", because its payload only carries the arm64 archive.
!macro customInit
  !ifdef APP_ARM64
    !ifndef APP_64
      ${ifNot} ${IsNativeARM64}
        MessageBox MB_OK|MB_ICONSTOP "This is the Windows on Arm build of Nib.$\r$\n$\r$\nThis PC is not an Arm64 machine. Download the x64 installer from https://nib.am/download.html instead."
        Quit
      ${endif}
    !endif
  !endif
!macroend

# Verify the application binary exists before the installer can report success.
!macro customInstall
  ${ifNot} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    # Do not leave shortcuts pointing at a file that is not there.
    Delete "$newDesktopLink"
    Delete "$newStartMenuLink"

    # A silent run (/S) is the in-app updater: it must fail with a non-zero
    # exit code instead of waiting on a dialog nobody can see.
    ${ifNot} ${Silent}
      MessageBox MB_OK|MB_ICONSTOP "${PRODUCT_NAME} could not be unpacked into:$\r$\n$INSTDIR$\r$\n$\r$\nThe download may be incomplete or blocked by security software. Download the installer again from https://nib.am/download.html and run it once more."
    ${endif}
    SetErrorLevel 2
    Quit
  ${endif}
!macroend
