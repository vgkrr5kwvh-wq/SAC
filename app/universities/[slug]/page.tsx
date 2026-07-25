import type { Metadata } from "next";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  fetchUniversityDetail,
  UniversityDetailApiError,
  type UniversityDetailApiResponse,
} from "@/lib/university-intelligence/api/university-detail.client";
import UniversityDetailView from "./_components/university-detail";

async function apiOrigin(): Promise<string> {
  if (process.env.AUTH_URL) return new URL(process.env.AUTH_URL).origin;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")
    ?? requestHeaders.get("host");
  if (!host) throw new Error("University API origin is unavailable.");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return `${protocol}://${host}`;
}

const loadUniversity = cache(async (slug: string) =>
  fetchUniversityDetail(await apiOrigin(), slug)
);

export function buildUniversityMetadata(
  university: UniversityDetailApiResponse["university"],
): Metadata {
  const description = university.description
    || `Explore programs, scholarships, admission information, and official links for ${university.name}.`;
  return {
    title: university.name,
    description,
    alternates: { canonical: `/universities/${university.slug}` },
    openGraph: {
      title: university.name,
      description,
      url: `/universities/${university.slug}`,
      images: university.bannerImageUrl
        ? [{ url: university.bannerImageUrl, alt: university.name }]
        : [{ url: "/og.png", alt: "Self Apply Center" }],
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { university } = await loadUniversity(slug);
    return buildUniversityMetadata(university);
  } catch (error) {
    if (error instanceof UniversityDetailApiError && error.status === 404) {
      return {
        title: "University not found",
        robots: { index: false, follow: false },
      };
    }
    return {
      title: "University profile unavailable",
      robots: { index: false, follow: false },
    };
  }
}

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data;
  try {
    data = await loadUniversity(slug);
  } catch (error) {
    if (error instanceof UniversityDetailApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  return <UniversityDetailView data={data} />;
}
