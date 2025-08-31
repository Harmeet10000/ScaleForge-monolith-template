# Notification API Testing Guide for Postman

This guide provides a complete testing sequence for the notification system API endpoints with sample JSON data.

## Prerequisites

1. **Base URL**: `http://localhost:8000` (or your server URL)
2. **Authentication**: Bearer token required for all notification endpoints
3. **Content-Type**: `application/json` for all requests

## Testing Sequence

### 1. Authentication (Required First)

#### 1.1 Register User
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/auth/register`  
**Headers**: 
```json
{
  "Content-Type": "application/json"
}
```
**Body**:
```json
{
  "name",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

#### 1.2 Login User
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/auth/login`  
**Headers**: 
```json
{
  "Content-Type": "application/json"
}
```
**Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```
**Response**: Save the `accessToken` from response for subsequent requests.

---

## Notification API Endpoints

### 2. Device Management

#### 2.1 Register Web Push Device
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/devices/user_123456789`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "deviceId": "web_device_123",
  "deviceType": "web",
  "token": "fcm_token_xyz789_web_push_example",
  "endpoint": "https://fcm.googleapis.com/fcm/send/dQkKOHUoA5o:APA91bHun4MxP5egoKMwt2KZFBaFUH-1RYqx",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8nq4HLRxf9b3P-VgVvSrlFtMnkrn4",
    "auth": "tBHItJI5svbpez7KI4CCXg"
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

#### 2.2 Register Mobile Device (iOS)
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/devices/user_123456789`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "deviceId": "ios_device_456",
  "deviceType": "ios",
  "token": "apns_token_abc123_ios_device_example",
  "userAgent": "MyApp/1.0 (iPhone; iOS 15.0)"
}
```

#### 2.3 Register Android Device
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/devices/user_123456789`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "deviceId": "android_device_789",
  "deviceType": "android",
  "token": "fcm_token_def456_android_device_example",
  "userAgent": "MyApp/1.0 (Android 12; SM-G991B)"
}
```

### 3. Notification Preferences

#### 3.1 Get User Preferences
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/v1/notifications/preferences/user_123456789`  
**Headers**: 
```json
{
  "Authorization": "Bearer {{accessToken}}"
}
```

#### 3.2 Update User Preferences
**Method**: `PUT`  
**URL**: `{{baseUrl}}/api/v1/notifications/preferences/user_123456789`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "channels": {
    "sms": {
      "enabled": true,
      "workflows": ["order-updates", "security-alerts", "two-factor-auth"]
    },
    "email": {
      "enabled": true,
      "workflows": ["welcome-email", "newsletter", "order-updates", "password-reset"]
    },
    "web_push": {
      "enabled": true,
      "workflows": ["breaking-news", "order-updates", "system-alerts"]
    },
    "mobile_push": {
      "enabled": true,
      "workflows": ["breaking-news", "order-updates", "chat-messages"]
    },
    "in_app": {
      "enabled": true,
      "workflows": ["system-alerts", "messages", "notifications"]
    }
  },
  "globalSettings": {
    "doNotDisturb": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "08:00"
    },
    "timezone": "America/New_York"
  }
}
```

### 4. Send Notifications

#### 4.1 Send Welcome Email Notification
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/send`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "userId": "user_123456789",
  "workflowId": "welcome-email",
  "payload": {
    "userName": "John Doe",
    "verificationUrl": "https://example.com/verify?token=abc123xyz",
    "companyName": "Acme Corporation",
    "supportEmail": "support@acme.com"
  },
  "channels": ["email", "in_app"],
  "priority": "high"
}
```

#### 4.2 Send Order Update Notification
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/send`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "userId": "user_123456789",
  "workflowId": "order-updates",
  "payload": {
    "userName": "John Doe",
    "orderId": "ORD-2024-001",
    "orderStatus": "shipped",
    "trackingNumber": "1Z999AA1234567890",
    "estimatedDelivery": "2024-01-15",
    "orderTotal": "$99.99"
  },
  "channels": ["sms", "email", "mobile_push"],
  "priority": "normal"
}
```

#### 4.3 Send Security Alert
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/send`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "userId": "user_123456789",
  "workflowId": "security-alerts",
  "payload": {
    "userName": "John Doe",
    "alertType": "login_attempt",
    "location": "New York, NY",
    "ipAddress": "192.168.1.100",
    "timestamp": "2024-01-10T14:30:00Z",
    "deviceInfo": "Chrome on Windows"
  },
  "channels": ["sms", "email", "mobile_push", "in_app"],
  "priority": "critical"
}
```

#### 4.4 Send Password Reset Notification
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/send`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "userId": "user_123456789",
  "workflowId": "password-reset",
  "payload": {
    "userName": "John Doe",
    "resetUrl": "https://example.com/reset-password?token=reset123xyz",
    "expiryTime": "1 hour",
    "requestTime": "2024-01-10T14:30:00Z",
    "ipAddress": "192.168.1.100"
  },
  "channels": ["email"],
  "priority": "high"
}
```

### 5. Bulk Notifications

#### 5.1 Send Bulk Welcome Notifications
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/bulk`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "notifications": [
    {
      "userId": "user_123456789",
      "workflowId": "welcome-email",
      "payload": {
        "userName": "John Doe",
        "verificationUrl": "https://example.com/verify?token=abc123",
        "companyName": "Acme Corp"
      },
      "priority": "normal"
    },
    {
      "userId": "user_987654321",
      "workflowId": "welcome-email",
      "payload": {
        "userName": "Jane Smith",
        "verificationUrl": "https://example.com/verify?token=def456",
        "companyName": "Acme Corp"
      },
      "priority": "normal"
    },
    {
      "userId": "user_555666777",
      "workflowId": "welcome-email",
      "payload": {
        "userName": "Bob Johnson",
        "verificationUrl": "https://example.com/verify?token=ghi789",
        "companyName": "Acme Corp"
      },
      "priority": "normal"
    }
  ]
}
```

#### 5.2 Send Bulk Newsletter Notifications
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/v1/notifications/bulk`  
**Headers**: 
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{accessToken}}"
}
```
**Body**:
```json
{
  "notifications": [
    {
      "userId": "user_123456789",
      "workflowId": "newsletter",
      "payload": {
        "userName": "John Doe",
        "newsletterTitle": "Weekly Tech Updates",
        "unsubscribeUrl": "https://example.com/unsubscribe?token=abc123",
        "articles": [
          {
            "title": "AI Trends 2024",
            "url": "https://example.com/articles/ai-trends-2024"
          },
          {
            "title": "Cloud Computing Best Practices",
            "url": "https://example.com/articles/cloud-best-practices"
          }
        ]
      },
      "channels": ["email"],
      "priority": "low"
    },
    {
      "userId": "user_987654321",
      "workflowId": "newsletter",
      "payload": {
        "userName": "Jane Smith",
        "newsletterTitle": "Weekly Tech Updates",
        "unsubscribeUrl": "https://example.com/unsubscribe?token=def456",
        "articles": [
          {
            "title": "AI Trends 2024",
            "url": "https://example.com/articles/ai-trends-2024"
          },
          {
            "title": "Cloud Computing Best Practices",
            "url": "https://example.com/articles/cloud-best-practices"
          }
        ]
      },
      "channels": ["email"],
      "priority": "low"
    }
  ]
}
```

### 6. Notification History

#### 6.1 Get All Notification History
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/v1/notifications/history/user_123456789`  
**Headers**: 
```json
{
  "Authorization": "Bearer {{accessToken}}"
}
```

