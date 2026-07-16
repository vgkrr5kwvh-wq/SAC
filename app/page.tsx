import type { Metadata } from "next";
import HomePage from "./home-page";

export const metadata: Metadata = {
  title: "Guided Self-Application for Global Study",
  description:
    "Apply abroad with expert guidance, transparent planning, document review, and clear next steps from Self Apply Center.",
};

export default function Page() {
  return <HomePage />;
}
