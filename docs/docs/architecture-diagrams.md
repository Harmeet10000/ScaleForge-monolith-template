# Architecture Diagrams and System Documentation

## Overview

This document provides comprehensive architecture diagrams and system documentation for the platform infrastructure, including network topology, service interactions, data flow, and security boundaries.

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Internet"
        Users[Users/Clients]
        CDN[CloudFront CDN]
    end

    subgraph "AWS Route 53"
        DNS[DNS Management]
    end

    subgraph "AWS VPC - Production (10.0.0.0/16)"
        subgraph "Public Subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)"
            ALB[Application Load Balancer]
            NAT1[NAT Gateway AZ-1]
            NAT2[NAT Gateway AZ-2]
            NAT3[NAT Gateway AZ-3]
        end

        subgraph "Private Subnets (10.0.10.0/24, 10.0.20.0/24, 10.0.30.0/24)"
            subgraph "EKS Cluster"
                subgraph "Infrastructure Namespace"
                    Prometheus[Prometheus]
                    Grafana[Grafana]
                    AlertManager[AlertManager]
                    CertManager[cert-manager]
                    Loki[Loki]
                end

                subgraph "Platform Namespace"
                    Kong[Kong Gateway]
                    ExternalSecrets[External Secrets Operator]
                    FluentBit[Fluent Bit]
                end

                subgraph "Apps Namespace"
                    FastAPI[FastAPI Pods]
                    Express[Express Pods]
                end

                subgraph "Workers Namespace"
                    LangChain[LangChain Workers]
                    LangGraph[LangGraph Orchestrator]
                    DocProcessor[Document Processors]
                    Crawlers[Web Crawlers]
                end

                subgraph "Batch Namespace"
                    CronJobs[Scheduled Jobs]
                    BackupJobs[Backup Jobs]
                end
            end

            RDS[(RDS PostgreSQL Multi-AZ)]
            ElastiCache[(ElastiCache Redis Cluster)]
            MSK[MSK Kafka Cluster]
            OpenSearch[(OpenSearch Cluster)]
        end
    end

    subgraph "External Services"
        Pinecone[(Pinecone Vector DB)]
        Gemini[Google Gemini API]
        S3[(S3 Storage)]
        ECR[ECR Container Registry]
        SecretsManager[AWS Secrets Manager]
    end

    Users --> CDN
    CDN --> DNS
    DNS --> ALB
    ALB --> Kong
    Kong --> FastAPI
    Kong --> Express

    FastAPI --> RDS
    FastAPI --> ElastiCache
    FastAPI --> Pinecone
    FastAPI --> S3

    Express --> RDS
    Express --> ElastiCache
    Express --> MSK

    LangChain --> Gemini
    LangChain --> Pinecone
    LangGraph --> RDS
    LangGraph --> MSK

    DocProcessor --> S3
    DocProcessor --> OpenSearch
    Crawlers --> S3

    ExternalSecrets --> SecretsManager

    Prometheus --> FastAPI
    Prometheus --> Express
    Prometheus --> LangChain

    FluentBit --> Loki
    AlertManager --> PagerDuty[PagerDuty]
```

## Network Architecture

```mermaid
graph TB
    subgraph "VPC: 10.0.0.0/16"
        subgraph "Availability Zone A"
            PublicA[Public Subnet<br/>10.0.1.0/24]
            PrivateA[Private Subnet<br/>10.0.10.0/24]
            PublicA --> PrivateA
        end

        subgraph "Availability Zone B"
            PublicB[Public Subnet<br/>10.0.2.0/24]
            PrivateB[Private Subnet<br/>10.0.20.0/24]
            PublicB --> PrivateB
        end

        subgraph "Availability Zone C"
            PublicC[Public Subnet<br/>10.0.3.0/24]
            PrivateC[Private Subnet<br/>10.0.30.0/24]
            PublicC --> PrivateC
        end

        IGW[Internet Gateway]

        subgraph "Route Tables"
            PublicRT[Public Route Table]
            PrivateRT1[Private Route Table AZ-A]
            PrivateRT2[Private Route Table AZ-B]
            PrivateRT3[Private Route Table AZ-C]
        end

        subgraph "Security Groups"
            ALBSG[ALB Security Group<br/>80, 443 from 0.0.0.0/0]
            EKSControlSG[EKS Control Plane SG<br/>443 from Worker Nodes]
            EKSWorkerSG[EKS Worker Nodes SG<br/>All traffic from Control Plane]
            RDSSG[RDS Security Group<br/>5432 from EKS Workers]
            RedisG[Redis Security Group<br/>6379 from EKS Workers]
        end
    end

    Internet --> IGW
    IGW --> PublicRT
    PublicRT --> PublicA
    PublicRT --> PublicB
    PublicRT --> PublicC

    PrivateRT1 --> PrivateA
    PrivateRT2 --> PrivateB
    PrivateRT3 --> PrivateC
