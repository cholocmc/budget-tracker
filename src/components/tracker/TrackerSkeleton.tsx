// Placeholder in the shape of the tracker: header, month rail, totals, chart and summary, expenses.
// No hooks or client state, so it renders from the route's loading.tsx the moment /tracker is requested,
// and again in TrackerApp until the browser has picked its local month.

const Bone = ({ w, h, round }: { w: number | string; h: number; round?: boolean }) => (
  <span className={`sk${round ? " sk-round" : ""}`} style={{ width: w, height: h }} />
);

export function TrackerSkeleton() {
  return (
    <div className="wrap pg-tracker sk-page" aria-busy="true" aria-label="Loading your tracker">
      <header className="top" aria-hidden="true">
        <div className="brand">
          <Bone w={40} h={40} round />
          <div className="sk-stack">
            <Bone w={180} h={20} />
            <Bone w={120} h={13} />
          </div>
        </div>
        <div className="members">
          <Bone w={72} h={34} round />
          <Bone w={92} h={40} />
          <Bone w={40} h={40} />
        </div>
      </header>

      <section className="rail" aria-hidden="true">
        <div className="month-nav">
          <Bone w={40} h={40} round />
          <div className="sk-stack">
            <Bone w={80} h={11} />
            <Bone w={170} h={26} />
          </div>
          <Bone w={40} h={40} round />
        </div>
        <div className="tracker-chips">
          <Bone w={128} h={40} />
        </div>
      </section>

      <section className="kpis" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="kpi">
            <Bone w={90} h={11} />
            <Bone w="70%" h={28} />
            <Bone w="50%" h={12} />
          </div>
        ))}
      </section>

      <section className="split sk-split" aria-hidden="true">
        <div className="panel sk-panel">
          <Bone w={140} h={16} />
          <div className="sk-center">
            <Bone w={200} h={200} round />
          </div>
        </div>
        <div />
        <div className="panel sk-panel">
          <Bone w={160} h={16} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Bone key={i} w="100%" h={18} />
          ))}
        </div>
      </section>

      <section className="panel sk-panel" aria-hidden="true">
        <Bone w={120} h={16} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} w="100%" h={22} />
        ))}
      </section>
    </div>
  );
}
