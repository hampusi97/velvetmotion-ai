@echo off
setlocal
cd /d "%~dp0"
set "VM_APP_DIR=%~dp0"
set "VM_OLLAMA_EXE=ollama"
where ollama >nul 2>&1
if not errorlevel 1 goto nodecheck
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
  set "VM_OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
  goto nodecheck
)
echo Install Ollama once, then double-click START-WINDOWS.cmd again.
start "" "https://ollama.com/download/windows"
pause
exit /b 1

:nodecheck
set "VM_NODE=node"
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)" >nul 2>&1
if not errorlevel 1 goto run
set "VM_NODE=%~dp0.runtime\node\node.exe"
if exist "%VM_NODE%" goto run
echo Preparing portable Node.js. This stays inside this folder.
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $root=Join-Path $env:VM_APP_DIR '.runtime'; New-Item -ItemType Directory -Force $root | Out-Null; $arch=if($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64'){'arm64'}else{'x64'}; $name='node-v24.22.2-win-'+$arch+'.zip'; $base='https://nodejs.org/dist/v24.22.2/'; $checks=(Invoke-WebRequest -UseBasicParsing ($base+'SHASUMS256.txt')).Content; $match=[regex]::Match($checks,'(?m)^([0-9a-f]{64})\s+'+[regex]::Escape($name)+'\r?$'); if(-not $match.Success){throw 'Official checksum not found'}; $zip=Join-Path $root $name; Invoke-WebRequest -UseBasicParsing ($base+$name) -OutFile $zip; if((Get-FileHash $zip -Algorithm SHA256).Hash.ToLower() -ne $match.Groups[1].Value){Remove-Item $zip; throw 'Node download checksum failed'}; Expand-Archive -Path $zip -DestinationPath $root -Force; Move-Item (Join-Path $root ('node-v24.22.2-win-'+$arch)) (Join-Path $root 'node'); Remove-Item $zip"
if errorlevel 1 (
  echo Runtime setup failed. Check your connection and try again.
  pause
  exit /b 1
)

:run
"%VM_NODE%" "%~dp0server.mjs"
pause
