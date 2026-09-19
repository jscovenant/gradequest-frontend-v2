import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../utils/api";

// Helper to sanitize and normalize asset URLs
const resolveMediaUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const clean = url.replace(/^\/+/, "");
  if (clean.startsWith("uploads/")) {
    return `https://schoolprofit.ng/${clean}`;
  }
  if (clean.startsWith("storage/")) {
    return `https://schoolprofit.ng/${clean}`;
  }
  return `https://schoolprofit.ng/storage/${clean}`;
};

const toast = {
  success: (msg: string) => console.log("SUCCESS:", msg),
  error: (msg: string) => alert(msg),
  warning: (msg: string) => alert(msg),
  info: (msg: string) => alert(msg),
};

export default function PublicAdmissionFormPage() {
  const { slugOrId } = useParams<{ slugOrId?: string }>();
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [logoError, setLogoError] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<any>({
    firstname: "",
    surname: "",
    other_names: "",
    dob: "",
    gender: "Male",
    blood_group: "O+",
    nationality: "Nigerian",
    state_of_origin: "",
    lga_of_origin: "",
    home_address: "",
    applied_class_name: "",
    level_id: "",
    previous_school: "",
    previous_class: "",
    last_grade_average: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    parent_address: "",
    parent_occupation: "",
    parent_relationship: "Father",
    passport_photo: "",
  });

  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Payment & Result Data
  const [applicationResult, setApplicationResult] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  useEffect(() => {
    fetchAdmissionInfo();
  }, [slugOrId]);

  const fetchAdmissionInfo = async () => {
    setLoading(true);
    try {
      const identifier = slugOrId || "current";
      const res = await api.get(`/public/admissions/info/${identifier}`);
      if (res.data.status) {
        setSchoolInfo(res.data);
        if (res.data.classes?.length > 0) {
          setFormData((prev: any) => ({
            ...prev,
            applied_class_name: res.data.classes[0].name,
            level_id: res.data.classes[0].id,
          }));
        }
      }
    } catch (err: any) {
      console.error("Error fetching admission info:", err);
      toast.error("Could not load admission form.");
    } finally {
      setLoading(false);
    }
  };

  const handlePassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPassportFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPassportPreview(reader.result as string);
        setFormData((prev: any) => ({ ...prev, passport_photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstname || !formData.surname || !formData.applied_class_name) {
      toast.warning("Please fill in candidate first name, surname, and class.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parent_name || !formData.parent_phone) {
      toast.warning("Please fill in parent name and active phone number.");
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitApplication = async () => {
    setSubmitting(true);
    try {
      const identifier = slugOrId || "current";
      const payload = {
        ...formData,
      };

      const res = await api.post(`/public/admissions/submit/${identifier}`, payload);
      if (res.data.status) {
        setApplicationResult(res.data.application);
        setPaymentData(res.data.payment);
        toast.success("Application created successfully!");
        setStep(4);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentData?.reference) return;
    setVerifyingPayment(true);
    try {
      const res = await api.get(`/public/admissions/verify-payment/${paymentData.reference}`);
      if (res.data.status) {
        toast.success("Payment verified successfully via Wema Bank!");
        setApplicationResult(res.data.application);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Payment not yet confirmed. Please try again in 1 minute.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const copyAccountNumber = (acc: string) => {
    if (!acc) return;
    navigator.clipboard.writeText(acc);
    setCopiedAccount(true);
    toast.info("Wema Bank Virtual Account copied!");
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <h6 className="text-dark fw-bold">Preparing Admission Portal...</h6>
        </div>
      </div>
    );
  }

  const school = schoolInfo?.school || {};
  const admission = schoolInfo?.admission || {};

  return (
    <div className="min-vh-100 bg-light py-5" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <div className="container" style={{ maxWidth: 880 }}>
        
        {/* School Header Card */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 text-center bg-white">
          <div className="d-flex align-items-center justify-content-center gap-3 mb-2">
            {school.logo && !logoError ? (
              <img
                src={resolveMediaUrl(school.logo)}
                alt={`${school.name || "School"} Logo`}
                style={{ height: 56, maxWidth: 180, objectFit: "contain" }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div
                className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center shadow-sm fw-bold fs-4"
                style={{ width: 52, height: 52 }}
              >
                {school.name ? school.name.charAt(0).toUpperCase() : "S"}
              </div>
            )}
            <h4 className="fw-extrabold text-dark mb-0">{school.name || "School Portal"}</h4>
          </div>
          <p className="text-muted small mb-2">{school.address || "Official School Campus, Nigeria"}</p>
          <div className="d-inline-flex align-items-center gap-2 mx-auto">
            <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-pill">
              {admission.session_name || "2026/2027 Academic Session"}
            </span>
            <span className="badge bg-success bg-opacity-10 text-success px-3 py-1 rounded-pill">
              Application Fee: ₦{(admission.total_fee || 6000).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Progress Stepper */}
        {step < 4 && (
          <div className="d-flex justify-content-between mb-4 px-2 position-relative">
            <div className={`text-center fw-bold small ${step >= 1 ? "text-primary" : "text-muted"}`}>
              <div className={`rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center ${step >= 1 ? "bg-primary text-white" : "bg-white text-muted border"}`} style={{ width: 32, height: 32 }}>
                1
              </div>
              Candidate Bio
            </div>
            <div className={`text-center fw-bold small ${step >= 2 ? "text-primary" : "text-muted"}`}>
              <div className={`rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center ${step >= 2 ? "bg-primary text-white" : "bg-white text-muted border"}`} style={{ width: 32, height: 32 }}>
                2
              </div>
              Parent & Guardian
            </div>
            <div className={`text-center fw-bold small ${step >= 3 ? "text-primary" : "text-muted"}`}>
              <div className={`rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center ${step >= 3 ? "bg-primary text-white" : "bg-white text-muted border"}`} style={{ width: 32, height: 32 }}>
                3
              </div>
              Review & Submit
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: CANDIDATE DETAILS */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
            <h5 className="fw-bold text-dark mb-1">Step 1: Candidate Academic & Personal Information</h5>
            <p className="text-muted small mb-4">Please provide accurate information for the prospective student.</p>

            <form onSubmit={handleStep1Next}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold small">First Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. David"
                    value={formData.firstname}
                    onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold small">Surname / Last Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Adeleke"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold small">Other Name(s)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Oluwaseun"
                    value={formData.other_names}
                    onChange={(e) => setFormData({ ...formData, other_names: e.target.value })}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold small">Gender *</label>
                  <select
                    className="form-select"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold small">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold small">Applying for Class *</label>
                  <select
                    className="form-select"
                    value={formData.applied_class_name}
                    onChange={(e) => {
                      const selectedClass = schoolInfo?.classes?.find((c: any) => c.name === e.target.value);
                      setFormData({
                        ...formData,
                        applied_class_name: e.target.value,
                        level_id: selectedClass ? selectedClass.id : "",
                      });
                    }}
                    required
                  >
                    {schoolInfo?.classes?.map((cls: any) => (
                      <option key={cls.id} value={cls.name}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">State of Origin</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Lagos State"
                    value={formData.state_of_origin}
                    onChange={(e) => setFormData({ ...formData, state_of_origin: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Previous School Attended</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Model Primary School, Ikeja"
                    value={formData.previous_school}
                    onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold small">Passport Photograph (White Background)</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handlePassportChange}
                  />
                  {passportPreview && (
                    <div className="mt-2">
                      <img src={passportPreview} alt="Preview" className="rounded-3 border shadow-sm" style={{ width: 80, height: 80, objectFit: "cover" }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                <button type="submit" className="btn btn-primary px-4 py-2 fw-bold">
                  Next: Parent Details <i className="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PARENT DETAILS */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
            <h5 className="fw-bold text-dark mb-1">Step 2: Parent / Guardian Details</h5>
            <p className="text-muted small mb-4">Provide official contact information for entrance examination updates and enrollment.</p>

            <form onSubmit={handleStep2Next}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Parent / Guardian Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Mr. & Mrs. Tunde Adeleke"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Relationship to Candidate *</label>
                  <select
                    className="form-select"
                    value={formData.parent_relationship}
                    onChange={(e) => setFormData({ ...formData, parent_relationship: e.target.value })}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Phone Number (WhatsApp Preferred) *</label>
                  <input
                    type="tel"
                    className="form-control"
                    required
                    placeholder="e.g. 08012345678"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. parent@gmail.com"
                    value={formData.parent_email}
                    onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold small">Residential Address *</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="e.g. 15 Victoria Island Road, Lagos"
                    value={formData.parent_address}
                    onChange={(e) => setFormData({ ...formData, parent_address: e.target.value })}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                <button type="button" onClick={() => setStep(1)} className="btn btn-outline-secondary px-4 fw-semibold">
                  <i className="bi bi-arrow-left me-1"></i> Back
                </button>
                <button type="submit" className="btn btn-primary px-4 py-2 fw-bold">
                  Next: Review Application <i className="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: REVIEW & SUBMIT */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
            <h5 className="fw-bold text-dark mb-1">Step 3: Review Application & Payment Summary</h5>
            <p className="text-muted small mb-4">Review all candidate and parent details before submitting.</p>

            <div className="row g-3 p-3 bg-light rounded-3 mb-4">
              <div className="col-md-6">
                <div className="small text-muted">Candidate Name:</div>
                <div className="fw-bold text-dark">{formData.firstname} {formData.other_names} {formData.surname}</div>
              </div>
              <div className="col-md-6">
                <div className="small text-muted">Applied Class:</div>
                <div className="fw-bold text-primary">{formData.applied_class_name}</div>
              </div>
              <div className="col-md-6">
                <div className="small text-muted">Parent / Guardian:</div>
                <div className="fw-bold text-dark">{formData.parent_name} ({formData.parent_relationship})</div>
              </div>
              <div className="col-md-6">
                <div className="small text-muted">Parent Phone:</div>
                <div className="fw-bold text-dark">{formData.parent_phone}</div>
              </div>
            </div>

            <div className="p-4 bg-success bg-opacity-10 rounded-4 border border-success border-opacity-25 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark">School Application Fee:</span>
                <span className="fw-bold text-dark">₦{(admission.application_fee || 5000).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted">Platform Processing Fee:</span>
                <span className="small text-muted">₦{(admission.platform_fee || 1000).toLocaleString()}</span>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-extrabold text-dark fs-5">Total Fee to Pay:</span>
                <span className="fw-extrabold text-success fs-4">₦{(admission.total_fee || 6000).toLocaleString()}</span>
              </div>
              <small className="text-muted d-block mt-2">
                <i className="bi bi-shield-check text-success me-1"></i> A dedicated <strong>Wema Bank Virtual Account</strong> will be generated for instant online payment and entrance slip printing.
              </small>
            </div>

            <div className="d-flex justify-content-between mt-4 pt-3 border-top">
              <button type="button" onClick={() => setStep(2)} className="btn btn-outline-secondary px-4 fw-semibold">
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
              <button
                onClick={handleSubmitApplication}
                disabled={submitting}
                className="btn btn-success btn-lg px-5 fw-bold shadow"
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span> Generating Slip...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-2"></i> Submit & Generate Wema Payment Slip
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: WEMA PAYMENT SLIP & OFFICIAL ENTRANCE SLIP */}
        {/* ========================================================================= */}
        {step === 4 && applicationResult && (
          <div className="card border-0 shadow rounded-4 p-4 p-md-5 bg-white">
            
            <div className="text-center mb-4 pb-3 border-bottom">
              <div className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex p-3 fs-3 mb-2">
                <i className="bi bi-check-lg"></i>
              </div>
              <h4 className="fw-extrabold text-dark mb-1">Application Submitted Successfully!</h4>
              <p className="text-muted small mb-0">Official Online Admission Slip & Entrance Pass</p>
            </div>

            {/* Official Entrance Pass Slip Header */}
            <div className="p-4 bg-light rounded-4 border mb-4">
              <div className="d-flex align-items-center gap-3 mb-3 border-bottom pb-3">
                {school.logo && !logoError ? (
                  <img
                    src={resolveMediaUrl(school.logo)}
                    alt={`${school.name || "School"} Logo`}
                    style={{ height: 48, maxWidth: 140, objectFit: "contain" }}
                  />
                ) : (
                  <div
                    className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center shadow-sm fw-bold fs-5"
                    style={{ width: 44, height: 44 }}
                  >
                    {school.name ? school.name.charAt(0).toUpperCase() : "S"}
                  </div>
                )}
                <div>
                  <h5 className="fw-bold text-dark mb-0">{school.name}</h5>
                  <span className="text-muted small">{school.address || "Official School Campus, Nigeria"}</span>
                </div>
              </div>

              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 border-bottom pb-3">
                <div>
                  <span className="text-muted small d-block">Application Reference Number</span>
                  <span className="fs-5 fw-extrabold text-primary font-monospace">{applicationResult.application_number}</span>
                </div>
                <div>
                  <span className="text-muted small d-block">Candidate Applied Class</span>
                  <span className="fs-5 fw-bold text-dark">{applicationResult.applied_class_name}</span>
                </div>
              </div>

              <div className="row g-3 small">
                <div className="col-md-6">
                  <span className="text-muted">Candidate Full Name:</span>
                  <div className="fw-bold text-dark fs-6">{applicationResult.firstname} {applicationResult.surname}</div>
                </div>
                <div className="col-md-6">
                  <span className="text-muted">Parent Contact:</span>
                  <div className="fw-bold text-dark">{applicationResult.parent_name} ({applicationResult.parent_phone})</div>
                </div>
              </div>
            </div>

            {/* Wema Bank Instant Payment Box */}
            {paymentData && applicationResult.payment_status !== "paid" && (
              <div className="p-4 bg-primary bg-opacity-10 rounded-4 border border-primary border-opacity-25 mb-4">
                <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-bold">
                  <i className="bi bi-bank fs-5"></i> Complete Application Fee Payment via Wema Bank Transfer
                </div>
                <p className="small text-muted mb-3">
                  Transfer the exact application fee to the dedicated Wema Bank account below. Payment is verified automatically.
                </p>

                <div className="bg-white p-3 rounded-3 shadow-sm mb-3">
                  <div className="row g-3 align-items-center">
                    <div className="col-md-5">
                      <small className="text-muted d-block">Bank Name</small>
                      <strong className="text-dark fs-6">Wema Bank</strong>
                    </div>
                    <div className="col-md-5">
                      <small className="text-muted d-block">Virtual Account Number</small>
                      <strong className="text-primary fs-5 font-monospace">{paymentData.account_number}</strong>
                    </div>
                    <div className="col-md-2 text-end">
                      <button
                        type="button"
                        onClick={() => copyAccountNumber(paymentData.account_number)}
                        className="btn btn-sm btn-outline-primary fw-bold"
                      >
                        {copiedAccount ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between align-items-center small">
                    <span className="text-muted">Account Name: <strong>{paymentData.account_name}</strong></span>
                    <span className="text-success fw-bold">Amount: ₦{paymentData.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <i className="bi bi-clock-history me-1"></i> Account expires in 24 hours.
                  </small>
                  <button
                    onClick={handleVerifyPayment}
                    disabled={verifyingPayment}
                    className="btn btn-primary fw-bold px-4 shadow-sm"
                  >
                    {verifyingPayment ? "Verifying..." : "I Have Made This Transfer"}
                  </button>
                </div>
              </div>
            )}

            {applicationResult.payment_status === "paid" && (
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-3 border border-success border-opacity-25 mb-4 text-center fw-bold">
                <i className="bi bi-check-circle-fill me-2"></i> Application Fee Paid & Verified via Wema Bank!
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center pt-3 border-top">
              <button onClick={() => window.print()} className="btn btn-outline-dark fw-bold px-4">
                <i className="bi bi-printer me-2"></i> Print Admission Slip
              </button>
              <Link to={`/school/${school.id}`} className="btn btn-primary fw-bold px-4">
                Return to School Homepage
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
