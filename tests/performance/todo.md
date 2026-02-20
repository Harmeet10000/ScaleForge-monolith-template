```js
6.  add prometheus, loki and grafana for monitoring and alerting - DONE
1.  Implement a OpenFGA to enhance scalability, reliability, and security of your authentication service. with permissions - DONE
1.  make a fucking awesome documentation for the same in Postman or Swagger - DONE
1.  also add a search engine Elasticsearch for better search capabilities - DONE
1.  add Gemini system prompts, prompt message structure, LLM settings, structured output, tool calling and RAG - DONE
1.  make AI-driven features for enhanced user experience and personalization using Gemini API - DONE
1.  add Novu for push notifications - DONE
1.  add recommendation system using Convex or AWS personalise/GCP equivalent - DONE
1.  Shift audit trail to new model - DONE
1.  make a branch for drizzle + JS for AI features and Postgres extensions - DONE
1.  add S3 CORS config for multipart upload - DONE
1.  add ELK stack for logging and monitoring - ABANDONED
1.  properly implement RabbitMQ for message queuing for modularity and decoupling - Undergoing
1.  explore Postgres Extensions for enhanced functionality - Undergoing
1.  rewrite all logic for idempotency in payments, subscription and audit trail by using postgresSQL & drizzle, Neon as db for ACID compliant idenpotent transactions and also leverage RabbitMQ producer and consumer with best practices
1. add blacklist JWT token after logout in DB or redis
1. implement websockets for realtime features
1. Implement CDC for updating Redis cache based on Events in DB
1.  implement better-auth with reCAPTCHA turnstile/google reCAPTCHA, OAuth/OIDC, last login method
1.  check performance/stress testing using grafana k6
1.  add tests in CI before deploying to production
1.  make a Golang version of the same       DONE
1.  add SAGA pattern for managing complex workflows and state transitions
1. check this   mongoose.set('strictQuery', true)
1. validate all .env in config
1. Redis Plugins and RedisGears
If you want to be a purist, "True Read-Through" means the application only talks to Redis, and Redis itself talks to MongoDB.

RedisGears: You can write Python or JS scripts that run inside Redis. When a GET command fails (a miss), RedisGears can trigger a script to fetch the data from MongoDB and populate the key before returning the value to your Node.js app
1. , use idempotent producer pattern: producer stores "I published this event" before sending, checks before republishing. Use connection pooling (not one connection per consumer)
1. add/append the state of request in the logs in the request lifecycle with possible stack trace
1. add the state of the message(with stack trace, why failed in each retry, and more) in message queue(DLQ) that has been rejected after retries
1. use the eslint-plugin-neverthrow in TS version
1. transfer all the required info in the state event itself (event carried state transfer)
1. use // ✅ CORRECT: Proper cache with limits
const LRU = require('lru-cache');
```

// Different worker patterns for different needs

// PATTERN 1: CPU-Heavy → Worker Threads
const { Worker } = require('worker_threads');

app.post('/compute', async (req, res) => {
const worker = new Worker('./cpu-intensive.js');
worker.postMessage(req.body);

const result = await new Promise((resolve) => {
worker.on('message', resolve);
worker.on('error', reject);
});

res.json(result);
// ✅ Never blocks event loop
});

// PATTERN 2: I/O-Heavy → Queue + Separate Process
app.post('/process', async (req, res) => {
await jobQueue.add(req.body);
res.json({ queued: true });
// ✅ Returns immediately
});

// Separate process handles I/O
const worker = new Worker('queue-processor.js');

// PATTERN 3: GPU-Heavy → Delegate to Service
app.post('/ai', async (req, res) => {
const result = await ai_service.predict(req.body);
res.json(result);
// ✅ AI service handles heavy lifting
});

below are anti patterns
// ❌ ANTI-PATTERN 1: Promise in request handler
app.post('/upload', (req, res) => {
res.json({ uploaded: true });

imageProcessing.resize(req.file)
.then(/_ ... _/)
.catch(/_ ... _/); // Still blocks!
});

