type ExplanationGroupProps = {
  title: string;
  symbol: string;
  tone: "aligns" | "verify" | "differs";
  explanations: readonly string[];
};

export default function ExplanationGroup({
  title,
  symbol,
  tone,
  explanations,
}: ExplanationGroupProps) {
  return (
    <section className={`finder-explanation-group is-${tone}`} aria-label={title}>
      <h4><span aria-hidden="true">{symbol}</span>{title}</h4>
      {explanations.length > 0 ? (
        <ul>
          {explanations.map((explanation, index) => (
            <li key={`${index}-${explanation}`}>{explanation}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
