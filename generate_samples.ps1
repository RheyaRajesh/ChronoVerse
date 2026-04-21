# ChronoVerse Sample Event Generator
# This script injects a series of simulated events to test the "Time Travel" and "Replay" features.

$events = @(
    @{
        service_name = "AuthService"
        event_type = "USER_LOGIN_SUCCESS"
        payload = @{ user = "rheya_rajesh"; ip = "192.168.1.45"; device = "Windows Desktop" }
    },
    @{
        service_name = "OrderService"
        event_type = "ORDER_CREATED"
        payload = @{ order_id = "ORD-9921"; items = @("Quantum GPU", "Grav-Mouse"); total = 1250.00 }
    },
    @{
        service_name = "PaymentService"
        event_type = "PAYMENT_PROCESSING"
        payload = @{ order_id = "ORD-9921"; gateway = "ChronoPay"; amount = 1250.00 }
    },
    @{
        service_name = "PaymentService"
        event_type = "PAYMENT_FAILED"
        payload = @{ order_id = "ORD-9921"; error = "Insufficient Chrono-Credits"; reason_code = "ERR_402" }
    },
    @{
        service_name = "InventoryService"
        event_type = "STOCK_RESERVED"
        payload = @{ item = "Quantum GPU"; sku = "QGPU-001"; quantity = 1 }
    }
)

Write-Host "🚀 Starting ChronoVerse Event Injection..." -ForegroundColor Cyan

foreach ($event in $events) {
    $body = $event | ConvertTo-Json
    Write-Host "Injecting $($event.event_type) from $($event.service_name)..."
    try {
        Invoke-RestMethod -Uri "https://chronoverse.onrender.com/api/events" -Method Post -ContentType "application/json" -Body $body
        Write-Host "✅ Success" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Seconds 2
}

Write-Host "🎉 Sample injection complete. Check your ChronoVerse dashboard!" -ForegroundColor Cyan
