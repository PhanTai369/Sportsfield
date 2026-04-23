# W3 Evidence Pack — SportFields

---

## 1. Cover

| Field | Value |
|-------|-------|
| **Group Number** | _[Điền số nhóm]_ |
| **Members** | _[Điền tên thành viên]_ |
| **Database Path** | **RDS PostgreSQL / Relational** |
| **W2 Evidence Link** | _[Link tới W2 evidence commit]_ |

### W2 Recap — Trainer Feedback

**W2 feedback item:** _[Kể tên 1 item cụ thể từ trainer feedback tuần trước]_

**Cách W3 addresses:** _[Giải thích W3 build lên trên feedback đó như thế nào. Ví dụ: "Trainer flagged missing S3 Gateway Endpoint — W3 VPC diagram now includes VPC Endpoint for S3 với route table entry verified."]_

---

## 2. Data Access Pattern Log

### Part A — 3 Access Patterns Thật Từ App

| # | Access Pattern | Frequency ước lượng |
|---|---------------|---------------------|
| 1 | Lấy tất cả bookings cho 1 user, JOIN với field/subfield/payment info, sort theo booking_date DESC | ~100 calls/phút lúc peak |
| 2 | Kiểm tra timeslot availability cho 1 subfield theo ngày cụ thể (WHERE sub_field_id + date + status = 'available') | ~200 calls/phút lúc peak |
| 3 | Tạo booking: INSERT booking + UPDATE timeslots status → 'booked' + INSERT payment — tất cả trong 1 ACID transaction | ~20 calls/phút lúc peak |

### Part B — Engine + Paradigm + Reasoning

**Engine: RDS PostgreSQL (managed) | Paradigm: Relational**

| Pattern | Index/Mechanism phục vụ query | Reasoning |
|---------|-------------------------------|-----------|
| **#1** Booking list with JOINs | Index `idx_bookings_user_status` (user_id, status) trên table Bookings. Query JOIN qua 5 tables: bookings → users → timeslots → subfields → fields, LEFT JOIN payments. | Data có deep FK relationships — 16 tables, ~20 foreign keys. Mỗi booking reference user, nhiều timeslots, mỗi timeslot reference subfield, mỗi subfield reference field. Chỉ relational engine native support multi-table JOIN + FK constraints. |
| **#2** Timeslot availability | Composite index `timeslot_availability_index` (sub_field_id, date, status) — Index Scan cover chính xác WHERE clause, không Seq Scan. ElastiCache (Redis) cache hot timeslot queries để giảm load lên RDS cho pattern này. | Query này chạy nhiều nhất (users checking sân trống). Composite index đảm bảo Index Scan. Cache Miss → query RDS → store in ElastiCache; Cache Hit → trả về trực tiếp từ Redis, bypass RDS. |
| **#3** Create booking transaction | PostgreSQL ACID transaction (BEGIN → INSERT booking → UPDATE timeslots → INSERT payment → COMMIT / ROLLBACK). Cache invalidation trên ElastiCache sau khi write thành công. | Đặt sân phải atomic: nếu payment insert fail sau khi timeslots đã update, ROLLBACK đưa tất cả về trạng thái trước. Sequelize ORM dùng `sequelize.transaction()` wrapper. |

**Backup & HA:**
- Automated backups: **7 ngày retention** (RDS managed)
- **Multi-AZ enabled** — RDS Primary (AZ A) + RDS Standby (AZ B) với automatic failover. Nếu Primary fail, AWS tự promote Standby thành Primary trong ~60-120 giây.
- ElastiCache: Primary (AZ A) + replica (AZ B) — caching layer giữa EC2 app tier và RDS, giảm read load ~60-80%.
- Encryption at rest: **Enabled** với AWS-managed KMS key `aws/rds` — chọn AWS-managed thay vì customer CMK vì chưa có compliance mandate và muốn automatic key rotation.

### Part C — "Wrong-Paradigm" Test

**Pattern được test: #3 — Create Booking Transaction**

