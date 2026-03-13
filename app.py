from flask import Flask, jsonify, render_template, request
import mysql.connector
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "hiv_dashboard"),
}

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_db():
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))")
    cur.close()
    return conn


def run_sql(sql):
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute(sql)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


SCHEMA_CONTEXT = """
You are a public health policy analyst assistant for amfAR, the Foundation for AIDS Research.
You have access to a MySQL database called 'hiv_dashboard' with REAL AIDSVu/CDC data:

1. diagnoses_state — Real state-level HIV new diagnoses (2014-2023)
   Columns: year, state, state_abbr, total_cases, rate_per_100k,
            male_cases, female_cases,
            black_cases, black_rate, hispanic_cases, hispanic_rate,
            white_cases, white_rate, asian_cases,
            age_13_24, age_25_34, age_35_44,
            age_45_54, age_55_64, age_65plus,
            msm_cases, msm_pct, idu_cases, idu_pct,
            heterosexual_cases, heterosexual_pct

2. prep_state — PrEP users by state (2014-2023)
   Columns: year, state, state_abbr, prep_users, prep_rate

3. pnr_state — PrEP-to-Need Ratio by state (2014-2023)
   Columns: year, state, state_abbr, pnr_ratio

Return ONLY valid JSON, no markdown, no code blocks:
{"sql": "SELECT ...", "answer": "2-3 sentence policy insight", "insight_type": "trend|demographic|geographic|comparison"}
"""


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/national-trend")
def national_trend():
    rows = run_sql("""
        SELECT year, SUM(total_cases) AS total_diagnoses
        FROM diagnoses_state WHERE total_cases IS NOT NULL
        GROUP BY year ORDER BY year
    """)
    return jsonify(rows)


@app.route("/api/transmission")
def transmission():
    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]
    rows = run_sql(f"""
        SELECT 'MSM' AS transmission_category, SUM(msm_cases) AS total FROM diagnoses_state WHERE year={latest} AND msm_cases IS NOT NULL
        UNION ALL SELECT 'Injection Drug Use', SUM(idu_cases) FROM diagnoses_state WHERE year={latest} AND idu_cases IS NOT NULL
        UNION ALL SELECT 'Heterosexual Contact', SUM(heterosexual_cases) FROM diagnoses_state WHERE year={latest} AND heterosexual_cases IS NOT NULL
        ORDER BY total DESC
    """)
    return jsonify(rows)


@app.route("/api/demographics")
def demographics():
    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]
    rows = run_sql(f"""
        SELECT race_ethnicity, total FROM (
            SELECT 'Black/African American' AS race_ethnicity, SUM(black_cases) AS total FROM diagnoses_state WHERE year={latest} AND black_cases IS NOT NULL
            UNION ALL SELECT 'Hispanic/Latino', SUM(hispanic_cases) FROM diagnoses_state WHERE year={latest} AND hispanic_cases IS NOT NULL
            UNION ALL SELECT 'White', SUM(white_cases) FROM diagnoses_state WHERE year={latest} AND white_cases IS NOT NULL
            UNION ALL SELECT 'Asian', SUM(asian_cases) FROM diagnoses_state WHERE year={latest} AND asian_cases IS NOT NULL
        ) t ORDER BY total DESC
    """)
    return jsonify(rows)


@app.route("/api/age-groups")
def age_groups():
    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]
    rows = run_sql(f"""
        SELECT age_group, total FROM (
            SELECT '13-24' AS age_group, SUM(age_13_24) AS total FROM diagnoses_state WHERE year={latest}
            UNION ALL SELECT '25-34', SUM(age_25_34) FROM diagnoses_state WHERE year={latest}
            UNION ALL SELECT '35-44', SUM(age_35_44) FROM diagnoses_state WHERE year={latest}
            UNION ALL SELECT '45-54', SUM(age_45_54) FROM diagnoses_state WHERE year={latest}
            UNION ALL SELECT '55-64', SUM(age_55_64) FROM diagnoses_state WHERE year={latest}
            UNION ALL SELECT '65+', SUM(age_65plus) FROM diagnoses_state WHERE year={latest}
        ) t ORDER BY total DESC
    """)
    return jsonify(rows)


@app.route("/api/state-prevalence")
def state_prevalence():
    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]
    rows = run_sql(f"""
        SELECT state, rate_per_100k FROM diagnoses_state
        WHERE year={latest} AND rate_per_100k IS NOT NULL
        ORDER BY rate_per_100k DESC LIMIT 25
    """)
    return jsonify(rows)


