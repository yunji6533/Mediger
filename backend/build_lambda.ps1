# Lambda 패키징 스크립트 (PowerShell)
# TODO: 아래 경로를 실제 Mediger 프로젝트 루트로 맞추세요
$ROOT = "c:\Users\joguk\Desktop\aws project\Mediger"
$BACKEND = "$ROOT\backend"
$DIST = "$ROOT\backend\dist"

if (Test-Path $DIST) { Remove-Item -Recurse -Force $DIST }
New-Item -ItemType Directory -Path $DIST | Out-Null

$PKG = "$DIST\packages"
pip install opensearch-py requests-aws4auth boto3 -t $PKG -q

$functions = @("patient_api", "doctor_api", "orchestrator")
foreach ($fn in $functions) {
    $ZIP_DIR = "$DIST\$fn"
    New-Item -ItemType Directory -Path $ZIP_DIR | Out-Null
    Copy-Item -Recurse "$PKG\*" "$ZIP_DIR\"
    Copy-Item -Recurse "$BACKEND\shared" "$ZIP_DIR\shared"
    Copy-Item "$BACKEND\lambdas\$fn\handler.py" "$ZIP_DIR\handler.py"
    Compress-Archive -Path "$ZIP_DIR\*" -DestinationPath "$DIST\$fn.zip" -Force
    Write-Host "$fn.zip 생성 완료"
}

Write-Host "완료!"
Get-ChildItem $DIST -Filter "*.zip" | Select-Object Name, @{N='Size(MB)';E={[math]::Round($_.Length/1MB, 1)}}