// ❌ ANTI-PATTERN 2: Async background without await
app.post('/notify', async (req, res) => {
res.json({ sent: true });

// Fire and forget - STILL blocks!
sendEmailsToUsers(req.body.users);
});

// ❌ ANTI-PATTERN 3: Queue consumer does work
consumer.on('message', (msg) => {
// CPU-heavy loop - blocks all queued messages
for (let i = 0; i < msg.items.length; i++) {
const result = heavyProcess(msg.items[i]);
}
});

// ❌ ANTI-PATTERN 4: Mixed concerns in one service
// API server + worker + cron jobs + WebSocket all in one
// = One slow task breaks everything

<!-- react three fiber
react 360
 react DND
  magic ui
 react AG Grid
 spline
 micro animations
  origin ui -->

```js


VS Code isolates global Node.js paths during its bootstrap sequence (5:31) to ensure a stable and predictable environment.

Here's why this isolation is crucial:

Prevents Interference (5:44): VS Code doesn't want random, globally installed Node.js packages or npm packages to interfere with its internal operations. By removing global paths from Node.js's module resolution, it prevents unexpected behavior.
Guarantees Dependency Origin (5:51): This isolation guarantees that every dependency VS Code uses comes directly from its own bundled modules. This ensures consistency and prevents issues that might arise from different versions of global packages.
Ensures Reproducibility Isolating dependencies ensures that when you deploy or run VS Code, it uses the exact same versions of its libraries and tools as during its development. This prevents "it works on my machine" issues and makes deployments more reliable.
Security It prevents a malicious global package from affecting multiple, unrelated projects on your system.
This practice is similar to how other development environments and tools manage dependencies, such as Python's virtual environments or Ruby's Bundler, by keeping installations localized to the project.

In VS Code, channel abstraction (11:36) is a core concept for Inter-Process Communication (IPC) (11:30), allowing different processes to communicate with each other.

Here's how it works:

Simplified Interface (11:36): A channel acts like a "phone line" between two processes. One process creates a channel, and another connects to it, enabling them to send messages back and forth.
Decoupling from Transport Mechanisms (12:02): The key insight is that the same channel interface works across completely different underlying transport mechanisms. This means the service code doesn't need to change, regardless of how the communication is physically happening.
For example, between the main and renderer processes in Electron, it uses IPC main and IPC renderer (12:06).
In the web version, it uses WebSockets to talk to the server (12:11).
Between the extension host and main processes, it uses Node's child_process module (12:15).
In a web browser, it uses PortMessage (12:20).
Benefits of Channel Abstraction:

Portability and Simplicity It provides a consistent and simplified way for developers to handle communication between processes, regardless of the underlying operating system or network setup.
Modularity It enables a modular design where services can be made available across any process boundary without modifying the service code itself. This allows services like the file service, configuration service, and window service to be "channelified" once and work universally [12:25, 12:31].
Hides Complexity It hides the low-level details of inter-process communication, presenting it as straightforward, named channels.
This approach allows VS Code to maintain a consistent and robust communication framework across its various processes, contributing to its stability and performance.

Multi-Process Architecture & Crash Isolation (3:08): VS Code runs as multiple isolated processes (main process, renderer processes, extension host processes, worker processes). This architecture prevents a crash in one part (like a buggy extension) from affecting the entire editor, ensuring stability and responsiveness.
Inter-Process Communication (IPC) (11:18): Processes in VS Code communicate securely using "channels" (11:36). The same interface works across different transport mechanisms (like IPC main/renderer in Electron or WebSockets in the web version). Sandboxing (12:43) is used to enhance security, restricting renderer processes from direct file system access, with all file operations routed through the main process via IPC. For high-throughput scenarios, MessagePorts (13:54) are used for direct communication, utilizing VQL (variable quantity length) encoding (14:16) for efficient data transfer.

```
