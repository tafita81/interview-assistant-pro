export const RESUME_DATA = {
  name: "Rafael Rodrigues",
  title: "Senior Data Analyst / Analytics Engineer",
  yearsExperience: "18+",
  summary: `Senior Data Analyst / Analytics Engineer with 18+ years delivering end-to-end BI and Analytics solutions. Certified in Microsoft Power BI (PL-300) and Tableau. Expert in Data Visualization, Self-Service Analytics, KPI Development, Dashboard Architecture, and Data Governance.`,
  coreSkills: {
    programming: "SQL, T-SQL, Python (pandas, scikit-learn, numpy, matplotlib), SAS, REST APIs",
    cloud: "Azure (ADF, Synapse, Databricks, ML), AWS (Athena, Redshift, S3, QuickSight), GCP BigQuery, Snowflake, Oracle",
    bi: "Power BI (DAX, Power Query, RLS, Deployment Pipelines, Copilot), Tableau (Desktop, Server, Prep, LODs, Tableau GPT), Looker (LookML), Qlik, ThoughtSpot, MicroStrategy, SAP Analytics Cloud, AWS QuickSight, IBM Cognos, Sisense, Domo, Zoho Analytics, Mode Analytics",
    dataEngineering: "dbt, Dimensional Modeling (Star, Snowflake, Kimball), ETL/ELT pipelines, OLAP Cubes, Semantic Models, Apache Airflow",
    governance: "Data Governance, SOX, GDPR, LGPD, Data Privacy, KPI frameworks (CAC, LTV, ARPU, Churn, ROI, Retention, NPS)",
    methodologies: "Agile, Scrum, Kanban, Design Thinking, Six Sigma Green Belt, BPM Bizagi, Jira, Confluence",
    strengths: "Performance tuning, automation & orchestration, dashboard UX, storytelling, BI adoption, cost optimization, AI/ML integration, Machine Learning (predictive & prescriptive models, ML pipelines)"
  },
  experience: [
    {
      company: "Keyrus",
      role: "Data Analyst",
      period: "Feb 2019 – Present",
      highlights: [
        "Orchestrated ETL/ELT workflows using Apache Airflow with SQL, Python, dbt, Databricks",
        "Developed ML models (predictive churn, segmentation, ARPU optimization) with Python, scikit-learn",
        "Delivered BI solutions with Power BI, Tableau, Looker, ThoughtSpot, AWS QuickSight across Industrial, Retail, Financial, Tech",
        "Designed dimensional data models (star/snowflake schemas), accelerating reporting by 40-70%",
        "Built Power BI dashboards with advanced DAX, RLS, improving adoption by 30%+",
        "Integrated BigQuery, Snowflake, AWS Athena, Redshift, Oracle, Azure Synapse, Databricks for multi-cloud architecture",
        "Piloted AI/ML integrations for BI (Power BI Copilot, Tableau GPT, ThoughtSpot Sage, QuickSight Q)"
      ]
    },
    {
      company: "The Coca-Cola Company",
      role: "Data Analyst",
      period: "May 2018 – Feb 2019",
      highlights: [
        "Built executive dashboards with Power BI, Tableau, SSAS, SSMS, SQL, Oracle, Azure, Databricks for C-Level",
        "Integrated Google Analytics, GTM, AWS S3, AWS Athena, APIs for funnel analysis and campaign ROI tracking",
        "Enhanced data reliability by 30% through optimized SQL queries and ETL orchestration",
        "Increased executive adoption of dashboards by 45% aligning BI with OKRs"
      ]
    },
    {
      company: "TIM",
      role: "Data Analyst",
      period: "Apr 2017 – May 2018",
      highlights: [
        "Designed churn prediction and ARPU optimization models using Python, SQL, SAS, Databricks, Azure ML",
        "Built customer segmentation and LTV models for prepaid/postpaid bases",
        "Developed executive dashboards in Power BI, Tableau tracking churn, ARPU, CAC, NPS"
      ]
    },
    {
      company: "Oi",
      role: "Senior Data Analyst (Strategic Planning & BI)",
      period: "Apr 2007 – Feb 2017",
      highlights: [
        "Delivered >$3M in savings via Six Sigma Green Belt, PDCA, and statistical analysis",
        "Automated financial/operational reporting reducing cycles from 5 days to 1 day",
        "Led predictive analytics: churn modeling, ARPU and segmentation for commercial planning"
      ]
    }
  ],
  education: [
    "MBA – Business Management | Ibmec Business School (2007-2008)",
    "Bachelor in Information Systems | Ibmec (2001-2004)"
  ],
  certifications: [
    "Microsoft Certified: Data Analyst Associate (PL-300)",
    "Tableau Desktop Certified",
    "Analyzing and Visualizing Data with Microsoft Power BI",
    "Six Sigma Green Belt"
  ],
  businessImpact: {
    dashboardAdoption: "30%+ increase",
    reportingLeadTime: "40-70% reduction",
    operationalCosts: "20-35% cut",
    savings: ">$3M through Six Sigma and process automation"
  }
};

export const RESUME_CONTEXT_FOR_LLM = `
CANDIDATE PROFILE - Rafael Rodrigues
Senior Data Analyst / Analytics Engineer with 18+ years of experience.

CURRENT ROLE: Data Analyst at Keyrus (Feb 2019 – Present)
- ETL/ELT with Apache Airflow, SQL, Python, dbt, Databricks
- ML models: predictive churn, segmentation, ARPU optimization (Python, scikit-learn)
- BI: Power BI, Tableau, Looker, ThoughtSpot, AWS QuickSight
- Dimensional modeling (star/snowflake), reporting acceleration 40-70%
- Multi-cloud: BigQuery, Snowflake, Athena, Redshift, Oracle, Azure Synapse, Databricks
- AI/ML integrations: Power BI Copilot, Tableau GPT, ThoughtSpot Sage

PREVIOUS: Coca-Cola (executive dashboards, 45% adoption increase), TIM (churn prediction, ARPU optimization), Oi (>$3M savings, Six Sigma)

SKILLS: SQL/T-SQL, Python (pandas, scikit-learn, numpy), dbt, Airflow, Azure, AWS, GCP, Snowflake, Power BI (DAX, Power Query, RLS), Tableau (LODs, Prep), Looker (LookML), ETL/ELT, dimensional modeling, OLAP, Data Governance, GDPR, SOX, Agile/Scrum, Six Sigma Green Belt

CERTIFICATIONS: PL-300 (Power BI), Tableau Desktop, Six Sigma Green Belt
EDUCATION: MBA Business Management (Ibmec), BS Information Systems (Ibmec)
IMPACT: 30%+ dashboard adoption, 40-70% reporting time reduction, 20-35% cost cuts, >$3M savings
`;
