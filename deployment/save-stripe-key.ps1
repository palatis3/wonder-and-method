param([ValidateSet('test','live')][string]$Mode='test')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$stripeCredentialFolder=Join-Path $PSScriptRoot '../.runtime/credentials'
$stripeCredentialFile=Join-Path $stripeCredentialFolder "stripe-$Mode.dpapi"
if(Test-Path -LiteralPath $stripeCredentialFile){throw 'A saved key already exists. Review it before replacing.'}
$stripeSecureKey=Read-Host "Paste the Stripe $Mode key (hidden; saved only with Windows user encryption)" -AsSecureString
$stripeKeyPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($stripeSecureKey)
try{
 $stripeKeyText=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($stripeKeyPointer)
 if($stripeKeyText -notmatch "^(sk|rk)_${Mode}_[A-Za-z0-9]+$"){throw 'Key format or environment does not match.'}
 $stripeKeyBytes=[Text.Encoding]::UTF8.GetBytes($stripeKeyText)
 $stripeCipherBytes=[Security.Cryptography.ProtectedData]::Protect($stripeKeyBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
 New-Item -ItemType Directory -Path $stripeCredentialFolder -Force | Out-Null
 $stripeKeyStream=[IO.File]::Open($stripeCredentialFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
 try{$stripeKeyStream.Write($stripeCipherBytes,0,$stripeCipherBytes.Length)}finally{$stripeKeyStream.Dispose()}
 Write-Output "Stripe $Mode credential saved with Windows user encryption."
}finally{
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($stripeKeyPointer)
 if($stripeKeyBytes){[Array]::Clear($stripeKeyBytes,0,$stripeKeyBytes.Length)}
 $stripeKeyText=$null
 $stripeSecureKey.Dispose()
}
