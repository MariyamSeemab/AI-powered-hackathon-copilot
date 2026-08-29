# 🚀 Hackathon Copilot

**From raw idea to working MVP with an AI teammate.**

Hackathon Copilot is an AI-powered development teammate that guides a builder through the full hackathon journey:

> **IDEA → PROBLEM → MVP → ARCHITECTURE → TASKS → BUILD → REVIEW → DEMO → PITCH**

It is not a chatbot with a dashboard around it. It is an agent that observes your project state, challenges weak scope, recommends the next best action, and helps you actually **ship**.

Built for the **AWS Summer Builds Showcase**.

---

## 🔴 Live demo

**Live app:** https://d1opvm735eapyv.cloudfront.net

Open it and click **Try Demo Project** to run the full IDEA → MVP → ARCHITECTURE → TASKS → MENTOR → REVIEW → DEMO workflow.

| Resource | Value |
| --- | --- |
| Public app URL (S3 + CloudFront) | https://d1opvm735eapyv.cloudfront.net |
| API endpoint (API Gateway → Lambda) | https://a8m93724d5.execute-api.us-east-1.amazonaws.com |
| Region | us-east-1 |
| CloudFormation stack | `hackathon-copilot` |
| DynamoDB table | `hackathon-copilot-ProjectsTable-1HWFXB2DRG1E1` |

> The backend is live on AWS Lambda with Amazon Bedrock (Nova) enrichment, persisting project state to Amazon DynamoDB. A health check is available at `/api/health`.

---

## The problem

Hackathon participants have exciting ideas but struggle to turn them into a realistic MVP in limited time. They over-scope, make ad‑hoc technical decisions, lose track of progress, and scramble to prepare a demo at the end.

## The solution

An AI teammate that:

- **Analyzes the idea** and scores it 0–100, challenging weak scope instead of blindly agreeing.
- **Generates a realistic MVP**, split into Must / Nice / Future, with a one‑click **Reduce Scope**.
- **Designs an AWS architecture** using only the services the project actually needs, with tradeoffs.
- **Generates an ordered task plan** and tracks progress on a board.
- **Mentors the builder** using live project state — detecting scope creep and identifying blockers.
- **Reviews the project** across functionality, architecture, security, UX, innovation, and docs.
- **Prepares the demo** — 30s pitch, 60s script, 3‑min presentation, and likely judge questions.

---

## Features

| Stage | What it does |
| --- | --- |
| 💡 Idea Analyzer | Problem, users, risks, assumptions, complexity, and a 5‑dimension score (0–100). Challenges over‑scoped ideas. |
| 🎯 MVP Generator | Must / Nice / Future split, effort estimates, dependencies, **Reduce Scope** to the smallest useful MVP. |
| ☁️ AWS Architect | Per‑service purpose, why, alternative, and tradeoff. ASCII data‑flow diagram. Only warranted services. |
| 🛠️ Task Board | Ordered tasks with priority, estimate, dependencies, status (TODO / IN PROGRESS / DONE), auto progress. |
| 🤝 AI Mentor | Observe → Analyze → Decide → Recommend. Uses project state; pushes back on scope creep. |
| 📊 Dashboard | Live progress, stage checklist, blockers, time remaining, AI score, next best action. |
| 🧪 Review | Scores functionality, architecture, security, scalability, UX, innovation, docs + top 5 improvements. |
| 🎤 Demo & Pitch | 30s pitch, 60s demo script, 3‑min deck, judge Q&A, final pitch flow — all from real project data. |

A built‑in **CampusConnect** sample project seeds the entire workflow with one click (**Try Demo Project**).

---

## Screenshots

Capture these for the showcase (the UI is designed for clean screenshots):

- Landing page with the journey strip.
- Idea Analyzer with score cards and the AI’s honest take.
- MVP Generator with Must/Nice/Future columns.
- AWS Architect with the data‑flow diagram + service decisions.
- Task board with progress bar.
- Mentor pushing back on scope creep.
- Review score cards.
- Demo/pitch output.

> _Add image files under `docs/screenshots/` and link them here. You can capture them directly from the live app: https://d1opvm735eapyv.cloudfront.net_

---

## Architecture

```text
                     User
                      |
              Web App (S3 + CloudFront)
                      |
                 API Gateway (HTTP API)
                      |
                   AWS Lambda  (Express app)
                 /      |        \
          DynamoDB     S3       Bedrock / Nova
        (project      (arts)     (AI reasoning)
         memory)                      |
                      |          AI responses
                      |
                 CloudWatch (logs + metrics)
```

The **same Express app** runs locally (`src/server.js`) and in Lambda (`src/lambda.js`), so behavior is identical in dev and prod.

### AWS services used

