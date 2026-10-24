import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://127.0.0.1:8000/api"
    : "/api")
  ).replace(/\/$/, "");
const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;

async function readAuthResponse(response) {
  const body = await response.text();

  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    if (!response.ok) {
      throw new Error(body || `${response.status} ${response.statusText}`);
    }
    throw new Error("The server returned an invalid response.");
  }
}

function App() {
  const [myProgress, setMyProgress] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const loadMyProgress = async () => {
  if (!authToken) return;

  setProgressLoading(true);
  setProgressError("");

  try {
    const response = await fetch(`${API_BASE_URL}/progress`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load progress.");
    }

    setMyProgress(data);
  } catch (error) {
    setProgressError(error.message || "Could not load progress.");
  } finally {
    setProgressLoading(false);
  }
};
  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("hiremate-theme") === "dark"
        ? "dark"
        : "light";
    } catch (error) {
      console.error("Could not load theme preference:", error);
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("hiremate-theme", theme);
    } catch (error) {
      console.error("Could not save theme preference:", error);
    }
  }, [theme]);

  const [authMode, setAuthMode] = useState("login");
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("hiremate-token") || ""
  );
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(60);
  useEffect(() => {
    if (!["verify", "reset"].includes(authMode) || resendCountdown <= 0) return;

  const timer = setTimeout(() => {
    setResendCountdown((previous) => previous - 1);
  }, 1000);

  return () => clearTimeout(timer);
}, [authMode, resendCountdown]);
  const [resendLoading, setResendLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const authRequestInProgress = useRef(false);
  const resendRequestInProgress = useRef(false);

  // Learning Roadmap state
  const [roadmapRole, setRoadmapRole] = useState("Python Developer");
  const [roadmapLevel, setRoadmapLevel] = useState("Beginner");
  const [roadmapDuration, setRoadmapDuration] = useState(8);
  const [roadmapHours, setRoadmapHours] = useState(10);
  const [roadmapData, setRoadmapData] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");

  const [roadmapCompletedTasks, setRoadmapCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "hiremate-roadmap-completed-tasks"
      );
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Could not load roadmap progress:", error);
      return {};
    }
  });

  const [resumeData, setResumeData] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [matchedJobDescription, setMatchedJobDescription] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [atsResult, setAtsResult] = useState(null);

  const [pastedResume, setPastedResume] = useState("");
  const [editedResumeText, setEditedResumeText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [resumeDragActive, setResumeDragActive] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [savingResume, setSavingResume] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [matching, setMatching] = useState(false);

  const [careerQuestion, setCareerQuestion] = useState("");
  const [careerSubmittedQuestion, setCareerSubmittedQuestion] = useState("");
  const [careerAnswer, setCareerAnswer] = useState("");
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState("");
  const careerRequestInProgress = useRef(false);
  const [aiStatus, setAiStatus] = useState("checking");

  const [interviewRole, setInterviewRole] = useState("Python Developer");
  const [interviewDifficulty, setInterviewDifficulty] =
    useState("Intermediate");
  const [interviewType, setInterviewType] = useState("Technical");
  const [interviewQuestionCount, setInterviewQuestionCount] = useState(5);

  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [interviewError, setInterviewError] = useState("");

  // Save roadmap progress automatically
  useEffect(() => {
    try {
      localStorage.setItem(
        "hiremate-roadmap-completed-tasks",
        JSON.stringify(roadmapCompletedTasks)
      );
    } catch (error) {
      console.error("Could not save roadmap progress:", error);
    }
  }, [roadmapCompletedTasks]);
  
  
const handleAuthSubmit = async (event) => {
  event.preventDefault();
  if (authRequestInProgress.current) return;

  authRequestInProgress.current = true;
  setAuthError("");
  setAuthSuccess("");
  setAuthLoading(true);

  try {
    const isRegister = authMode === "register";
    const isVerify = authMode === "verify";
    const isPasswordResetRequest = authMode === "forgot";
    const isPasswordResetConfirm = authMode === "reset";

    const endpoint = isRegister
      ? "/auth/register"
      : isVerify
        ? "/auth/verify-email"
        : isPasswordResetRequest
          ? "/auth/password-reset/request"
          : isPasswordResetConfirm
            ? "/auth/password-reset/confirm"
            : "/auth/login";

    const payload = isRegister
      ? {
          full_name: authName.trim(),
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
        }
      : isVerify
        ? {
            email: authEmail.trim().toLowerCase(),
            otp: authOtp.trim(),
          }
        : isPasswordResetRequest
          ? { email: authEmail.trim().toLowerCase() }
          : isPasswordResetConfirm
            ? {
                email: authEmail.trim().toLowerCase(),
                otp: authOtp.trim(),
                new_password: authPassword,
              }
        : {
            email: authEmail.trim().toLowerCase(),
            password: authPassword,
          };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await readAuthResponse(response);

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Request failed. Please check your details."
      );
    }

    if (isRegister) {
      setAuthEmail(payload.email);
      setAuthMode("verify");
      setAuthPassword("");
      setAuthOtp("");
      setResendCountdown(60);
      setAuthSuccess(
        data.message || "OTP sent to your email. Please check your inbox."
      );
      return;
    }

    if (isVerify) {
      setAuthMode("login");
      setAuthOtp("");
      setAuthPassword("");
      setAuthSuccess(
        data.message || "Email verified successfully! Please log in."
      );
      return;
    }

    if (isPasswordResetRequest) {
      setAuthMode("reset");
      setAuthOtp("");
      setAuthPassword("");
      setResendCountdown(60);
      setAuthSuccess(
        data.message || "If an eligible account exists, a reset code will be sent."
      );
      return;
    }

    if (isPasswordResetConfirm) {
      setAuthMode("login");
      setAuthOtp("");
      setAuthPassword("");
      setAuthSuccess(
        data.message || "Your password has been reset. You can now log in."
      );
      return;
    }

    localStorage.setItem("hiremate-token", data.access_token);
    setAuthToken(data.access_token);
    setAuthUser(data.user);
    setAuthPassword("");
    setActivePage("Dashboard");
  } catch (error) {
    setAuthError(error.message || "Could not connect to the server.");
  } finally {
    authRequestInProgress.current = false;
    setAuthLoading(false);
  }
};

  const handleLogout = () => {
    localStorage.removeItem("hiremate-token");
    setAuthToken("");
    setAuthUser(null);
    setAuthPassword("");
    setAuthMode("login");
    setActivePage("Dashboard");
  };
  
  useEffect(() => {
    if (!authToken) return;

    let cancelled = false;

    fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Session expired.");
        }

        if (!cancelled) {
          setAuthUser(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("hiremate-token");
          setAuthToken("");
          setAuthUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);


  // Check backend health
  useEffect(() => {
    let active = true;

    fetch(`${API_BASE_URL}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend health check failed.");
        }
        return response.json();
      })
      .then((data) => {
        if (active) {
          setAiStatus(data.ai?.configured ? "configured" : "not-configured");
        }
      })
      .catch(() => {
        if (active) {
          setAiStatus("unavailable");
        }
      });

    return () => {
      active = false;
    };
  }, []);
  

const handleResendOtp = async () => {
  if (
    resendCountdown > 0 ||
    resendLoading ||
    authLoading ||
    resendRequestInProgress.current
  ) return;

  resendRequestInProgress.current = true;
  setResendLoading(true);
  setAuthError("");
  setAuthSuccess("");

  try {
    const endpoint = authMode === "reset"
      ? "/auth/password-reset/request"
      : "/auth/resend-otp";
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: authEmail.trim().toLowerCase(),
      }),
    });

    const data = await readAuthResponse(response);

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Could not resend OTP."
      );
    }

    setAuthError("");
    setAuthSuccess(
      data.message || "A new code has been sent to your email."
    );
    setResendCountdown(60);
    setAuthOtp("");
  } catch (error) {
    setAuthError(error.message || "Could not connect to the server.");
  } finally {
    resendRequestInProgress.current = false;
    setResendLoading(false);
  }
};

  // ============================================================
  // RESUME UPLOAD
  // ============================================================

  const handleUpload = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF resume.");
      return;
    }

    if (file.size > MAX_RESUME_FILE_SIZE) {
      alert("PDF resumes must be 10 MiB or smaller.");
      return;
    }

    try {
      setUploading(true);
      setAtsResult(null);
      setMatchResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE_URL}/resume/upload`,
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
      setEditedResumeText(data.text || "");
      // Save resume upload activity for this logged-in user
try {
  const progressResponse = await fetch(`${API_BASE_URL}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      feature: "Resume Analyzer",
      activity_type: "resume_uploaded",
      details: {
        filename: data.filename || file.name,
        skills_detected: data.skills?.length || 0,
      },
    }),
  });

  if (progressResponse.ok) {
    await loadMyProgress();
  } else {
    console.error(
      "Could not save resume progress:",
      await progressResponse.text()
    );
  }
} catch (progressError) {
  console.error("Progress tracking error:", progressError);
}
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
        `${API_BASE_URL}/resume/paste`,
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
      setEditedResumeText(data.text || "");
      setShowPaste(false);
      setPastedResume("");
    } catch (error) {
      console.error("Paste error:", error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveReviewedResume = async () => {
    if (!editedResumeText.trim()) {
      alert("Resume text cannot be empty.");
      return;
    }

    try {
      setSavingResume(true);
      const response = await fetch(`${API_BASE_URL}/resume/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resume_text: editedResumeText }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not save reviewed resume text.");
      }

      setResumeData(data);
      setEditedResumeText(data.text || "");
      setAtsResult(null);
      setMatchResult(null);
    } catch (error) {
      console.error("Resume review error:", error);
      alert(error.message);
    } finally {
      setSavingResume(false);
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
    if (editedResumeText !== (resumeData.text || "")) {
      alert("Save your reviewed resume text before analyzing it.");
      return;
    }

    try {
      setAnalyzing(true);

      const response = await fetch(
        `${API_BASE_URL}/resume/analyze`,
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
        `${API_BASE_URL}/job/match`,
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
      setMatchedJobDescription(jobDescription);
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
      <div className="page-content dashboard-content">

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
                {atsResult?.ats_score != null
                  ? `${atsResult.ats_score}/100`
                  : atsResult
                    ? "PDF needed"
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
                    {atsResult.ats_score ?? "N/A"}
                  </strong>

                  {atsResult.ats_score != null && <span>/100</span>}
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
      <div className="page-content resume-analyzer-page">

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

        <div
          className={`upload-card resume-upload-card ${
            resumeDragActive ? "is-dragging" : ""
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!uploading) setResumeDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!uploading) setResumeDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setResumeDragActive(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setResumeDragActive(false);
            if (!uploading) handleUpload(event.dataTransfer.files[0]);
          }}
        >

          <div className="upload-icon">
            📄
          </div>

          <h2>
            {resumeData
              ? "Resume Ready for Analysis"
              : "Add Your Resume"}
          </h2>

          <p>
            Drop a PDF here, choose one below, or paste your resume text.
          </p>

          <p className="resume-upload-guidance">
            PDF only · Maximum file size 10 MiB
          </p>

          <label className="upload-btn">

            {uploading
              ? "Processing..."
              : "Choose PDF Resume"}

            <input
              type="file"
              accept=".pdf"
              disabled={uploading}
              aria-label="Choose a PDF resume"
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
            <div className="paste-box resume-paste-box">

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
          <div className="resume-preview-card resume-current-card">

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
              disabled={
                analyzing ||
                editedResumeText !== (resumeData.text || "")
              }
            >
              {analyzing
                ? "Analyzing..."
                : editedResumeText !== (resumeData.text || "")
                  ? "Save reviewed text first"
                  : "Analyze Resume"}
            </button>

          </div>
        )}

        {resumeData && (
          <details className="resume-text-review">
            <summary>Review and correct extracted resume text</summary>
            <p>
              Check the extracted text before analysis. Changes clear previous
              scores so they can be recalculated from the reviewed text.
            </p>
            <textarea
              aria-label="Review extracted resume text"
              value={editedResumeText}
              maxLength={100000}
              onChange={(event) => setEditedResumeText(event.target.value)}
            />
            <button
              className="secondary-btn"
              onClick={saveReviewedResume}
              disabled={
                savingResume ||
                editedResumeText === (resumeData.text || "")
              }
            >
              {savingResume ? "Saving..." : "Save reviewed text"}
            </button>
          </details>
        )}

        {/* ATS RESULT */}

        {atsResult && (
          <div className="analysis-result">

            {/* SCORE */}

            <div className="result-score-card resume-result-score-card">

              <div className="score-circle">

                <strong>
                  {atsResult.ats_score ?? "N/A"}
                </strong>

                {atsResult.ats_score != null && <span>/100</span>}

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
                  {atsResult.ats_readability?.message ||
                    "ATS-style readability could not be assessed."}
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

            {atsResult.ai_message && (
              <div className="notice-card" role="status">
                <span>ℹ️</span>
                <div>
                  <strong>
                    {atsResult.ai_status === "not_configured"
                      ? "AI features need setup"
                      : "AI feedback unavailable"}
                  </strong>
                  <p>{atsResult.ai_message}</p>
                </div>
              </div>
            )}

            <div className="analysis-section quality-score-section">
              <div className="section-title">
                <span>✍️</span>
                <h2>Resume Content Quality</h2>
              </div>
              <div className="quality-score-summary">
                <strong className="quality-score-value">
                  {atsResult.resume_quality?.score ?? "--"}/100
                </strong>
                <span className="quality-score-message">
                  {atsResult.resume_quality?.message}
                </span>
              </div>
              <div className="score-breakdown-grid">
                {Object.entries(
                  atsResult.resume_quality?.categories || {}
                ).map(([key, category]) => (
                  <ScoreBreakdown
                    key={key}
                    title={`${category.label} · ${category.weight}%`}
                    score={category.score}
                    max={100}
                  />
                ))}
              </div>
            </div>

            {/* SCORE BREAKDOWN */}

            {atsResult.ats_readability?.status === "scored" && (
              <div className="analysis-section ats-score-breakdown-section">

                <div className="section-title">

                  <span>
                    📊
                  </span>

                  <h2>
                    ATS Score Breakdown
                  </h2>

                </div>

                <div className="score-breakdown-grid ats-score-breakdown-grid">
                  {Object.entries(
                    atsResult.ats_readability.categories
                  ).map(([key, category]) => (
                    <ScoreBreakdown
                      key={key}
                      title={`${category.label} · ${category.weight}%`}
                      score={category.score}
                      max={100}
                    />
                  ))}
                </div>

                <div className="score-total ats-readability-summary">

                  <span>ATS-style readability estimate</span>

                  <strong>
                    {atsResult.ats_score}
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
      <div className="page-content job-match-page">

        <div className="page-header">

          <div>

            <p className="eyebrow">
              CAREER MATCH
            </p>

            <h1>
              Job Match
            </h1>

            <p>
              See how your resume’s detected skills align with a role’s
              requirements.
            </p>

          </div>

        </div>

        {!resumeData && (
          <div className="notice-card job-match-notice">

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

        <div
          className="job-input-card job-match-input-card"
          aria-busy={matching}
        >

          <div className="job-match-form-heading">
            <span className="job-match-step">01</span>
            <div>
              <h2>Compare with a job description</h2>
              <p>Paste role details to identify overlapping and missing skills.</p>
            </div>
          </div>

          <label htmlFor="job-description">
            Job description
          </label>

          <textarea
            id="job-description"
            className="job-description-input"
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
            aria-live="polite"
          >
            {matching
              ? "Analyzing match..."
              : "Analyze Career Match"}
          </button>

          {matching && (
            <p className="job-match-loading" role="status">
              Comparing detected resume skills with the job requirements…
            </p>
          )}

        </div>

        {matchResult && (
          <div className="match-results">

            <div className="job-match-overview">
              {/* MATCH SCORE */}

              <div className="match-score-card job-match-score-card">

                <div className="match-circle">

                  <strong>
                    {matchResult.match_percentage}%
                  </strong>

                </div>

                <div className="job-match-score-copy">

                  <p className="eyebrow">
                    RESUME SKILL MATCH
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

                  <div
                    className="job-match-progress-track"
                    role="progressbar"
                    aria-label="Resume skill match"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={matchResult.match_percentage}
                  >
                    <span
                      className="job-match-progress-fill"
                      style={{
                        width: `${matchResult.match_percentage}%`,
                      }}
                    />
                  </div>

                </div>

              </div>

              <section className="job-target-card">
                <span className="job-target-label">ANALYZED ROLE</span>
                <h2>Job description</h2>
                <details className="job-target-description">
                  <summary>View submitted description</summary>
                  <p>{matchedJobDescription}</p>
                </details>
              </section>
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
  
  const askCareerAssistant = async (
    event,
    submittedQuestion = careerQuestion
  ) => {
    event?.preventDefault();

    const question = submittedQuestion.trim();
    if (!question || careerRequestInProgress.current) return;

    careerRequestInProgress.current = true;
    setCareerLoading(true);
    setCareerError("");
    setCareerAnswer("");
    setCareerSubmittedQuestion(question);
    setCareerQuestion("");

    try {
      const response = await fetch(`${API_BASE_URL}/career/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to get an AI response."
        );
      }

      setCareerAnswer(data.answer || "No answer received.");
    } catch (error) {
      setCareerError(error.message || "Could not connect to the backend.");
    } finally {
      careerRequestInProgress.current = false;
      setCareerLoading(false);
    }
  };

  const renderCareerAssistant = () => (
    <div className="page-content career-assistant-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">HIREMATE AI</p>
          <h1>AI Career Assistant</h1>
          <p>Practical career guidance, grounded in your resume when relevant.</p>
        </div>
      </div>

      <section className="career-chat-shell" aria-label="AI Career Assistant">
        <header className="career-chat-header">
          <span className="career-assistant-mark" aria-hidden="true">AI</span>
          <div className="career-chat-heading">
            <h2>HireMate Career Assistant</h2>
            <p>Resume advice, interview preparation, and career planning</p>
          </div>
          <div className={`career-chat-status ${aiStatus}`} role="status">
            <span className={`status-dot ${aiStatus}`} aria-hidden="true" />
            <span>
              {aiStatus === "configured"
                ? "Groq connected"
                : aiStatus === "not-configured"
                  ? "AI setup needed"
                  : aiStatus === "unavailable"
                    ? "Backend unavailable"
                    : "Checking connection"}
            </span>
          </div>
        </header>

        <div className="career-chat-messages" aria-live="polite">
          {!careerSubmittedQuestion && !careerAnswer && !careerError && !careerLoading ? (
            <div className="career-chat-welcome">
              <span className="career-welcome-mark" aria-hidden="true">✦</span>
              <h3>What would you like to work on?</h3>
              <p>
                Ask a career question for practical advice based on your resume,
                skills, and goals.
              </p>
              <div className="career-suggested-prompts" aria-label="Suggested questions">
                {[
                  "Help me improve my resume.",
                  "Prepare me for a Python interview.",
                  "Find skills I need to learn for my target role.",
                  "Help me prepare for HR interview questions.",
                ].map((prompt) => (
                  <button
                    className="career-suggested-prompt"
                    key={prompt}
                    type="button"
                    disabled={careerLoading}
                    onClick={() => askCareerAssistant(null, prompt)}
                  >
                    <span aria-hidden="true">↗</span>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="career-chat-thread">
              {careerSubmittedQuestion && (
                <article className="career-message career-message-user">
                  <div className="career-message-meta">
                    <span>You</span>
                  </div>
                  <p>{careerSubmittedQuestion}</p>
                </article>
              )}

              {(careerLoading || careerAnswer || careerError) && (
                <article className="career-message career-message-assistant">
                  <div className="career-message-meta">
                    <span className="career-message-avatar" aria-hidden="true">AI</span>
                    <span>HireMate AI</span>
                  </div>
                  {careerLoading ? (
                    <div className="career-thinking" role="status">
                      <span className="career-thinking-dots" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      Preparing career guidance…
                    </div>
                  ) : careerError ? (
                    <div className="career-assistant-error" role="alert">
                      <p>{careerError}</p>
                      <button
                        className="career-retry-button"
                        type="button"
                        disabled={careerLoading}
                        onClick={() =>
                          askCareerAssistant(null, careerSubmittedQuestion)
                        }
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div className="career-response-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {careerAnswer}
                      </ReactMarkdown>
                    </div>
                  )}
                </article>
              )}
            </div>
          )}
        </div>

        <form
          className="career-assistant-form"
          onSubmit={askCareerAssistant}
        >
          <label className="career-composer-label" htmlFor="career-question">
            Your question
          </label>
          <div className="career-composer">
            <textarea
              id="career-question"
              className="career-question-input"
              value={careerQuestion}
              onChange={(event) => setCareerQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask about resumes, interviews, skills, or career goals…"
              rows={2}
              maxLength={4000}
              required
              disabled={careerLoading}
              aria-describedby="career-composer-hint"
            />

            <button
              type="submit"
              className="primary-btn career-send-button"
              disabled={careerLoading || !careerQuestion.trim()}
              aria-label={careerLoading ? "Sending question" : "Send question"}
            >
              {careerLoading ? "Sending…" : "Send"}
              {!careerLoading && <span aria-hidden="true">↑</span>}
            </button>
          </div>
          <div className="career-composer-footer">
            <span id="career-composer-hint">
              Enter to send · Shift+Enter for a new line
            </span>
            <span>{careerQuestion.length}/4000</span>
          </div>
        </form>
      </section>
    </div>
  );
  
  const startMockInterview = async (event) => {
    event.preventDefault();

    if (!interviewRole.trim() || interviewLoading) return;

    setInterviewLoading(true);
    setInterviewError("");
    setInterviewFeedback(null);
    setInterviewQuestions([]);
    setCurrentQuestionIndex(0);
    setInterviewAnswer("");

    try {
      const response = await fetch(`${API_BASE_URL}/mock-interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: interviewRole.trim(),
          difficulty: interviewDifficulty,
          interview_type: interviewType,
          question_count: Number(interviewQuestionCount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not start the interview.");
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("The AI did not return any interview questions.");
      }

      setInterviewQuestions(data.questions);
    } catch (error) {
      setInterviewError(error.message || "Unable to connect to the backend.");
    } finally {
      setInterviewLoading(false);
    }
  };

  const evaluateMockAnswer = async () => {
    const question = interviewQuestions[currentQuestionIndex];

    if (!question || !interviewAnswer.trim() || evaluationLoading) return;

    setEvaluationLoading(true);
    setInterviewError("");
    setInterviewFeedback(null);

    try {
      const response = await fetch(`${API_BASE_URL}/mock-interview/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: interviewRole.trim(),
          question: question.question,
          answer: interviewAnswer.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not evaluate your answer.");
      }

      setInterviewFeedback(data);
    } catch (error) {
      setInterviewError(error.message || "Unable to evaluate your answer.");
    } finally {
      setEvaluationLoading(false);
    }
  };

  const moveToNextInterviewQuestion = () => {
    setCurrentQuestionIndex((index) => index + 1);
    setInterviewAnswer("");
    setInterviewFeedback(null);
    setInterviewError("");
  };

  const renderMockInterview = () => {
    const currentQuestion = interviewQuestions[currentQuestionIndex];
    const interviewFinished =
      interviewQuestions.length > 0 && !currentQuestion;

    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">AI INTERVIEW PRACTICE</p>
            <h1>🎤 Mock Interview</h1>
            <p>Practice answering questions and receive AI-powered feedback.</p>
          </div>
        </div>

        {interviewQuestions.length === 0 && (
          <div className="coming-soon-card">
            <h2>Set up your interview</h2>
            <p>Choose your target role and start your practice session.</p>

            <form onSubmit={startMockInterview}>
              <label htmlFor="interview-role">Target job role</label>
              <input
                id="interview-role"
                value={interviewRole}
                onChange={(event) => setInterviewRole(event.target.value)}
                placeholder="e.g. Python Developer"
                minLength={2}
                maxLength={150}
                required
                disabled={interviewLoading}
                style={{ display: "block", width: "100%", margin: "8px 0 16px", padding: "12px", boxSizing: "border-box" }}
              />

              <label htmlFor="interview-difficulty">Difficulty</label>
              <select
                id="interview-difficulty"
                value={interviewDifficulty}
                onChange={(event) => setInterviewDifficulty(event.target.value)}
                disabled={interviewLoading}
                style={{ display: "block", width: "100%", margin: "8px 0 16px", padding: "12px" }}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>

              <label htmlFor="interview-type">Interview type</label>
              <select
                id="interview-type"
                value={interviewType}
                onChange={(event) => setInterviewType(event.target.value)}
                disabled={interviewLoading}
                style={{ display: "block", width: "100%", margin: "8px 0 16px", padding: "12px" }}
              >
                <option value="Technical">Technical</option>
                <option value="HR">HR</option>
                <option value="Mixed">Mixed</option>
              </select>

              <label htmlFor="interview-count">Number of questions</label>
              <select
                id="interview-count"
                value={interviewQuestionCount}
                onChange={(event) => setInterviewQuestionCount(Number(event.target.value))}
                disabled={interviewLoading}
                style={{ display: "block", width: "100%", margin: "8px 0 20px", padding: "12px" }}
              >
                <option value={3}>3 questions</option>
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
              </select>

              <button
                className="primary-btn"
                type="submit"
                disabled={interviewLoading || !interviewRole.trim()}
              >
                {interviewLoading ? "Generating questions..." : "Start Interview"}
              </button>
            </form>
          </div>
        )}

        {interviewError && (
          <div className="notice-card" role="alert">
            <span>⚠️</span>
            <div>{interviewError}</div>
          </div>
        )}

        {currentQuestion && (
          <div className="coming-soon-card">
            <p className="eyebrow">
              QUESTION {currentQuestionIndex + 1} OF {interviewQuestions.length}
            </p>

            <h2>{currentQuestion.question}</h2>

            <p>
              Topic: {currentQuestion.topic || "General"} · Difficulty:{" "}
              {currentQuestion.difficulty || interviewDifficulty}
            </p>

            <label htmlFor="interview-answer">Your answer</label>
            <textarea
              id="interview-answer"
              value={interviewAnswer}
              onChange={(event) => setInterviewAnswer(event.target.value)}
              placeholder="Write your answer here..."
              rows={7}
              maxLength={6000}
              disabled={evaluationLoading || Boolean(interviewFeedback)}
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                margin: "12px 0",
                font: "inherit",
                borderRadius: "10px",
              }}
            />

            {!interviewFeedback && (
              <button
                className="primary-btn"
                onClick={evaluateMockAnswer}
                disabled={evaluationLoading || !interviewAnswer.trim()}
              >
                {evaluationLoading ? "Evaluating..." : "Evaluate My Answer"}
              </button>
            )}

            {interviewFeedback && (
              <div style={{ textAlign: "left", marginTop: "24px" }}>
                <h2>
                  Score: {interviewFeedback.score}/10
                </h2>
                <h3>{interviewFeedback.verdict}</h3>

                <h3>Strengths</h3>
                {Array.isArray(interviewFeedback.strengths) &&
                  interviewFeedback.strengths.map((item, index) => (
                    <p key={index}>✅ {item}</p>
                  ))}

                <h3>Areas to improve</h3>
                {Array.isArray(interviewFeedback.improvements) &&
                  interviewFeedback.improvements.map((item, index) => (
                    <p key={index}>💡 {item}</p>
                  ))}

                <h3>Sample answer</h3>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                  {interviewFeedback.sample_answer}
                </div>

                <h3>Overall feedback</h3>
                <p>{interviewFeedback.feedback}</p>

                <button
                  className="primary-btn"
                  style={{ marginTop: "16px" }}
                  onClick={
                    currentQuestionIndex < interviewQuestions.length - 1
                      ? moveToNextInterviewQuestion
                      : () => {
                          setInterviewQuestions([]);
                          setCurrentQuestionIndex(0);
                          setInterviewAnswer("");
                          setInterviewFeedback(null);
                          setInterviewError("");
                        }
                  }
                >
                  {currentQuestionIndex < interviewQuestions.length - 1
                    ? "Next Question →"
                    : "Finish & Start Again"}
                </button>
              </div>
            )}
          </div>
        )}

        {interviewFinished && (
          <div className="coming-soon-card">
            <h2>🎉 Interview completed!</h2>
            <p>You have answered all the questions in this session.</p>
            <button
              className="primary-btn"
              onClick={() => {
                setInterviewQuestions([]);
                setCurrentQuestionIndex(0);
                setInterviewAnswer("");
                setInterviewFeedback(null);
                setInterviewError("");
              }}
            >
              Start Another Interview
            </button>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // PAGE ROUTER
  // ============================================================


const renderLearningRoadmap = () => {
  const generateRoadmap = async (event) => {
    event.preventDefault();

    if (!roadmapRole.trim() || roadmapLoading) return;

    setRoadmapLoading(true);
    setRoadmapError("");

    try {
      const response = await fetch(`${API_BASE_URL}/roadmap/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: roadmapRole.trim(),
          current_level: roadmapLevel,
          duration_weeks: Number(roadmapDuration),
          hours_per_week: Number(roadmapHours),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to generate the roadmap."
        );
      }

      if (!Array.isArray(data.weeks)) {
        throw new Error("The response does not contain weekly plans.");
      }

      setRoadmapData(data);
      setRoadmapCompletedTasks({});
    } catch (error) {
      setRoadmapError(error.message || "Could not connect to the backend.");
    } finally {
      setRoadmapLoading(false);
    }
  };

  const allTasks = (roadmapData?.weeks || []).flatMap((week) =>
    (Array.isArray(week.tasks) ? week.tasks : []).map((task, index) => ({
      key: `${week.week}-${index}`,
      task,
    }))
  );

  const completedCount = allTasks.filter(
    (task) => roadmapCompletedTasks[task.key]
  ).length;

  const progress = allTasks.length
    ? Math.round((completedCount / allTasks.length) * 100)
    : 0;

  return (
    <div className="page-content learning-roadmap-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">PERSONALIZED LEARNING</p>
          <h1>📚 Learning Roadmap</h1>
          <p>Create a weekly learning plan for your target career.</p>
        </div>
      </div>

      <div className="coming-soon-card">
        <h2>Build your learning plan</h2>

        <form onSubmit={generateRoadmap}>
          <label htmlFor="roadmap-role">Target job role</label>
          <input
            id="roadmap-role"
            value={roadmapRole}
            onChange={(event) => setRoadmapRole(event.target.value)}
            placeholder="e.g. Python Developer"
            maxLength={150}
            required
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              margin: "8px 0 16px",
            }}
          />

          <label htmlFor="roadmap-level">Current skill level</label>
          <select
            id="roadmap-level"
            value={roadmapLevel}
            onChange={(event) => setRoadmapLevel(event.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              margin: "8px 0 16px",
            }}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>

          <label htmlFor="roadmap-duration">Duration (weeks)</label>
          <input
            id="roadmap-duration"
            type="number"
            min="1"
            max="24"
            value={roadmapDuration}
            onChange={(event) => setRoadmapDuration(event.target.value)}
            required
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              margin: "8px 0 16px",
            }}
          />

          <label htmlFor="roadmap-hours">Study hours per week</label>
          <input
            id="roadmap-hours"
            type="number"
            min="1"
            max="60"
            value={roadmapHours}
            onChange={(event) => setRoadmapHours(event.target.value)}
            required
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              margin: "8px 0 20px",
            }}
          />

          <button
            className="primary-btn"
            type="submit"
            disabled={roadmapLoading || !roadmapRole.trim()}
          >
            {roadmapLoading ? "Generating roadmap..." : "Generate Roadmap"}
          </button>
        </form>

        {roadmapError && (
          <p className="roadmap-error" role="alert">
            {roadmapError}
          </p>
        )}
      </div>

      {roadmapData && (
        <div style={{ marginTop: "24px" }}>
          <div className="coming-soon-card">
            <h2>{roadmapData.title || "Your Learning Roadmap"}</h2>
            <p>{roadmapData.summary}</p>
            <p>
              <strong>Target role:</strong>{" "}
              {roadmapData.target_role || roadmapRole}
            </p>
            <p>
              <strong>Duration:</strong>{" "}
              {roadmapData.duration_weeks || roadmapDuration} weeks
              {" · "}
              <strong>Study time:</strong>{" "}
              {roadmapData.hours_per_week || roadmapHours} hours/week
            </p>

            <h3>Overall progress: {progress}%</h3>
            <div
              className="roadmap-progress-track"
              role="progressbar"
              aria-label="Learning roadmap progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="roadmap-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p>
              {completedCount} of {allTasks.length} tasks completed
            </p>
          </div>

          {(roadmapData.weeks || []).map((week) => (
            <div
              className="coming-soon-card"
              key={week.week}
              style={{ marginTop: "16px", textAlign: "left" }}
            >
              <h2>
                Week {week.week}: {week.title}
              </h2>

              <h3>Topics to learn</h3>
              <ul>
                {(Array.isArray(week.topics) ? week.topics : []).map(
                  (topic, index) => (
                    <li key={index}>{topic}</li>
                  )
                )}
              </ul>

              <h3>Learning tasks</h3>
              {(Array.isArray(week.tasks) ? week.tasks : []).map(
                (task, index) => {
                  const taskKey = `${week.week}-${index}`;

                  return (
                    <label
                      key={taskKey}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        margin: "12px 0",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(roadmapCompletedTasks[taskKey])}
                        onChange={(event) =>
                          setRoadmapCompletedTasks((previous) => ({
                            ...previous,
                            [taskKey]: event.target.checked,
                          }))
                        }
                        style={{ marginTop: "5px" }}
                      />
                      <span
                        style={{
                          textDecoration: roadmapCompletedTasks[taskKey]
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {task}
                      </span>
                    </label>
                  );
                }
              )}

              {week.project && (
                <>
                  <h3>Mini project</h3>
                  <p>{week.project}</p>
                </>
              )}

              {Array.isArray(week.resources) && week.resources.length > 0 && (
                <>
                  <h3>Learning resources</h3>
                  <ul>
                    {week.resources.map((resource, index) => (
                      <li key={index}>
                        {resource.url &&
                        /^https?:\/\//i.test(resource.url) ? (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {resource.name || resource.url}
                          </a>
                        ) : (
                          resource.name || String(resource)
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const renderAuthPage = () => (
  <div
    className={`auth-page ${
      authMode === "login" || authMode === "register"
        ? "auth-page-split"
        : ""
    } ${authMode === "login" ? "auth-page-login" : ""} ${
      authMode === "register" ? "auth-page-register" : ""
    }`}
  >
    {(authMode === "login" || authMode === "register") && (
      <aside className="auth-brand-panel" aria-label="About HireMate AI">
        <div className="auth-brand">
          <span className="auth-brand-logo" aria-hidden="true">H</span>
          <span>HireMate <strong>AI</strong></span>
        </div>

        {authMode === "login" ? (
          <>
            <div className="auth-login-promo-copy">
              <p className="auth-login-eyebrow">YOUR CAREER, IN FOCUS</p>
              <h2>Your next opportunity starts here.</h2>
              <p>
                Make every application count with practical tools for your
                next career move.
              </p>
            </div>

            <div className="auth-login-cards" aria-label="HireMate AI tools">
              <article className="auth-login-float-card auth-login-card-resume">
                <span className="auth-login-card-icon" aria-hidden="true">R</span>
                <span>
                  <strong>Resume Insights</strong>
                  <small>Skills and improvement suggestions</small>
                </span>
              </article>
              <article className="auth-login-float-card auth-login-card-match">
                <span className="auth-login-card-icon" aria-hidden="true">M</span>
                <span>
                  <strong>Job Match</strong>
                  <small>Skills aligned with a target role</small>
                </span>
              </article>
              <article className="auth-login-float-card auth-login-card-interview">
                <span className="auth-login-card-icon" aria-hidden="true">I</span>
                <span>
                  <strong>Interview Prep</strong>
                  <small>Practice and preparation progress</small>
                </span>
              </article>
            </div>

            <div className="auth-login-quote">
              <p>“A clearer path to your next opportunity starts with one step.”</p>
              <span>Your AI career companion.</span>
            </div>
          </>
        ) : (
          <>
            <div className="auth-brand-copy">
              <p className="auth-brand-eyebrow">YOUR CAREER, IN FOCUS</p>
              <h2>Your next opportunity starts here.</h2>
              <p className="auth-brand-description">
                Make every application count with practical tools for your next
                career move.
              </p>

              <ul className="auth-benefits">
                <li>
                  <span aria-hidden="true">01</span>
                  <span>
                    <strong>Make your resume stand out</strong>
                    <small>Get clear, actionable resume insights.</small>
                  </span>
                </li>
                <li>
                  <span aria-hidden="true">02</span>
                  <span>
                    <strong>Find your strongest job matches</strong>
                    <small>See how your skills align with a role.</small>
                  </span>
                </li>
                <li>
                  <span aria-hidden="true">03</span>
                  <span>
                    <strong>Walk into interviews prepared</strong>
                    <small>Practice and build confidence at your pace.</small>
                  </span>
                </li>
              </ul>
            </div>

            <div className="auth-brand-visual" aria-hidden="true">
              <div className="auth-visual-orbit" />
              <div className="auth-visual-card">
                <span className="auth-visual-heading">Your career toolkit</span>
                <span className="auth-visual-line">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="auth-visual-caption">
                  Resume <b>·</b> Job match <b>·</b> Interview
                </span>
              </div>
            </div>
          </>
        )}
      </aside>
    )}

    <form
      className={`auth-card ${
        authMode === "login"
          ? "auth-card-login"
          : authMode === "register"
            ? "auth-card-register"
            : ""
      }`}
      onSubmit={handleAuthSubmit}
    >
      <div className="auth-logo">H</div>

      <h1>
        {authMode === "register"
          ? "Create account"
          : authMode === "verify"
            ? "Verify your email"
            : authMode === "forgot"
              ? "Forgot password?"
              : authMode === "reset"
                ? "Reset your password"
                : "Welcome back"}
      </h1>

      <p>
        {authMode === "register"
          ? "Join HireMate AI and track your career progress."
          : authMode === "verify"
            ? `Enter the 6-digit verification code sent to ${authEmail}.`
            : authMode === "forgot"
              ? "Enter your account email and we’ll send a password reset code if an eligible account exists."
              : authMode === "reset"
                ? `Enter the reset code sent to ${authEmail} and choose a new password.`
                : "Log in to continue your career journey."}
      </p>

      {authMode === "register" && (
        <>
          <label htmlFor="auth-name">Full name</label>
          <input
            id="auth-name"
            value={authName}
            onChange={(e) => setAuthName(e.target.value)}
            minLength={2}
            maxLength={100}
            autoComplete="name"
            required
          />
        </>
      )}

      <label htmlFor="auth-email">Email address</label>
      <input
        id="auth-email"
        type="email"
        value={authEmail}
        onChange={(e) => setAuthEmail(e.target.value)}
        autoComplete="email"
        readOnly={authMode === "verify" || authMode === "reset"}
        required
      />

      {(authMode === "verify" || authMode === "reset") && (
        <>
          <label htmlFor="auth-otp">
            {authMode === "reset" ? "Password reset code" : "Verification code"}
          </label>
          <input
            id="auth-otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={authOtp}
            onChange={(e) =>
              setAuthOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            autoComplete="one-time-code"
            required
          />
        </>
      )}

      {(authMode === "register" ||
        authMode === "login" ||
        authMode === "reset") && (
        <>
          <label htmlFor="auth-password">
            {authMode === "reset"
              ? "New password"
              : authMode === "register"
                ? "Password"
                : "Password"}
          </label>
          <div className="password-input-wrapper">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              minLength={
                authMode === "register" || authMode === "reset" ? 8 : undefined
              }
              maxLength={128}
              autoComplete={
                authMode === "register" || authMode === "reset"
                  ? "new-password"
                  : "current-password"
              }
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword((previous) => !previous)
              }
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </>
      )}

      {authMode === "login" && (
        <p className="auth-forgot">
          <button
            type="button"
            onClick={() => {
              setAuthMode("forgot");
              setAuthError("");
              setAuthSuccess("");
              setAuthPassword("");
            }}
          >
            Forgot password?
          </button>
        </p>
      )}

{authError && !authSuccess && (
  <p className="auth-message" role="alert">
    {authError}
  </p>
)}

{authSuccess && (
  <p className="auth-message" role="status">
    {authSuccess}
  </p>
)}

{(authMode === "verify" || authMode === "reset") && (
  <div className="resend-otp-section">
    <button
      type="button"
      className="auth-resend-btn"
      onClick={handleResendOtp}
      disabled={authLoading || resendCountdown > 0 || resendLoading}
    >
      {resendLoading
        ? "Sending..."
        : resendCountdown > 0
          ? `Resend OTP in ${resendCountdown}s`
          : "Resend OTP"}
    </button>
  </div>
)}

<button
  className="primary-btn auth-submit"
  type="submit"
  disabled={authLoading}
>
  {authLoading
    ? "Please wait..."
    : authMode === "register"
      ? "Create account"
      : authMode === "verify"
        ? "Verify Email"
        : authMode === "forgot"
          ? "Send reset code"
          : authMode === "reset"
            ? "Reset password"
            : "Log in"}
</button>
      <p className="auth-switch">
        {authMode === "verify" ? (
          <button
            type="button"
            onClick={() => {
              setAuthMode("register");
              setAuthOtp("");
              setAuthError("");
              setAuthSuccess("");
            }}
          >
            Back to registration
          </button>
        ) : authMode === "forgot" || authMode === "reset" ? (
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthOtp("");
              setAuthPassword("");
              setAuthError("");
              setAuthSuccess("");
            }}
          >
            Back to log in
          </button>
        ) : (
          <>
            {authMode === "register"
              ? "Already have an account?"
              : "New to HireMate AI?"}{" "}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === "register" ? "login" : "register"
                );
                setAuthError("");
                setAuthSuccess("");
              }}
            >
              {authMode === "register" ? "Log in" : "Create account"}
            </button>
          </>
        )}
      </p>
    </form>
  </div>
);


const renderPage = () => {
  switch (activePage) {
    case "Resume Analyzer":
      return renderResumeAnalyzer();

    case "Job Match":
      return renderJobMatch();

    case "Career Assistant":
      return renderCareerAssistant();

    case "Mock Interview":
      return renderMockInterview();

    case "Learning Roadmap":
      return renderLearningRoadmap();

    default:
      return renderDashboard();
  }
};


  // ============================================================
  // MAIN UI
  // ============================================================

  if (!authToken || !authUser) {
  return renderAuthPage();
}

return (
  <div className="app-shell" data-theme={theme}>

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

            <span className={`status-dot ${aiStatus}`}></span>

            <div>

              <strong>
                AI Engine
              </strong>

              <small>
                {aiStatus === "configured"
                  ? "Groq connected"
                  : aiStatus === "not-configured"
                    ? "AI setup needed"
                    : aiStatus === "unavailable"
                      ? "Backend unavailable"
                      : "Checking connection..."}
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

            <button
              type="button"
              className="theme-toggle"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={() =>
                setTheme((currentTheme) =>
                  currentTheme === "light" ? "dark" : "light"
                )
              }
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />
                </svg>
              )}
            </button>

            <div className="profile">
              <button
                type="button"
                className="profile-trigger"
                aria-label="Open your profile"
                onClick={() => {
                  setShowProfile(true);
                  loadMyProgress();
                }}
              >
                <span className="profile-avatar" aria-hidden="true">
                  {(authUser.full_name || authUser.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <span className="profile-identity">
                  <strong>{authUser.full_name || authUser.email}</strong>
                  <span>{authUser.email}</span>
                </span>
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>

          </div>

        </header>

        {showProfile ? (
  <section className="profile-page">
    <button
      type="button"
      className="secondary-btn"
      onClick={() => setShowProfile(false)}
    >
      ← Back to Dashboard
    </button>

    <h1>My Profile</h1>
    <p>Manage your account and track your career progress.</p>

    <div className="profile-details-card">
      <h2>Personal Information</h2>
      <p><strong>Name:</strong> {authUser.full_name || "Not provided"}</p>
      <p><strong>Email:</strong> {authUser.email || "Not provided"}</p>
      <p><strong>Phone:</strong> {authUser.phone || "Not provided"}</p>
    </div>

    <div className="profile-details-card">
  <h2>My Career Progress</h2>

  {progressLoading && <p>Loading your progress...</p>}

  {progressError && (
    <p className="auth-message">{progressError}</p>
  )}

  {!progressLoading && !progressError && (
    <>
      <p>
        <strong>Total activities:</strong> {myProgress.length}
      </p>

      <p>
        <strong>Resume analyses:</strong>{" "}
        {myProgress.filter(
          (item) => item.feature === "Resume Analyzer"
        ).length}
      </p>

      <p>
        <strong>Job matches:</strong>{" "}
        {myProgress.filter(
          (item) => item.feature === "Job Match"
        ).length}
      </p>

      <p>
        <strong>Mock interviews:</strong>{" "}
        {myProgress.filter(
          (item) => item.feature === "Mock Interview"
        ).length}
      </p>

      <p>
        <strong>Roadmap activities:</strong>{" "}
        {myProgress.filter(
          (item) => item.feature === "Learning Roadmap"
        ).length}
      </p>

      <h3>Recent activity</h3>

      {myProgress.length === 0 ? (
        <p>No progress recorded yet.</p>
      ) : (
        myProgress.map((item) => (
          <div key={item.id} className="progress-activity">
            <strong>{item.feature}</strong>
            <p>{item.activity_type.replaceAll("_", " ")}</p>
            <small>
              {item.created_at
                ? new Date(item.created_at).toLocaleString()
                : ""}
            </small>
          </div>
        ))
      )}
    </>
  )}
</div>

    <div className="profile-details-card">
      <h2>Skills Tracker</h2>
      <p>Review your resume skills and identify skills to improve.</p>
      <button
        type="button"
        className="primary-btn"
        onClick={() => {
          setShowProfile(false);
          setActivePage("Resume Analyzer");
        }}
      >
        View Resume Skills
      </button>
    </div>

    <button
      type="button"
      className="secondary-btn"
      onClick={handleLogout}
    >
      Logout
    </button>
  </section>
) : (
  renderPage()
)}

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
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
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

        <span className="score-breakdown-percent">
          {percentage}%
        </span>

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