@app.route("/api/prep-trend")
def prep_trend():
    rows = run_sql("""
        SELECT p.year, SUM(p.prep_users) AS prep_users, SUM(d.total_cases) AS new_diagnoses
        FROM prep_state p JOIN diagnoses_state d ON p.state=d.state AND p.year=d.year
        WHERE p.prep_users IS NOT NULL AND d.total_cases IS NOT NULL
        GROUP BY p.year ORDER BY p.year
    """)
    return jsonify(rows)


@app.route("/api/pnr-bottom")
def pnr_bottom():
    latest = run_sql("SELECT MAX(year) AS yr FROM pnr_state")[0]["yr"]
    rows = run_sql(f"""
        SELECT state, pnr_ratio FROM pnr_state
        WHERE year={latest} AND pnr_ratio IS NOT NULL AND pnr_ratio > 0
        ORDER BY pnr_ratio ASC LIMIT 10
    """)
    return jsonify(rows)


@app.route("/api/summary-stats")
def summary_stats():
    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]
    total  = run_sql(f"SELECT SUM(total_cases) AS t FROM diagnoses_state WHERE year={latest}")[0]["t"]
    prev_  = run_sql(f"SELECT SUM(total_cases) AS t FROM diagnoses_state WHERE year={latest-1}")[0]["t"]
    prep_  = run_sql(f"SELECT SUM(prep_users) AS t FROM prep_state WHERE year={latest}")[0]["t"]
    states = run_sql(f"SELECT COUNT(DISTINCT state) AS t FROM diagnoses_state WHERE year={latest}")[0]["t"]
    change = round(((total - prev_) / prev_) * 100, 1) if prev_ else 0
    return jsonify({
        "year": latest,
        "new_diagnoses": int(total or 0),
        "prep_users": int(prep_ or 0),
        "states_reporting": int(states or 0),
        "yoy_change_pct": change,
        "data_source": "AIDSVu / CDC NHSS"
    })


@app.route("/api/racial-disparity")
def racial_disparity():
    rows = run_sql("""
        SELECT year,
               ROUND(SUM(black_cases)/SUM(total_cases)*100,1) AS black_pct,
               ROUND(SUM(hispanic_cases)/SUM(total_cases)*100,1) AS hispanic_pct,
               ROUND(SUM(white_cases)/SUM(total_cases)*100,1) AS white_pct
        FROM diagnoses_state WHERE total_cases IS NOT NULL AND black_cases IS NOT NULL
        GROUP BY year ORDER BY year
    """)
    return jsonify(rows)


@app.route("/api/ai-insights")
def ai_insights():
    prompts = [
        "What is the national trend in new HIV diagnoses from 2014 to 2023, and what does the COVID-19 dip in 2020 mean for ongoing surveillance policy?",
        "Which racial/ethnic group bears the highest burden of new HIV diagnoses in the most recent year, and what targeted intervention does the data suggest?",
        "Which states have the lowest PrEP-to-Need ratios indicating greatest unmet PrEP need, and what does this mean for federal resource allocation?"
    ]
    insights = []
    for prompt in prompts:
        try:
            resp = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": SCHEMA_CONTEXT}, {"role": "user", "content": prompt}],
                temperature=0.3, max_tokens=350
            )
            raw = resp.choices[0].message.content.strip()
            parsed = json.loads(raw)
            data_rows = []
            if parsed.get("sql"):
                try:
                    data_rows = run_sql(parsed["sql"])
                except:
                    data_rows = []
            insights.append({"question": prompt, "answer": parsed.get("answer", ""), "insight_type": parsed.get("insight_type", "trend"), "data": data_rows[:6]})
        except Exception as e:
            insights.append({"question": prompt, "answer": f"Error: {e}", "insight_type": "trend", "data": []})
    return jsonify(insights)


