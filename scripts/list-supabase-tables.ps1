$ErrorActionPreference = 'Stop'

$patterns = @(
  'create table if not exists public\.',
  'create table public\.'
)

$rows = @()
Get-ChildItem -Path supabase/migrations -Filter *.sql | Sort-Object Name | ForEach-Object {
  $file = $_
  foreach ($pat in $patterns) {
    $hits = Select-String -Path $file.FullName -Pattern $pat -CaseSensitive:$false
    foreach ($h in $hits) {
      $rows += [pscustomobject]@{ file = $file.Name; line = $h.LineNumber; text = $h.Line.Trim() }
    }
  }
}

$rows | Sort-Object file, line | Format-Table -AutoSize