```

## Kubernetes Architecture

```mermaid
graph TB
    subgraph "EKS Control Plane (AWS Managed)"
        APIServer[API Server]
        Scheduler[Scheduler]
        ControllerManager[Controller Manager]
        etcd[etcd]
    end

    subgraph "Worker Node Group 1 (General Workloads)"
        subgraph "Node 1"
            kubelet1[kubelet]
            kube-proxy1[kube-proxy]
            Pods1[Application Pods]
        end

        subgraph "Node 2"
            kubelet2[kubelet]
            kube-proxy2[kube-proxy]
            Pods2[Application Pods]
        end
    end

    subgraph "Worker Node Group 2 (Compute Intensive)"
        subgraph "Node 3"
            kubelet3[kubelet]
            kube-proxy3[kube-proxy]
            Pods3[Worker Pods]
        end

        subgraph "Node 4"
            kubelet4[kubelet]
            kube-proxy4[kube-proxy]
            Pods4[Worker Pods]
        end
    end

    subgraph "Add-ons"
        CoreDNS[CoreDNS]
        AWSLBC[AWS Load Balancer Controller]
        EBSCSIDriver[EBS CSI Driver]
        VPCCNIPlugin[VPC CNI Plugin]
    end

    APIServer --> kubelet1
    APIServer --> kubelet2
    APIServer --> kubelet3
    APIServer --> kubelet4

    Scheduler --> APIServer
    ControllerManager --> APIServer
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant ALB
    participant Kong
    participant FastAPI
    participant Express
    participant RDS
    participant Redis
    participant Pinecone
    participant S3
    participant LangChain

    User->>ALB: HTTPS Request
    ALB->>Kong: Forward Request
    Kong->>Kong: Rate Limiting, Auth

    alt FastAPI Request
        Kong->>FastAPI: Route to FastAPI
        FastAPI->>Redis: Check Cache
        alt Cache Miss
            FastAPI->>RDS: Query Database
            FastAPI->>Pinecone: Vector Search
            FastAPI->>Redis: Update Cache
        end
        FastAPI->>Kong: Response
    else Express Request
        Kong->>Express: Route to Express
        Express->>RDS: Query Database
        Express->>Redis: Session Management
        Express->>Kong: Response
    end

    Kong->>ALB: Response
    ALB->>User: HTTPS Response

    Note over LangChain: Async Processing
    LangChain->>S3: Process Documents
    LangChain->>Pinecone: Store Embeddings
    LangChain->>RDS: Update Metadata
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            WAF[AWS WAF]
            SecurityGroups[Security Groups]
            NACLs[Network ACLs]
            NetworkPolicies[K8s Network Policies]
        end

        subgraph "Identity & Access"
            IAMRoles[IAM Roles]
            IRSA[IAM Roles for Service Accounts]
            RBAC[Kubernetes RBAC]
            ServiceAccounts[Service Accounts]
        end

        subgraph "Data Protection"
            TLS[TLS Encryption in Transit]
            KMSEncryption[KMS Encryption at Rest]
            SecretsEncryption[Secrets Encryption]
            VaultIntegration[HashiCorp Vault]
        end

        subgraph "Monitoring & Compliance"
            CloudTrail[AWS CloudTrail]
            GuardDuty[AWS GuardDuty]
            SecurityHub[AWS Security Hub]
            FalcoRules[Falco Runtime Security]
        end
    end

    Internet --> WAF
    WAF --> SecurityGroups
    SecurityGroups --> NetworkPolicies

    IAMRoles --> IRSA
    IRSA --> ServiceAccounts
    ServiceAccounts --> RBAC

    TLS --> KMSEncryption
    KMSEncryption --> SecretsEncryption
    SecretsEncryption --> VaultIntegration
