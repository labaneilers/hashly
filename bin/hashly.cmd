@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\hashly" %*
) ELSE (
  node  "%~dp0\hashly" %*
)