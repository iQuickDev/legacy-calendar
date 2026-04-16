$bypassKey = "super-secret-bypass-key"
$user = "calendar_range_user_$(Get-Random)"
$pass = "securePassword123"

function Get-StartOfWeekMonday {
    param([DateTime]$Date)

    $offset = (([int]$Date.DayOfWeek + 6) % 7)
    return $Date.Date.AddDays(-$offset)
}

function Get-EndOfWeekMonday {
    param([DateTime]$Date)

    $offset = (([int]$Date.DayOfWeek + 6) % 7)
    return $Date.Date.AddDays(6 - $offset).AddHours(23).AddMinutes(59).AddSeconds(59).AddMilliseconds(999)
}

Write-Host "Creating user..."
Invoke-RestMethod -Uri "http://localhost:3000/users" -Method Post -Body (@{ username = $user; password = $pass } | ConvertTo-Json) -Headers @{ "X-Bypass" = $bypassKey } -ContentType "application/json"

Write-Host "Logging in..."
$loginRes = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -Body (@{ username = $user; password = $pass } | ConvertTo-Json) -Headers @{ "X-Bypass" = $bypassKey } -ContentType "application/json"
$token = $loginRes.access_token

$today = Get-Date
$monthStart = Get-Date -Year $today.Year -Month $today.Month -Day 1 -Hour 0 -Minute 0 -Second 0 -Millisecond 0
$monthEnd = $monthStart.AddMonths(1).AddMilliseconds(-1)
$rangeStart = Get-StartOfWeekMonday -Date $monthStart
$rangeEnd = Get-EndOfWeekMonday -Date $monthEnd

Write-Host "Creating events..."
$visibleStartEventTime = $rangeStart.AddDays(1).AddHours(10).ToString("o")
$visibleEndEventTime = $rangeEnd.AddDays(-1).AddHours(10).ToString("o")
$hiddenEventTime = $rangeStart.AddDays(-2).AddHours(10).ToString("o")

$visibleStartEvent = Invoke-RestMethod -Uri "http://localhost:3000/events" -Method Post -Body (@{
    title     = "Visible Start Event"
    startTime = $visibleStartEventTime
} | ConvertTo-Json) -Headers @{ Authorization = "Bearer $token"; "X-Bypass" = $bypassKey } -ContentType "application/json"

$visibleEndEvent = Invoke-RestMethod -Uri "http://localhost:3000/events" -Method Post -Body (@{
    title     = "Visible End Event"
    startTime = $visibleEndEventTime
} | ConvertTo-Json) -Headers @{ Authorization = "Bearer $token"; "X-Bypass" = $bypassKey } -ContentType "application/json"

$hiddenEvent = Invoke-RestMethod -Uri "http://localhost:3000/events" -Method Post -Body (@{
    title     = "Outside Visible Range"
    startTime = $hiddenEventTime
} | ConvertTo-Json) -Headers @{ Authorization = "Bearer $token"; "X-Bypass" = $bypassKey } -ContentType "application/json"

$startQuery = [uri]::EscapeDataString($rangeStart.ToString("o"))
$endQuery = [uri]::EscapeDataString($rangeEnd.ToString("o"))

Write-Host "Fetching visible calendar range..."
$events = Invoke-RestMethod -Uri "http://localhost:3000/events?start=$startQuery&end=$endQuery" -Method Get -Headers @{ Authorization = "Bearer $token"; "X-Bypass" = $bypassKey } -ErrorAction Stop

if ($events.Count -lt 2) {
    Write-Error "FAILURE: Expected at least 2 events in the visible range, got $($events.Count)"
    exit 1
}

$visibleStartFound = $events | Where-Object { $_.id -eq $visibleStartEvent.id }
$visibleEndFound = $events | Where-Object { $_.id -eq $visibleEndEvent.id }
$hiddenFound = $events | Where-Object { $_.id -eq $hiddenEvent.id }

if ($null -eq $visibleStartFound -or $null -eq $visibleEndFound) {
    Write-Error "FAILURE: Expected visible events were not returned by the calendar range query"
    exit 1
}

if ($null -ne $hiddenFound) {
    Write-Error "FAILURE: Event outside the visible range was returned unexpectedly"
    exit 1
}

Write-Host "SUCCESS: Calendar range query returns the visible month window."
