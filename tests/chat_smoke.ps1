param(
    [string]$BaseUrl = 'http://localhost:3000',
    [int]$PollAttempts = 20,
    [int]$PollDelayMs = 500
)

$ErrorActionPreference = 'Stop'

$ChatUsers = @(
    @{ Username = 'iquick'; Password = 'pw' },
    @{ Username = 'polponline'; Password = 'pw' },
    @{ Username = 'bulbo'; Password = 'pw' }
)

function New-TempScriptPath {
    param(
        [Parameter(Mandatory = $true)][string]$Extension,
        [string]$Directory = [System.IO.Path]::GetTempPath()
    )

    $tempName = 'chat-smoke-{0}{1}' -f ([guid]::NewGuid().ToString('N')), $Extension
    return [System.IO.Path]::Combine($Directory, $tempName)
}

function Write-TempScript {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    Set-Content -Path $Path -Value $Content -Encoding utf8 -NoNewline
}

function Invoke-JsonRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][string]$Method,
        [hashtable]$Headers = @{},
        $Body = $null
    )

    $params = @{
        Uri         = $Uri
        Method      = $Method
        Headers     = $Headers
        ErrorAction = 'Stop'
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
        $params.ContentType = 'application/json'
    }

    return Invoke-RestMethod @params
}

function Get-AuthToken {
    param(
        [Parameter(Mandatory = $true)][string]$Username,
        [Parameter(Mandatory = $true)][string]$Password
    )

    Write-Host "Logging in $Username..."
    $login = Invoke-JsonRequest -Uri "$BaseUrl/auth/login" -Method Post -Body @{
        username = $Username
        password = $Password
    }

    if (-not $login.access_token) {
        throw "Login succeeded for $Username, but no access_token was returned."
    }

    return $login.access_token
}

function Find-SharedChatEventId {
    param(
        [Parameter(Mandatory = $true)][string[]]$Usernames
    )

    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    $scriptPath = New-TempScriptPath -Extension '.ts' -Directory (Join-Path $repoRoot 'scratch')
    $script = @'
import { PrismaClient } from '../prisma/generated/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

async function main() {
    const usernames = new Set(process.argv.slice(2));
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    try {
        const events = await prisma.event.findMany({
            include: {
                host: { select: { username: true } },
                participants: {
                    select: {
                        status: true,
                        user: { select: { username: true } }
                    }
                }
            }
        });

        const matches = events.filter((event) => {
            const memberNames = new Set([
                event.host.username,
                ...event.participants
                    .filter((participant) => participant.status === 'ACCEPTED')
                    .map((participant) => participant.user.username)
            ]);

            for (const username of usernames) {
                if (!memberNames.has(username)) {
                    return false;
                }
            }

            return true;
        });

        if (matches.length === 0) {
            console.log(JSON.stringify({ eventId: null, title: null, usernames: [...usernames] }));
            process.exitCode = 1;
        } else {
            const event = matches[0];
            console.log(JSON.stringify({ eventId: event.id, title: event.title, usernames: [...usernames] }));
        }
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

await main();
'@

    try {
        Write-TempScript -Path $scriptPath -Content $script
        $output = & npx tsx $scriptPath @Usernames
        if ($LASTEXITCODE -ne 0) {
            throw "No shared chat event was found for usernames: $($Usernames -join ', ')"
        }

        $result = $output | ConvertFrom-Json
        if (-not $result.eventId) {
            throw "No shared chat event was found for usernames: $($Usernames -join ', ')"
        }

        return [int]$result.eventId
    }
    finally {
        Remove-Item $scriptPath -ErrorAction SilentlyContinue
    }
}

function Send-ChatMessageViaSocket {
    param(
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)][int]$EventId,
        [Parameter(Mandatory = $true)][string]$MessageText
    )

    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    $scriptPath = New-TempScriptPath -Extension '.mjs' -Directory (Join-Path $repoRoot 'scratch')
    $script = @'
import { io } from 'socket.io-client';

const [baseUrl, token, eventIdText, messageText] = process.argv.slice(2);
const eventId = Number(eventIdText);

const socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
});

const finish = (code, message) => {
    if (message) {
        console.log(message);
    }

    try {
        socket.close();
    } catch {
        // Ignore shutdown errors.
    }

    process.exit(code);
};

