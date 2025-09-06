
---

## 🔄 Function Call Flow

### **1. Application Startup Flow**
```
1. app.js starts
2. connectRabbitMQ() establishes connection
3. AuthConsumer.startConsumers() initializes consumers
4. Server starts listening for requests
```

### **2. Message Publishing Flow**
```
Controller Request
    ↓
AuthProducer.publishUserRegistered()
    ↓
ensureInitialized() → initializeAuthService()
    ↓
AuthMessagingService.publishUserRegistered()
    ↓
BaseService.publishServiceMessage()
    ↓
validateMessage() → MessageBroker.publishMessage()
    ↓
getChannel() → publishWithRetries()
    ↓
RabbitMQ Exchange → Queue
```

### **3. Message Consumption Flow**
```
RabbitMQ Queue
    ↓
Consumer receives message
    ↓
createConsumerWrapper() → createMessageHandler()
    ↓
parseMessageContent() → handler execution
    ↓
handleUserRegistered() → Resendmail()
    ↓
channel.ack() → updateMetrics()
```

### **4. Error Handling Flow**
```
Error occurs in any function
    ↓
asyncHandler catches error
    ↓
Global error handler processes
    ↓
httpError() formats response
    ↓
Client receives error response
```
