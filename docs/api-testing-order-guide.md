# API Testing Order Guide - Elasticsearch Search API

This guide provides the correct order for testing APIs and explains which endpoints require data to be pre-populated in Elasticsearch.

## 🔄 Testing Flow Overview

```
Setup Phase → Data Population → Search Testing → Management Operations → Cleanup
```

---

## 📋 Phase 1: System Setup & Health Check

### **Step 1: Health Check**
**Endpoint:** `GET /api/v1/search/health`  
**Purpose:** Verify Elasticsearch connection and system health  
**Prerequisites:** None  
**Data Required:** None  

```bash
# Test this first to ensure ES is running
GET {{baseUrl}}/api/v1/search/health
```

### **Step 2: Search Statistics (Initial)**
**Endpoint:** `GET /api/v1/search/stats/documents`  
**Purpose:** Check initial index state  
**Prerequisites:** None  
**Data Required:** None  

```bash
# This will show empty stats initially
GET {{baseUrl}}/api/v1/search/stats/documents
```

---

## 🏗️ Phase 2: Index & Pipeline Setup

### **Step 3: Create Pipeline**
**Endpoint:** `POST /api/v1/search/pipeline`  
**Purpose:** Create document processing pipeline  
**Prerequisites:** Health check passed  
**Data Required:** None  

```json
{
  "name": "content_processing_pipeline",
  "description": "Pipeline for processing content documents",
  "processors": [
    {
      "lowercase": {
        "field": "title",
        "ignore_missing": true
      }
    },
    {
      "trim": {
        "field": "content",
        "ignore_missing": true
      }
    },
    {
      "set": {
        "field": "processed_at",
        "value": "{{_ingest.timestamp}}"
      }
    }
  ]
}
```

### **Step 4: Create Index**
**Endpoint:** `POST /api/v1/search/index/create`  
**Purpose:** Create index with proper mappings and analyzers  
**Prerequisites:** Pipeline created  
**Data Required:** None  

```json
{
  "name": "documents",
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": {"type": "keyword"},
          "ngram": {"type": "text", "analyzer": "ngram_analyzer"},
          "edge_ngram": {"type": "text", "analyzer": "edge_ngram_analyzer"},
          "fuzzy": {"type": "text", "analyzer": "fuzzy_analyzer"}
        }
      },
      "content": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "ngram": {"type": "text", "analyzer": "ngram_analyzer"},
          "semantic": {"type": "text", "analyzer": "semantic_analyzer"}
        }
      },
      "embedding": {
        "type": "dense_vector",
        "dims": 768,
        "similarity": "cosine"
      },
      "category": {"type": "keyword"},
      "tags": {"type": "keyword"},
      "rating": {"type": "float"},
      "published": {"type": "boolean"},
      "created_at": {"type": "date"},
      "updated_at": {"type": "date"}
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "ngram_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "ngram_filter"]
        }
      },
      "filter": {
        "ngram_filter": {
          "type": "ngram",
          "min_gram": 2,
          "max_gram": 4
        }
      }
    }
  }
}
```

---

## 📊 Phase 3: Data Population (CRITICAL)

> **⚠️ IMPORTANT:** All search APIs require data to be present in Elasticsearch. You must populate data before testing search endpoints.

### **Step 5: Index Single Document**
**Endpoint:** `POST /api/v1/search/index`  
**Purpose:** Test single document indexing  
**Prerequisites:** Index and pipeline created  
**Data Required:** None (this creates data)  

```json
{
  "document": {
    "title": "JavaScript Fundamentals",
    "content": "Learn the basics of JavaScript programming including variables, functions, and control structures.",
    "author": "John Doe",
    "category": "programming",
    "tags": ["javascript", "tutorial", "beginner"],
    "difficulty": "beginner",
    "rating": 4.5,
    "published": true,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "index": "documents",
  "pipeline": "content_processing_pipeline"
}
```

