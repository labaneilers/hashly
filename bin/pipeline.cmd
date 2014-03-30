@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\pipeline" %*
) ELSE (
  node  "%~dp0\pipeline" %*
)