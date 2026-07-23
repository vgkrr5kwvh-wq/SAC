export type SitePage = {
  title: string;
  eyebrow: string;
  intro: string;
  description: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  sections: Array<{
    title: string;
    copy: string;
    items?: string[];
  }>;
};

export const sitePages: Record<string, SitePage> = {
  about: {
    title: "A consultancy built around clear student decisions.",
    eyebrow: "About Self Apply Center",
    intro: "We combine the familiarity of an education consultancy with the transparency of a guided self-application process.",
    description: "Learn about Self Apply Center, our approach, and our commitment to transparent international education guidance.",
    faqs: [
      { question: "What does “self apply” mean at SAC?", answer: "You remain informed and involved throughout your application while our counsellors provide planning, document review, and practical guidance." },
      { question: "Is SAC only an online platform?", answer: "No. You can work with SAC through our Kathmandu office, online communication, and the guided application platform." },
      { question: "How is SAC different from a traditional consultancy?", answer: "We focus on visible tasks, explained recommendations, and student ownership instead of keeping application details hidden." },
    ],
    sections: [
      { title: "Our purpose", copy: "SAC helps students and families understand the complete study-abroad journey before making major academic and financial decisions. Our role is to organise the process, explain the reasoning, and support each milestone." },
      { title: "What makes SAC different", copy: "Students remain involved in their own applications. We do not hide shortlists, documents, deadlines, or university communication.", items: ["Recommendations explained in plain language", "Profile, budget, and career goals reviewed together", "Visible application tasks and timelines", "Support from planning through visa readiness"] },
      { title: "Our promise", copy: "We will give practical guidance based on the information available, communicate requirements clearly, and avoid pushing students toward unsuitable destinations or programs." },
    ],
  },
  "our-team": {
    title: "People who keep your application organised and understandable.",
    eyebrow: "Our Team",
    intro: "Counsellors, application handlers, and support staff work together around one clear student plan.",
    description: "Meet the team and working approach behind Self Apply Center.",
    faqs: [
      { question: "Who will handle my application?", answer: "Your application may involve a counsellor, document reviewer, application handler, and visa support team working from one shared plan." },
      { question: "Can I speak with the same counsellor throughout the process?", answer: "We aim to maintain a consistent point of contact while involving specialist team members when their expertise is needed." },
      { question: "Can I meet the team before starting?", answer: "Yes. You can arrange an initial counselling session at our Putalisadak office or begin with an online conversation." },
    ],
    sections: [
      { title: "Student counselling", copy: "Your counsellor helps translate your academic record, budget, destination interests, and career direction into realistic options." },
      { title: "Application support", copy: "The application team checks forms, documents, deadlines, and university requirements before submission." },
      { title: "Visa and enrollment guidance", copy: "Our support continues through offer conditions, financial preparation, visa documentation, interviews, and pre-departure planning." },
    ],
  },
  services: {
    title: "Complete guidance for every stage of studying abroad.",
    eyebrow: "Student Services",
    intro: "From your first counselling session to pre-departure preparation, SAC keeps each step practical and visible.",
    description: "Explore counselling, university selection, application, visa, and enrollment services from Self Apply Center.",
    faqs: [
      { question: "Can SAC help if I have already shortlisted universities?", answer: "Yes. We can review your shortlist for eligibility, cost, course relevance, and application risk before you proceed." },
      { question: "Do you review SOPs and application documents?", answer: "Yes. Document and story review can cover SOPs, CVs, academic files, financial evidence, and application details." },
      { question: "Does support continue after receiving an offer?", answer: "Yes. SAC can help with offer conditions, enrollment preparation, visa documents, interviews, and pre-departure planning." },
    ],
    sections: [
      { title: "Profile counselling", copy: "Review academics, study gaps, work experience, budget, career interests, and destination preferences.", items: ["Initial profile assessment", "Career and course discussion", "Risk and eligibility review"] },
      { title: "Country, course & university selection", copy: "Build a balanced shortlist using entry requirements, cost, course relevance, location, and career outcomes.", items: ["Country and intake comparison", "University shortlist", "Course and scholarship review"] },
      { title: "Application & admission", copy: "Prepare complete, timely applications with properly reviewed documents and written materials.", items: ["Application form review", "SOP, CV, and LOR guidance", "Offer follow-up and conditions"] },
      { title: "Financial & scholarship guidance", copy: "Understand tuition, living costs, scholarships, financial evidence, and realistic total budgets." },
      { title: "Visa preparation", copy: "Organise visa documents and prepare to explain your study plan confidently.", items: ["Visa document checklist", "Financial file review", "Interview preparation"] },
      { title: "Pre-departure support", copy: "Plan accommodation, travel, enrollment tasks, insurance, and the practical transition to student life abroad." },
    ],
  },
  destinations: {
    title: "Choose a destination that fits your profile and future.",
    eyebrow: "Study Destinations",
    intro: "SAC focuses on practical pathways for the USA, Canada, the United Kingdom, and South Korea.",
    description: "Compare SAC's priority international study destinations and find a route suited to your goals.",
    faqs: [
      { question: "Which destination is best for my profile?", answer: "The answer depends on your academics, budget, course goals, intake timing, and career plan. We compare these factors before recommending a route." },
      { question: "Can I compare more than one country?", answer: "Yes. Comparing entry requirements, total costs, course structures, and timelines across countries often leads to a stronger decision." },
      { question: "Does SAC support destinations outside the featured countries?", answer: "Our primary pathways are the USA, Canada, the UK, and South Korea. Contact us to discuss whether support is available for another destination." },
    ],
    sections: [
      { title: "Study in the USA", copy: "A broad university system with flexible programs, research opportunities, scholarships, and strong options across business, technology, engineering, and health fields.", items: ["Multiple annual intakes", "Community college and university pathways", "CPT and OPT opportunities subject to eligibility"] },
      { title: "Study in Canada", copy: "A familiar destination for Nepali students with career-focused programs and established international student communities.", items: ["University and college options", "Applied and academic programs", "Budget and province comparison"] },
      { title: "Study in the United Kingdom", copy: "Focused undergraduate and postgraduate programs, globally recognised universities, and comparatively shorter course durations.", items: ["One-year master's options", "September and January intakes", "Clear academic entry routes"] },
      { title: "Study in South Korea", copy: "An emerging destination offering technology-focused education, scholarships, cultural experience, and English-taught degree options.", items: ["University scholarship possibilities", "Language and degree pathways", "Growing technology and business sectors"] },
    ],
  },
  "success-stories": {
    title: "Student journeys supported with patience and practical guidance.",
    eyebrow: "Success Stories",
    intro: "Results matter, but so does understanding the work behind each offer and visa outcome.",
    description: "Read student experiences and application outcomes supported by Self Apply Center.",
    faqs: [
      { question: "Are visa or admission results guaranteed?", answer: "No consultancy can guarantee an admission or visa decision. Outcomes depend on the student profile, documents, institution, and relevant authorities." },
      { question: "Can I speak with a previous SAC student?", answer: "Where appropriate and with the student’s permission, our team may be able to share relevant experiences or connect you with community events." },
      { question: "Does every successful student follow the same process?", answer: "No. Each application plan is adjusted for the student’s academic history, destination, finances, course, and intake." },
    ],
    sections: [
      { title: "Aashish Dhakal", copy: "“The team understood my situation, answered my questions patiently, and made the visa process feel manageable.”", items: ["Graduate Instructional Assistant"] },
      { title: "Rohit Bohora", copy: "“From selecting the right program to visa guidance, SAC supported me at every step. The interview classes boosted my confidence.”", items: ["USA visa approved"] },
      { title: "Kanchan Poudel", copy: "“SAC made my dream of studying in Canada a reality with counselling, application support, and visa appointment guidance.”", items: ["Canada visa approved"] },
      { title: "Priyaska Khadka", copy: "“Their guidance through the application process and visa lodging exceeded our expectations.”", items: ["USA visa approved"] },
      { title: "Monika Poudel", copy: "“Their attention to detail, counselling, and interview classes gave me confidence for a successful visa interview.”", items: ["USA visa approved"] },
      { title: "Kreetan Bhatta", copy: "“SAC made the process stress-free and efficient. Their visa lodging support and interview classes were exceptional.”", items: ["Canada visa approved"] },
    ],
  },
  blog: {
    title: "Straightforward guidance for common study-abroad questions.",
    eyebrow: "Student Resources",
    intro: "Start with the decisions that affect your eligibility, budget, documents, and timeline.",
    description: "Practical study-abroad articles and common questions from Self Apply Center.",
    faqs: [
      { question: "How often is new guidance published?", answer: "We regularly add practical articles about applications, destinations, documents, scholarships, visas, and student planning." },
      { question: "Can I request an article topic?", answer: "Yes. Send SAC a question through the contact page or WhatsApp and it may be covered in a future guide." },
      { question: "Should blog guidance replace personal counselling?", answer: "No. Articles provide general information, while personal recommendations should consider your complete profile and current requirements." },
    ],
    sections: [
      { title: "How early should you begin?", copy: "Most students benefit from beginning research and profile planning 9–12 months before their intended intake. Competitive courses, scholarships, and complex financial preparation may need more time." },
      { title: "How should you choose a country?", copy: "Compare course quality, total cost, entry requirements, work opportunities, climate, support network, and long-term career relevance—not popularity alone." },
      { title: "What makes a strong SOP?", copy: "A strong statement connects your academic history, experience, course choice, university choice, and future plan into one credible story." },
      { title: "What belongs in an application file?", copy: "Typical documents include academic transcripts, passport, English-language results, CV, SOP, recommendations, financial evidence, and course-specific materials." },
      { title: "How do scholarships work?", copy: "Scholarships may consider grades, English scores, leadership, research, portfolios, financial need, or early application timing. Requirements differ by university." },
      { title: "Why are visa interviews important?", copy: "An interview may test whether your study plan, finances, academic choice, and future intentions are genuine and consistent with your documents." },
    ],
  },
  events: {
    title: "Focused sessions for the decisions students face next.",
    eyebrow: "Events & Seminars",
    intro: "Join destination briefings, application workshops, visa sessions, and university interactions.",
    description: "View upcoming education counselling events and workshops from Self Apply Center.",
    faqs: [
      { question: "How do I register for an event?", answer: "Contact SAC through the event announcement, WhatsApp, or the contact page. Registration details are shared when each session opens." },
      { question: "Are events available online?", answer: "Some sessions may be offered online or in a hybrid format. The event details will confirm the venue and participation method." },
      { question: "What should I bring to a workshop?", answer: "Bring the documents or drafts mentioned in the event description, along with your questions and intended study plan." },
    ],
    sections: [
      { title: "USA application planning session", copy: "Learn how to organise university research, profile positioning, documents, and intake timelines.", items: ["Registration opening soon", "Putalisadak office and online"] },
      { title: "Canada program and budget clinic", copy: "Compare program types, provinces, tuition, living costs, and application readiness.", items: ["Registration opening soon", "Small-group counselling"] },
      { title: "SOP and document workshop", copy: "Understand how your written materials and supporting documents should work together.", items: ["Bring your current draft", "Prior registration required"] },
    ],
  },
  contact: {
    title: "Talk to a counsellor about your study goal.",
    eyebrow: "Contact Self Apply Center",
    intro: "Tell us where you want to study, what you have completed, and where you are getting stuck.",
    description: "Contact Self Apply Center for study-abroad counselling in Kathmandu.",
    faqs: [
      { question: "When is the SAC office open?", answer: "The Putalisadak office is open Sunday through Friday from 9:30 AM to 5:30 PM." },
      { question: "Can I begin without visiting the office?", answer: "Yes. You can contact the team by email or WhatsApp and begin through the online application portal." },
      { question: "What information should I include in my enquiry?", answer: "Include your intended country, course, intake, academic background, and the specific support you need whenever possible." },
    ],
    sections: [
      { title: "Visit our office", copy: "Star Mall, 2nd Floor, Putalisadak, Kathmandu", items: ["Sunday–Friday", "9:30 AM–5:30 PM"] },
      { title: "Call or WhatsApp", copy: "Office: 01-4012581 · WhatsApp: 9761642348 | 9761642349 | 9761642336", items: ["WhatsApp counselling enquiries welcome"] },
      { title: "Email", copy: "info@selfapplycenter.com", items: ["Include your intended country, course, and intake when possible"] },
    ],
  },
  "partner-with-us": {
    title: "Build clearer international study pathways with SAC.",
    eyebrow: "Partner With Us",
    intro: "We welcome focused relationships with universities, institutions, and education-sector partners.",
    description: "Explore partnership opportunities with Self Apply Center.",
    faqs: [
      { question: "Who can submit a partnership enquiry?", answer: "Universities, colleges, pathway providers, education agents, counsellors, and relevant student-service organisations may submit an enquiry." },
      { question: "What happens after the form is submitted?", answer: "The SAC team reviews organisational fit, compliance, the proposed collaboration, and potential student benefit before arranging a discussion." },
      { question: "Does submitting the form guarantee a partnership?", answer: "No. Every proposal is reviewed individually, and a partnership proceeds only when expectations, standards, and terms are mutually suitable." },
    ],
    sections: [
      { title: "University partnerships", copy: "Work with a student-focused team that values accurate course representation, prepared applications, and timely communication." },
      { title: "Education-sector collaboration", copy: "Collaborate on student events, application support, test preparation, finance, accommodation, or pre-departure services where there is a clear student benefit." },
      { title: "Our partnership standard", copy: "SAC prioritises fit, transparent terms, reliable communication, and responsible student recruitment over volume-only arrangements." },
    ],
  },
};
