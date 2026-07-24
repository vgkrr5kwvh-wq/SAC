import Link from "next/link";

type RecommendationActionsProps = {
  universityWebsite: string;
  universityName: string;
  onModifyAnswers: () => void;
};

export default function RecommendationActions({
  universityWebsite,
  universityName,
  onModifyAnswers,
}: RecommendationActionsProps) {
  const whatsappMessage = encodeURIComponent(
    `Hello Self Apply Center, I would like to discuss ${universityName} from my University Finder results.`,
  );

  return (
    <div className="finder-result-actions" aria-label={`Actions for ${universityName}`}>
      <a className="button primary" href={universityWebsite} target="_blank" rel="noopener noreferrer">
        View university details
      </a>
      <Link className="button secondary" href="/contact">Contact a counsellor</Link>
      <a
        className="finder-result-text-action"
        href={`https://wa.me/9779761642336?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp us
      </a>
      <button className="finder-result-text-action" type="button" onClick={onModifyAnswers}>
        Modify answers
      </button>
    </div>
  );
}