> Nếu dùng **DynamoDB (key-value)** cho pattern này:
>
> - DynamoDB `TransactWriteItems` hỗ trợ atomic writes, nhưng giới hạn ở **100 items/transaction** và **25 unique items per request**. Quan trọng hơn: DynamoDB **không có foreign key constraints** — application phải tự validate mọi reference (booking → user tồn tại? timeslot → subfield tồn tại?). Nếu validation logic ở app layer bị bug, data sẽ inconsistent mà database không báo lỗi.
>
> - Reporting queries (monthly revenue, booking stats by field) sẽ cần **Scan toàn bộ table** hoặc maintain nhiều GSI cho mỗi query pattern. Mỗi GSI tốn thêm write capacity và storage cost, scale linearly theo số access patterns. Trong khi PostgreSQL handle bằng 1 SQL query: `SELECT field_id, SUM(total_price) FROM bookings GROUP BY field_id`.
>
> - Schema gồm 16 tables với ~20 FK relationships. DynamoDB single-table design cho schema này sẽ cực kỳ complex — mỗi item type cần composite keys (PK: `USER#<id>`, SK: `BOOKING#<id>#TIMESLOT#<id>`), và mọi relationship phải denormalized. Thay đổi schema (thêm field mới, thay đổi relationship) yêu cầu rewrite tất cả consuming code.

---

## 3. Deployment Evidence

### 3.1 RDS Instance — Multi-AZ, Private Subnet, Encryption, Backups

**Screenshot:** _[Paste screenshot RDS console: instance details showing engine, status, Multi-AZ = Yes, encryption enabled, backup retention = 7 days, VPC/subnet, Public accessibility = No]_

**CLI verification:**
```bash
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus,Engine,EngineVersion,StorageEncrypted,BackupRetentionPeriod,PubliclyAccessible,MultiAZ]' --output table
```

**Output:** _[Paste CLI output]_

**Notes:**
- Encryption at rest enabled với AWS-managed KMS key `aws/rds`. Chọn AWS-managed thay vì customer CMK vì chưa có compliance mandate yêu cầu key rotation control riêng — AWS-managed key tự rotate hàng năm.
- Backup retention: 7 ngày. Cho phép point-in-time restore tới bất kỳ thời điểm nào trong 7 ngày gần nhất.
- Public accessibility: **No** — RDS instance chỉ reachable từ application tier EC2 qua private subnet + Security Group.
- **Multi-AZ: Yes** — RDS Primary (AZ A) + RDS Standby (AZ B). Automatic failover nếu Primary AZ fail, với DNS endpoint tự động re-resolve về Standby. Estimated failover time: ~60-120 giây.

### 3.2 ElastiCache (Redis) — Cache Layer

**Screenshot:** _[Paste screenshot ElastiCache console: cluster name, engine = Redis, node type, number of nodes, replication status]_

**CLI verification:**
```bash
aws elasticache describe-cache-clusters --query 'CacheClusters[*].[CacheClusterId,Engine,CacheNodeType,NumCacheNodes]' --output table
```

**Output:** _[Paste CLI output]_

