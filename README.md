# HIV/AIDS Policy Intelligence Dashboard

An AI-powered public health data dashboard built for the amfAR Data Analyst application.  
Visualizes 15 years of U.S. HIV surveillance data with GPT-4o-powered natural language analysis.

**Live Demo:** [your-url-here]

---

## What It Does

| Feature | Tech |
|---|---|
| Interactive charts (trend, demographics, state map) | JavaScript + Chart.js |
| Surveillance data storage & querying | Python + MySQL |
| REST API serving all data endpoints | Python + Flask |
| AI auto-generated policy insights (on page load) | OpenAI GPT-4o-mini |
| Natural language Q&A against live data | OpenAI GPT-4o-mini + MySQL |
| One-click deployment | Railway.app |

### AI Capabilities
- **Auto-Insights Panel**: On page load, GPT-4o-mini analyzes the database and generates 3 policy-oriented insights covering national trends, demographic disparities, and geographic concentration — including supporting data tables.
- **Chat Interface**: Ask any question in plain English. The AI writes a MySQL query, executes it against live data, returns results + a policy interpretation. The SQL is shown so you can inspect exactly what ran.

---

## Tech Stack

```
Backend:   Python 3.11, Flask, MySQL Connector
Database:  MySQL 8
AI:        OpenAI GPT-4o-mini
Frontend:  Vanilla JavaScript, Chart.js 4, Chart.js Annotation Plugin
Fonts:     Playfair Display, DM Mono, DM Sans (Google Fonts)
Deploy:    Railway.app (Python + MySQL services)
```

---

## Local Setup (30 minutes)

### Prerequisites
- Python 3.10+
- MySQL 8 running locally
- OpenAI API key (platform.openai.com → API Keys)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/hiv-policy-dashboard
cd hiv-policy-dashboard
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
#   OPENAI_API_KEY=sk-...
#   DB_PASSWORD=your-mysql-root-password
```

### 3. Seed the Database

```bash
python seed_db.py
# Creates hiv_dashboard database with 3 tables
# Inserts ~50k rows of realistic HIV surveillance data
# Takes ~30 seconds
```

### 4. Run

```bash
flask run
# Open http://localhost:5000
```

---

## Deploy to Railway (15 minutes, free tier)

Railway gives you a live HTTPS URL — this is what you send to employers.

### Step 1 — Create Railway account
Go to [railway.app](https://railway.app) and sign up with GitHub.

### Step 2 — Add MySQL service
- New Project → Add a Service → Database → MySQL
- Once provisioned, click the MySQL service → Variables tab
- Copy: `MYSQL_HOST`, `MYSQLPORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

### Step 3 — Deploy the app
- New Service → GitHub Repo → select this repo
- Go to Variables tab, add:
  ```
  OPENAI_API_KEY   = sk-your-key
  DB_HOST          = (value of MYSQL_HOST from step 2)
  DB_PORT          = (value of MYSQLPORT)
  DB_USER          = (value of MYSQL_USER)
  DB_PASSWORD      = (value of MYSQL_PASSWORD)
  DB_NAME          = railway
  ```
- Railway auto-deploys on push. First deploy takes ~3 minutes.

### Step 4 — Seed the remote database
In the Railway app service terminal (or locally with remote DB env vars):
```bash
DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=railway python seed_db.py
```

### Step 5 — Get your URL
Settings → Domains → Generate Domain → you get `https://something.railway.app`

---

## Project Structure

```
hiv-policy-dashboard/
├── app.py              # Flask app, all API routes, OpenAI integration
├── seed_db.py          # One-time database seeding script
├── requirements.txt
├── railway.toml        # Deployment config
├── .env.example        # Environment variable template
├── templates/
│   └── index.html      # Single-page dashboard
└── static/
    ├── css/style.css   # Full custom CSS (no framework)
    └── js/dashboard.js # Chart.js charts + AI chat logic
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/summary-stats` | Latest year aggregate stats |
| `GET /api/national-trend` | Annual diagnoses 2008–2022 |
| `GET /api/transmission` | Breakdown by transmission category |
| `GET /api/demographics` | Breakdown by race/ethnicity |
| `GET /api/age-groups` | Breakdown by age group |
| `GET /api/state-prevalence` | HIV rate per 100k by state |
| `GET /api/ai-insights` | 3 AI-generated policy insights |
| `POST /api/chat` | Natural language question → SQL → answer |

---

## Data Sources

Data is modeled on the CDC's HIV Surveillance Report and mirrors published national/state statistics:
- CDC HIV Surveillance Reports: cdc.gov/hiv/library/reports
- AIDSVu: aidsvu.org/resources

This dashboard uses realistic synthetic data for demonstration. All trends, demographic distributions, and geographic patterns reflect published CDC figures.

---

*Built as a portfolio demonstration for the amfAR Data Analyst (Biostatistician / Web Developer) position.*  
*Stack: Python · MySQL · JavaScript · OpenAI GPT-4o · Flask · Chart.js*
