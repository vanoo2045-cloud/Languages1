$ErrorActionPreference = 'Stop'
$dictionaryRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'public/dictionaries'
$dictionaryHeaders = @{ 'User-Agent' = 'Languages dictionary sync'; 'Accept' = 'application/vnd.github+json' }
$dictionaryDownloads = @{}
foreach ($dictionaryLanguage in @('ancientGreek', 'japanese', 'chinese')) {
    $dictionaryUrl = 'https://api.github.com/repos/vanoo2045-cloud/languages/contents/' + $dictionaryLanguage + '/words.json?ref=main'
    $dictionaryResponse = Invoke-RestMethod -Uri $dictionaryUrl -Headers $dictionaryHeaders -TimeoutSec 30
    if ($dictionaryResponse.encoding -ne 'base64' -or !$dictionaryResponse.content) { throw ('GitHub did not return dictionary bytes: ' + $dictionaryLanguage) }
    $dictionaryBytes = [Convert]::FromBase64String(($dictionaryResponse.content -replace '\s', ''))
    $dictionaryParsed = [Text.Encoding]::UTF8.GetString($dictionaryBytes) | ConvertFrom-Json
    if ($null -eq $dictionaryParsed.vocabulary) { throw ('Missing vocabulary array: ' + $dictionaryLanguage) }
    $dictionaryDownloads[$dictionaryLanguage] = $dictionaryBytes
}
[IO.Directory]::CreateDirectory($dictionaryRoot) | Out-Null
foreach ($dictionaryLanguage in $dictionaryDownloads.Keys) {
    [IO.File]::WriteAllBytes((Join-Path $dictionaryRoot ($dictionaryLanguage + '.json')), $dictionaryDownloads[$dictionaryLanguage])
    Write-Output ('Updated ' + $dictionaryLanguage + '.json')
}
