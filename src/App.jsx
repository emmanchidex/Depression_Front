import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // ============================================================
  // THEME
  // ============================================================

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('mindsense-theme');

    if (savedTheme) {
      return savedTheme === 'dark';
    }

    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  // ============================================================
  // FORM DATA
  // Matches StudentInput in the FastAPI backend exactly
  // ============================================================

  const [formData, setFormData] = useState({
    Gender: 1,
    Age: 20,
    Academic_Pressure: 3,
    Financial_Stress: 3,
    CGPA: 3.5,
    Study_Hours: 6,
    Sleep_Duration: 2,
    Dietary_Habits: 1,
    Have_you_ever_had_suicidal_thoughts: 0,
    Family_History_of_Mental_Illness: 0,
    City: 'Kalyan',
    Degree: 'B.Tech'
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================
  // THEME
  // ============================================================

  useEffect(() => {
    localStorage.setItem(
      'mindsense-theme',
      darkMode ? 'dark' : 'light'
    );

    document.documentElement.setAttribute(
      'data-theme',
      darkMode ? 'dark' : 'light'
    );
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    const numericFields = [
      'Gender',
      'Age',
      'Academic_Pressure',
      'Financial_Stress',
      'CGPA',
      'Study_Hours',
      'Sleep_Duration',
      'Dietary_Habits',
      'Have_you_ever_had_suicidal_thoughts',
      'Family_History_of_Mental_Illness'
    ];

    const parsedValue =
      numericFields.includes(name) || type === 'number'
        ? Number(value)
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/predict',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        let errData = {};

        try {
          errData = await response.json();
        } catch {
          errData = {};
        }

        throw new Error(
          errData.detail || 'Prediction request failed'
        );
      }

      const data = await response.json();

      console.log('Prediction result:', data);

      setResult(data);

      setTimeout(() => {
        document
          .getElementById('result-section')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
      }, 100);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        'Unable to connect to the prediction server.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // BACKEND RESULT HELPERS
  // ============================================================

  /*
   * IMPORTANT:
   *
   * The backend is the source of truth.
   *
   * Backend status:
   *
   * if rf_prediction == 1 OR svm_prediction == 1:
   *     status = "High Risk"
   * else:
   *     status = "Low Risk"
   *
   * Therefore, the frontend does NOT recreate the status
   * using risk_score.
   */

  const backendStatus = result?.status || null;

  const isHighRisk =
    backendStatus === 'High Risk';

  const isLowRisk =
    backendStatus === 'Low Risk';

  /*
   * risk_score is the average of the available model
   * class-1 probabilities.
   *
   * It can theoretically be null if both models do not
   * provide probabilities.
   */

  const hasRiskScore =
    result?.risk_score !== null &&
    result?.risk_score !== undefined &&
    !Number.isNaN(Number(result.risk_score));

  const riskScore = hasRiskScore
    ? Number(result.risk_score)
    : null;

  // ============================================================
  // RISK SCORE BAND
  //
  // This is ONLY used for interpreting the numerical
  // probability score and its colour.
  //
  // It does NOT replace backendStatus.
  // ============================================================

  const getRiskScoreColor = () => {
    if (riskScore === null) {
      return '#64748b';
    }

    if (riskScore >= 70) {
      return '#ef4444';
    }

    if (riskScore >= 40) {
      return '#f59e0b';
    }

    return '#22c55e';
  };

  const getRiskScoreLabel = () => {
    if (riskScore === null) {
      return 'Unavailable';
    }

    if (riskScore >= 70) {
      return 'High';
    }

    if (riskScore >= 40) {
      return 'Moderate';
    }

    return 'Low';
  };

  /*
   * The recommendation comes directly from the backend.
   *
   * The backend determines this using risk_score:
   *
   * >= 70  -> High-risk indicators
   * >= 40  -> Moderate-risk indicators
   * < 40   -> Lower-risk indicators
   */

  const recommendation =
    result?.recommendation ||
    'No recommendation was returned by the prediction service.';

  // ============================================================
  // FEATURE DATA
  // ============================================================

  /*
   * The backend returns:
   *
   * top_risk_factors: [
   *   {
   *     feature: "...",
   *     importance: ...
   *   }
   * ]
   *
   * importance has already been multiplied by 100
   * in the backend.
   */

  const featureData =
    result?.top_risk_factors || [];

  const formatFeatureName = (feature) => {
    if (!feature) {
      return 'Unknown Feature';
    }

    return String(feature)
      .replace(/_/g, ' ')
      .replace(/\?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const formatFeatureScore = (score) => {
    const numericScore = Number(score);

    if (Number.isNaN(numericScore)) {
      return 'N/A';
    }

    /*
     * Backend top_risk_factors already contains percentage
     * values such as 18.42, not decimal values such as 0.1842.
     */

    return `${numericScore.toFixed(2)}%`;
  };

  // ============================================================
  // RESULT CSS CLASS
  //
  // This is based ONLY on backend status.
  // ============================================================

  const resultRiskClass =
    backendStatus === 'High Risk'
      ? 'risk-high'
      : backendStatus === 'Low Risk'
        ? 'risk-low'
        : '';

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="background-orb orb-one"></div>
      <div className="background-orb orb-two"></div>
      <div className="background-orb orb-three"></div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="navbar">

        <div className="brand">

          <div className="brand-icon">
            ✦
          </div>

          <div>
            <div className="brand-name">
              MindSense
            </div>

            <div className="brand-subtitle">
              Student Wellness AI
            </div>
          </div>

        </div>

        <div className="navbar-actions">

          <div className="nav-status">
            <span className="status-dot"></span>
            ML System Online
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              darkMode
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
          >

            <span className="theme-icon">
              {darkMode ? '☀' : '☾'}
            </span>

            <span className="theme-label">
              {darkMode ? 'Light' : 'Dark'}
            </span>

          </button>

        </div>

      </nav>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="main-content">

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="hero">

          <div className="hero-badge">
            <span>✦</span>
            AI-POWERED EARLY DETECTION
          </div>

          <h1>
            Understand student
            <span> wellbeing.</span>
          </h1>

          <p>
            An intelligent decision-support system that analyzes
            academic, lifestyle and personal factors to provide
            an early risk indication.
          </p>

          <div className="hero-features">

            <div>
              <span>✓</span>
              Machine Learning
            </div>

            <div>
              <span>✓</span>
              Dual Model Analysis
            </div>

            <div>
              <span>✓</span>
              Private Assessment
            </div>

          </div>

        </section>

        {/* ===================================================
            DASHBOARD
        =================================================== */}

        <div className="dashboard-grid">

          {/* =================================================
              INPUT CARD
          ================================================= */}

          <section className="glass-card assessment-card">

            <div className="card-heading">

              <div className="heading-icon purple">
                ◈
              </div>

              <div>
                <h2>
                  Student Assessment
                </h2>

                <p>
                  Enter the student's information below
                </p>
              </div>

            </div>

            <form
              onSubmit={handleSubmit}
              className="assessment-form"
            >

              {/* =================================================
                  PERSONAL INFORMATION
              ================================================= */}

              <div className="section-label">
                <span>01</span>
                Personal Information
              </div>

              <div className="form-grid">

                <div className="input-group">

                  <label>
                    Gender
                  </label>

                  <select
                    name="Gender"
                    value={formData.Gender}
                    onChange={handleChange}
                  >
                    <option value={1}>
                      Male
                    </option>

                    <option value={0}>
                      Female
                    </option>
                  </select>

                </div>

                <div className="input-group">

                  <label>
                    Age
                  </label>

                  <input
                    type="number"
                    name="Age"
                    value={formData.Age}
                    onChange={handleChange}
                    min="10"
                    max="100"
                    required
                  />

                </div>

                <div className="input-group">

                  <label>
                    City
                  </label>

                  <input
                    type="text"
                    name="City"
                    value={formData.City}
                    onChange={handleChange}
                    placeholder="e.g. Kalyan"
                    required
                  />

                </div>

                <div className="input-group">

                  <label>
                    Degree
                  </label>

                  <input
                    type="text"
                    name="Degree"
                    value={formData.Degree}
                    onChange={handleChange}
                    placeholder="e.g. B.Tech"
                    required
                  />

                </div>

              </div>

              {/* =================================================
                  ACADEMIC & FINANCIAL
              ================================================= */}

              <div className="section-label">
                <span>02</span>
                Academic & Financial
              </div>

              <div className="form-grid">

                <div className="input-group">

                  <label>
                    CGPA
                    <small>0 – 10</small>
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="CGPA"
                    value={formData.CGPA}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="input-group">

                  <label>
                    Daily Study Hours
                  </label>

                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    name="Study_Hours"
                    value={formData.Study_Hours}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="input-group">

                  <label>
                    Academic Pressure
                    <small>1 – 5</small>
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="5"
                    name="Academic_Pressure"
                    value={formData.Academic_Pressure}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="input-group">

                  <label>
                    Financial Stress
                    <small>1 – 5</small>
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="5"
                    name="Financial_Stress"
                    value={formData.Financial_Stress}
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>

              {/* =================================================
                  LIFESTYLE
              ================================================= */}

              <div className="section-label">
                <span>03</span>
                Lifestyle
              </div>

              <div className="form-grid">

                <div className="input-group">

                  <label>
                    Sleep Duration
                  </label>

                  <select
                    name="Sleep_Duration"
                    value={formData.Sleep_Duration}
                    onChange={handleChange}
                  >

                    <option value={0}>
                      Less than 5 hours
                    </option>

                    <option value={1}>
                      5 – 6 hours
                    </option>

                    <option value={2}>
                      7 – 8 hours
                    </option>

                    <option value={3}>
                      More than 8 hours
                    </option>

                  </select>

                </div>

                <div className="input-group">

                  <label>
                    Dietary Habits
                  </label>

                  <select
                    name="Dietary_Habits"
                    value={formData.Dietary_Habits}
                    onChange={handleChange}
                  >

                    <option value={0}>
                      Unhealthy
                    </option>

                    <option value={1}>
                      Moderate
                    </option>

                    <option value={2}>
                      Healthy
                    </option>

                  </select>

                </div>

              </div>

              {/* =================================================
                  MENTAL HEALTH
              ================================================= */}

              <div className="section-label">
                <span>04</span>
                Mental Health Indicators
              </div>

              <div className="question-card">

                <div className="question-icon">
                  ?
                </div>

                <div className="question-content">

                  <label>
                    Have you ever experienced
                    suicidal thoughts?
                  </label>

                  <p>
                    This information is used only as
                    a model input.
                  </p>

                </div>

                <select
                  name="Have_you_ever_had_suicidal_thoughts"
                  value={
                    formData.Have_you_ever_had_suicidal_thoughts
                  }
                  onChange={handleChange}
                >

                  <option value={0}>
                    No
                  </option>

                  <option value={1}>
                    Yes
                  </option>

                </select>

              </div>

              <div className="question-card">

                <div className="question-icon">
                  ♡
                </div>

                <div className="question-content">

                  <label>
                    Family history of mental illness?
                  </label>

                  <p>
                    Select the option that best represents
                    the student's history.
                  </p>

                </div>

                <select
                  name="Family_History_of_Mental_Illness"
                  value={
                    formData.Family_History_of_Mental_Illness
                  }
                  onChange={handleChange}
                >

                  <option value={0}>
                    No
                  </option>

                  <option value={1}>
                    Yes
                  </option>

                </select>

              </div>

              {/* =================================================
                  SUBMIT
              ================================================= */}

              <button
                type="submit"
                className="predict-button"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing student profile...
                  </>
                ) : (
                  <>
                    <span>✦</span>
                    Analyze Risk Profile
                    <span className="button-arrow">
                      →
                    </span>
                  </>
                )}

              </button>

              <div className="secure-note">

                <span>⌁</span>

                Your assessment data is transmitted securely
                to the local prediction service.

              </div>

            </form>

          </section>

          {/* =================================================
              RESULTS
          ================================================= */}

          <section
            id="result-section"
            className="results-column"
          >

            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {!result && !loading && (

              <div className="glass-card empty-result">

                <div className="empty-icon">
                  ✦
                </div>

                <h2>
                  Your analysis will appear here
                </h2>

                <p>
                  Complete the assessment and click
                  <strong> Analyze Risk Profile </strong>
                  to generate an AI-assisted risk indication.
                </p>

                <div className="analysis-points">

                  <div>
                    <span>01</span>
                    Profile Analysis
                  </div>

                  <div>
                    <span>02</span>
                    Dual Model Prediction
                  </div>

                  <div>
                    <span>03</span>
                    Risk Interpretation
                  </div>

                </div>

              </div>

            )}

            {/* =================================================
                LOADING STATE
            ================================================= */}

            {loading && (

              <div className="glass-card analyzing-card">

                <div className="loader-ring"></div>

                <h2>
                  Analyzing profile
                </h2>

                <p>
                  Random Forest and SVM models are
                  evaluating the submitted information...
                </p>

                <div className="loading-bars">

                  <span></span>
                  <span></span>
                  <span></span>

                </div>

              </div>

            )}

            {/* =================================================
                RESULT
            ================================================= */}

            {result && !loading && (

              <div
                className={`glass-card result-card ${resultRiskClass}`}
              >

                {/* =================================================
                    RESULT HEADER
                ================================================= */}

                <div className="result-header">

                  <div>

                    <div className="result-label">
                      ASSESSMENT RESULT
                    </div>

                    <h2>
                      Risk Overview
                    </h2>

                  </div>

                  <div className="result-check">
                    ✓
                  </div>

                </div>

                {/* =================================================
                    BACKEND STATUS
                ================================================= */}

                <div className="score-section">

                  <div
                    className="score-circle"
                    style={{
                      '--score':
                        riskScore !== null
                          ? `${Math.min(
                              Math.max(riskScore, 0),
                              100
                            )}%`
                          : '0%',
                      '--risk-color':
                        getRiskScoreColor()
                    }}
                  >

                    <div className="score-inner">

                      <strong>
                        {riskScore !== null
                          ? riskScore.toFixed(2)
                          : 'N/A'}
                      </strong>

                      {riskScore !== null && (
                        <span>
                          %
                        </span>
                      )}

                    </div>

                  </div>

                  <div className="score-info">

                    <span className="score-caption">
                      COMBINED RISK SCORE
                    </span>

                    {/* =================================================
                        IMPORTANT:
                        This badge uses BACKEND STATUS.
                    ================================================= */}

                    <div
                      className="risk-badge"
                      style={{
                        color:
                          isHighRisk
                            ? '#ef4444'
                            : isLowRisk
                              ? '#22c55e'
                              : '#64748b',

                        backgroundColor:
                          isHighRisk
                            ? '#ef444415'
                            : isLowRisk
                              ? '#22c55e15'
                              : '#64748b15'
                      }}
                    >

                      <span
                        style={{
                          background:
                            isHighRisk
                              ? '#ef4444'
                              : isLowRisk
                                ? '#22c55e'
                                : '#64748b'
                        }}
                      ></span>

                      {backendStatus || 'Unknown Status'}

                    </div>

                    <p>
                      Combined probability estimate from
                      the available prediction models.
                    </p>

                  </div>

                </div>

                {/* =================================================
                    NUMERICAL RISK SCORE SCALE
                ================================================= */}

                <div className="risk-scale">

                  <div className="scale-labels">

                    <span>
                      LOW
                    </span>

                    <span>
                      MODERATE
                    </span>

                    <span>
                      HIGH
                    </span>

                  </div>

                  <div className="scale-bar">

                    <div
                      className="scale-progress"
                      style={{
                        width:
                          riskScore !== null
                            ? `${Math.min(
                                Math.max(riskScore, 0),
                                100
                              )}%`
                            : '0%',

                        background:
                          getRiskScoreColor()
                      }}
                    ></div>

                  </div>

                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      opacity: 0.7,
                      textAlign: 'right'
                    }}
                  >
                    Score band:{' '}
                    <strong>
                      {getRiskScoreLabel()}
                    </strong>
                  </div>

                </div>

                {/* =================================================
                    RECOMMENDATION
                    DIRECTLY FROM BACKEND
                ================================================= */}

                <div className="recommendation-box">

                  <div className="recommendation-icon">

                    {isHighRisk ? '!' : '✓'}

                  </div>

                  <div>

                    <h3>
                      Recommendation
                    </h3>

                    <p>
                      {recommendation}
                    </p>

                  </div>

                </div>

                {/* =================================================
                    MODEL AGREEMENT
                ================================================= */}

                <div className="section-title">
                  Model Agreement
                </div>

                <div className="model-grid">

                  {/* RANDOM FOREST */}

                  <div className="model-card">

                    <div className="model-top">

                      <div className="model-icon rf">
                        RF
                      </div>

                      <span>
                        Random Forest
                      </span>

                    </div>

                    <strong>

                      {result.random_forest?.risk_percentage != null
                        ? `${Number(
                            result.random_forest.risk_percentage
                          ).toFixed(2)}%`
                        : 'N/A'}

                    </strong>

                    <small>

                      {result.random_forest?.status ||
                        'No result'}

                    </small>

                  </div>

                  {/* SVM */}

                  <div className="model-card">

                    <div className="model-top">

                      <div className="model-icon svm">
                        SV
                      </div>

                      <span>
                        SVM
                      </span>

                    </div>

                    <strong>

                      {result.svm?.risk_percentage != null
                        ? `${Number(
                            result.svm.risk_percentage
                          ).toFixed(2)}%`
                        : 'N/A'}

                    </strong>

                    <small>

                      {result.svm?.status ||
                        'No result'}

                    </small>

                  </div>

                </div>

                {/* =================================================
                    SIGNIFICANT MODEL FACTORS
                ================================================= */}

                <div className="section-title">
                  Significant Model Factors
                </div>

                <div className="factors-list">

                  {featureData.length > 0 ? (

                    featureData
                      .slice(0, 5)
                      .map((item, index) => {

                        const feature =
                          item?.feature;

                        const score =
                          item?.importance;

                        const numericScore =
                          Number(score);

                        const progressWidth =
                          Number.isNaN(numericScore)
                            ? 0
                            : Math.min(
                                Math.max(
                                  numericScore,
                                  0
                                ),
                                100
                              );

                        return (

                          <div
                            className="factor"
                            key={`${feature}-${index}`}
                          >

                            <div className="factor-number">
                              {String(index + 1).padStart(2, '0')}
                            </div>

                            <div className="factor-content">

                              <div className="factor-name">
                                {formatFeatureName(feature)}
                              </div>

                              <div className="factor-track">

                                <div
                                  className="factor-progress"
                                  style={{
                                    width:
                                      `${progressWidth}%`
                                  }}
                                ></div>

                              </div>

                            </div>

                            <div className="factor-score">

                              {formatFeatureScore(score)}

                            </div>

                          </div>

                        );
                      })

                  ) : (

                    <div className="no-factors">
                      Model feature information unavailable.
                    </div>

                  )}

                </div>

                {/* =================================================
                    DISCLAIMER
                ================================================= */}

                <div className="disclaimer">

                  <span>
                    ⓘ
                  </span>

                  <p>

                    This system provides an ML-based
                    <strong> risk indication </strong>
                    and is not a clinical diagnosis.
                    Results should be interpreted by
                    an appropriately qualified professional.

                  </p>

                </div>

              </div>

            )}

          </section>

        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (

          <div className="error-banner">

            <span>
              !
            </span>

            <div>

              <strong>
                Prediction failed
              </strong>

              <p>
                {error}
              </p>

            </div>

          </div>

        )}

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>

        <div>
          MindSense • Student Wellness AI
        </div>

        <div>
          Decision support, not diagnosis
        </div>

      </footer>

    </div>
  );
}

export default App;
