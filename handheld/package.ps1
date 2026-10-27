param([string]$Output)
$ErrorActionPreference='Stop'
if(-not $Output){$Output=Join-Path $PSScriptRoot 'Loopfield-Pocket-0.1-Trimui.zip'}
$files=[ordered]@{}
foreach($name in @('loopfield','pixel.ttf','default.json','config.json','launch.sh','icon.bmp','README.md','Font-OFL.txt','JSON-LICENSE.txt','SDL-LICENSE.txt','projects/Blank.json','projects/Tone-Check.json','samples/Loopfield-Demo.wav','samples/README.txt')){
    $files[$name]=Join-Path $PSScriptRoot ('package/Loopfield/'+$name)
}
foreach($name in @('Loopfield-Brick-Cheat-Sheet.pdf','cheat-sheet-01.png','cheat-sheet-02.png','cheat-sheet-01.svg','cheat-sheet-02.svg','index.html')){
    $files['docs/'+$name]=Join-Path $PSScriptRoot ('docs/'+$name)
}
foreach($source in $files.Values){if(-not (Test-Path -LiteralPath $source)){throw "Missing package resource: $source"}}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream=[System.IO.File]::Open($Output,[System.IO.FileMode]::Create)
$zip=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)
try{
    foreach($entry in $files.GetEnumerator()){
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$entry.Value,('Loopfield/'+$entry.Key),[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}finally{$zip.Dispose();$stream.Dispose()}
Write-Output $Output
