# HIV/AIDS Policy Intelligence Dashboard

> An AI-powered public health analytics platform built with real CDC/AIDSVu surveillance data — developed as a portfolio project for a Data Analyst (Biostatistician/Web Developer) role at [amfAR, The Foundation for AIDS Research](https://www.amfar.org/).

![Python](https://img.shields.io/badge/Python-3.10+-blue) ![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey) ![MySQL](https://img.shields.io/badge/MySQL-8.0-orange) ![OpenAI](https://img.shields.io/badge/GPT--4o--mini-AI--Powered-purple) ![Status](https://img.shields.io/badge/Status-Live-brightgreen)

---

## What This Is

A full-stack policy intelligence dashboard that turns 10 years of U.S. HIV surveillance data into actionable policy insights. It combines epidemiological analysis, machine learning forecasting, racial equity scoring, and AI-generated policy tools into a single research platform.

Built to demonstrate real-world biostatistician + web developer skills:

- Statistical modeling (linear regression with confidence bands, PrEP impact simulation)
- Geospatial visualization (D3 choropleth map of all 50 states)
- Equity analysis (composite Black/White disparity index per state)
- AI integration (GPT-4o-mini for policy briefs, NL-to-SQL chat, news curation)
- Full-stack engineering (Flask REST API, MySQL, vanilla JS SPA with URL routing)

---

## Features

| Page | Description |
|------|-------------|
| **Overview** | National trend + YoY toggle, PrEP uptake, transmission breakdown, race/age demographics, AI policy insights |
| **US Choropleth Map** | D3 filled state map — switch between diagnosis rate, total cases, PNR ratio. Click any state for full profile modal |
| **Racial Disparity Index** | Composite equity score per state — Black/White rate ratio, scatter plot, AI commentary |
| **2030 ML Forecast** | Linear regression on 2014–2023 data with 80% confidence bands, EHE gap analysis, per-state trajectories |
| **EHE Tracker** | Ending the HIV Epidemic initiative — 90% reduction goal, animated progress bar, yearly trend |
| **Funding Gap** | State-by-state PrEP funding gap calculator ($4,200/patient CDC estimate) — CRITICAL / HIGH / MODERATE tiers |
| **Epidemic Simulator** | Model PrEP expansion impact — sliders for coverage % and target year, AI scenario commentary |
| **State Explorer** | Ranked bar chart (clickable → modal), side-by-side state comparison with AI analysis |
| **Policy Tools** | Congressional-style policy brief generator + AI-curated HIV/AIDS news feed |
| **Ask the Data** | Natural language → SQL → answer, with live data tables and query display |

**Cross-cutting:** Dark/light mode toggle, URL routing (shareable links per page/state), animated 6-slide data story mode, mobile-responsive bottom nav, multi-page PDF export.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (SPA)                        │
│  Vanilla JS + Chart.js 4 + D3.js 7 + jsPDF             │
│  10-page sidebar app · History API routing              │
└──────────────────────┬──────────────────────────────────┘
                       │ REST / JSON
┌──────────────────────▼──────────────────────────────────┐
│                Flask API  (app.py)                      │
│  25 endpoints · NumPy/SciPy ML · OpenAI SDK             │
└───────────┬──────────────────────────┬──────────────────┘
            │                          │
┌───────────▼──────────┐  ┌───────────▼──────────────────┐
│   MySQL 8 Database   │  │      OpenAI GPT-4o-mini       │
│   hiv_dashboard      │  │  Insights · Briefs · Chat     │
│   3 tables · 1,560   │  │  Simulator commentary · News  │
│   rows · real data   │  └──────────────────────────────┘
└──────────────────────┘
```

### Database Schema

**`diagnoses_state`** — State-level HIV new diagnoses (2014–2023)
```
year, state, state_abbr, total_cases, rate_per_100k,
male_cases, female_cases,
black_cases, black_rate, hispanic_cases, hispanic_rate,
white_cases, white_rate, asian_cases,
age_13_24, age_25_34, age_35_44, age_45_54, age_55_64, age_65plus,
msm_cases, msm_pct, idu_cases, idu_pct,
heterosexual_cases, heterosexual_pct
```

**`prep_state`** — State-level PrEP uptake (2014–2023)
```
year, state, state_abbr, prep_users, prep_rate
```

**`pnr_state`** — PrEP-to-Need Ratio by state (2014–2023)
```
year, state, state_abbr, pnr_ratio
```

Suppression codes (`-9`, `-8`, `-7`, `0`) stored as `NULL`.

---

## Data Sources

| Dataset | Source | Years | Rows |
|---------|--------|-------|------|
| HIV New Diagnoses by State | [AIDSVu / CDC NHSS](https://aidsvu.org/) | 2014–2023 | 520 |
| PrEP Uptake by State | [AIDSVu](https://aidsvu.org/services/map-data-download/) | 2014–2023 | 520 |
| PrEP-to-Need Ratio | [AIDSVu](https://aidsvu.org/) | 2014–2023 | 520 |

Data was downloaded as XLSX files from AIDSVu, cleaned via `preprocess.py`, and loaded into MySQL via `seed_db_clean.py`. In production at amfAR, these would connect directly to PPO databases — the ETL architecture is identical.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, Flask 3.0 |
| Database | MySQL 8.0 |
| ML / Stats | NumPy, SciPy (linear regression, prediction intervals) |
| AI | OpenAI GPT-4o-mini |
| Frontend | Vanilla JavaScript (ES2020), Chart.js 4, D3.js 7 |
| Mapping | D3-geo + TopoJSON (us-atlas) |
| PDF Export | jsPDF 2.5 + html2canvas 1.4 |
| Deployment | Railway (Gunicorn) |

---

## Local Setup

### Prerequisites

- Python 3.10+
- MySQL 8.0 running locally
- An OpenAI API key
- AIDSVu XLSX data files (see Data Sources above)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/hiv-policy-dashboard
cd hiv-policy-dashboard
pip install -r requirements.txt
pip install numpy scipy openpyxl pandas
```

### 2. Create MySQL database and user

```sql
CREATE DATABASE hiv_dashboard CHARACTER SET utf8mb4;
CREATE USER 'hiv_user'@'localhost' IDENTIFIED BY 'hiv_pass_2025';
GRANT ALL PRIVILEGES ON hiv_dashboard.* TO 'hiv_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure environment

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-your-key-here
DB_HOST=localhost
DB_PORT=3306
DB_USER=hiv_user
DB_PASSWORD=hiv_pass_2025
DB_NAME=hiv_dashboard
```

### 4. Load the data

Place AIDSVu XLSX files in `data/raw/`, then:

```bash
python preprocess.py        # XLSX → clean CSVs in data/clean/
python seed_db_clean.py     # CSVs → MySQL
```

Expected: 520 diagnosis rows, 520 PrEP rows, 520 PNR rows.

### 5. Run

```bash
flask run
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## API Reference

All endpoints return JSON. Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/summary-stats` | Topbar KPIs — diagnoses, PrEP, EHE %, funding gap |
| GET | `/api/national-trend` | Year-by-year national diagnosis totals |
| GET | `/api/transmission` | Transmission category breakdown |
| GET | `/api/demographics` | Race/ethnicity case counts |
| GET | `/api/age-groups` | Age group distribution |
| GET | `/api/state-prevalence` | All states sorted by rate per 100k |
| GET | `/api/choropleth` | State data for D3 map (rate, cases, PNR, normalized) |
| GET | `/api/prep-trend` | Annual PrEP uptake + diagnoses dual-axis |
| GET | `/api/pnr-bottom` | Bottom 10 states by PNR ratio |
| GET | `/api/disparity-index` | Composite equity score per state + AI commentary |
| GET | `/api/ehe-progress` | EHE initiative yearly progress toward 90% goal |
| GET | `/api/funding-gap` | PrEP funding gap per state in dollars |
| GET | `/api/forecast` | ML regression → 2030 with confidence bands + state trajectories |
| GET | `/api/state-profile/<abbr>` | Full profile for one state (trend, demographics, PrEP) |
| GET | `/api/compare-states?a=FL&b=CA` | Side-by-side state comparison + AI commentary |
| GET | `/api/news` | GPT-4o-mini curated HIV/AIDS policy news |
| GET | `/api/report-data` | Aggregated data bundle for PDF export |
| GET | `/api/ai-insights` | 3 AI-generated policy insight cards |
| POST | `/api/policy-brief` | `{"topic": "..."}` → congressional-style brief |
| POST | `/api/chat` | `{"question": "..."}` → NL-to-SQL → answer + data table |
| POST | `/api/simulate` | `{"prep_increase_pct": 20, "target_year": 2030}` → epidemic projection |

---

## Project Structure

```
hiv-policy-dashboard/
├── app.py                  # Flask application — all 25 API routes
├── preprocess.py           # AIDSVu XLSX → clean CSV pipeline
├── seed_db_clean.py        # CSV → MySQL loader with schema creation
├── requirements.txt        # pip dependencies
├── Procfile                # gunicorn entry point for Railway
├── railway.toml            # Railway deployment config
├── .env                    # not committed — see setup above
├── data/
│   ├── raw/                # original AIDSVu XLSX files (not committed)
│   └── clean/              # preprocessed CSVs (not committed)
├── templates/
│   └── index.html          # SPA shell — all 10 pages, story overlay, modals
└── static/
    ├── css/style.css       # full custom dark/light theme (~600 lines)
    └── js/dashboard.js     # charts, D3 map, AI features, URL routing (~550 lines)
```

---

## Methodology Notes

**PrEP Funding Gap** — Additional patients needed to reach PNR target × $4,200/year (CDC generic PrEP cost estimate). States already at target show $0.

**EHE Progress** — Baseline year 2017. Target = 90% reduction by 2030. Progress = (baseline − current) / (baseline × 0.9) × 100.

**Disparity Score** — Weighted composite: Black/White rate ratio (50%) + Hispanic/White ratio (20%) + Black share deviation from national average (30%).

**Forecast Confidence Bands** — 80% prediction intervals using t-distribution with n−2 degrees of freedom. Reflect uncertainty about individual future observations, not just the mean trajectory.

**Why linear regression, not ARIMA or LSTM?** — Ten years of annual data (10 points per state) is insufficient for ARIMA's stationarity requirements or LSTM's training needs. Linear regression with prediction intervals is statistically honest at this data volume and produces interpretable results for a policy audience.

**Suppressed Data** — CDC suppresses counts < 5 cases. These values are stored as NULL and excluded from rate calculations, disparity scoring, and forecasts.

---

## Disclaimer

This dashboard uses publicly available surveillance data for educational and portfolio purposes. All analyses reflect the author's methodology and do not represent official positions of CDC, AIDSVu, or amfAR. HIV surveillance data has known limitations including diagnosis delays, testing access disparities, and jurisdictional reporting variation.

---

## Author

**Venkata Narayana Redrouthu**  
---

*Data: AIDSVu · CDC National HIV Surveillance System (NHSS) · 2014–2023*