@app.route("/api/policy-brief", methods=["POST"])
def policy_brief():
    body = request.get_json()
    topic = body.get("topic", "overall HIV epidemic trends")
    latest_stats = run_sql("SELECT year, SUM(total_cases) AS total, ROUND(SUM(black_cases)/SUM(total_cases)*100,1) AS black_pct, ROUND(SUM(hispanic_cases)/SUM(total_cases)*100,1) AS hisp_pct, ROUND(SUM(msm_cases)/SUM(total_cases)*100,1) AS msm_pct FROM diagnoses_state WHERE year=(SELECT MAX(year) FROM diagnoses_state) GROUP BY year")
    trend = run_sql("SELECT year, SUM(total_cases) AS total FROM diagnoses_state GROUP BY year ORDER BY year")
    pnr_low = run_sql("SELECT state, pnr_ratio FROM pnr_state WHERE year=(SELECT MAX(year) FROM pnr_state) AND pnr_ratio IS NOT NULL AND pnr_ratio > 0 ORDER BY pnr_ratio ASC LIMIT 5")
    context = f"""Real AIDSVu/CDC data: latest={latest_stats}, trend={trend}, lowest PNR states={pnr_low}

Write a professional 3-paragraph HIV policy brief for amfAR's Public Policy Office about: {topic}

PARAGRAPH 1 - Situation: Current epidemic status with real numbers.
PARAGRAPH 2 - Disparities: Populations/states with greatest burden.
PARAGRAPH 3 - Recommendations: 2-3 specific evidence-based policy actions.

Use real numbers. Professional policy tone. No bullet points. Flowing paragraphs."""
    resp = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": context}],
        temperature=0.4, max_tokens=700
    )
    return jsonify({"brief": resp.choices[0].message.content.strip(), "topic": topic})


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json()
    question = body.get("question", "").strip()
    if not question:
        return jsonify({"error": "No question"}), 400
    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": SCHEMA_CONTEXT}, {"role": "user", "content": question}],
            temperature=0.2, max_tokens=400
        )
        raw = resp.choices[0].message.content.strip()
        parsed = json.loads(raw)
        data_rows = []
        if parsed.get("sql"):
            try:
                data_rows = run_sql(parsed["sql"])
            except Exception as e:
                parsed["answer"] += f" (SQL error: {e})"
        return jsonify({"answer": parsed.get("answer", ""), "sql": parsed.get("sql"), "data": data_rows[:10], "insight_type": parsed.get("insight_type", "trend")})
    except json.JSONDecodeError:
        return jsonify({"answer": raw, "sql": None, "data": []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/api/ehe-progress")
def ehe_progress():
    """
    Ending the HIV Epidemic tracks 4 pillars.
    EHE goal: reduce new diagnoses 90% by 2030 (baseline 2017 = ~38,739 nationally).
    We track: diagnoses trend, PrEP coverage, and geographic focus.
    """
    EHE_BASELINE_YEAR = 2017
    EHE_TARGET_REDUCTION = 0.90

    baseline = float(run_sql(f"SELECT SUM(total_cases) AS t FROM diagnoses_state WHERE year={EHE_BASELINE_YEAR}")[0]["t"] or 0)
    yearly   = run_sql("SELECT year, SUM(total_cases) AS diagnoses, SUM(d.total_cases) AS total FROM diagnoses_state d GROUP BY year ORDER BY year")
    prep_yr  = run_sql("SELECT year, SUM(prep_users) AS prep_users FROM prep_state GROUP BY year ORDER BY year")
    ehe_jurisdictions = run_sql(f"""
        SELECT state, total_cases, rate_per_100k,
               ROUND((1 - total_cases/{float(baseline or 1)} * 52) * 100, 1) AS pct_of_national
        FROM diagnoses_state
        WHERE year=(SELECT MAX(year) FROM diagnoses_state)
          AND total_cases IS NOT NULL
        ORDER BY total_cases DESC LIMIT 10
    """)

    target_cases = int(baseline * (1 - EHE_TARGET_REDUCTION)) if baseline else 0

    progress = []
    for row in yearly:
        yr = row["year"]
        dx = int(float(row["diagnoses"] or 0))
        if baseline:
            pct_reduced = round((1 - dx / baseline) * 100, 1)
            pct_to_goal = round((pct_reduced / 90) * 100, 1)
        else:
            pct_reduced = 0
            pct_to_goal = 0
        progress.append({
            "year": yr,
            "diagnoses": dx,
            "pct_reduced_from_baseline": pct_reduced,
            "pct_of_ehe_goal_achieved": min(pct_to_goal, 100),
        })

    prep_map = {r["year"]: int(r["prep_users"] or 0) for r in prep_yr}
    for row in progress:
        row["prep_users"] = prep_map.get(row["year"], 0)

    return jsonify({
        "baseline_year": EHE_BASELINE_YEAR,
        "baseline_diagnoses": int(baseline or 0),
        "target_2030": target_cases,
        "target_reduction_pct": 90,
        "yearly_progress": progress,
        "high_burden_jurisdictions": ehe_jurisdictions,
    })


@app.route("/api/state-profile/<state_abbr>")
def state_profile(state_abbr):
    """Full state profile for the click-through modal."""
    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]

    current = run_sql(f"""
        SELECT d.*, p.prep_users, p.prep_rate, n.pnr_ratio
        FROM diagnoses_state d
        LEFT JOIN prep_state p ON p.state_abbr=d.state_abbr AND p.year=d.year
        LEFT JOIN pnr_state n  ON n.state_abbr=d.state_abbr AND n.year=d.year
        WHERE d.state_abbr='{state_abbr}' AND d.year={latest}
        LIMIT 1
    """)
    if not current:
        return jsonify({"error": "State not found"}), 404

    trend = run_sql(f"""
        SELECT d.year, d.total_cases, d.rate_per_100k, p.prep_users
        FROM diagnoses_state d
        LEFT JOIN prep_state p ON p.state_abbr=d.state_abbr AND p.year=d.year
        WHERE d.state_abbr='{state_abbr}' AND d.total_cases IS NOT NULL
        ORDER BY d.year
    """)

    national_rate = run_sql(f"""
        SELECT ROUND(SUM(total_cases)/SUM(1)*1.0,1) AS nat_rate,
               ROUND(AVG(rate_per_100k),1) AS avg_rate
        FROM diagnoses_state WHERE year={latest} AND rate_per_100k IS NOT NULL
    """)[0]

    return jsonify({
        "current": current[0],
        "trend": trend,
        "national_avg_rate": national_rate.get("avg_rate"),
    })


# ── Feature: State Comparison ─────────────────────────────────────────────────
@app.route("/api/compare-states")
def compare_states():
    state_a = request.args.get("a", "").upper()
    state_b = request.args.get("b", "").upper()
    if not state_a or not state_b:
        return jsonify({"error": "Provide ?a=TX&b=CA"}), 400

    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]

    def get_state(abbr):
        rows = run_sql(f"""
            SELECT d.year, d.state, d.state_abbr, d.total_cases, d.rate_per_100k,
                   d.black_cases, d.hispanic_cases, d.white_cases,
                   d.msm_cases, d.msm_pct, d.idu_cases,
                   d.age_13_24, d.age_25_34, d.age_35_44,
                   p.prep_users, p.prep_rate, n.pnr_ratio
            FROM diagnoses_state d
            LEFT JOIN prep_state p ON p.state_abbr=d.state_abbr AND p.year=d.year
            LEFT JOIN pnr_state  n ON n.state_abbr=d.state_abbr AND n.year=d.year
            WHERE d.state_abbr='{abbr}'
            ORDER BY d.year
        """)
        return rows

    data_a = get_state(state_a)
    data_b = get_state(state_b)
    if not data_a or not data_b:
        return jsonify({"error": "One or both states not found"}), 404

    latest_a = next((r for r in data_a if r["year"] == latest), data_a[-1])
    latest_b = next((r for r in data_b if r["year"] == latest), data_b[-1])

    # Ask GPT for commentary
    prompt = f"""Compare HIV epidemic data between {latest_a['state']} and {latest_b['state']} (latest year {latest}):
{latest_a['state']}: {latest_a['total_cases']} new diagnoses, rate {latest_a['rate_per_100k']} per 100k, PrEP users {latest_a['prep_users']}, PNR {latest_a['pnr_ratio']}
{latest_b['state']}: {latest_b['total_cases']} new diagnoses, rate {latest_b['rate_per_100k']} per 100k, PrEP users {latest_b['prep_users']}, PNR {latest_b['pnr_ratio']}
Write 2 punchy sentences of policy commentary on the key difference and what it means for resource allocation."""

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content":prompt}],
            temperature=0.4, max_tokens=180
        )
        commentary = resp.choices[0].message.content.strip()
    except:
        commentary = "AI commentary unavailable."

    return jsonify({
        "state_a": {"abbr": state_a, "trend": data_a, "latest": latest_a},
        "state_b": {"abbr": state_b, "trend": data_b, "latest": latest_b},
        "commentary": commentary,
        "latest_year": latest,
    })


