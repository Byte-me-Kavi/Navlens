# Cleanup Old Architecture Files
# Run this script to remove old monolithic components

Write-Host "🧹 Cleaning up old architecture files..." -ForegroundColor Cyan

# Files to remove
$filesToRemove = @(
    "components\DomHeatmapViewer.tsx",
    "components\CssGenerator.tsx"
)

foreach ($file in $filesToRemove) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
        Write-Host "✅ Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Already deleted: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ Cleanup complete! Old architecture removed." -ForegroundColor Green
Write-Host ""
Write-Host "New modular architecture is now active:" -ForegroundColor Cyan
Write-Host "  - features/heatmap/" -ForegroundColor White
Write-Host "  - features/element-tracking/" -ForegroundColor White
Write-Host "  - features/dom-snapshot/" -ForegroundColor White
Write-Host "  - shared/services/api/" -ForegroundColor White
Write-Host ""
Write-Host "See MIGRATION_COMPLETE.md for full details." -ForegroundColor Cyan
