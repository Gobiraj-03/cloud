# AssetFlow — AWS Zero-Cost Deployment Checklist & Guardrails

**Project:** AssetFlow — IT Asset & Software License Management System  
**Workspace:** `D:\cloud`  
**Account Status:** AWS Free Tier Eligible (within 12 months), $100 Promotional Credits Remaining (183 Days Validity)  
**Target Out-of-Pocket Budget:** **Strict ₹0.00 / $0.00**  
**Audit Purpose:** Pre-deployment safety verification to prevent accidental charges, unexpected credit burn, or credit-card liability.

---

## 1. Fundamental Credit & Free Tier Realities

Before provisioning any cloud resource on AWS, you must understand how AWS billing interacts with promotional credits and the Free Tier:

> [!CAUTION]
> **CRITICAL AWS BILLING RULES**:
> 1. **Promotional credits are NOT cash and do NOT cover everything:**
>    - Credits do **NOT** cover Route 53 domain registrations (e.g., purchasing `.com` or `.org` domains).
>    - Credits do **NOT** cover AWS Marketplace third-party products.
>    - Credits do **NOT** cover upfront fees or certain regional tax assessments.
> 2. **Credits have a strict expiration date (183 Days):**
>    - When credits expire or reach $0.00 balance, AWS **automatically bills the credit card on file** for all running resources without pausing them.
> 3. **The 12-Month Free Tier has strict parameter ceilings:**
>    - RDS Free Tier provides **750 hours/month** of Single-AZ `db.t4g.micro` or `db.t3.micro`. If you create a second instance or enable Multi-AZ, hours double to 1,440/month, immediately incurring billable hours.
> 4. **New AWS IPv4 Charge (Effective Feb 1, 2024):**
>    - AWS now charges **$0.005 per IP per hour** (~$3.60/month) for every public IPv4 address assigned to an EC2 instance, NAT gateway, or public resource, even within the Free Tier.
> 5. **App Runner Provisioned Memory Trap:**
>    - App Runner instances charge for provisioned memory ($0.007/GB-hour) 24 hours a day, 7 days a week, even when receiving zero web requests. A 2 GB container costs ~$10.08/month continuously unless paused.

---

## 2. Phase 0: Mandatory Manual AWS Console Checks

Execute these checks inside the **AWS Management Console** before provisioning a single service. Do not proceed until every checkbox is verified.

