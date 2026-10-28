; installer.nsh — Nib additions to the electron-builder NSIS installer.
;
; Wired up by build/electron-builder.json ("nsis" -> "include"). The path is
; resolved against the project dir by electron-builder, and its generated
; script calls the customInstall / customUnInstall macros below because they
; are defined here (guarded by !ifmacrodef in the electron-builder template).
;
; Self-contained on purpose: no !include of shared headers and no constants
; that could clash with WinMessages.nsh, so the ordering inside
; electron-builder's generated script cannot break compilation.
;
; What it does beyond the default install:
;   - copies resources\cli\nib.cmd to %LOCALAPPDATA%\Nib\bin (on PATH)
;   - copies the bundled CLI (resources\cli) to %LOCALAPPDATA%\Nib\bin\cli
;   - appends %LOCALAPPDATA%\Nib\bin to the user Path (deduplicated), so
;     `nib --version` works in any new terminal without installing Node
;   - reverses all of the above on uninstall and broadcasts
;     WM_SETTINGCHANGE so running shells pick the Path change up

; Unique, guarded names — deliberately not ${WM_SETTINGCHANGE}/${HWND_BROADCAST},
; which belong to WinMessages.nsh and may or may not be included yet.
!ifndef NIB_HWND_BROADCAST
  !define NIB_HWND_BROADCAST 0xFFFF
!endif
!ifndef NIB_WM_SETTINGCHANGE
  !define NIB_WM_SETTINGCHANGE 0x001A
!endif

; Locations managed outside $INSTDIR. $LOCALAPPDATA is correct for a
; per-user install (nsis.perMachine = false).
!define NIB_BIN_DIR "$LOCALAPPDATA\Nib\bin"
!define NIB_CLI_DIR "$LOCALAPPDATA\Nib\bin\cli"
!define NIB_PATH_ENTRY "$LOCALAPPDATA\Nib\bin"

; Append ${NIB_PATH_ENTRY} to the current user's Path unless an equivalent
; entry is already present. Matching is case-insensitive and accepts both the
; expanded form and a literal "%LOCALAPPDATA%\Nib\bin" entry, so a reinstall
; or a hand-edited Path never grows duplicates.
Function NibAddToPath
  ClearErrors
  ReadRegStr $R0 HKCU "Environment" "Path"
  IfErrors nibAddFresh 0

  StrCpy $R1 "%LOCALAPPDATA%\Nib\bin"
  System::Call 'shlwapi::StrStrIW(t R0, t R1) p .R2'
  IntCmp $R2 0 0 nibAddDone nibAddDone
  StrCpy $R1 "${NIB_PATH_ENTRY}"
  System::Call 'shlwapi::StrStrIW(t R0, t R1) p .R2'
  IntCmp $R2 0 0 nibAddDone nibAddDone

  ; Not present: append. The old value is written back verbatim — ReadRegStr
  ; returns REG_EXPAND_SZ data unexpanded, so %SystemRoot% and friends stay
  ; symbolic through the rewrite.
  StrCmp $R0 "" 0 nibAddAppend
  WriteRegExpandStr HKCU "Environment" "Path" "${NIB_PATH_ENTRY}"
  Return

nibAddAppend:
  WriteRegExpandStr HKCU "Environment" "Path" "$R0;${NIB_PATH_ENTRY}"
  Return

nibAddFresh:
  WriteRegExpandStr HKCU "Environment" "Path" "${NIB_PATH_ENTRY}"

nibAddDone:
  Return
FunctionEnd

; Rebuild the user Path without the Nib entry, delete the value entirely when
; nothing is left, and broadcast the change. Tokens are compared
; case-insensitively against both the expanded and the %LOCALAPPDATA% form.
Function un.NibRemoveFromPath
  ClearErrors
  ReadRegStr $R0 HKCU "Environment" "Path"
  IfErrors unNibDone 0

  Push $R0              ; remember the original to detect a no-op
  StrCpy $R5 "%LOCALAPPDATA%\Nib\bin"
  StrCpy $R6 "${NIB_PATH_ENTRY}"
  StrCpy $R8 ""         ; rebuilt Path
  StrCpy $R9 1          ; "no token kept yet" flag

unNibNextToken:
  StrCpy $R7 0          ; scan offset within the current remainder
  StrCmp $R0 "" unNibWrite

unNibScanChar:
  StrLen $R1 $R0
  IntCmp $R7 $R1 unNibTail unNibProbe unNibTail

unNibProbe:
  StrCpy $R2 $R0 1 $R7
  StrCmp $R2 ";" 0 unNibAdvance
  IntOp $R4 $R7 + 1
  StrCpy $R3 $R0 $R7            ; token before the ';'
  StrCpy $R0 $R0 "" $R4         ; remainder after the ';'
  Goto unNibFilter

unNibAdvance:
  IntOp $R7 $R7 + 1
  Goto unNibScanCharChar

unNibTail:
  StrCpy $R3 $R0                ; last token runs to the end
  StrCpy $R0 ""

unNibFilter:
  StrCmp $R3 "" unNibNextToken  ; drop empty tokens
  System::Call 'kernel32::lstrcmpiW(t R3, t R5) i .R2'
  IntCmp $R2 0 unNibNextToken
  System::Call 'kernel32::lstrcmpiW(t R3, t R6) i .R2'
  IntCmp $R2 0 unNibNextToken
  StrCmp $R9 1 0 unNibJoin
  StrCpy $R8 $R3
  StrCpy $R9 0
  Goto unNibNextToken

unNibJoin:
  StrCpy $R8 "$R8;$R3"
  Goto unNibNextToken

unNibWrite:
  Pop $R4                       ; original Path
  StrCmp $R8 $R4 unNibDone      ; nothing removed, leave the registry alone
  StrCmp $R8 "" 0 unNibKeep
  DeleteRegValue HKCU "Environment" "Path"
  Goto unNibDone

unNibKeep:
  WriteRegExpandStr HKCU "Environment" "Path" $R8

unNibDone:
  SendMessage ${NIB_HWND_BROADCAST} ${NIB_WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
  Return
FunctionEnd

!macro customInstall
  ; 1) nib.cmd -> %LOCALAPPDATA%\Nib\bin
  IfFileExists "$INSTDIR\resources\cli\nib.cmd" 0 nibInstallNoCmd
    CreateDirectory "${NIB_BIN_DIR}"
    CopyFiles /SILENT "$INSTDIR\resources\cli\nib.cmd" "${NIB_BIN_DIR}"
  nibInstallNoCmd:

  ; 2) bundled CLI -> %LOCALAPPDATA%\Nib\bin\cli (replaced on upgrade)
  IfFileExists "$INSTDIR\resources\cli\*.*" 0 nibInstallNoCli
    CreateDirectory "${NIB_BIN_DIR}"
    RMDir /r "${NIB_CLI_DIR}"
    CopyFiles "$INSTDIR\resources\cli" "${NIB_CLI_DIR}"
  nibInstallNoCli:

  ; 3) put %LOCALAPPDATA%\Nib\bin on the user Path for new shells
  Call NibAddToPath
  SendMessage ${NIB_HWND_BROADCAST} ${NIB_WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend

!macro customUnInstall
  ; reverse of customInstall: bundled CLI, launcher, then the PATH entry
  RMDir /r "${NIB_BIN_DIR}"
  RMDir "$LOCALAPPDATA\Nib"
  Call un.NibRemoveFromPath
!macroend
