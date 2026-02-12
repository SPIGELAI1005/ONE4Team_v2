$ErrorActionPreference = 'Stop'

$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx
$hits = @()

foreach ($f in $files) {
  $lines = Get-Content -LiteralPath $f.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'postgres_changes') {
      $end = [Math]::Min($i + 20, $lines.Count - 1)
      $window = ($lines[$i..$end] -join "`n")
      if ($window -notmatch 'filter:') {
        $hits += [pscustomobject]@{ file = $f.FullName; line = $i + 1; text = $lines[$i].Trim() }
      }
    }
  }
}

$hits | Sort-Object file, line | Format-Table -AutoSize
