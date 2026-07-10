$ErrorActionPreference = "Stop"

function Test-Docker {
  try {
    docker version | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (Test-Docker) {
  Write-Output "Docker CLI already available."
  exit 0
}

$possible = @(
  "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
  "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe",
  "$env:ProgramFiles\Docker\Docker\DockerDesktop.exe"
)

$found = $possible | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($null -ne $found) {
  Write-Output "Starting Docker Desktop from: $found"
  Start-Process -FilePath $found
} else {
  Write-Error "Docker CLI not available and Docker Desktop executable not found. Please start Docker Desktop manually."
  exit 2
}

# Wait for docker to become available
$timeout = 120
$interval = 2
$elapsed = 0
while (-not (Test-Docker) -and $elapsed -lt $timeout) {
  Start-Sleep -Seconds $interval
  $elapsed += $interval
  Write-Output "Waiting for Docker to become ready... ($elapsed/$timeout)"
}

if (Test-Docker) {
  Write-Output "Docker ready."
  exit 0
} else {
  Write-Error "Timed out waiting for Docker to become available."
  exit 3
}
