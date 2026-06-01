const colors = {
  teal: '#27a1ad',
  gold: '#f2c94c',
  grey: '#9aa8ad',
  blue: '#3f7fb8'
};

export default function ComparisonChart({ items }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="comparison-chart">
      {items.map((item) => (
        <div className="comparison-row" key={item.label}>
          <div>
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </div>
          <div className="comparison-track">
            <span
              style={{
                width: `${(item.value / max) * 100}%`,
                background: colors[item.color] || item.color
              }}
            />
          </div>
          <strong className="comparison-value">{item.display || item.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}
