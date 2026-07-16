"use client";

import { FormEvent, useState } from "react";

export default function PartnerForm() {
  const [partnerType, setPartnerType] = useState<"university" | "agent">("university");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = [...data.entries()].map(([key, value]) => `${key}: ${value}`).join("\n");
    window.location.href = `mailto:info@selfapplycenter.com?subject=${encodeURIComponent(`${partnerType === "university" ? "University" : "Agent"} partnership enquiry`)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <section className="section partner-form-section">
      <div className="shell partner-form-grid">
        <div className="partner-intro">
          <span className="eyebrow">Partnership enquiry</span>
          <h2>Tell us how you would like to work together.</h2>
          <p className="lead">Choose your organisation type and the form will ask for the information relevant to your partnership.</p>
          <div className="partner-process">
            <div><span>01</span><p><strong>Share your organisation</strong>Complete the questions relevant to your partnership type.</p></div>
            <div><span>02</span><p><strong>Fit and compliance review</strong>Our team reviews your network, proposal, and student benefit.</p></div>
            <div><span>03</span><p><strong>Partnership discussion</strong>Suitable partners are invited to discuss terms and next steps.</p></div>
          </div>
        </div>
        <form className="contact-form partner-form" onSubmit={handleSubmit}>
          <div className="partner-form-heading">
            <span>Start your enquiry</span>
            <h3>Organisation details</h3>
            <p>Fields are updated automatically for your selected partner type.</p>
          </div>
          <fieldset className="partner-type">
            <legend>Who are you representing?</legend>
            <div className="partner-type-options">
              <label className={partnerType === "university" ? "is-selected" : ""}><input type="radio" name="Partner type" value="University" checked={partnerType === "university"} onChange={() => setPartnerType("university")} /><span><strong>University</strong><small>Institution, college, or pathway provider</small></span></label>
              <label className={partnerType === "agent" ? "is-selected" : ""}><input type="radio" name="Partner type" value="Agent" checked={partnerType === "agent"} onChange={() => setPartnerType("agent")} /><span><strong>Education agent</strong><small>Agency, counsellor, or referral network</small></span></label>
            </div>
          </fieldset>

          <div className="form-section-label"><span>01</span> Contact information</div>
          <div className="form-row">
            <label>Contact name<input name="Contact name" type="text" required autoComplete="name" /></label>
            <label>Work email<input name="Work email" type="email" required autoComplete="email" /></label>
          </div>
          <label>{partnerType === "university" ? "University or institution name" : "Agency name"}<input name="Organisation" type="text" required /></label>
          <label>{partnerType === "university" ? "Country and campus locations" : "Countries and regions you operate in"}<input name="Locations" type="text" required /></label>

          <div className="form-section-label"><span>02</span> Partnership details</div>
          {partnerType === "university" ? (
            <>
              <label>Programs and study levels you want SAC to represent<textarea name="Programs" rows={3} required /></label>
              <label>What type of university partnership are you proposing?<select name="Partnership proposal" required defaultValue=""><option value="" disabled>Select an option</option><option>Student recruitment</option><option>Direct representation</option><option>Events and outreach</option><option>Pathway or articulation</option><option>Other collaboration</option></select></label>
              <label>International recruitment goals and preferred student profile<textarea name="Recruitment goals" rows={3} required /></label>
            </>
          ) : (
            <>
              <label>Services your agency provides<textarea name="Agency services" rows={3} required /></label>
              <label>What type of agent collaboration are you proposing?<select name="Partnership proposal" required defaultValue=""><option value="" disabled>Select an option</option><option>Student referrals</option><option>Sub-agent collaboration</option><option>Application processing</option><option>Events and outreach</option><option>Other collaboration</option></select></label>
              <label>Current institution network and expected referral volume<textarea name="Network and volume" rows={3} required /></label>
            </>
          )}

          <label>Anything else we should know?<textarea name="Additional details" rows={3} /></label>
          <button className="button primary" type="submit">Send partnership enquiry <span>→</span></button>
          <p className="form-message">Your completed enquiry will open in your email application.</p>
        </form>
      </div>
    </section>
  );
}