### **Step 6: Bulk Index Documents (REQUIRED FOR SEARCH TESTING)**
**Endpoint:** `POST /api/v1/search/bulk`  
**Purpose:** Populate index with test data for search operations  
**Prerequisites:** Index and pipeline created  
**Data Required:** None (this creates the data needed for all search tests)  

```json
{
  "documents": [
    {
      "_index": "documents",
      "_id": "js-advanced-001",
      "_source": {
        "title": "Advanced JavaScript Patterns",
        "content": "Deep dive into advanced JavaScript design patterns including module pattern, observer pattern, and factory pattern. Learn how to write maintainable and scalable JavaScript code.",
        "author": "Jane Smith",
        "category": "programming",
        "tags": ["javascript", "patterns", "advanced"],
        "difficulty": "advanced",
        "rating": 4.8,
        "published": true,
        "created_at": "2024-01-20T14:15:00Z"
      }
    },
    {
      "_index": "documents",
      "_id": "python-ml-002",
      "_source": {
        "title": "Python Machine Learning Guide",
        "content": "Complete guide to machine learning with Python using scikit-learn, pandas, and numpy. Covers supervised and unsupervised learning algorithms.",
        "author": "Mike Johnson",
        "category": "ai",
        "tags": ["python", "machine-learning", "data-science"],
        "difficulty": "intermediate",
        "rating": 4.6,
        "published": true,
        "created_at": "2024-01-18T09:45:00Z"
      }
    },
    {
      "_index": "documents",
      "_id": "react-hooks-003",
      "_source": {
        "title": "React Hooks Complete Tutorial",
        "content": "Learn React Hooks from basics to advanced concepts. Covers useState, useEffect, useContext, and custom hooks with practical examples.",
        "author": "Sarah Wilson",
        "category": "programming",
        "tags": ["react", "hooks", "frontend"],
        "difficulty": "intermediate",
        "rating": 4.7,
        "published": true,
        "created_at": "2024-01-22T16:30:00Z"
      }
    },
    {
      "_index": "documents",
      "_id": "docker-guide-004",
      "_source": {
        "title": "Docker Containerization",
        "content": "Complete guide to Docker containerization. Learn how to create, manage, and deploy Docker containers in production environments.",
        "author": "Tom Brown",
        "category": "devops",
        "tags": ["docker", "containers", "deployment"],
        "difficulty": "intermediate",
        "rating": 4.4,
        "published": true,
        "created_at": "2024-01-25T11:20:00Z"
      }
    },
    {
      "_index": "documents",
      "_id": "ai-basics-005",
      "_source": {
        "title": "Artificial Intelligence Fundamentals",
        "content": "Introduction to artificial intelligence concepts, neural networks, and deep learning. Perfect for beginners starting their AI journey.",
        "author": "Lisa Chen",
        "category": "ai",
        "tags": ["ai", "neural-networks", "deep-learning"],
        "difficulty": "beginner",
        "rating": 4.3,
        "published": true,
        "created_at": "2024-01-28T13:45:00Z"
      }
    },
    {
      "_index": "documents",
      "_id": "database-optimization-006",
      "_source": {
        "title": "Database Performance Optimization",
        "content": "Learn how to optimize database performance for large scale applications. Covers indexing, query optimization, and scaling strategies.",
        "author": "David Kumar",
        "category": "database",
        "tags": ["database", "performance", "optimization", "sql"],
        "difficulty": "advanced",
        "rating": 4.9,
        "published": true,
        "created_at": "2024-01-30T09:15:00Z"
      }
    },
    {
      "_index": "documents",
      "_id": "web-security-007",
      "_source": {
        "title": "Web Application Security Best Practices",
        "content": "Comprehensive guide to web application security including OWASP top 10, authentication, authorization, and secure coding practices.",
        "author": "Alex Rodriguez",
        "category": "security",
        "tags": ["security", "web", "owasp", "authentication"],
        "difficulty": "intermediate",
        "rating": 4.5,
        "published": true,
        "created_at": "2024-02-01T15:30:00Z"
      }
    },
    {
      "_index": "documents",
      "_id": "cloud-architecture-008",
      "_source": {
        "title": "Cloud Architecture Patterns",
        "content": "Design patterns for cloud-native applications including microservices, serverless, and container orchestration with Kubernetes.",
        "author": "Maria Garcia",
        "category": "cloud",
        "tags": ["cloud", "architecture", "microservices", "kubernetes"],
        "difficulty": "advanced",
        "rating": 4.7,
        "published": true,
        "created_at": "2024-02-03T10:45:00Z"
      }
    }
  ],
  "index": "documents",
  "pipeline": "content_processing_pipeline"
}
```