| Service | Role |
| --- | --- |
| **Amazon Bedrock / Nova** | AI reasoning: enriches idea analysis, mentoring, and pitch narrative. |
| **AWS Lambda** | Stateless backend logic and orchestration for every API route. |
| **Amazon API Gateway (HTTP API)** | Secure HTTPS API layer between frontend and backend. |
| **Amazon DynamoDB** | Project memory — persists idea, MVP, architecture, tasks, decisions, reviews, demo. |
| **Amazon S3** | Static frontend hosting (and project artifacts). |
| **Amazon CloudFront** | CDN + HTTPS for the frontend. |
| **Amazon CloudWatch** | Structured JSON logs, metrics, and troubleshooting. |
| **AWS IAM** | Least‑privilege execution role (single table, single Bedrock model). |

---

## Technology stack

- **Frontend:** React 18, React Router, Vite. Custom CSS design system (responsive: desktop / tablet / mobile).
- **Backend:** Node.js 20 (ESM), Express. Runs as a local server or an AWS Lambda.
- **AI:** Amazon Bedrock (Nova) with a **deterministic reasoning engine fallback** so the app works with or without live AWS access.
- **Persistence:** Amazon DynamoDB with a **local JSON file fallback** for zero‑setup dev.
- **Infra:** CloudFormation template (`infra/template.yaml`) deployed with the AWS CLI — no SAM CLI required.
- **Tests:** Node’s built‑in test runner (`node:test`).

---

## Agent workflow

The AI follows a real agent loop and every recommendation considers current project state:

```text
OBSERVE  →  ANALYZE  →  DECIDE  →  RECOMMEND  →  TRACK  →  RE-EVALUATE
```

Because state is persisted in DynamoDB (project memory), later AI responses reflect earlier decisions — the mentor won’t forget your scope choices, and its advice changes as your progress changes.

Example — the mentor pushing back:

> **You:** “I want to add 10 more features.”
> **Mentor:** “You have ~25h of planned work left and the MVP is 55% done. Do NOT add features. Finish the core loop first.”

---

## DynamoDB data model

Single table, keyed by `id` (partition key), one item per project:

| Attribute | Type | Notes |
| --- | --- | --- |
| `id` | String (PK) | UUID |
| `name`, `problem`, `targetUsers`, `availableTime`, … | String | Project inputs |
| `analysis` | Map | Idea analysis + 5‑dimension score |
| `mvp` | Map | Must / Nice / Future features + summary |
| `architecture` | Map | Services + diagram |
| `tasks` | List | Ordered tasks with status |
| `decisions` | List | Project decision log (memory) |
| `mentorLog` | List | Mentor interactions |
| `review` | Map | Review scores + improvements |
| `demo`, `pitch` | Map | Generated demo/pitch content |
| `createdAt`, `updatedAt` | String | ISO timestamps |

Access patterns are simple key‑value get/put plus a scan for the project list — a good fit for DynamoDB on‑demand billing.

---

## Local setup

**Prerequisites:** Node.js 18+ (tested on Node 22).

```powershell
# 1. Install all dependencies (root + backend + frontend)
npm run install:all

# 2. (optional) Configure backend env
copy backend\.env.example backend\.env
# For a fully offline run, set BEDROCK_ENABLED=false and leave DYNAMODB_TABLE empty.

# 3. Run the backend (terminal 1)
npm run dev:backend        # http://localhost:4000

# 4. Run the frontend (terminal 2)
npm run dev:frontend       # http://localhost:5173  (proxies /api -> :4000)
```

Open **http://localhost:5173** and click **Try Demo Project** to see the full workflow, or **Start Building** to create your own.

> With no AWS setup, the app uses a local JSON file store (`backend/.data/projects.json`) and the deterministic reasoning engine. Everything works end‑to‑end.

### Enabling real AWS Bedrock locally

1. Configure AWS credentials (`aws configure` or environment variables).
2. Request access to the Nova model in the Amazon Bedrock console (region `us-east-1`).
3. In `backend/.env`, set `BEDROCK_ENABLED=true` and `BEDROCK_MODEL_ID=amazon.nova-lite-v1:0`.
4. Restart the backend. Narrative fields are now enriched by Nova; structured data still comes from the engine.

### Enabling DynamoDB locally

Set `DYNAMODB_TABLE=<your-table>` and valid AWS credentials. The table needs a `String` partition key named `id`.

---

## AWS deployment

> **Status: already deployed and live** at https://d1opvm735eapyv.cloudfront.net (stack `hackathon-copilot`, region `us-east-1`). The steps below reproduce that deployment from scratch or update it.

The infrastructure is defined in `infra/template.yaml` (a SAM/CloudFormation template): Lambda + HTTP API + DynamoDB + S3 + CloudFront + least-privilege IAM + CloudWatch.

**Prerequisites:** AWS CLI configured with credentials, and Amazon Bedrock model access for Nova enabled in the target region.

### Option A — AWS CLI + CloudFormation (no SAM CLI required)

This is exactly how the live stack was deployed.

