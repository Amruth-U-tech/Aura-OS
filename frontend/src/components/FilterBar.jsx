export default function FilterBar({ filter, setFilter }) {
  const filters = ["All", "Active", "Completed", "Elite Priority", "High Priority", "Work", "Personal"];

  return (
    <div className="filters-container">
      {filters.map(f => (
        <button
          key={f}
          className={`filter-btn ${filter === f ? "active" : ""}`}
          onClick={() => setFilter(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
