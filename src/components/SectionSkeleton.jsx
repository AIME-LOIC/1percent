function SectionSkeleton({ lines = 3, cards = 3 }) {
  return (
    <section className="section-skeleton" aria-hidden="true">
      <div className="skeleton-title skeleton-shimmer"></div>
      <div className="skeleton-lines">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={`line-${index}`} className="skeleton-line skeleton-shimmer"></div>
        ))}
      </div>
      <div className="skeleton-card-grid">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={`card-${index}`} className="skeleton-card">
            <div className="skeleton-thumb skeleton-shimmer"></div>
            <div className="skeleton-line skeleton-shimmer"></div>
            <div className="skeleton-line short skeleton-shimmer"></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SectionSkeleton;