```powershell
# 1. Package the backend for Lambda (production deps only)
$build = ".build\lambda"
Remove-Item -Recurse -Force $build -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $build -Force | Out-Null
Copy-Item -Recurse backend\src "$build\src"
Copy-Item backend\package.json "$build\package.json"
npm --prefix $build install --omit=dev --no-audit --no-fund

# 2. Create a deploy bucket (once) and upload the template + code artifact
$acct = aws sts get-caller-identity --query Account --output text
$bucket = "hackathon-copilot-deploy-$acct-us-east-1"
aws s3 mb "s3://$bucket" --region us-east-1
aws cloudformation package --template-file infra/template.yaml `
  --s3-bucket $bucket --s3-prefix lambda `
  --output-template-file .build/packaged.yaml --region us-east-1

# 3. Deploy the stack
aws cloudformation deploy --template-file .build/packaged.yaml `
  --stack-name hackathon-copilot --capabilities CAPABILITY_IAM --region us-east-1

# 4. Read the outputs (ApiUrl, FrontendBucketName, FrontendUrl)
aws cloudformation describe-stacks --stack-name hackathon-copilot `
  --region us-east-1 --query "Stacks[0].Outputs" --output table
```

### Option B — AWS SAM CLI (if installed)

```powershell
sam build -t infra/template.yaml
sam deploy --guided --stack-name hackathon-copilot
```

### Deploy the frontend to S3 + CloudFront

```powershell
# Point the build at your deployed API, then build
$env:VITE_API_BASE = "<ApiUrl output>/api"
npm run build

# Upload and invalidate the CDN cache
aws s3 sync frontend/dist "s3://<FrontendBucketName output>" --delete --region us-east-1
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

Open the **FrontendUrl** output — that is your public app URL.

### Live deployment outputs

| Output | Value |
| --- | --- |
| `FrontendUrl` (public app) | https://d1opvm735eapyv.cloudfront.net |
| `ApiUrl` | https://a8m93724d5.execute-api.us-east-1.amazonaws.com |
| `ProjectsTableName` | `hackathon-copilot-ProjectsTable-1HWFXB2DRG1E1` |
| `FrontendBucketName` | `hackathon-copilot-frontendbucket-psgziurebn0c` |

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `PORT` | backend | Local port (default 4000) |
| `CORS_ORIGIN` | backend/Lambda | Allowed origin (set to your CloudFront domain in prod) |
| `BEDROCK_ENABLED` | backend/Lambda | `false` to force the offline engine |
| `BEDROCK_MODEL_ID` | backend/Lambda | e.g. `amazon.nova-lite-v1:0` |
| `AWS_REGION` | backend/Lambda | Bedrock/DynamoDB region |
| `DYNAMODB_TABLE` | backend/Lambda | Table name (empty = local file store) |
| `VITE_API_BASE` | frontend build | Prod API base URL |

### IAM requirements (least privilege)

The Lambda execution role (defined in `infra/template.yaml`) grants only:

- `dynamodb:GetItem | PutItem | DeleteItem | Scan` on **the single project table**.
- `bedrock:InvokeModel` on **the single configured model ARN**.
- CloudWatch Logs (via the managed basic execution role).

No AWS credentials ever live in the frontend.

---

## Testing

```powershell
npm test        # runs the backend test suite (node:test)
```

Covers project creation, idea analysis, MVP generation (incl. reduce), architecture, task generation and updates, DynamoDB/local persistence, AI mentor scope‑creep detection, project review, demo generation, API error handling, and a **full end‑to‑end workflow** test:

```text
create → analyze → mvp → architecture → tasks → update task → mentor → review → demo
```

All tests run offline (Bedrock disabled, temp local store) so they are hermetic and fast.

---

## Observability

The backend emits **structured JSON logs** (`backend/src/lib/logger.js`) for API requests, workflow steps, AI success/fallback, and store operations. In Lambda these flow to **CloudWatch Logs** and are queryable with Logs Insights. Sensitive keys (password, token, secret, credentials) are automatically redacted, and request bodies are never logged.

Example Logs Insights query:

```text
fields @timestamp, event, id
| filter event like /workflow/
| sort @timestamp desc
```

---

## Demo instructions (60–90s)

1. Open the live app at **https://d1opvm735eapyv.cloudfront.net** → **Try Demo Project** (seeds CampusConnect).
2. **Idea** — show the score and the AI challenging scope.
3. **MVP** — show Must/Nice/Future, click **Reduce Scope**.
4. **Architecture** — show the AWS data‑flow diagram.
5. **Tasks** — show the generated roadmap + progress.
6. **Mentor** — ask “Should I add a mobile app now?” → it says no, finish the core first.
7. **Review** — show the scores.
8. **Demo** — show the generated pitch and script.
9. End on: **“From idea to MVP with an AI teammate.”**

---

## Known limitations

- Single‑user (no auth yet); projects are not scoped to accounts. Cognito is recommended as the next step.
- The reasoning engine is rule‑based; Bedrock enriches narrative fields but structured scoring is deterministic (this is intentional for reliability during demos).
- DynamoDB list view uses `Scan` (fine at hackathon scale; add a GSI for large datasets).

## Future improvements

- Cognito‑based multi‑user projects.
- Streaming AI responses for faster perceived latency.
- One‑click export of the task plan into a real repo scaffold.
- Richer architecture diagrams (rendered, not ASCII).

---

## Submission checklist

See [`docs/showcase.md`](docs/showcase.md) for the full showcase article material and the final submission checklist.

## License

MIT