#### 6.2 Get Filtered Notification History (Email Only)
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/v1/notifications/history/user_123456789?channel=email&status=delivered&page=1&limit=10`  
**Headers**: 
```json
{
  "Authorization": "Bearer {{accessToken}}"
}
```

#### 6.3 Get Notification History with Date Range
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/v1/notifications/history/user_123456789?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=20`  
**Headers**: 
```json
{
  "Authorization": "Bearer {{accessToken}}"
}
```

#### 6.4 Get Failed Notifications
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/v1/notifications/history/user_123456789?status=failed`  
**Headers**: 
```json
{
  "Authorization": "Bearer {{accessToken}}"
}
```

### 7. Device Management (Cleanup)

#### 7.1 Unregister Web Device
**Method**: `DELETE`  
**URL**: `{{baseUrl}}/api/v1/notifications/devices/user_123456789/web_device_123`  
**Headers**: 
```json
{
  "Authorization": "Bearer {{accessToken}}"
}
```

#### 7.2 Unregister Mobile Device
**Method**: `DELETE`  
**URL**: `{{baseUrl}}/api/v1/notifications/devices/user_123456789/ios_device_456`  
**Headers**: 
```json
{
  "Authorization": "Bearer {{accessToken}}"
}
```

---

## Postman Environment Variables

Create these environment variables in Postman:

```json
{
  "baseUrl": "http://localhost:8000",
  "accessToken": "{{token_from_login_response}}",
  "userId": "user_123456789"
}
```

## Testing Tips

1. **Run in Order**: Execute the endpoints in the numbered sequence above
2. **Save Tokens**: After login (step 1.2), copy the `accessToken` to your environment variables
3. **Check Responses**: Verify each response has `success: true` and appropriate data
4. **Error Testing**: Try invalid data to test validation and error handling
5. **Rate Limiting**: Be aware of rate limits when testing bulk operations

## Expected Response Format

All successful responses follow this format:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

Error responses follow this format:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "error": {
    "details": "Detailed error information"
  }
}
```

## Workflow IDs for Testing

Use these workflow IDs in your notification payloads:
- `welcome-email`
- `order-updates`
- `security-alerts`
- `password-reset`
- `newsletter`
- `two-factor-auth`
- `breaking-news`
- `system-alerts`
- `chat-messages`

## Common Test Scenarios

1. **Happy Path**: All endpoints with valid data
2. **Authentication**: Test without Bearer token (should get 401)
3. **Validation**: Send invalid data (missing required fields)
4. **Permissions**: Try accessing other user's data (should get 403)
5. **Rate Limiting**: Send multiple requests quickly
6. **Large Payloads**: Test with maximum allowed data sizes

POST /api/v1/notifications/broadcast
{
  "workflowId": "system-maintenance",
  "payload": {
    "customKey": "customValue",
    "customKey1": {
      "nestedkey1": "nestedValue1"
    },
    "maintenanceTime": "2024-02-01T02:00:00Z",
    "duration": "2 hours"
  },
  "overrides": {
    "email": {
      "from": "support@novu.co"
    }
  },
  "tenant": "tenantIdentifier",
  "priority": "high"
}