# ── Feature: Epidemic Simulation ──────────────────────────────────────────────
@app.route("/api/simulate", methods=["POST"])
def simulate():
    body = request.get_json()
    prep_increase_pct = float(body.get("prep_increase_pct", 20))
    target_year       = int(body.get("target_year", 2030))

    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]
    baseline_dx   = float(run_sql(f"SELECT SUM(total_cases) AS t FROM diagnoses_state WHERE year={latest}")[0]["t"] or 0)
    current_prep  = float(run_sql(f"SELECT SUM(prep_users) AS t FROM prep_state WHERE year={latest}")[0]["t"] or 0)

    # Evidence-based: each 10% increase in PrEP coverage → ~4.4% reduction in incidence
    # (based on CDC modeling literature)
    PREP_EFFICACY_RATIO = 0.44
    reduction_pct = (prep_increase_pct / 10) * PREP_EFFICACY_RATIO
    projected_dx  = round(baseline_dx * (1 - reduction_pct / 100))
    dx_prevented  = int(baseline_dx - projected_dx)
    new_prep_users = round(current_prep * (1 + prep_increase_pct / 100))

    # Year-by-year projection
    years_ahead = target_year - latest
    yearly = []
    for i in range(years_ahead + 1):
        yr = latest + i
        frac = i / years_ahead if years_ahead > 0 else 1
        dx = round(baseline_dx - (baseline_dx - projected_dx) * frac)
        prep = round(current_prep + (new_prep_users - current_prep) * frac)
        yearly.append({"year": yr, "projected_diagnoses": dx, "projected_prep": prep})

    ehe_baseline = float(run_sql("SELECT SUM(total_cases) AS t FROM diagnoses_state WHERE year=2017")[0]["t"] or 1)
    final_reduction_from_2017 = round((1 - projected_dx / ehe_baseline) * 100, 1)

    prompt = f"""A public health simulation shows: if PrEP coverage increases by {prep_increase_pct}% from {latest} levels ({int(current_prep):,} users → {new_prep_users:,} users), 
HIV diagnoses would drop from {int(baseline_dx):,} to {projected_dx:,} by {target_year} — preventing {dx_prevented:,} infections.
This would achieve {final_reduction_from_2017}% reduction from the 2017 EHE baseline (goal is 90% by 2030).
Write 2 sentences of policy commentary on what this means for federal PrEP funding priorities."""

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content":prompt}],
            temperature=0.3, max_tokens=150
        )
        commentary = resp.choices[0].message.content.strip()
    except:
        commentary = ""

    return jsonify({
        "baseline_year": latest,
        "baseline_diagnoses": int(baseline_dx),
        "current_prep_users": int(current_prep),
        "prep_increase_pct": prep_increase_pct,
        "target_year": target_year,
        "projected_diagnoses": projected_dx,
        "projected_prep_users": new_prep_users,
        "diagnoses_prevented": dx_prevented,
        "ehe_reduction_from_2017_pct": final_reduction_from_2017,
        "yearly_projection": yearly,
        "commentary": commentary,
    })


