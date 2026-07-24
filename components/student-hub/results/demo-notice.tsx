export default function DemoNotice() {
  return (
    <aside className="finder-results-demo-notice" role="note" aria-labelledby="finder-demo-title">
      <span aria-hidden="true">i</span>
      <div>
        <h2 id="finder-demo-title">Demonstration catalog</h2>
        <p>
          These results use sample university records to demonstrate how the finder works.
          They are not real university recommendations or admission advice. Confirm all
          requirements with the university and a qualified counsellor.
        </p>
      </div>
    </aside>
  );
}