### **Step 7: Create Vector Index (For Semantic/KNN Search)**
**Endpoint:** `POST /api/v1/search/index/create`  
**Purpose:** Create separate index for vector embeddings  
**Prerequisites:** Documents index created  
**Data Required:** None  

```json
{
  "name": "vectors",
  "mappings": {
    "properties": {
      "embedding": {
        "type": "dense_vector",
        "dims": 768,
        "similarity": "cosine"
      },
      "document_id": {"type": "keyword"},
      "text_snippet": {"type": "text", "index": false},
      "category": {"type": "keyword"},
      "tags": {"type": "keyword"},
      "created_at": {"type": "date"}
    }
  }
}
```

### **Step 8: Populate Vector Data (For Semantic/KNN Search)**
**Endpoint:** `POST /api/v1/search/bulk`  
**Purpose:** Add documents with vector embeddings  
**Prerequisites:** Vector index created  
**Data Required:** None (this creates vector data)  

```json
{
  "documents": [
    {
      "_id": "js-advanced-001",
      "_source": {
        "title": "Advanced JavaScript Patterns",
        "content": "Deep dive into advanced JavaScript design patterns including module pattern, observer pattern, and factory pattern. Learn how to write maintainable and scalable JavaScript code.",
        "author": "Jane Smith",
        "category": "programming",
        "tags": ["javascript", "patterns", "advanced"],
        "difficulty": "advanced",
        "rating": 4.8,
        "published": true,
        "created_at": "2024-01-20T14:15:00Z"
      }
    },
    {
      "_id": "python-ml-002",
      "_source": {
        "title": "Python Machine Learning Guide",
        "content": "Complete guide to machine learning with Python using scikit-learn, pandas, and numpy. Covers supervised and unsupervised learning algorithms.",
        "author": "Mike Johnson",
        "category": "ai",
        "tags": ["python", "machine-learning", "data-science"],
        "difficulty": "intermediate",
        "rating": 4.6,
        "published": true,
        "created_at": "2024-01-18T09:45:00Z"
      },
      "_routing": "ai-content"
    },
    {
      "_id": "react-hooks-003",
      "_source": {
        "title": "React Hooks Complete Tutorial",
        "content": "Learn React Hooks from basics to advanced concepts. Covers useState, useEffect, useContext, and custom hooks with practical examples.",
        "author": "Sarah Wilson",
        "category": "programming",
        "tags": ["react", "hooks", "frontend"],
        "difficulty": "intermediate",
        "rating": 4.7,
        "published": true,
        "created_at": "2024-01-22T16:30:00Z"
      }
    },
    {
      "_id": "docker-guide-004",
      "_source": {
        "title": "Docker Containerization",
        "content": "Complete guide to Docker containerization. Learn how to create, manage, and deploy Docker containers in production environments.",
        "author": "Tom Brown",
        "category": "devops",
        "tags": ["docker", "containers", "deployment"],
        "difficulty": "intermediate",
        "rating": 4.4,
        "published": true,
        "created_at": "2024-01-25T11:20:00Z"
      }
    },
    {
      "_id": "ai-basics-005",
      "_source": {
        "title": "Artificial Intelligence Fundamentals",
        "content": "Introduction to artificial intelligence concepts, neural networks, and deep learning. Perfect for beginners starting their AI journey.",
        "author": "Lisa Chen",
        "category": "ai",
        "tags": ["ai", "neural-networks", "deep-learning"],
        "difficulty": "beginner",
        "rating": 4.3,
        "published": true,
        "created_at": "2024-01-28T13:45:00Z"
      }
    },
    {
      "_id": "database-optimization-006",
      "_source": {
        "title": "Database Performance Optimization",
        "content": "Learn how to optimize database performance for large scale applications. Covers indexing, query optimization, and scaling strategies.",
        "author": "David Kumar",
        "category": "database",
        "tags": ["database", "performance", "optimization", "sql"],
        "difficulty": "advanced",
        "rating": 4.9,
        "published": true,
        "created_at": "2024-01-30T09:15:00Z"
      }
    },
    {
      "_id": "web-security-007",
      "_source": {
        "title": "Web Application Security Best Practices",
        "content": "Comprehensive guide to web application security including OWASP top 10, authentication, authorization, and secure coding practices.",
        "author": "Alex Rodriguez",
        "category": "security",
        "tags": ["security", "web", "owasp", "authentication"],
        "difficulty": "intermediate",
        "rating": 4.5,
        "published": true,
        "created_at": "2024-02-01T15:30:00Z"
      }
    },
    {
      "_id": "cloud-architecture-008",
      "_source": {
        "title": "Cloud Architecture Patterns",
        "content": "Design patterns for cloud-native applications including microservices, serverless, and container orchestration with Kubernetes.",
        "author": "Maria Garcia",
        "category": "cloud",
        "tags": ["cloud", "architecture", "microservices", "kubernetes"],
        "difficulty": "advanced",
        "rating": 4.7,
        "published": true,
        "created_at": "2024-02-03T10:45:00Z"
      }
    }
  ],
  "index": "vectors",
  "pipeline": "content_processing_pipeline",
  "refresh": "wait_for",
  "timeout": "30s"
}

```

