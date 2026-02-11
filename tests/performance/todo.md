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
1.  make a Golang version of the same
1.  add SAGA pattern for managing complex workflows and state transitions
1. check this   mongoose.set('strictQuery', true)
1. validate all .env in config
1. Redis Plugins and RedisGears
If you want to be a purist, "True Read-Through" means the application only talks to Redis, and Redis itself talks to MongoDB.

RedisGears: You can write Python or JS scripts that run inside Redis. When a GET command fails (a miss), RedisGears can trigger a script to fetch the data from MongoDB and populate the key before returning the value to your Node.js app
1. , use idempotent producer pattern: producer stores "I published this event" before sending, checks before republishing. Use connection pooling (not one connection per consumer)
1. add/append the state of request in the logs in the request lifecycle with possible stack trace
1. add the state of the message(with stack trace, why failed in each retry, and more) in message queue(DLQ) that has been rejected after retries
1. transfer all the required info in the state event itself (event carried state transfer) 
```

<!-- react three fiber
react 360
 react DND
  magic ui
 react AG Grid
 spline
 micro animations
  origin ui -->

```js

```