# ── Feature: Funding Gap Calculator ───────────────────────────────────────────
@app.route("/api/funding-gap")
def funding_gap():
    """
    Estimates federal PrEP funding needed per state to reach EHE goals.
    Methodology: Cost per PrEP patient/year ~$4,200 (CDC estimate, generic PrEP).
    EHE target: enough PrEP to cover all people who need it (PNR >= 10 = covered).
    """
    COST_PER_PREP_PATIENT = 4200
    TARGET_PNR = 10.0

    latest = run_sql("SELECT MAX(year) AS yr FROM pnr_state")[0]["yr"]
    states = run_sql(f"""
        SELECT p.state, p.state_abbr, p.pnr_ratio,
               pr.prep_users, pr.prep_rate,
               d.total_cases, d.rate_per_100k
        FROM pnr_state p
        LEFT JOIN prep_state pr ON pr.state_abbr=p.state_abbr AND pr.year=p.year
        LEFT JOIN diagnoses_state d ON d.state_abbr=p.state_abbr AND d.year=p.year
        WHERE p.year={latest} AND p.pnr_ratio IS NOT NULL AND p.pnr_ratio > 0
        ORDER BY p.pnr_ratio ASC
    """)

    results = []
    total_gap_usd = 0
    total_additional_prep = 0

    for s in states:
        pnr   = float(s["pnr_ratio"] or 0)
        prep  = int(s["prep_users"] or 0)
        if pnr <= 0 or pnr >= TARGET_PNR:
            additional_prep = 0
            gap_usd = 0
        else:
            # To reach TARGET_PNR, need (TARGET_PNR / current_pnr) * current_prep users
            target_prep     = round(prep * (TARGET_PNR / pnr))
            additional_prep = max(0, target_prep - prep)
            gap_usd         = additional_prep * COST_PER_PREP_PATIENT

        total_gap_usd        += gap_usd
        total_additional_prep += additional_prep

        results.append({
            "state":            s["state"],
            "state_abbr":       s["state_abbr"],
            "pnr_ratio":        round(pnr, 2),
            "current_prep":     prep,
            "additional_prep_needed": additional_prep,
            "funding_gap_usd":  gap_usd,
            "funding_gap_millions": round(gap_usd / 1_000_000, 1),
            "priority":         "CRITICAL" if pnr < 2 else "HIGH" if pnr < 5 else "MODERATE",
        })

    return jsonify({
        "latest_year": latest,
        "cost_assumption_per_patient": COST_PER_PREP_PATIENT,
        "target_pnr": TARGET_PNR,
        "total_funding_gap_usd": total_gap_usd,
        "total_funding_gap_billions": round(total_gap_usd / 1_000_000_000, 2),
        "total_additional_prep_needed": total_additional_prep,
        "states": results[:20],
    })


