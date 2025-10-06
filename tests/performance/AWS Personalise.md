# Complete AWS Personalize Setup Guide for Express.js

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding AWS Personalize](#understanding-aws-personalize)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Data Preparation](#data-preparation)
5. [Training Models](#training-models)
6. [Integration Code](#integration-code)
7. [Testing & Monitoring](#testing--monitoring)

---

## Prerequisites

### Required AWS Setup

- AWS Account with appropriate permissions
- IAM User with permissions for:
  - `AmazonPersonalizeFullAccess`
  - `AmazonS3FullAccess` (for storing training data)
- AWS CLI installed and configured
- Node.js and Express.js project

### Install AWS CLI

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g., us-east-1), Output format (json)
```

---

## Understanding AWS Personalize

### Key Concepts

1. **Dataset Group**: Container for all your recommendation data and resources
2. **Datasets**: Three types of data you can import
   - **Interactions** (Required): User-item interactions (clicks, purchases, views)
   - **Users** (Optional): User metadata (age, gender, location)
   - **Items** (Optional): Item metadata (category, price, description)
3. **Schema**: Defines the structure of your data
4. **Solution**: The ML model configuration
5. **Campaign**: Deployed solution that serves recommendations
6. **Event Tracker**: Tracks real-time user interactions

### Recipe Types

- **User-Personalization**: Personalized recommendations for users
- **Similar-Items**: Find similar items based on user behavior
- **Personalized-Ranking**: Rerank items for a specific user

---

## Step-by-Step Setup

### Step 1: Prepare Your Data Files

Create three CSV files with your data:

#### interactions.csv (Required)

```csv
USER_ID,ITEM_ID,TIMESTAMP,EVENT_TYPE
user1,item101,1634567890,purchase
user1,item102,1634567900,view
user2,item101,1634567910,purchase
user2,item103,1634567920,click
user3,item102,1634567930,view
```

#### users.csv (Optional)

```csv
USER_ID,AGE,GENDER,MEMBERSHIP_TYPE
user1,25,M,premium
user2,34,F,basic
user3,45,M,premium
```

#### items.csv (Optional)

```csv
ITEM_ID,CATEGORY,PRICE,GENRE
item101,electronics,299.99,smartphones
item102,electronics,199.99,tablets
item103,books,29.99,fiction
```

### Step 2: Upload Data to S3

```bash
# Create S3 bucket
aws s3 mb s3://my-personalize-data-bucket

# Upload CSV files
aws s3 cp interactions.csv s3://my-personalize-data-bucket/
aws s3 cp users.csv s3://my-personalize-data-bucket/
aws s3 cp items.csv s3://my-personalize-data-bucket/
```

### Step 3: Create IAM Role for Personalize

Create a file named `personalize-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "personalize.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the role:

```bash
# Create IAM role
aws iam create-role \
  --role-name PersonalizeS3Role \
  --assume-role-policy-document file://personalize-trust-policy.json

# Attach S3 read policy
aws iam attach-role-policy \
  --role-name PersonalizeS3Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Get the role ARN (save this for later)
aws iam get-role --role-name PersonalizeS3Role --query 'Role.Arn' --output text
```

### Step 4: Create Dataset Group (AWS Console Method)

1. **Open AWS Personalize Console**: https://console.aws.amazon.com/personalize/
2. **Create Dataset Group**:

   - Click "Create dataset group"
   - Name: `my-recommendation-system`
   - Click "Next"

3. **Create Interactions Schema**:

   - Click "Create new schema"
   - Name: `interactions-schema`
   - Schema definition:

   ```json
   {
     "type": "record",
     "name": "Interactions",
     "namespace": "com.amazonaws.personalize.schema",
     "fields": [
       {
         "name": "USER_ID",
         "type": "string"
       },
       {
         "name": "ITEM_ID",
         "type": "string"
       },
       {
         "name": "TIMESTAMP",
         "type": "long"
       },
       {
         "name": "EVENT_TYPE",
         "type": "string"
       }
     ],
     "version": "1.0"
   }
   ```

   - Click "Next"

4. **Create Interactions Dataset**:

   - Dataset name: `interactions-dataset`
   - Schema: Select the schema you just created
   - Click "Next"

5. **Import Interactions Data**:
   - Dataset import job name: `interactions-import-1`
   - IAM role: Select `PersonalizeS3Role`
   - Data location: `s3://my-personalize-data-bucket/interactions.csv`
   - Click "Finish"
   - **Wait for import to complete** (10-30 minutes)

### Step 5: Create Solution and Solution Version

1. **Create Solution**:

   - Go to "Solutions and recipes"
   - Click "Create solution"
   - Solution name: `user-personalization-solution`
   - Recipe: `aws-user-personalization`
   - Click "Next" → "Finish"

2. **Create Solution Version** (Train the model):
   - Select your solution
   - Click "Create solution version"
   - **Wait for training to complete** (1-4 hours depending on data size)
   - Status will change from "CREATE PENDING" → "CREATE IN_PROGRESS" → "ACTIVE"

### Step 6: Create Campaign

1. **Create Campaign**:

   - Go to "Campaigns"
   - Click "Create campaign"
   - Campaign name: `user-personalization-campaign`
   - Solution: Select `user-personalization-solution`
   - Solution version: Select latest
   - Minimum TPS: 1 (increase based on traffic)
   - Click "Create campaign"
   - **Wait for deployment** (5-10 minutes)

2. **Get Campaign ARN**:
   - Click on your campaign
   - Copy the Campaign ARN (looks like: `arn:aws:personalize:region:account-id:campaign/campaign-name`)

### Step 7: Create Event Tracker

1. **Create Event Tracker**:
   - Go to "Event trackers"
   - Click "Create event tracker"
   - Name: `real-time-events-tracker`
   - Click "Create event tracker"
   - Copy the **Tracking ID** (you'll need this for real-time events)

---

## Step 8: Configure Environment Variables

Create a `.env` file in your Express.js project:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1

# AWS Personalize ARNs (get these from AWS Console)
PERSONALIZE_DATASET_GROUP_ARN=arn:aws:personalize:us-east-1:123456789:dataset-group/my-recommendation-system
PERSONALIZE_USER_CAMPAIGN_ARN=arn:aws:personalize:us-east-1:123456789:campaign/user-personalization-campaign
PERSONALIZE_TRACKING_ID=your-tracking-id-here

# Optional: If you create more campaigns
PERSONALIZE_SIMILAR_ITEMS_CAMPAIGN_ARN=arn:aws:personalize:us-east-1:123456789:campaign/similar-items-campaign
PERSONALIZE_RANKING_CAMPAIGN_ARN=arn:aws:personalize:us-east-1:123456789:campaign/personalized-ranking-campaign
```

---

## Integration Code

### Complete Express.js Integration

```javascript
// server.js
const express = require('express');
const {
  PersonalizeRuntimeClient,
  GetRecommendationsCommand
} = require('@aws-sdk/client-personalize-runtime');
const { PersonalizeEventsClient, PutEventsCommand } = require('@aws-sdk/client-personalize-events');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize clients
const personalizeRuntimeClient = new PersonalizeRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const personalizeEventsClient = new PersonalizeEventsClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// ROUTE 1: Get personalized recommendations for a user
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const numResults = parseInt(req.query.numResults) || 10;

    const command = new GetRecommendationsCommand({
      campaignArn: process.env.PERSONALIZE_USER_CAMPAIGN_ARN,
      userId: userId,
      numResults: numResults
    });

    const response = await personalizeRuntimeClient.send(command);

    res.json({
      success: true,
      userId: userId,
      recommendations: response.itemList.map((item) => ({
        itemId: item.itemId,
        score: item.score
      })),
      recommendationId: response.recommendationId
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ROUTE 2: Track user events (clicks, views, purchases)
app.post('/api/events/track', async (req, res) => {
  try {
    const { userId, sessionId, eventType, itemId, properties } = req.body;

    const event = {
      eventType: eventType, // 'view', 'click', 'purchase', etc.
      sentAt: new Date(),
      itemId: itemId,
      properties: JSON.stringify(properties || {})
    };

    const command = new PutEventsCommand({
      trackingId: process.env.PERSONALIZE_TRACKING_ID,
      userId: userId,
      sessionId: sessionId || `session-${userId}-${Date.now()}`,
      eventList: [event]
    });

    await personalizeEventsClient.send(command);

    res.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ROUTE 3: Get similar items
app.get('/api/similar-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const numResults = parseInt(req.query.numResults) || 10;

    // Note: You need to create a Similar-Items campaign for this
    const command = new GetRecommendationsCommand({
      campaignArn: process.env.PERSONALIZE_SIMILAR_ITEMS_CAMPAIGN_ARN,
      itemId: itemId,
      numResults: numResults
    });

    const response = await personalizeRuntimeClient.send(command);

    res.json({
      success: true,
      itemId: itemId,
      similarItems: response.itemList.map((item) => ({
        itemId: item.itemId,
        score: item.score
      }))
    });
  } catch (error) {
    console.error('Error getting similar items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Testing Your Integration

### Test 1: Get Recommendations

```bash
# Get recommendations for a user
curl http://localhost:3000/api/recommendations/user1?numResults=5
```

Expected response:

```json
{
  "success": true,
  "userId": "user1",
  "recommendations": [
    { "itemId": "item101", "score": 0.95 },
    { "itemId": "item102", "score": 0.87 },
    { "itemId": "item103", "score": 0.76 }
  ],
  "recommendationId": "rid-123456"
}
```

### Test 2: Track an Event

```bash
curl -X POST http://localhost:3000/api/events/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1",
    "sessionId": "session123",
    "eventType": "view",
    "itemId": "item101",
    "properties": {
      "source": "homepage",
      "device": "mobile"
    }
  }'
```

### Test 3: Get Similar Items

```bash
curl http://localhost:3000/api/similar-items/item101?numResults=3
```

---

## Frontend Integration Example

```javascript
// React/Vue/Vanilla JS Frontend
class RecommendationService {
  constructor(apiBaseUrl) {
    this.baseUrl = apiBaseUrl;
    this.sessionId = `session-${Date.now()}`;
  }

  // Get recommendations for current user
  async getRecommendations(userId, numResults = 10) {
    const response = await fetch(
      `${this.baseUrl}/api/recommendations/${userId}?numResults=${numResults}`
    );
    return response.json();
  }

  // Track user interaction
  async trackEvent(userId, eventType, itemId, properties = {}) {
    await fetch(`${this.baseUrl}/api/events/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        sessionId: this.sessionId,
        eventType,
        itemId,
        properties
      })
    });
  }

  // Get similar items
  async getSimilarItems(itemId, numResults = 10) {
    const response = await fetch(
      `${this.baseUrl}/api/similar-items/${itemId}?numResults=${numResults}`
    );
    return response.json();
  }
}

// Usage
const recService = new RecommendationService('http://localhost:3000');

// When user views a product
await recService.trackEvent('user123', 'view', 'item101');

// Get personalized recommendations
const recs = await recService.getRecommendations('user123', 5);
console.log('Recommended items:', recs.recommendations);

// Get similar products
const similar = await recService.getSimilarItems('item101', 3);
console.log('Similar items:', similar.similarItems);
```

---

## Best Practices & Tips

### Data Quality

- **Minimum interactions**: AWS recommends at least 1,000 interactions for training
- **User diversity**: More diverse user behavior = better recommendations
- **Fresh data**: Regularly update your dataset with new interactions
- **Event types**: Use consistent event types (view, click, purchase)

### Event Tracking

- Track events in real-time for better personalization
- Include sessionId to track user journeys
- Common event types: `view`, `click`, `purchase`, `add-to-cart`, `rating`

### Monitoring

```javascript
// Add monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});
```

### Caching Recommendations

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

app.get('/api/recommendations/:userId', async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `recs-${userId}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // Get from Personalize and cache
  const recommendations = await getRecommendations(userId);
  cache.set(cacheKey, recommendations);
  res.json(recommendations);
});
```

### Error Handling

- Handle cold start (new users with no interactions)
- Provide fallback recommendations (popular items, trending)
- Log errors for monitoring

---

## Cost Optimization

### Pricing Overview

- **Training**: ~$1.25 per training hour
- **Campaign hosting**: ~$0.75 per hour (minimum 1 TPS)
- **Recommendations**: ~$0.20 per 1,000 recommendations
- **Real-time events**: ~$0.10 per 100,000 events

### Tips to Reduce Costs

1. Start with minimum TPS (1), scale up as needed
2. Use caching to reduce API calls
3. Batch event tracking when possible
4. Delete unused campaigns and solutions
5. Use data import wisely (bulk imports are cheaper than real-time)

---

## Troubleshooting

### Common Issues

**Issue**: "Campaign not found"

- **Solution**: Verify campaign ARN in .env file
- Check campaign status is ACTIVE in AWS Console

**Issue**: "No recommendations returned"

- **Solution**: Ensure user has interaction history
- Check if solution training completed successfully
- Verify minimum data requirements (1,000+ interactions)

**Issue**: "Access Denied"

- **Solution**: Check IAM permissions for Personalize
- Verify AWS credentials in .env file

**Issue**: "Event tracking fails"

- **Solution**: Verify tracking ID is correct
- Check event schema matches your dataset

---

## Next Steps

1. **Improve Models**: Add user and item metadata for better recommendations
2. **A/B Testing**: Compare Personalize recommendations with your current system
3. **Create Multiple Campaigns**:
   - User-Personalization for homepage
   - Similar-Items for product pages
   - Personalized-Ranking for search results
4. **Implement Filters**: Filter out out-of-stock items, apply business rules
5. **Monitor Performance**: Track click-through rates, conversion rates
6. **Retrain Models**: Schedule regular retraining with fresh data

---

## Resources

- [AWS Personalize Documentation](https://docs.aws.amazon.com/personalize/)
- [AWS Personalize Samples](https://github.com/aws-samples/amazon-personalize-samples)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Personalize Pricing](https://aws.amazon.com/personalize/pricing/)
