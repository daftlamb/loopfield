param([string]$NativeDeps=$env:LOOPFIELD_NATIVE_DEPS)
$ErrorActionPreference='Stop'
if(-not $NativeDeps){$NativeDeps=Join-Path $PSScriptRoot '..\.deps\handheld'}
$nativeDeps=$NativeDeps
$zig=Join-Path $nativeDeps 'zig-windows-x86_64-0.13.0\zig.exe'
$headers=Join-Path $nativeDeps 'SDL-release-2.30.8\include'
$libs=Join-Path $nativeDeps 'sysroot'
& $zig c++ (Join-Path $PSScriptRoot 'Main.cpp') -target aarch64-linux-gnu.2.33 -mcpu=cortex_a53 -std=c++17 -O2 -I $headers -I (Join-Path $PSScriptRoot 'vendor') -L $libs -lSDL2 -lSDL2_ttf '-Wl,-rpath,/usr/trimui/lib' -o (Join-Path $PSScriptRoot 'package\Loopfield\loopfield')
if($LASTEXITCODE -ne 0){throw 'Loopfield handheld compilation failed'}