### Check 1: Verify Active Educational / Promotional Credits
- [ ] Log in to the [AWS Billing & Cost Management Console](https://console.aws.amazon.com/billing/).
- [ ] In the left navigation, click **Credits**.
- [ ] Confirm:
  - **Credit Name / Description:** Verify the promo code.
  - **Original Amount:** e.g., $100.00.
  - **Remaining Balance:** Confirm at least $100.00.
  - **Expiration Date:** Confirm at least 183 days remaining.
  - **Applicable Services:** Confirm it applies to "Amazon Elastic Compute Cloud (EC2)", "Amazon Relational Database Service (RDS)", "AWS App Runner", "Amazon Simple Storage Service (S3)", and "Amazon CloudWatch".

### Check 2: Verify 12-Month Free Tier Eligibility Status
- [ ] In Billing Console, navigate to **Free Tier**.
- [ ] Check the **Account Age / Free Tier Active Indicator**:
  - AWS Free Tier core benefits (750 hrs RDS, 5 GB S3) are valid **only for the first 12 months** from account creation.
  - If your account was created more than 12 months ago, only "Always Free" services (Lambda, CloudWatch basic) remain free; RDS and S3 will draw against your $100 credits immediately.

### Check 3: Enable Free Tier Usage Alerts & PDF Invoices
- [ ] In Billing Console, navigate to **Billing Preferences** (or **Preferences**).
- [ ] Check **Receive Free Tier Usage Alerts** (Sends an email whenever you approach 85% of any Free Tier service limit).
- [ ] Enter your primary active email address.
- [ ] Check **Receive PDF Invoice by Email**.
- [ ] Click **Save preferences**.

### Check 4: Configure Zero-Spend & Credit Depletion AWS Budgets
Create two independent budgets in [AWS Budgets](https://console.aws.amazon.com/billing/home#/budgets):

#### Budget A: Zero-Spend Circuit Breaker ($0.01 Threshold)
- [ ] Click **Create budget** > Select **Cost budget (Recommended)**.
- [ ] **Budget Name:** `AssetFlow-Zero-Spend-Guard`
- [ ] **Period:** Monthly | **Budget renewal type:** Recurring.
- [ ] **Budgeted amount:** `$0.01` (One cent).
- [ ] **Scope:** All AWS Services.
- [ ] **Alert Threshold:** 100% of budgeted amount ($0.01 actual spend).
- [ ] **Notification Email:** Your primary email address.
- [ ] *Purpose:* Triggers an emergency email alert the instant any service generates even $0.01 in uncredited out-of-pocket charges.

#### Budget B: Credit Burn Rate Alert ($20 / $50 / $80 Thresholds)
- [ ] Click **Create budget** > Select **Cost budget**.
- [ ] **Budget Name:** `AssetFlow-Credit-Exhaustion-Warning`
- [ ] **Budgeted amount:** `$100.00`
- [ ] **Alert 1:** Actual spend exceeds **20% ($20.00)**.
- [ ] **Alert 2:** Actual spend exceeds **50% ($50.00)**.
- [ ] **Alert 3:** Actual spend exceeds **80% ($80.00)** — Critical warning to prepare teardown before credit expiry.
- [ ] Click **Create budget**.

### Check 5: Lock Down Root Account Security (MFA & Keys)
- [ ] In the top navigation bar, click your account name > **Security Credentials**.
- [ ] **Multi-Factor Authentication (MFA):** Verify virtual MFA (Google Authenticator / Authy) is **Active** on the root account.
- [ ] **Access Keys:** Confirm **zero active root access keys** exist. Never generate access keys for the root account.
- [ ] Create a dedicated IAM user (e.g., `assetflow-deployer`) with Administrator or PowerUser permissions for CLI/deployment tasks, and enable MFA on this user.

### Check 6: Enforce Single AWS Region Selection
- [ ] Choose **ONE** region closest to you and deploy all resources strictly within it:
  - Recommended: `us-east-1` (N. Virginia) — Lowest baseline cost and widest Free Tier support.
  - Or: `ap-south-1` (Mumbai) — Lowest network latency in India.
- [ ] Never create resources across multiple regions; cross-region data transfers are billed at $0.02/GB and duplicate regional minimums.

### Check 7: Global Orphan Resource Sweep
- [ ] Navigate to **AWS Resource Groups & Tag Editor** or **Cost Explorer**.
- [ ] Verify that no leftover EC2 instances, unattached EBS volumes, Elastic IPs, NAT Gateways, or old RDS clusters exist from previous coursework.
- [ ] An unattached Elastic IP costs **$0.005/hour** ($3.60/month) simply for existing without an associated running EC2 instance!

---

## 3. The 10 "Hidden Cost Traps" Risk Matrix

| # | AWS Service Trap | How the Trap Happens | Potential Cost Impact | ₹0 Prevention Invariant |
| :- | :--- | :--- | :--- | :--- |
| **1** | **App Runner Idle Memory** | App Runner keeps container memory warm continuously ($0.007/GB-hr). | ~$10.08 / month for 2 GB container | Pause App Runner via AWS Console when not presenting; or use Lambda serverless. |
| **2** | **RDS Multi-AZ Toggle** | Checking "Multi-AZ Deployment" during RDS wizard provisions a standby replica. | Doubles hourly rate; voids Free Tier (~$30/mo) | Select **Single-AZ deployment** only (`db.t4g.micro`). |
| **3** | **Public IPv4 Charge** | Launching resources with public IPv4 (EC2, NAT Gateways). | $0.005/hour per IP (~$3.60/mo each) | Use App Runner / CloudFront managed domains; avoid self-managed public EC2/NAT. |
| **4** | **VPC NAT Gateway** | Placing backend in private subnet and creating NAT Gateway for internet access. | **$32.40 / month** flat + $0.045/GB data processing! | **NEVER create a NAT Gateway**. App Runner handles outbound internet natively for $0. |
| **5** | **AWS Secrets Manager** | Storing database passwords in AWS Secrets Manager. | **$0.40 per secret / month** + $0.05/10k API calls | Use **AWS SSM Parameter Store (Standard Tier)** which is **100% free ($0.00)**. |
| **6** | **CloudWatch Log Retention** | Log groups default to "Never Expire", accumulating GBs of logs over months. | $0.03/GB-month after 5 GB Free Tier | Set log retention policy to **7 Days** on all App Runner and RDS log groups. |
| **7** | **Route 53 Hosted Zone** | Creating a custom DNS zone for `yourdomain.com`. | **$0.50 per hosted zone / month** (NOT credit eligible) | Use default AWS-provided URLs (`*.awsapprunner.com`, `*.cloudfront.net`). |
| **8** | **RDS Automated Snapshots** | Backups exceeding allocated 20 GB free storage limit. | $0.095 per GB-month | Set backup retention period to **1 Day** or maximum **7 Days**; clean up manual snapshots. |
| **9** | **S3 Public Bucket Scraping** | Public S3 bucket crawled by bots or search engines. | $0.0004 / 1k GETs + Egress bandwidth ($0.09/GB) | Enforce **Block Public Access**; serve static frontend strictly through CloudFront OAC. |
| **10**| **Credit Expiry Cliff** | 183 days elapse with resources still running. | Immediate credit-card deduction at standard rates | Delete or pause all running resources at Day 170 (13-day safety buffer). |

---

## 4. Pre-Flight Verification Sign-Off Table

*Print or review this table before authorizing any provisioning command:*

| Verification Step | Target Parameter | Actual Value Checked | Pass / Fail |
| :--- | :--- | :--- | :---: |
| Active Promotional Credits | $\ge \$100.00$ | Checked in Billing Console | [ ] |
| Credit Days Remaining | $\ge 183\text{ days}$ | Expiry date noted | [ ] |
| Free Tier Active Period | Month 1–12 of account | Checked in Billing Console | [ ] |
| Zero-Spend Budget Created | $\$0.01$ alert with email | Verified in AWS Budgets | [ ] |
| Credit Burn Budget Created | Alert at $\$20, \$50, \$80$ | Verified in AWS Budgets | [ ] |
| Root Account MFA | Virtual Authenticator active | Verified in Security Credentials | [ ] |
| Root Access Keys | 0 Active Keys | Verified in Security Credentials | [ ] |
| Deployment Region | Exactly 1 region (e.g. `us-east-1`) | Confirmed | [ ] |
| Existing Orphan Resources | 0 EC2, 0 EBS, 0 EIP, 0 RDS | Verified in Tag Editor | [ ] |
| SSM Parameter Store Selected | Standard tier (Free) vs Secrets Mgr | Confirmed in architecture plan | [ ] |
| App Runner Pause Protocol | Teardown script ready | Documented in deployment plan | [ ] |

---

## 5. Post-Deployment Daily Routine (2 Minutes / Day)

When resources are active in the cloud, follow this 2-minute daily audit:

1. **Check Email:** Confirm no alerts from `no-reply-budgets@amazon.com`.
2. **Open AWS Cost Explorer:**
   - Group by: **Service**.
   - Timeframe: **Last 7 days**.
   - Verify: "Total Cost" line is completely offset by promotional credits.
3. **If not demonstrating today:**
   - In AWS App Runner console, click **Actions > Pause Service**.
   - While paused, provisioned memory charges drop to **$0.00**.
   - When ready for demo, click **Actions > Resume Service** (takes ~90 seconds to resume).

---

## 6. Emergency Resource Teardown Playbook

If your zero-spend budget alert triggers, or if you reach Day 170 of your 183-day credit validity:

```powershell
# 1. Pause or Delete App Runner Service
# In Console: App Runner > Services > assetflow-backend > Actions > Delete

# 2. Delete Amazon RDS Database Instance
# In Console: RDS > Databases > assetflow-db > Actions > Delete
# UNCHECK "Create final snapshot" (to avoid snapshot storage costs)
# CHECK "I acknowledge that upon instance deletion, all automated backups will be permanently deleted"

# 3. Delete CloudFront Distribution & S3 Bucket
# CloudFront > Select distribution > Disable > Wait 3 mins > Delete
# S3 > Buckets > assetflow-frontend > Empty > Delete

# 4. Confirm in Cost Explorer
# Verify active running instances count is 0 in all regions.
```
