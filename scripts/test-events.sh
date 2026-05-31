#!/bin/bash
# Quick test script to verify all rules work with the Event Simulator
# Run while the dev server is running: bash scripts/test-events.sh

API_URL="http://localhost:3000/api/events"

echo "=== Testing Email Automation Rules ==="
echo ""

# Test 1: Pro user upgrades (should match "Send Welcome to Pro Users" rule)
echo "1. Pro user upgrade (should MATCH rule → sends email)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "plan_upgraded",
    "user_id": "test-user-pro",
    "payload": {"plan_name": "pro", "first_name": "Pro User", "email": "pro_user@example.com"},
    "idempotency_key": "test_pro_upgrade_'$(date +%s)'"
  }' | python3 -m json.tool 2>/dev/null || echo "(response received)"
echo ""

# Test 2: Free user upgrade (should NOT match "pro" condition)
echo "2. Free user upgrade (should NOT match — plan_name=free)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "plan_upgraded",
    "user_id": "test-user-free",
    "payload": {"plan_name": "free", "first_name": "Free User", "email": "free_user@example.com"},
    "idempotency_key": "test_free_upgrade_'$(date +%s)'"
  }' | python3 -m json.tool 2>/dev/null || echo "(response received)"
echo ""

# Test 3: Free user creates project (tests milestone rule — user has 8 projects, needs >=10)
echo "3. Free user creates project (8 projects, needs >=10 — should NOT match)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "project_created",
    "user_id": "test-user-free",
    "payload": {"project_name": "Test Project", "first_name": "Free User"},
    "idempotency_key": "test_free_project_'$(date +%s)'"
  }' | python3 -m json.tool 2>/dev/null || echo "(response received)"
echo ""

# Test 4: Power user creates project (pro plan, 120 projects — milestone rule requires free plan)
echo "4. Power pro user creates project (pro plan — milestone requires free, should NOT match)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "project_created",
    "user_id": "test-user-power",
    "payload": {"project_name": "Big Project", "first_name": "Power"},
    "idempotency_key": "test_power_project_'$(date +%s)'"
  }' | python3 -m json.tool 2>/dev/null || echo "(response received)"
echo ""

# Test 5: Payment failed for pro user (should match "Payment Failed - Pro Users")
echo "5. Payment failed for pro user (should MATCH rule)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "payment_failed",
    "user_id": "test-user-pro",
    "payload": {"amount": 29.99, "plan_name": "pro", "first_name": "Pro"},
    "idempotency_key": "test_payment_pro_'$(date +%s)'"
  }' | python3 -m json.tool 2>/dev/null || echo "(response received)"
echo ""

# Test 6: Feature launched for pro user (AI features — should match for pro/enterprise)
echo "6. Feature launched for pro user (supports_ai=true — should MATCH)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "feature_launched",
    "user_id": "test-user-pro",
    "payload": {"feature_name": "AI Analytics", "first_name": "Pro User", "tier": "pro"},
    "idempotency_key": "test_feature_pro_'$(date +%s)'"
  }' | python3 -m json.tool 2>/dev/null || echo "(response received)"
echo ""

# Test 7: Email campaign for unsubscribed user (should NOT match)
echo "7. Campaign for unsubscribed user (unsubscribed=true — should NOT match)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "email_campaign",
    "user_id": "test-user-unsubscribed",
    "payload": {"campaign_name": "Newsletter", "first_name": "Unsubscribed", "email": "unsubscribed_user@example.com"},
    "idempotency_key": "test_campaign_unsub_'$(date +%s)'"
  }' | python3 -m json.tool 2>/dev/null || echo "(response received)"
echo ""

# Test 8: Enterprise user upgrade (should NOT match "pro" welcome rule)
echo "8. Enterprise user upgrade (plan_name=enterprise — should NOT match pro rule)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "plan_upgraded",
    "user_id": "test-user-enterprise",
    "payload": {"plan_name": "enterprise", "first_name": "Enterprise", "email": "enterprise_user@example.com"},
    "idempotency_key": "test_enterprise_upgrade_'$(date +%s)'"
  }' | python3 -m json.tool 2>/dev/null || echo "(response received)"
echo ""

echo "=== Done! Check /logs and /events in the app to see results ==="