---

## 🔍 Phase 4: Search API Testing

> **✅ Prerequisites:** All data from Phase 3 must be indexed before testing these endpoints.

### **Step 9: Basic Multi-field Search**
**Endpoint:** `GET /api/v1/search`  
**Purpose:** Test basic search functionality  
**Prerequisites:** Documents indexed in Step 6  
**Data Required:** ✅ Documents from bulk index  

```
GET /api/v1/search?query=javascript&fields=["title","content"]&index=documents
```

### **Step 10: N-gram Search**
**Endpoint:** `POST /api/v1/search/ngram`  
**Purpose:** Test partial matching with typos  
**Prerequisites:** Documents indexed with n-gram analyzers  
**Data Required:** ✅ Documents from bulk index  

```json
{
  "query": "javascrpt tutorail",
  "fields": ["title", "content"],
  "index": "documents",
  "ngramType": "both"
}
```

### **Step 11: Fuzzy Search**
**Endpoint:** `POST /api/v1/search/fuzzy`  
**Purpose:** Test typo tolerance  
**Prerequisites:** Documents indexed with fuzzy analyzers  
**Data Required:** ✅ Documents from bulk index  

```json
{
  "query": "machien lerning",
  "fields": ["title", "content"],
  "index": "documents",
  "fuzziness": "AUTO"
}
```

### **Step 12: Semantic Search**
**Endpoint:** `POST /api/v1/search/semantic`  
**Purpose:** Test vector-based search  
**Prerequisites:** Vector data indexed in Step 8  
**Data Required:** ✅ Vector embeddings from Step 8  

```json
{
  "query": "machine learning algorithms",
  "index": "vectors",
  "threshold": 0.7,
  "hybridMode": true
}
```

### **Step 13: KNN Search**
**Endpoint:** `POST /api/v1/search/knn`  
**Purpose:** Test similarity search  
**Prerequisites:** Vector data indexed in Step 8  
**Data Required:** ✅ Vector embeddings from Step 8  

