"use client";

import { useEffect, useRef } from "react";
import {
  getOptionLabel,
  studyLevelOptions,
} from "@/lib/student-hub/university-finder/options";
import type {
  UniversityFinderAnswers,
  UniversityRecommendationCollection,
} from "@/lib/student-hub/university-finder/types";
import DemoNotice from "./demo-notice";
import EmptyResults from "./empty-results";
import RecommendationCard from "./recommendation-card";

type ResultsPageProps = {
  answers: UniversityFinderAnswers;
  recommendations: UniversityRecommendationCollection;
  totalEvaluated: number;
  onModifyAnswers: () => void;
};

export default function ResultsPage({
  answers,
  recommendations,
  totalEvaluated,
  onModifyAnswers,
}: ResultsPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const studyLevel = getOptionLabel(studyLevelOptions, answers.studyLevel);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="finder-results" aria-labelledby="finder-results-title">
      <header className="finder-results-heading">
        <div>
          <span className="eyebrow">Your university finder results</span>
          <h2 id="finder-results-title" ref={headingRef} tabIndex={-1}>Universities to review</h2>
          <p>
            These results explain how the available catalog information compares with
            your answers. They do not confirm admission eligibility.
          </p>
        </div>
        <dl aria-label="Results totals">
          <div><dt>Evaluated</dt><dd>{totalEvaluated}</dd></div>
          <div><dt>Returned</dt><dd>{recommendations.results.length}</dd></div>
        </dl>
      </header>

      {recommendations.showDemonstrationCatalogNotice ? <DemoNotice /> : null}

      {recommendations.results.length === 0 ? (
        <EmptyResults onModifyAnswers={onModifyAnswers} />
      ) : (
        <ol className="finder-results-list" aria-label="University recommendations">
          {recommendations.results.map((recommendation) => (
            <li key={`${recommendation.university.name}-${recommendation.program.name}`}>
              <RecommendationCard
                recommendation={recommendation}
                studyLevel={studyLevel}
                onModifyAnswers={onModifyAnswers}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
