export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readTime: string;
  image: string;
  content: string[];
};

// Add new articles at the top of this array. The blog index and article pages
// are generated automatically from this single source.
export const blogPosts: BlogPost[] = [
  {
    slug: "study-abroad-application-timeline",
    title: "Your 12-month study-abroad application timeline",
    excerpt: "A practical month-by-month plan covering research, tests, documents, applications, offers, and visa preparation.",
    category: "Application planning",
    publishedAt: "2026-07-16",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=85",
    content: [
      "Starting early gives you time to compare programs carefully instead of making rushed decisions around deadlines. Begin by reviewing your academic profile, budget, preferred countries, and intended intake.",
      "During the next stage, prepare for language tests, research entry requirements, and build a balanced university shortlist. Keep ambitious, realistic, and safer options in the same plan.",
      "Use the final months for polished documents, complete applications, scholarship checks, offer conditions, financial preparation, and visa requirements. Your exact timeline will vary by destination and intake.",
    ],
  },
  {
    slug: "choose-the-right-study-destination",
    title: "How to choose the right study destination",
    excerpt: "Look beyond popularity and compare academic fit, total cost, career relevance, lifestyle, and entry requirements.",
    category: "Destinations",
    publishedAt: "2026-07-08",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=85",
    content: [
      "The best destination is the one that fits your academic history, financial capacity, preferred learning environment, and long-term goals. A popular choice is not automatically the right choice.",
      "Compare the complete cost of study, including tuition, accommodation, insurance, transport, and daily living. Then examine the course structure, university support, location, and relevant career outcomes.",
      "Before committing, confirm current entry and visa requirements and discuss possible risks. A clear comparison makes it easier to explain and defend your final decision.",
    ],
  },
  {
    slug: "strong-statement-of-purpose",
    title: "What makes a strong Statement of Purpose?",
    excerpt: "Build a credible story connecting your education, experience, course choice, university, and future plan.",
    category: "Documents",
    publishedAt: "2026-06-27",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=85",
    content: [
      "A strong SOP is specific, personal, and consistent with the rest of your application. It should explain the academic and professional experiences that led to your chosen field.",
      "Show that you understand the course and university. Connect particular modules, teaching approaches, or opportunities to the skills you want to develop.",
      "Finish with a realistic future plan. Avoid copied language and unsupported claims; clear reasoning and authentic detail are more persuasive than exaggerated promises.",
    ],
  },
];

export const blogPostMap = Object.fromEntries(blogPosts.map((post) => [post.slug, post]));