```

## Monitoring and Observability Architecture

```mermaid
graph TB
    subgraph "Data Collection"
        Applications[Applications]
        Infrastructure[Infrastructure]
        Kubernetes[Kubernetes]
    end

    subgraph "Metrics Pipeline"
        Prometheus[Prometheus]
        PrometheusOperator[Prometheus Operator]
        ServiceMonitors[Service Monitors]
        PodMonitors[Pod Monitors]
    end

    subgraph "Logging Pipeline"
        FluentBit[Fluent Bit]
        Loki[Loki]
        LogAggregation[Log Aggregation]
    end

    subgraph "Tracing Pipeline"
        Jaeger[Jaeger]
        OpenTelemetry[OpenTelemetry Collector]
        TraceCollection[Trace Collection]
    end

    subgraph "Visualization & Alerting"
        Grafana[Grafana Dashboards]
        AlertManager[Alert Manager]
        PagerDuty[PagerDuty Integration]
        Slack[Slack Notifications]
    end

    Applications --> Prometheus
    Applications --> FluentBit
    Applications --> OpenTelemetry

    Infrastructure --> Prometheus
    Kubernetes --> Prometheus

    Prometheus --> Grafana
    Prometheus --> AlertManager

    FluentBit --> Loki
    Loki --> Grafana

    OpenTelemetry --> Jaeger
    Jaeger --> Grafana

    AlertManager --> PagerDuty
    AlertManager --> Slack
```

## Deployment Pipeline Architecture

```mermaid
graph LR
    subgraph "Source Control"
        GitHub[GitHub Repository]
        PRs[Pull Requests]
        MainBranch[Main Branch]
    end

    subgraph "CI Pipeline"
        GitHubActions[GitHub Actions]
        BuildStage[Build & Test]
        SecurityScan[Security Scanning]
        ImageBuild[Container Build]
        ImagePush[Push to ECR]
    end

    subgraph "CD Pipeline"
        ArgoCD[ArgoCD]
        GitOps[GitOps Sync]
        Deployment[K8s Deployment]
        HealthCheck[Health Checks]
    end

    subgraph "Environments"
        Dev[Development]
        Staging[Staging]
        Prod[Production]
    end

    GitHub --> GitHubActions
    GitHubActions --> BuildStage
    BuildStage --> SecurityScan
    SecurityScan --> ImageBuild
    ImageBuild --> ImagePush

    ImagePush --> ArgoCD
    ArgoCD --> GitOps
    GitOps --> Deployment
    Deployment --> HealthCheck

    HealthCheck --> Dev
    Dev --> Staging
    Staging --> Prod
```

## Storage Architecture

```mermaid
graph TB
    subgraph "Persistent Storage"
        subgraph "Database Storage"
            RDSStorage[(RDS PostgreSQL<br/>Multi-AZ<br/>Encrypted)]
            RedisStorage[(ElastiCache Redis<br/>Cluster Mode<br/>Encrypted)]
        end

        subgraph "Object Storage"
            S3Documents[(S3 Documents<br/>Lifecycle Policies<br/>Versioning)]
            S3Backups[(S3 Backups<br/>Cross-Region Replication)]
            S3Logs[(S3 Logs<br/>Intelligent Tiering)]
        end

        subgraph "Search Storage"
            OpenSearchStorage[(OpenSearch<br/>Multi-AZ<br/>Encrypted)]
            PineconeStorage[(Pinecone Vector DB<br/>External Service)]
        end

        subgraph "Container Storage"
            ECRStorage[(ECR Container Registry<br/>Vulnerability Scanning)]
            EBSVolumes[EBS Volumes<br/>gp3 Encrypted]
        end
    end

    subgraph "Backup Strategy"
        AutomatedBackups[Automated Daily Backups]
        PointInTimeRecovery[Point-in-Time Recovery]
        CrossRegionReplication[Cross-Region Replication]
        BackupRetention[30-day Retention Policy]
    end

    RDSStorage --> AutomatedBackups
    S3Documents --> CrossRegionReplication
    RedisStorage --> AutomatedBackups
    OpenSearchStorage --> AutomatedBackups
