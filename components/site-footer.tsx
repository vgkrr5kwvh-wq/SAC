import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <>
      <section className="counselling-cta">
        <div className="shell counselling-inner">
          <div><span>Ready to take the next step?</span><h2>Start your study-abroad journey with SAC.</h2><p>Book a focused counselling conversation about your profile, options, and application plan.</p></div>
          <div className="button-row">
            <Link className="button light-button" href="/contact">Book counselling</Link>
            <a className="button outline-light" href="https://sac.osom.global/1/student" target="_blank" rel="noopener noreferrer">Start application</a>
          </div>
        </div>
      </section>
      <footer className="site-footer">
        <div className="shell footer-grid">
          <div className="footer-brand">
            <div className="footer-logo-row">
              <Image src="/sac-logo.png" alt="Self Apply Center" width={350} height={132} />
              <div className="icef-badge" aria-label="ICEF agency badge">
                <span>ICEF</span>
                <small>AGENCY</small>
              </div>
            </div>
            <p>Professional education guidance for students who want a transparent, well-organized route to international study.</p>
            <div className="social-text"><a href="https://www.facebook.com/selfapplycenter" target="_blank" rel="noopener noreferrer">Facebook</a><a href="https://www.instagram.com/usaselfapplycenter" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.linkedin.com/company/self-apply-center" target="_blank" rel="noopener noreferrer">LinkedIn</a></div>
          </div>
          <div><h3>Company</h3><Link href="/about">About Us</Link><Link href="/our-team">Our Team</Link><Link href="/partner-with-us">Partner With Us</Link><Link href="/events">Events</Link></div>
          <div><h3>Student Support</h3><Link href="/services">Our Services</Link><Link href="/destinations">Study Destinations</Link><Link href="/success-stories">Success Stories</Link><Link href="/blog">Study Resources</Link></div>
          <div><h3>Contact</h3><p>Star Mall, 2nd Floor<br />Putalisadak, Kathmandu</p><a href="tel:+977014012581">01-4012581</a><a href="https://wa.me/9779761642336" target="_blank" rel="noopener noreferrer">+977 9761642336</a><a href="mailto:info@selfapplycenter.com">info@selfapplycenter.com</a></div>
        </div>
        <div className="shell footer-bottom"><span>© 2026 Self Apply Center. All rights reserved.</span><span>Sunday–Friday · 9:30 AM–5:30 PM</span></div>
      </footer>
      <a className="floating-whatsapp" href="https://wa.me/9779761642336?text=Hello%20Self%20Apply%20Center%2C%20I%20want%20to%20ask%20about%20studying%20abroad." target="_blank" rel="noopener noreferrer" aria-label="Chat with Self Apply Center on WhatsApp">WhatsApp</a>
    </>
  );
}
