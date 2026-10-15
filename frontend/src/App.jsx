import { useState } from "react";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [resumeData, setResumeData] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [atsResult, setAtsResult] = useState(null);

  const [pastedResume, setPastedResume] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [matching, setMatching] = useState(false);

  // ============================================================
  // RESUME UPLOAD
  // ============================================================

  const handleUpload = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF resume.");
      return;
    }

    try {
      setUploading(true);
      setAtsResult(null);
      setMatchResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://127.0.0.1:8000/resume/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Resume upload failed."
        );
      }

      setResumeData(data);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // PASTE RESUME
  // ============================================================

  const handlePastedResume = async () => {
    if (!pastedResume.trim()) {
      alert("Please paste your resume text first.");
      return;
    }

    try {
      setUploading(true);
      setAtsResult(null);
      setMatchResult(null);

      const response = await fetch(
        "http://127.0.0.1:8000/resume/paste",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: pastedResume,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to process resume."
        );
      }

      setResumeData(data);
      setShowPaste(false);
      setPastedResume("");
    } catch (error) {
      console.error("Paste error:", error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // ATS ANALYSIS
  // ============================================================

  const analyzeResume = async () => {
    if (!resumeData) {
      alert("Please upload or paste your resume first.");
      return;
    }

    try {
      setAnalyzing(true);

      const response = await fetch(
        "http://127.0.0.1:8000/resume/analyze",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Resume analysis failed."
        );
      }

      console.log("ATS RESULT:", data);

      setAtsResult(data);
      setActivePage("Resume Analyzer");
    } catch (error) {
      console.error("ATS error:", error);
      alert(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ============================================================
  // JOB MATCH
  // ============================================================

  const analyzeJob = async () => {
    if (!resumeData) {
      alert("Please upload or paste your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter a job description.");
      return;
    }

    try {
      setMatching(true);

      const response = await fetch(
        "http://127.0.0.1:8000/job/match",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Job matching failed."
        );
      }

      console.log("JOB MATCH RESULT:", data);

      setMatchResult(data);
      setActivePage("Job Match");
    } catch (error) {
      console.error("Job match error:", error);
      alert(error.message);
    } finally {
      setMatching(false);
    }
  };

  // ============================================================
  // DASHBOARD
  // ============================================================

  const renderDashboard = () => {
    return (
      <div className="page-content">

        <div className="page-header">
          <div>
            <p className="eyebrow">
              AI CAREER PLATFORM
            </p>

            <h1>
              Welcome to HireMate AI 👋
            </h1>

            <p>
              Analyze your resume, match jobs, improve your
              skills, and prepare for interviews.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() =>
              setActivePage("Resume Analyzer")
            }
          >
            + Analyze Resume
          </button>
        </div>

        {/* DASHBOARD STATS */}

        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon purple">
              📄
            </div>

            <div>
              <span>Resume Status</span>

              <strong>
                {resumeData
                  ? "Uploaded"
                  : "Not Added"}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">
              🎯
            </div>

            <div>
              <span>ATS Score</span>

              <strong>
                {atsResult?.ats_score !== undefined
                  ? `${atsResult.ats_score}/100`
                  : "--"}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              💼
            </div>

            <div>
              <span>Job Match</span>

              <strong>
                {matchResult?.match_percentage !== undefined
                  ? `${matchResult.match_percentage}%`
                  : "--"}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              🧠
            </div>

            <div>
              <span>Skills Found</span>

              <strong>
                {resumeData?.skills?.length || 0}
              </strong>
            </div>
          </div>

        </div>

        {/* DASHBOARD CARDS */}

        <div className="dashboard-grid">

          <div className="large-card">

            <div className="card-title">
              <div>
                <h2>
                  Resume Health
                </h2>

                <p>
                  Check how prepared your resume is.
                </p>
              </div>

              <span className="card-icon">
                📊
              </span>
            </div>

            {atsResult ? (
              <div className="resume-health">

                <div className="big-score">
                  <strong>
                    {atsResult.ats_score}
                  </strong>

                  <span>/100</span>
                </div>

                <div className="score-status">
                  {atsResult.assessment_level ||
                    getScoreLabel(
                      atsResult.ats_score
                    )}
                </div>

                <button
                  className="secondary-btn"
                  onClick={() =>
                    setActivePage(
                      "Resume Analyzer"
                    )
                  }
                >
                  View Analysis →
                </button>

              </div>
            ) : (
              <div className="empty-dashboard">

                <div>
                  📄
                </div>

                <h3>
                  No resume analysis yet
                </h3>

                <p>
                  Upload your resume and run an
                  ATS analysis.
                </p>

                <button
                  className="primary-btn"
                  onClick={() =>
                    setActivePage(
                      "Resume Analyzer"
                    )
                  }
                >
                  Analyze Resume
                </button>

              </div>
            )}

          </div>

          <div className="large-card">

            <div className="card-title">
              <div>
                <h2>
                  Career Readiness
                </h2>

                <p>
                  Your current application progress.
                </p>
              </div>

              <span className="card-icon">
                🚀
              </span>
            </div>

            <div className="readiness-list">

              <div>
                <span>
                  Resume
                </span>

                <b
                  className={
                    resumeData
                      ? "complete"
                      : "pending"
                  }
                >
                  {resumeData
                    ? "✓ Ready"
                    : "Pending"}
                </b>
              </div>

              <div>
                <span>
                  ATS Analysis
                </span>

                <b
                  className={
                    atsResult
                      ? "complete"
                      : "pending"
                  }
                >
                  {atsResult
                    ? "✓ Completed"
                    : "Pending"}
                </b>
              </div>

              <div>
                <span>
                  Job Match
                </span>

                <b
                  className={
                    matchResult
                      ? "complete"
                      : "pending"
                  }
                >
                  {matchResult
                    ? "✓ Completed"
                    : "Pending"}
                </b>
              </div>

              <div>
                <span>
                  Mock Interview
                </span>

                <b className="pending">
                  Coming Soon
                </b>
              </div>

            </div>

          </div>

        </div>

        {/* FEATURES */}

        <div className="section-heading">

          <h2>
            What can HireMate AI do?
          </h2>

          <p>
            Everything you need for your job
            application journey.
          </p>

        </div>

        <div className="feature-grid">

          <FeatureCard
            icon="📄"
            title="Resume Analyzer"
            description="Get an ATS score and detailed resume feedback."
            onClick={() =>
              setActivePage(
                "Resume Analyzer"
              )
            }
          />

          <FeatureCard
            icon="🎯"
            title="Job Match"
            description="Compare your resume against any job description."
            onClick={() =>
              setActivePage(
                "Job Match"
              )
            }
          />

          <FeatureCard
            icon="🤖"
            title="AI Career Assistant"
            description="Ask questions about your resume, skills and career."
            onClick={() =>
              setActivePage(
                "Career Assistant"
              )
            }
          />

          <FeatureCard
            icon="🎤"
            title="Mock Interview"
            description="Practice questions based on your resume and job."
            onClick={() =>
              setActivePage(
                "Mock Interview"
              )
            }
          />

          <FeatureCard
            icon="📚"
            title="Learning Roadmap"
            description="Find what skills you should learn next."
            onClick={() =>
              setActivePage(
                "Learning Roadmap"
              )
            }
          />

          <FeatureCard
            icon="💡"
            title="AI Recommendations"
            description="Get personalized suggestions to improve your applications."
            onClick={() =>
              setActivePage(
                "Resume Analyzer"
              )
            }
          />

        </div>

      </div>
    );
  };

  // ============================================================
  // RESUME ANALYZER
  // ============================================================

  const renderResumeAnalyzer = () => {
    return (
      <div className="page-content">

        <div className="page-header">

          <div>

            <p className="eyebrow">
              RESUME ANALYSIS
            </p>

            <h1>
              Resume Analyzer
            </h1>

            <p>
              Upload your resume and analyze its
              ATS compatibility.
            </p>

          </div>

        </div>

        {/* UPLOAD CARD */}

        <div className="upload-card">

          <div className="upload-icon">
            📄
          </div>

          <h2>
            {resumeData
              ? "Resume Ready for Analysis"
              : "Add Your Resume"}
          </h2>

          <p>
            Upload a PDF resume or paste your
            resume text.
          </p>

          <label className="upload-btn">

            {uploading
              ? "Processing..."
              : "Choose PDF Resume"}

            <input
              type="file"
              accept=".pdf"
              hidden
              disabled={uploading}
              onChange={(event) =>
                handleUpload(
                  event.target.files[0]
                )
              }
            />

          </label>

          <span className="upload-or">
            or
          </span>

          <button
            className="secondary-btn"
            onClick={() =>
              setShowPaste(!showPaste)
            }
          >
            Paste Resume Text
          </button>

          {showPaste && (
            <div className="paste-box">

              <textarea
                value={pastedResume}
                onChange={(event) =>
                  setPastedResume(
                    event.target.value
                  )
                }
                placeholder="Paste your complete resume text here..."
              />

              <button
                className="primary-btn"
                onClick={handlePastedResume}
                disabled={uploading}
              >
                {uploading
                  ? "Processing..."
                  : "Process Resume"}
              </button>

            </div>
          )}

        </div>

        {/* CURRENT RESUME */}

        {resumeData && (
          <div className="resume-preview-card">

            <div>

              <span className="eyebrow">
                CURRENT RESUME
              </span>

              <h2>
                {resumeData.filename}
              </h2>

              <p>
                {resumeData.skills?.length || 0}
                {" "}
                skills detected
              </p>

            </div>

            <button
              className="primary-btn"
              onClick={analyzeResume}
              disabled={analyzing}
            >
              {analyzing
                ? "Analyzing..."
                : "Analyze ATS Score"}
            </button>

          </div>
        )}

        {/* ATS RESULT */}

        {atsResult && (
          <div className="analysis-result">

            {/* SCORE */}

            <div className="result-score-card">

              <div className="score-circle">

                <strong>
                  {atsResult.ats_score}
                </strong>

                <span>
                  /100
                </span>

              </div>

              <div>

                <p className="eyebrow">
                  ATS SCORE
                </p>

                <h2>
                  {atsResult.assessment_level ||
                    getScoreLabel(
                      atsResult.ats_score
                    )}
                </h2>

                <p>
                  {atsResult.ats_compatibility ||
                    "Your resume has been analyzed for ATS compatibility."}
                </p>

                {atsResult.career_field && (
                  <p>
                    <strong>
                      Career Field:
                    </strong>{" "}
                    {atsResult.career_field}
                  </p>
                )}

              </div>

            </div>

            {/* SCORE BREAKDOWN */}

            {atsResult.score_breakdown && (
              <div className="analysis-section">

                <div className="section-title">

                  <span>
                    📊
                  </span>

                  <h2>
                    ATS Score Breakdown
                  </h2>

                </div>

                <div className="score-breakdown-grid">

                  <ScoreBreakdown
                    title="Keywords"
                    score={
                      atsResult.score_breakdown.keywords
                    }
                    max={25}
                  />

                  <ScoreBreakdown
                    title="Skills"
                    score={
                      atsResult.score_breakdown.skills
                    }
                    max={20}
                  />

                  <ScoreBreakdown
                    title="Experience"
                    score={
                      atsResult.score_breakdown.experience
                    }
                    max={20}
                  />

                  <ScoreBreakdown
                    title="Formatting"
                    score={
                      atsResult.score_breakdown.formatting
                    }
                    max={15}
                  />

                  <ScoreBreakdown
                    title="Education"
                    score={
                      atsResult.score_breakdown.education
                    }
                    max={10}
                  />

                  <ScoreBreakdown
                    title="Job Relevance"
                    score={
                      atsResult.score_breakdown.job_relevance
                    }
                    max={10}
                  />

                </div>

                <div className="score-total">

                  <span>
                    Total ATS Score
                  </span>

                  <strong>
                    {calculateBreakdownTotal(
                      atsResult.score_breakdown
                    )}
                    /100
                  </strong>

                </div>

              </div>
            )}

            {/* CAREER FIELD */}

            {atsResult.career_field && (
              <div className="analysis-section">

                <div className="section-title">
                  <span>🎓</span>

                  <h2>
                    Career Field
                  </h2>
                </div>

                <div className="analysis-item">
                  {atsResult.career_field}
                </div>

              </div>
            )}

            {/* DETECTED SECTIONS */}

            {atsResult.sections?.length > 0 && (
              <div className="analysis-section">

                <div className="section-title">
                  <span>📑</span>

                  <h2>
                    Detected Resume Sections
                  </h2>
                </div>

                <div className="skill-tags">

                  {atsResult.sections.map(
                    (section, index) => (
                      <span key={index}>
                        {typeof section === "string"
                          ? section
                          : section?.name ||
                            "Section"}
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

            {/* SKILLS */}

            {atsResult.skills?.length > 0 && (
              <div className="analysis-section">

                <div className="section-title">
                  <span>🧠</span>

                  <h2>
                    Detected Skills
                  </h2>
                </div>

                <div className="skill-tags">

                  {atsResult.skills.map(
                    (skill, index) => (
                      <span key={index}>
                        {skill}
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

            {/* STRENGTHS */}

            <AnalysisSection
              title="Strengths"
              icon="✓"
              className="strengths"
              items={atsResult.strengths}
            />

            {/* WEAKNESSES */}

            <AnalysisSection
              title="Weaknesses"
              icon="✗"
              className="weaknesses"
              items={atsResult.weaknesses}
            />

            {/* RECOMMENDATIONS */}

            <AnalysisSection
              title="AI Recommendations"
              icon="→"
              className="improvements"
              items={
                atsResult.recommendations ||
                atsResult.improvements
              }
            />

            {/* AI ASSESSMENT */}

            {atsResult.assessment && (
              <div className="analysis-section">

                <div className="section-title">
                  <span>🤖</span>

                  <h2>
                    AI Assessment
                  </h2>
                </div>

                <div className="analysis-item">
                  {atsResult.assessment}
                </div>

              </div>
            )}

            {/* EXPERIENCE */}

            {atsResult.experience?.length > 0 && (
              <AnalysisSection
                title="Experience"
                icon="💼"
                className="experience"
                items={atsResult.experience}
              />
            )}

            {/* EDUCATION */}

            {atsResult.education?.length > 0 && (
              <AnalysisSection
                title="Education"
                icon="🎓"
                className="education"
                items={atsResult.education}
              />
            )}

            {/* PROJECTS */}

            {atsResult.projects?.length > 0 && (
              <AnalysisSection
                title="Projects"
                icon="🛠️"
                className="projects"
                items={atsResult.projects}
              />
            )}

            {/* CERTIFICATIONS */}

            {atsResult.certifications?.length > 0 && (
              <AnalysisSection
                title="Certifications"
                icon="🏆"
                className="certifications"
                items={atsResult.certifications}
              />
            )}

            {/* ACHIEVEMENTS */}

            {atsResult.achievements?.length > 0 && (
              <AnalysisSection
                title="Achievements"
                icon="⭐"
                className="achievements"
                items={atsResult.achievements}
              />
            )}

            {/* VERIFIED QUANTIFIABLE EVIDENCE */}

            {atsResult.quantifiable_evidence?.length > 0 && (
              <AnalysisSection
                title="Verified Resume Evidence"
                icon="📈"
                className="evidence"
                items={
                  atsResult.quantifiable_evidence
                }
              />
            )}

          </div>
        )}

      </div>
    );
  };

  // ============================================================
  // JOB MATCH
  // ============================================================

  const renderJobMatch = () => {
    return (
      <div className="page-content">

        <div className="page-header">

          <div>

            <p className="eyebrow">
              CAREER MATCH
            </p>

            <h1>
              Job Match
            </h1>

            <p>
              Compare your resume with a specific
              job description.
            </p>

          </div>

        </div>

        {!resumeData && (
          <div className="notice-card">

            <span>
              ⚠️
            </span>

            <div>

              <strong>
                Resume required
              </strong>

              <p>
                Upload your resume before analyzing
                a job.
              </p>

            </div>

          </div>
        )}

        <div className="job-input-card">

          <label>
            Job Description
          </label>

          <textarea
            value={jobDescription}
            onChange={(event) =>
              setJobDescription(
                event.target.value
              )
            }
            placeholder="Paste the job description or job requirements here..."
          />

          <button
            className="primary-btn large-btn"
            onClick={analyzeJob}
            disabled={matching}
          >
            {matching
              ? "Analyzing Job..."
              : "Analyze Career Match"}
          </button>

        </div>

        {matchResult && (
          <div className="match-results">

            {/* MATCH SCORE */}

            <div className="match-score-card">

              <div className="match-circle">

                <strong>
                  {matchResult.match_percentage}%
                </strong>

              </div>

              <div>

                <p className="eyebrow">
                  CAREER MATCH
                </p>

                <h2>
                  {matchResult.match_percentage >= 80
                    ? "Strong Match"
                    : matchResult.match_percentage >= 60
                    ? "Moderate Match"
                    : "Needs Improvement"}
                </h2>

                <p>
                  {matchResult.matched_skills?.length || 0}
                  {" "}
                  skills matched out of{" "}
                  {matchResult.job_skills?.length || 0}
                  {" "}
                  identified job skills.
                </p>

              </div>

            </div>

            {/* MATCHED / MISSING */}

            <div className="skills-result-grid">

              <SkillResultCard
                title="Matched Skills"
                icon="✓"
                className="matched"
                skills={
                  matchResult.matched_skills
                }
              />

              <SkillResultCard
                title="Missing Skills"
                icon="⚠"
                className="missing"
                skills={
                  matchResult.missing_skills
                }
              />

            </div>

            {/* JOB SKILLS */}

            <div className="analysis-section">

              <div className="section-title">

                <span>
                  🎯
                </span>

                <h2>
                  Job Skills
                </h2>

              </div>

              <div className="skill-tags">

                {matchResult.job_skills?.map(
                  (skill, index) => (
                    <span key={index}>
                      {skill}
                    </span>
                  )
                )}

              </div>

            </div>

            {/* RECOMMENDATIONS */}

            {matchResult.recommendations?.length > 0 && (
              <div className="recommendation-box">

                <div className="section-title">

                  <span>
                    💡
                  </span>

                  <h2>
                    AI Recommendations
                  </h2>

                </div>

                {matchResult.recommendations.map(
                  (recommendation, index) => (
                    <div
                      className="recommendation-item"
                      key={index}
                    >
                      {recommendation}
                    </div>
                  )
                )}

              </div>
            )}

          </div>
        )}

      </div>
    );
  };

  // ============================================================
  // PLACEHOLDER
  // ============================================================

  const renderPlaceholder = (
    title,
    icon,
    description
  ) => {
    return (
      <div className="page-content">

        <div className="page-header">

          <div>

            <p className="eyebrow">
              HIREMATE AI
            </p>

            <h1>
              {icon} {title}
            </h1>

            <p>
              {description}
            </p>

          </div>

        </div>

        <div className="coming-soon-card">

          <div className="coming-icon">
            {icon}
          </div>

          <h2>
            {title}
          </h2>

          <p>
            This module will be built in the
            next development step.
          </p>

          <div className="coming-features">

            <span>
              AI Powered
            </span>

            <span>
              Resume Based
            </span>

            <span>
              Career Focused
            </span>

          </div>

        </div>

      </div>
    );
  };

  // ============================================================
  // PAGE ROUTER
  // ============================================================

  const renderPage = () => {
    switch (activePage) {

      case "Resume Analyzer":
        return renderResumeAnalyzer();

      case "Job Match":
        return renderJobMatch();

      case "Career Assistant":
        return renderPlaceholder(
          "AI Career Assistant",
          "🤖",
          "Ask questions about your resume, job match, skills and career."
        );

      case "Mock Interview":
        return renderPlaceholder(
          "Mock Interview",
          "🎤",
          "Practice interview questions based on your resume and target job."
        );

      case "Learning Roadmap":
        return renderPlaceholder(
          "Learning Roadmap",
          "📚",
          "Build a personalized roadmap for the skills you need to improve."
        );

      default:
        return renderDashboard();
    }
  };

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-logo">
            H
          </div>

          <div>

            <h2>
              HireMate
            </h2>

            <span>
              AI Career Assistant
            </span>

          </div>

        </div>

        <nav className="sidebar-nav">

          <p className="nav-label">
            MAIN
          </p>

          <NavItem
            icon="⌂"
            label="Dashboard"
            active={
              activePage === "Dashboard"
            }
            onClick={() =>
              setActivePage("Dashboard")
            }
          />

          <NavItem
            icon="📄"
            label="Resume Analyzer"
            active={
              activePage === "Resume Analyzer"
            }
            onClick={() =>
              setActivePage(
                "Resume Analyzer"
              )
            }
          />

          <NavItem
            icon="🎯"
            label="Job Match"
            active={
              activePage === "Job Match"
            }
            onClick={() =>
              setActivePage("Job Match")
            }
          />

          <p className="nav-label second">
            AI TOOLS
          </p>

          <NavItem
            icon="🤖"
            label="Career Assistant"
            active={
              activePage === "Career Assistant"
            }
            onClick={() =>
              setActivePage(
                "Career Assistant"
              )
            }
          />

          <NavItem
            icon="🎤"
            label="Mock Interview"
            active={
              activePage === "Mock Interview"
            }
            onClick={() =>
              setActivePage(
                "Mock Interview"
              )
            }
          />

          <NavItem
            icon="📚"
            label="Learning Roadmap"
            active={
              activePage === "Learning Roadmap"
            }
            onClick={() =>
              setActivePage(
                "Learning Roadmap"
              )
            }
          />

        </nav>

        <div className="sidebar-bottom">

          <div className="ai-status">

            <span className="status-dot"></span>

            <div>

              <strong>
                AI Engine
              </strong>

              <small>
                Ready to analyze
              </small>

            </div>

          </div>

        </div>

      </aside>

      {/* MAIN */}

      <main className="main-area">

        <header className="topbar">

          <div>

            <span className="breadcrumb">
              HireMate AI
            </span>

            <span className="breadcrumb-arrow">
              /
            </span>

            <span className="breadcrumb-current">
              {activePage}
            </span>

          </div>

          <div className="topbar-right">

            <span className="ai-badge">
              ✨ AI Powered
            </span>

            <div className="profile">

              <div className="profile-avatar">
                N
              </div>

              <div>

                <strong>
                  Naveen
                </strong>

                <span>
                  Job Seeker
                </span>

              </div>

            </div>

          </div>

        </header>

        {renderPage()}

      </main>

    </div>
  );
}


// ============================================================
// SCORE LABEL
// ============================================================

function getScoreLabel(score) {
  if (score >= 80) {
    return "Strong Resume";
  }

  if (score >= 60) {
    return "Needs Improvement";
  }

  return "Needs Attention";
}


// ============================================================
// SCORE BREAKDOWN TOTAL
// ============================================================

function calculateBreakdownTotal(breakdown) {
  if (!breakdown) {
    return 0;
  }

  return (
    Number(breakdown.keywords || 0) +
    Number(breakdown.skills || 0) +
    Number(breakdown.experience || 0) +
    Number(breakdown.formatting || 0) +
    Number(breakdown.education || 0) +
    Number(breakdown.job_relevance || 0)
  );
}


// ============================================================
// NAV ITEM
// ============================================================

function NavItem({
  icon,
  label,
  active,
  onClick,
}) {
  return (
    <button
      className={`nav-item ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <span className="nav-icon">
        {icon}
      </span>

      <span>
        {label}
      </span>
    </button>
  );
}


// ============================================================
// FEATURE CARD
// ============================================================

function FeatureCard({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      className="feature-card"
      onClick={onClick}
    >
      <div className="feature-icon">
        {icon}
      </div>

      <div>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>

      <span className="feature-arrow">
        →
      </span>
    </button>
  );
}


// ============================================================
// SCORE BREAKDOWN
// ============================================================

function ScoreBreakdown({
  title,
  score,
  max,
}) {
  const safeScore =
    Number.isFinite(Number(score))
      ? Number(score)
      : 0;

  const safeMax =
    Number.isFinite(Number(max))
      ? Number(max)
      : 1;

  const percentage = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (safeScore / safeMax) * 100
      )
    )
  );

  return (
    <div className="score-breakdown-card">

      <div className="score-breakdown-header">

        <span>
          {title}
        </span>

        <strong>
          {safeScore}/{safeMax}
        </strong>

      </div>

      <div className="score-breakdown-bar">

        <div
          className="score-breakdown-fill"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}


// ============================================================
// UNIVERSAL ANALYSIS ITEM RENDERER
// ============================================================

function renderAnalysisItem(item) {

  // STRING
  if (typeof item === "string") {
    return item;
  }

  // EMPTY / UNKNOWN
  if (!item || typeof item !== "object") {
    return "";
  }

  // CLAIM + EVIDENCE
  if (item.claim) {
    return (
      <div>

        <strong>
          {item.claim}
        </strong>

        {item.evidence && (
          <div className="evidence-text">
            Evidence: {item.evidence}
          </div>
        )}

      </div>
    );
  }

  // ACHIEVEMENT + EVIDENCE
  if (item.achievement) {
    return (
      <div>

        <strong>
          {item.achievement}
        </strong>

        {item.evidence && (
          <div className="evidence-text">
            Evidence: {item.evidence}
          </div>
        )}

      </div>
    );
  }

  // PROJECT / CERTIFICATION NAME
  if (item.name) {
    return (
      <div>

        <strong>
          {item.name}
        </strong>

        {item.evidence && (
          <div className="evidence-text">
            Evidence: {item.evidence}
          </div>
        )}

      </div>
    );
  }

  // EDUCATION
  if (
    item.degree ||
    item.institution
  ) {
    return (
      <div>

        {item.degree && (
          <strong>
            {item.degree}
          </strong>
        )}

        {item.institution && (
          <div>
            {item.institution}
          </div>
        )}

        {item.evidence && (
          <div className="evidence-text">
            Evidence: {item.evidence}
          </div>
        )}

      </div>
    );
  }

  // EXPERIENCE
  if (
    item.title ||
    item.organization
  ) {
    return (
      <div>

        {item.title && (
          <strong>
            {item.title}
          </strong>
        )}

        {item.organization && (
          <div>
            {item.organization}
          </div>
        )}

        {item.evidence && (
          <div className="evidence-text">
            Evidence: {item.evidence}
          </div>
        )}

      </div>
    );
  }

  // FALLBACK
  return (
    <div>
      {Object.entries(item).map(
        ([key, value]) => (
          <div key={key}>
            <strong>
              {key}:
            </strong>{" "}
            {String(value)}
          </div>
        )
      )}
    </div>
  );
}


// ============================================================
// ANALYSIS SECTION
// ============================================================

function AnalysisSection({
  title,
  icon,
  className,
  items,
}) {
  const safeItems = Array.isArray(items)
    ? items
    : [];

  return (
    <div
      className={`analysis-section ${
        className || ""
      }`}
    >

      <div className="section-title">

        <span>
          {icon}
        </span>

        <h2>
          {title}
        </h2>

      </div>

      <div className="analysis-list">

        {safeItems.length > 0 ? (
          safeItems.map(
            (item, index) => (
              <div
                key={index}
                className="analysis-item"
              >
                {renderAnalysisItem(item)}
              </div>
            )
          )
        ) : (
          <div className="analysis-item">
            No information available.
          </div>
        )}

      </div>

    </div>
  );
}


// ============================================================
// SKILL RESULT CARD
// ============================================================

function SkillResultCard({
  title,
  icon,
  className,
  skills,
}) {
  const safeSkills = Array.isArray(skills)
    ? skills
    : [];

  return (
    <div
      className={`skill-result-card ${
        className || ""
      }`}
    >

      <div className="section-title">

        <span>
          {icon}
        </span>

        <h2>
          {title}
        </h2>

      </div>

      <div className="skill-tags">

        {safeSkills.length > 0 ? (
          safeSkills.map(
            (skill, index) => (
              <span key={index}>
                {typeof skill === "string"
                  ? skill
                  : String(skill)}
              </span>
            )
          )
        ) : (
          <p>
            No skills found.
          </p>
        )}

      </div>

    </div>
  );
}


export default App;