# ── Feature: Live News Feed ────────────────────────────────────────────────────
@app.route("/api/news")
def news():
    """Use GPT to surface recent HIV/AIDS policy news context."""
    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content": """List 5 significant HIV/AIDS policy developments or news items from 2024-2025 that would be relevant to amfAR's work. 
For each, return ONLY valid JSON array, no markdown:
[{"headline": "...", "summary": "1-2 sentence summary", "relevance": "Why this matters for HIV policy", "category": "funding|legislation|research|epidemic|prevention"}]"""}],
            temperature=0.4, max_tokens=800
        )
        raw = resp.choices[0].message.content.strip()
        raw = raw.replace("```json","").replace("```","").strip()
        items = json.loads(raw)
        return jsonify({"items": items, "note": "AI-curated policy context · Verify with primary sources"})
    except Exception as e:
        return jsonify({"error": str(e), "items": []}), 500


# ── Feature: PDF Report Data ───────────────────────────────────────────────────
@app.route("/api/report-data")
def report_data():
    """Aggregates all dashboard data for the PDF report generator."""
    latest = run_sql("SELECT MAX(year) AS yr FROM diagnoses_state")[0]["yr"]
    
    summary    = run_sql(f"SELECT SUM(total_cases) AS dx, ROUND(AVG(rate_per_100k),1) AS avg_rate FROM diagnoses_state WHERE year={latest}")[0]
    trend      = run_sql("SELECT year, SUM(total_cases) AS dx FROM diagnoses_state GROUP BY year ORDER BY year")
    race       = run_sql(f"""SELECT 'Black' AS grp, SUM(black_cases) AS n FROM diagnoses_state WHERE year={latest}
                            UNION ALL SELECT 'Hispanic', SUM(hispanic_cases) FROM diagnoses_state WHERE year={latest}
                            UNION ALL SELECT 'White', SUM(white_cases) FROM diagnoses_state WHERE year={latest}
                            ORDER BY n DESC""")
    top_states = run_sql(f"SELECT state, total_cases, rate_per_100k FROM diagnoses_state WHERE year={latest} AND rate_per_100k IS NOT NULL ORDER BY rate_per_100k DESC LIMIT 5")
    prep_total = run_sql(f"SELECT SUM(prep_users) AS t FROM prep_state WHERE year={latest}")[0]["t"]
    ehe_base   = float(run_sql("SELECT SUM(total_cases) AS t FROM diagnoses_state WHERE year=2017")[0]["t"] or 1)
    current_dx = float(summary["dx"] or 0)
    ehe_pct    = round((1 - current_dx / ehe_base) * 100, 1)

    return jsonify({
        "generated": latest,
        "new_diagnoses": int(current_dx),
        "national_avg_rate": float(summary["avg_rate"] or 0),
        "prep_users": int(prep_total or 0),
        "ehe_reduction_pct": ehe_pct,
        "trend": trend,
        "race_breakdown": race,
        "top_burden_states": top_states,
        "ehe_baseline": int(ehe_base),
        "ehe_target": int(ehe_base * 0.10),
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)