```

## Disaster Recovery Architecture

```mermaid
graph TB
    subgraph "Primary Region (us-west-2)"
        PrimaryVPC[Primary VPC]
        PrimaryEKS[Primary EKS Cluster]
        PrimaryRDS[Primary RDS]
        PrimaryS3[Primary S3 Buckets]
    end

    subgraph "Secondary Region (us-east-1)"
        SecondaryVPC[Secondary VPC]
        SecondaryEKS[Secondary EKS Cluster]
        SecondaryRDS[RDS Read Replica]
        SecondaryS3[S3 Cross-Region Replication]
    end

    subgraph "Recovery Procedures"
        RPO[RPO: 15 minutes]
        RTO[RTO: 4 hours]
        FailoverProcess[Automated Failover]
        DataSync[Data Synchronization]
    end

    PrimaryRDS -.->|Continuous Replication| SecondaryRDS
    PrimaryS3 -.->|Cross-Region Replication| SecondaryS3

    PrimaryVPC -.->|Disaster Event| FailoverProcess
    FailoverProcess --> SecondaryVPC
```

## Component Specifications

### EKS Cluster Configuration

- **Kubernetes Version**: 1.28
- **Control Plane**: AWS Managed, Multi-AZ
- **Node Groups**:
  - General: m5.large, m5.xlarge (Spot instances)
  - Compute: c5.2xlarge, c5.4xlarge (On-demand)
- **Networking**: VPC CNI, Calico for network policies
- **Storage**: EBS CSI driver, gp3 storage class

### Database Specifications

- **RDS PostgreSQL**:
  - Version: 15.4
  - Instance: db.r6g.large (Multi-AZ)
  - Storage: 100GB gp3, auto-scaling enabled
  - Backup: 30-day retention, automated backups
- **ElastiCache Redis**:
  - Version: 7.0
  - Node Type: cache.r6g.large
  - Configuration: Cluster mode, 3 shards, 1 replica per shard

### Load Balancer Configuration

- **Application Load Balancer**:
  - Scheme: Internet-facing
  - IP Address Type: IPv4
  - Listeners: HTTP (80) → HTTPS (443)
  - SSL Policy: ELBSecurityPolicy-TLS-1-2-2017-01
  - Target Groups: EKS worker nodes

### Security Group Rules

#### ALB Security Group

- **Inbound**:
  - HTTP (80) from 0.0.0.0/0
  - HTTPS (443) from 0.0.0.0/0
- **Outbound**:
  - All traffic to EKS worker nodes

#### EKS Worker Nodes Security Group

- **Inbound**:
  - All traffic from EKS control plane
  - HTTP/HTTPS from ALB security group
  - Node-to-node communication
- **Outbound**:
  - All traffic to 0.0.0.0/0

#### RDS Security Group

- **Inbound**:
  - PostgreSQL (5432) from EKS worker nodes
- **Outbound**:
  - None

### Resource Allocation Guidelines

#### Application Pods

```yaml
FastAPI Pods:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi

Express Pods:
  requests:
    cpu: 200m
    memory: 384Mi
  limits:
    cpu: 750m
    memory: 768Mi

LangChain Workers:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 4000m
    memory: 8Gi
```

#### Infrastructure Pods

```yaml
Prometheus:
  requests:
    cpu: 500m
    memory: 2Gi
  limits:
    cpu: 2000m
    memory: 8Gi

Grafana:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

Fluent Bit:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

## Scaling Policies

### Horizontal Pod Autoscaler (HPA)

- **FastAPI**: Scale 3-20 pods based on CPU (70%) and memory (80%)
- **Express**: Scale 3-15 pods based on CPU (70%) and memory (80%)
- **LangChain Workers**: Scale 2-10 pods based on CPU (80%) and custom metrics

### Cluster Autoscaler

- **General Node Group**: 1-10 nodes, scale based on pod resource requests
- **Compute Node Group**: 0-8 nodes, scale based on compute-intensive workloads

### Vertical Pod Autoscaler (VPA)

- **Recommendation Mode**: Monitor resource usage patterns
- **Auto Mode**: Automatically adjust resource requests/limits for non-critical workloads

This architecture documentation provides a comprehensive view of the system design, component interactions, and operational considerations for the platform infrastructure.
