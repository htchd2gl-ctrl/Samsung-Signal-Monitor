$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path settings.json)) { throw 'Zuerst setup.ps1 starten' }
node server.js
