Set-Location 'C:\Users\georg\ONE4Team\clubhub-connect'

$files = Get-ChildItem -Recurse -File src -Include *.ts,*.tsx
$rows = @()

foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw

  $m = [regex]::Matches($c, 'supabase\.from\("([^"]+)"\)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  foreach ($x in $m) {
    $rows += [pscustomobject]@{
      table = $x.Groups[1].Value
      file  = $f.FullName
    }
  }
}

$rows |
  Group-Object table |
  Sort-Object Count -Descending |
  Select-Object -First 60 |
  ForEach-Object {
    [pscustomobject]@{ table = $_.Name; count = $_.Count }
  } |
  Format-Table -AutoSize

"\nTop files per table (sample):" | Write-Output
$rows |
  Group-Object table |
  Sort-Object Count -Descending |
  Select-Object -First 10 |
  ForEach-Object {
    $t = $_.Name
    "\n== $t ==" | Write-Output
    $_.Group | Select-Object -First 5 file | Format-Table -HideTableHeaders | Out-String | Write-Output
  }
