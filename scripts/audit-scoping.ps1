$ErrorActionPreference = 'Stop'

$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx
$hits = @()

foreach ($f in $files) {
  $lines = Get-Content -LiteralPath $f.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '\.update\(|\.delete\(|\.upsert\(') {
      $end = [Math]::Min($i + 12, $lines.Count - 1)
      $window = ($lines[$i..$end] -join "`n")

      # Heuristic: if the next few lines don't include a club_id/team_id filter, flag it.
      if ($window -notmatch 'club_id' -and $window -notmatch 'team_id' -and $window -notmatch 'match_id' -and $window -notmatch 'event_id') {
        $hits += [pscustomobject]@{
          file = $f.FullName
          line = $i + 1
          text = $lines[$i].Trim()
        }
      }
    }
  }
}

$hits | Sort-Object file, line | Format-Table -AutoSize