socket.on('connect_error', (error) => {
    finish(1, JSON.stringify({ type: 'connect_error', message: error.message }));
});

socket.on('error', (error) => {
    finish(1, JSON.stringify({ type: 'socket_error', error }));
});

socket.on('connect', () => {
    socket.emit('joinRoom', { eventId });
    setTimeout(() => {
        socket.emit('sendMessage', { eventId, text: messageText });
    }, 300);
});

socket.on('newMessage', (message) => {
    if (message?.text === messageText && Number(message?.eventId) === eventId) {
        finish(0, JSON.stringify(message));
    }
});

setTimeout(() => {
    finish(1, JSON.stringify({ type: 'timeout', eventId, messageText }));
}, 15000);
'@

    try {
        Write-TempScript -Path $scriptPath -Content $script
        $output = & node $scriptPath $BaseUrl $Token $EventId $MessageText 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Socket send failed for event $EventId. Output: $($output -join [Environment]::NewLine)"
        }

        return $output | ConvertFrom-Json
    }
    finally {
        Remove-Item $scriptPath -ErrorAction SilentlyContinue
    }
}

function Wait-ForMessageInHistory {
    param(
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)][int]$EventId,
        [Parameter(Mandatory = $true)][int]$ExpectedMessageId,
        [Parameter(Mandatory = $true)][string]$ExpectedText,
        [Parameter(Mandatory = $true)][string]$Label
    )

    for ($attempt = 1; $attempt -le $PollAttempts; $attempt++) {
        $history = Invoke-JsonRequest -Uri "$BaseUrl/chat/$EventId/messages?limit=20" -Method Get -Headers @{
            Authorization = "Bearer $Token"
        }

        $messages = @($history.messages)
        $match = $messages | Where-Object { $_.id -eq $ExpectedMessageId -or $_.text -eq $ExpectedText } | Select-Object -First 1
        if ($null -ne $match) {
            Write-Host "$Label saw message id=$($match.id) author=$($match.authorUsername)"
            return $match
        }

        Start-Sleep -Milliseconds $PollDelayMs
    }

    throw "$Label did not see message id $ExpectedMessageId in chat history."
}

Write-Host 'Logging in test users...'
$tokens = @{}
foreach ($chatUser in $ChatUsers) {
    $tokens[$chatUser.Username] = Get-AuthToken -Username $chatUser.Username -Password $chatUser.Password
}

Write-Host 'Finding a shared chat event...'
$sharedEventId = Find-SharedChatEventId -Usernames @($ChatUsers.Username)
Write-Host "Shared chat event: $sharedEventId"

foreach ($chatUser in $ChatUsers) {
    Write-Host "Verifying chat access for $($chatUser.Username)..."
    $null = Invoke-JsonRequest -Uri "$BaseUrl/chat/$sharedEventId/messages?limit=1" -Method Get -Headers @{
        Authorization = "Bearer $($tokens[$chatUser.Username])"
    }
}

$sender = $ChatUsers[0]
$recipient = $ChatUsers[1]
$messageText = "PowerShell chat smoke test $(Get-Date -Format o) [$([guid]::NewGuid().ToString())]"

Write-Host "Sending message as $($sender.Username)..."
$sentMessage = Send-ChatMessageViaSocket -Token $tokens[$sender.Username] -EventId $sharedEventId -MessageText $messageText

if (-not $sentMessage.id) {
    throw 'The websocket send did not return a persisted message payload.'
}

Write-Host "Sent message id=$($sentMessage.id)"

$recipientMessage = Wait-ForMessageInHistory -Token $tokens[$recipient.Username] -EventId $sharedEventId -ExpectedMessageId ([int]$sentMessage.id) -ExpectedText $messageText -Label $recipient.Username
$senderMessage = Wait-ForMessageInHistory -Token $tokens[$sender.Username] -EventId $sharedEventId -ExpectedMessageId ([int]$sentMessage.id) -ExpectedText $messageText -Label $sender.Username

if ($recipientMessage.text -ne $messageText) {
    throw "Recipient history returned the wrong text: $($recipientMessage.text)"
}

if ($senderMessage.id -ne $sentMessage.id) {
    throw "Sender history returned a different message id: $($senderMessage.id)"
}

Write-Host ''
Write-Host 'SUCCESS: chat send/get flow verified.'
Write-Host "EventId: $sharedEventId"
Write-Host "MessageId: $($sentMessage.id)"
