"use client";

import { FormEvent, useState } from "react";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function PartnerForm() {
  const [partnerType, setPartnerType] = useState<"university" | "agent">(
    "university"
  );
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setStatus("submitting");
    setMessage("");

    const details =
      partnerType === "university"
        ? String(formData.get("programs") ?? "")
        : String(formData.get("agencyServices") ?? "");

    const secondaryDetails =
      partnerType === "university"
        ? String(formData.get("recruitmentGoals") ?? "")
        : String(formData.get("networkAndVolume") ?? "");

    const payload = {
      partnerType,
      contactName: String(formData.get("contactName") ?? ""),
      workEmail: String(formData.get("workEmail") ?? ""),
      organisation: String(formData.get("organisation") ?? ""),
      locations: String(formData.get("locations") ?? ""),
      partnershipProposal: String(
        formData.get("partnershipProposal") ?? ""
      ),
      details: `${details}\n\n${secondaryDetails}`.trim(),
      additionalDetails: String(
        formData.get("additionalDetails") ?? ""
      ),
      website: String(formData.get("website") ?? ""),
    };

    try {
      const response = await fetch("/api/partner-enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "We could not submit your partnership enquiry."
        );
      }

      setStatus("success");
      setMessage(
        result.message ||
          "Thank you. Your partnership enquiry has been received."
      );

      form.reset();
      setPartnerType("university");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not submit your partnership enquiry."
      );
    }
  }

  return (
    <section className="section partner-form-section">
      <div className="shell partner-form-grid">
        <div className="partner-intro">
          <span className="eyebrow">Partnership enquiry</span>

          <h2>Tell us how you would like to work together.</h2>

          <p className="lead">
            Choose your organisation type and provide the information relevant
            to your proposed partnership.
          </p>

          <div className="partner-process">
            <div>
              <span>01</span>
              <p>
                <strong>Share your organisation</strong>
                Complete the questions relevant to your partnership type.
              </p>
            </div>

            <div>
              <span>02</span>
              <p>
                <strong>Fit and compliance review</strong>
                Our team reviews your network, proposal, and student benefit.
              </p>
            </div>

            <div>
              <span>03</span>
              <p>
                <strong>Partnership discussion</strong>
                Suitable partners are invited to discuss terms and next steps.
              </p>
            </div>
          </div>
        </div>

        <form className="contact-form partner-form" onSubmit={handleSubmit}>
          <div className="partner-form-heading">
            <span>Start your enquiry</span>
            <h3>Organisation details</h3>
            <p>
              Fields are updated automatically for your selected partner type.
            </p>
          </div>

          <fieldset className="partner-type">
            <legend>Who are you representing?</legend>

            <div className="partner-type-options">
              <label
                className={
                  partnerType === "university" ? "is-selected" : ""
                }
              >
                <input
                  type="radio"
                  name="partnerType"
                  value="university"
                  checked={partnerType === "university"}
                  onChange={() => setPartnerType("university")}
                />

                <span>
                  <strong>University</strong>
                  <small>Institution, college, or pathway provider</small>
                </span>
              </label>

              <label
                className={partnerType === "agent" ? "is-selected" : ""}
              >
                <input
                  type="radio"
                  name="partnerType"
                  value="agent"
                  checked={partnerType === "agent"}
                  onChange={() => setPartnerType("agent")}
                />

                <span>
                  <strong>Education agent</strong>
                  <small>Agency, counsellor, or referral network</small>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="form-section-label">
            <span>01</span> Contact information
          </div>

          <div className="form-row">
            <label>
              Contact name
              <input
                name="contactName"
                type="text"
                required
                autoComplete="name"
              />
            </label>

            <label>
              Work email
              <input
                name="workEmail"
                type="email"
                required
                autoComplete="email"
              />
            </label>
          </div>

          <label>
            {partnerType === "university"
              ? "University or institution name"
              : "Agency name"}

            <input name="organisation" type="text" required />
          </label>

          <label>
            {partnerType === "university"
              ? "Country and campus locations"
              : "Countries and regions you operate in"}

            <input name="locations" type="text" required />
          </label>

          <div className="form-section-label">
            <span>02</span> Partnership details
          </div>

          {partnerType === "university" ? (
            <>
              <label>
                Programs and study levels you want SAC to represent
                <textarea name="programs" rows={3} required />
              </label>

              <label>
                What type of university partnership are you proposing?

                <select
                  name="partnershipProposal"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="Student recruitment">
                    Student recruitment
                  </option>
                  <option value="Direct representation">
                    Direct representation
                  </option>
                  <option value="Events and outreach">
                    Events and outreach
                  </option>
                  <option value="Pathway or articulation">
                    Pathway or articulation
                  </option>
                  <option value="Other collaboration">
                    Other collaboration
                  </option>
                </select>
              </label>

              <label>
                International recruitment goals and preferred student profile
                <textarea name="recruitmentGoals" rows={3} required />
              </label>
            </>
          ) : (
            <>
              <label>
                Services your agency provides
                <textarea name="agencyServices" rows={3} required />
              </label>

              <label>
                What type of agent collaboration are you proposing?

                <select
                  name="partnershipProposal"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="Student referrals">
                    Student referrals
                  </option>
                  <option value="Sub-agent collaboration">
                    Sub-agent collaboration
                  </option>
                  <option value="Application processing">
                    Application processing
                  </option>
                  <option value="Events and outreach">
                    Events and outreach
                  </option>
                  <option value="Other collaboration">
                    Other collaboration
                  </option>
                </select>
              </label>

              <label>
                Current institution network and expected referral volume
                <textarea name="networkAndVolume" rows={3} required />
              </label>
            </>
          )}

          <label>
            Anything else we should know?
            <textarea name="additionalDetails" rows={3} />
          </label>

          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: "none" }}
          />

          <button
            className="button primary"
            type="submit"
            disabled={status === "submitting"}
          >
            {status === "submitting"
              ? "Sending..."
              : "Send partnership enquiry"}{" "}
            <span>→</span>
          </button>

          {message && (
            <p
              className={`form-message ${
                status === "error" ? "is-error" : "is-success"
              }`}
              role="status"
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}