```json
{
  "vector": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  "k": 5,
  "index": "vectors",
  "similarity_metric": "cosine"
}
```

### **Step 14: Aggregation Search**
**Endpoint:** `POST /api/v1/search/aggregate`  
**Purpose:** Test analytics and aggregations  
**Prerequisites:** Documents indexed in Step 6  
**Data Required:** ✅ Documents from bulk index  

```json
{
  "index": "documents",
  "aggregations": {
    "categories": {
      "type": "terms",
      "field": "category",
      "size": 10
    },
    "avg_rating": {
      "type": "avg",
      "field": "rating"
    }
  }
}
```

---

## ✏️ Phase 5: Document Management Testing

### **Step 15: Update Document**
**Endpoint:** `PUT /api/v1/search/document/{id}`  
**Purpose:** Test document updates  
**Prerequisites:** Document exists (from Step 5 or 6)  
**Data Required:** ✅ Existing document ID  

```json
{
  "document": {
    "title": "JavaScript Fundamentals - Updated",
    "rating": 4.8,
    "updated_at": "2024-02-05T12:00:00Z"
  },
  "index": "documents"
}
```

### **Step 16: Search Statistics (Final)**
**Endpoint:** `GET /api/v1/search/stats/documents`  
**Purpose:** Verify data population and get final stats  
**Prerequisites:** All documents indexed  
**Data Required:** ✅ All indexed documents  

---

## 🧹 Phase 6: Cleanup Testing

### **Step 17: Delete Document**
**Endpoint:** `DELETE /api/v1/search/document/{id}`  
**Purpose:** Test document deletion  
**Prerequisites:** Document exists  
**Data Required:** ✅ Existing document ID  

```
DELETE /api/v1/search/document/js-advanced-001?index=documents
```

---

## 📊 Data Requirements Summary

### **APIs that CREATE data (run these first):**
1. ✅ **Create Pipeline** - Creates processing pipeline
2. ✅ **Create Index** - Creates index structure
3. ✅ **Index Document** - Creates single document
4. ✅ **Bulk Index** - Creates multiple documents (CRITICAL for search testing)

### **APIs that REQUIRE existing data:**
1. ❌ **Basic Search** - Needs documents from bulk index
2. ❌ **Semantic Search** - Needs vector embeddings
3. ❌ **KNN Search** - Needs vector embeddings
4. ❌ **N-gram Search** - Needs documents with n-gram fields
5. ❌ **Fuzzy Search** - Needs documents with fuzzy fields
6. ❌ **Aggregation Search** - Needs documents for aggregation
7. ❌ **Update Document** - Needs existing document
8. ❌ **Delete Document** - Needs existing document
9. ❌ **Search Statistics** - More meaningful with existing data

### **APIs that work without data:**
1. ✅ **Health Check** - System status only
2. ✅ **Create Index** - Index management
3. ✅ **Create Pipeline** - Pipeline management

---

## 🚨 Critical Testing Notes

### **Before Search Testing:**
1. **MUST** run bulk index operation with at least 5-10 documents
2. **MUST** include documents with different categories, tags, and ratings
3. **MUST** wait for index refresh (use `"refresh": "wait_for"`)

### **For Vector Search Testing:**
1. **MUST** create separate vector index
2. **MUST** populate with documents containing embedding arrays
3. **MUST** ensure embedding dimensions match (768 in examples)

### **For Advanced Search Features:**
1. **MUST** ensure index has proper analyzer configurations
2. **MUST** include documents with typos for fuzzy testing
3. **MUST** include varied content for n-gram testing

### **Testing Order Violations:**
- ❌ **DON'T** test search APIs before populating data
- ❌ **DON'T** test vector search without vector index
- ❌ **DON'T** test document operations without creating index first
- ❌ **DON'T** skip pipeline creation if using document processing

This order ensures all dependencies are met and provides meaningful test results for each API endpoint.