**Notes:**
- ElastiCache Redis đặt giữa EC2 app tier và RDS. Cache hit → return trực tiếp từ Redis (sub-millisecond latency). Cache miss → query RDS → store result in Redis.
- Primary node (AZ A) + replica (AZ B) — automatic failover nếu primary node fail.
- Use case chính: cache timeslot availability queries (Pattern #2 — highest frequency, ~200 calls/phút) và field listings.

### 3.3 Database Security Group

**Screenshot:** _[Paste screenshot Security Group inbound rules showing: PostgreSQL 5432, Source = sg-xxxxx (app tier SG)]_

**CLI verification:**
```bash
aws ec2 describe-security-groups --group-ids <DB_SG_ID> --query 'SecurityGroups[*].IpPermissions' --output json
```

**Output:** _[Paste CLI output]_

**Notes:**
- Inbound rule reference **App tier Security Group ID** (sg-xxxx) — không dùng CIDR block. Lý do: nếu app tier EC2 instances thay đổi IP (scale out/in across AZ A/B), SG reference vẫn hoạt động vì nó reference security group membership chứ không phải IP cụ thể.
- Outbound: default — allow all outbound (RDS managed connections).

### 3.4 Schema — Related Tables With Foreign Keys

**Screenshot:** _[Paste screenshot hoặc CLI output showing table structure với FK constraints]_

```sql
-- Verify FK constraints exist between related tables
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

**Output:** _[Paste output showing FK relationships, ví dụ: bookings.user_id → users.id, timeslots.booking_id → bookings.id, timeslots.sub_field_id → subfields.id, etc.]_

### 3.5 Automated Backups

**Screenshot:** _[Paste screenshot RDS → Maintenance & backups showing backup retention period = 7 days, backup window, latest restorable time]_

**Notes:**
- Automated backups enabled: 7 ngày retention.
- Backup window: _[Điền thời gian]_ UTC — chọn ngoài peak hours.
- Multi-AZ: backup taken từ Standby instance → không impact Primary performance.

### 3.6 Data Write + Read Evidence

**Screenshot:** _[Paste screenshot showing ít nhất 1 record được write và read — có thể qua app UI hoặc psql CLI]_

**Notes:**
- Record được tạo qua application (Sequelize ORM), không chỉ tạo trong console.
- Ví dụ: tạo 1 booking qua API → verify record xuất hiện trong RDS qua psql query.

---

## 4. Working Query Evidence

### Query 1 — JOIN: Lấy Bookings Với Field + Payment Info

```sql
SELECT 
    b.id AS booking_id,
    b.booking_date,
    b.status,
    b.total_price,
    u.name AS customer_name,
    f.name AS field_name,
    sf.name AS subfield_name,
    sf.field_type,
    p.status AS payment_status,
    p.amount AS paid_amount
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN timeslots ts ON ts.booking_id = b.id
JOIN subfields sf ON ts.sub_field_id = sf.id
JOIN fields f ON sf.field_id = f.id
LEFT JOIN payments p ON p.booking_id = b.id
WHERE u.id = '<user-uuid-here>'
ORDER BY b.booking_date DESC
LIMIT 10;
```

**Screenshot:** _[Paste screenshot showing query result with real data rows]_

**Index used:** `idx_bookings_user_status` (user_id, status) — supports WHERE clause filtering by user_id.

### Query 2 — Indexed Lookup: Timeslot Availability

```sql
-- Query
SELECT ts.id, ts.start_time, ts.end_time, ts.status
FROM timeslots ts
WHERE ts.sub_field_id = '<subfield-uuid-here>'
  AND ts.date = '2026-04-25'
  AND ts.status = 'available'
ORDER BY ts.start_time;

-- EXPLAIN ANALYZE to prove index usage
EXPLAIN ANALYZE
SELECT ts.id, ts.start_time, ts.end_time, ts.status
FROM timeslots ts
WHERE ts.sub_field_id = '<subfield-uuid-here>'
  AND ts.date = '2026-04-25'
  AND ts.status = 'available'
ORDER BY ts.start_time;
```

**Screenshot:** _[Paste screenshot showing: (1) query results, (2) EXPLAIN ANALYZE output showing "Index Scan using timeslot_availability_index"]_

**Index used:** `timeslot_availability_index` (sub_field_id, date, status) — composite index cover chính xác WHERE clause → Index Scan, không Seq Scan.

---

## 5. Lambda + Bedrock Evidence

### 5.1 Lambda Function — Image Processing

**Screenshot:** _[Paste screenshot Lambda console: function name, runtime, trigger configuration (S3 event trigger)]_

**Trigger:** S3 event — function fire khi user upload image vào S3 bucket (user assets).

**IAM Role Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ReadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::<user-assets-bucket>/*"
    },
    {
      "Sid": "S3WriteProcessed",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::<user-assets-bucket>/processed/*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:<region>:<account>:log-group:/aws/lambda/<function-name>:*"
    }
  ]
}
```

**Notes:**
- **Không có `Action: "*"`** — chỉ s3:GetObject, s3:PutObject, và CloudWatch logs permissions.
- **Không có `Resource: "*"`** — scoped về specific S3 bucket ARN và specific log group.

### 5.2 Lambda CloudWatch Logs

**Screenshot:** _[Paste screenshot CloudWatch Logs showing Lambda execution log entry with timestamp sau khi S3 upload trigger]_

**Notes:**
- Lambda triggered bởi S3 PUT event (user upload ảnh sân/profile).
- Function xử lý image (resize/optimize) và write output về S3 processed folder.
- CloudWatch log timestamp: _[Điền timestamp]_ — matches S3 upload time.

### 5.3 Bedrock Knowledge Base

**Screenshot:** _[Paste screenshot Bedrock console: KB name, status = ACTIVE, data source = S3 bucket, embedding model, vector store]_

**Details:**
| Config | Value |
|--------|-------|
| Knowledge Base ID | _[Điền]_ |
| S3 Data Source | _[S3 DataSource bucket name]_ |
| Documents ingested | _[Số lượng, ≥ 3]_ |
| Sync job status | Complete |
| Embedding Model | Amazon Titan Embeddings G1 - Text v2 |
| Vector Store | **S3 Vectors** |

**Notes:**
- Knowledge Base connect với S3 DataSource bucket (separate từ user assets bucket).
- S3 Vectors engine được chọn vì: chi phí thấp hơn OpenSearch Serverless cho volume nhỏ, không cần provision cluster riêng, data lưu trực tiếp trong S3.

### 5.4 Bedrock Retrieve API Call (ngoài Console)

**Method:** _[Lambda function / AWS CLI]_

```bash
# CLI command used:
aws bedrock-agent-runtime retrieve \
  --knowledge-base-id <KB_ID> \
  --retrieval-query '{"text": "Chính sách huỷ đặt sân bóng"}' \
  --region <REGION>
```

**Screenshot:** _[Paste screenshot showing Retrieve response with real document chunks returned]_

**Notes:**
- API call thực hiện ngoài Bedrock Console (qua CLI / Lambda), không phải Playground.
- Response trả về document chunks relevant to query, kèm score và source metadata.

---

## 6. VPC + Networking Evidence

### 6.1 VPC Architecture Diagram — 3 Tiers, Multi-AZ

_[Embed diagram ở đây — diagram đã có sẵn, show các layer sau:]_

| Tier | Subnet | Components | AZ |
|------|--------|------------|-----|
| **Public** | Public subnet | NAT Gateway, ALB | Shared |
| **Private Application** | Private subnet (AZ A + B) | EC2 App instances, Lambda | AZ A + AZ B |
| **Private Database** | Private subnet (AZ A + B) | RDS Primary + ElastiCache Primary (AZ A), RDS Standby + ElastiCache replica (AZ B) | AZ A + AZ B |

**Additional components outside VPC:**
- Route 53 → CloudFront (+ WAF + ACM) → Internet Gateway → ALB
- S3 frontend static (served via CloudFront)
- S3 user assets (accessed via VPC Endpoint)
- S3 DataSource → Bedrock Knowledge Base (S3 Vectors)
- AWS KMS, IAM (Security & Identity)
- CloudWatch, CloudTrail (Monitoring & Logging)

### 6.2 S3 Gateway Endpoint (VPC Endpoint)

**Screenshot:** _[Paste screenshot VPC → Endpoints showing S3 Gateway Endpoint: service name = com.amazonaws.<region>.s3, VPC ID, route table, status = available]_

**CLI verification:**
```bash
aws ec2 describe-vpc-endpoints --query 'VpcEndpoints[*].[VpcEndpointId,ServiceName,VpcId,State]' --output table
```

**Output:** _[Paste CLI output]_

**Route table entry screenshot:** _[Paste screenshot route table showing pl-xxxxx (S3 prefix list) → vpce-xxxxx]_

**Notes:**
- S3 VPC Gateway Endpoint cho phép EC2 instances trong private subnet truy cập S3 user assets bucket mà không qua NAT Gateway — tiết kiệm NAT data processing charges (~$0.045/GB) và giảm latency.
- Route table entry tự động thêm S3 prefix list destination → VPC Endpoint target.
- Trong diagram: labeled "VPC ENDPOINT" giữa EC2 app tier và S3 user assets.

### 6.3 Database Security Group — App Tier SG Reference

**Screenshot:** _[Paste screenshot SG inbound rules: PostgreSQL 5432, Source = sg-xxxxx (app tier SG)]_

**Notes:**
- Source là **Security Group ID** (sg-xxxxx) của app tier — không phải CIDR block.
- Lý do: SG reference tự động adapt khi app tier instances scale out/in across AZ A/B. CIDR block sẽ cần manual update mỗi lần IP thay đổi.
- Cùng pattern cho ElastiCache SG: inbound Redis port 6379, source = app tier SG ID.

### 6.4 NACL vs Security Group Explanation

> **Scenario khi dùng NACL thay vì Security Group:**
>
> Nếu phát hiện 1 IP address cụ thể đang gửi flood requests (DDoS attempt) qua ALB tới app — mặc dù đã có AWS WAF ở CloudFront layer, nếu attacker bypass WAF hoặc attack trực tiếp vào VPC, ta dùng **NACL deny rule trên public subnet** để block IP đó ở network boundary.
>
> Security Group không thể làm điều này vì: (1) SG chỉ có ALLOW rules, không có DENY rules — không thể explicitly block 1 IP; (2) SG evaluate per-instance, traffic đã vào subnet rồi mới bị check. NACL là stateless (phải define cả inbound + outbound), nhưng cho phép explicit DENY rules ở subnet level — drop packets trước khi reach bất kỳ instance nào.

---

## 7. Negative Security Test

### Test: Direct Connection tới RDS từ Internet

**Action:** Attempt connect tới RDS endpoint từ local machine (ngoài VPC):

```bash
psql -h <rds-endpoint>.rds.amazonaws.com -p 5432 -U postgres -d sportfields
```

**Expected result:** Connection timeout hoặc "could not connect to server" — RDS không publicly accessible.

**Screenshot:** _[Paste screenshot showing connection failure/timeout]_

**Notes:**
- RDS instance có `PubliclyAccessible = false` — không có public IP, chỉ reachable từ within VPC.
- Database Security Group chỉ allow inbound từ app tier SG — không có rule cho external IPs.
- Architecture có nhiều lớp bảo vệ: WAF (CloudFront) → ALB (public subnet) → EC2 (private subnet) → ElastiCache/RDS (private database subnet). Direct connection tới RDS bypass tất cả layers này → bị denied ở network level.
- Kết quả: connection timeout sau ~30 giây, confirm database layer isolated trong private database subnet.

---

## 8. Bonus (Tùy chọn)

_[Nếu có thời gian, document bonus scenario ở đây. Gợi ý phù hợp với architecture:]_

### Gợi ý bonus scenarios cho architecture hiện tại:

- **RDS Multi-AZ Failover Drill** — `Reboot with failover` trong RDS console. Đo downtime mà app thấy. Rất phù hợp vì đã có Multi-AZ setup.
- **ElastiCache Failover** — failover Redis primary sang replica, measure cache rebuild time.
- **Partial CloudFormation template** — CFN cho VPC + RDS + ElastiCache stack.

### _[Tên scenario đã chọn]_

**Pre-state:** _[Screenshot trước khi thực hiện]_

**Action taken:** _[Console step / CLI command / CFN change]_

**Post-state:** _[Screenshot sau khi thực hiện]_

**Measurement:** _[Downtime seconds / failover duration / cache hit rate trước vs sau]_

**Reflection (2-3 câu):**
> _[Bạn học được gì? Cái gì bất ngờ? Lần sau sẽ làm khác gì?]_
