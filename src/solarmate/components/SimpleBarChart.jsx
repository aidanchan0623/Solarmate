const colors = {
  teal: '#27a1ad',
  gold: '#f2c94c',
  grey: '#9aa8ad',
  blueGrey: '#6f8790',
  green: '#1c9a65'
};

export default function SimpleBarChart({ items, valuePrefix = '', valueSuffix = '' }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="bar-chart-card">
      {items.map((item) => (
        <div className="bar-chart-item" key={item.label}>
          <div className="bar-column">
            <span
              style={{
                height: `${Math.max((item.value / max) * 100, 5)}%`,
                background: colors[item.color] || item.color
              }}
            />
          </div>
          <strong>{valuePrefix}{formatValue(item.value, valuePrefix)}{valueSuffix}</strong>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function formatValue(value, valuePrefix) {
  if (valuePrefix === 'RM') {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  if (value >= 1000) return value.toLocaleString();
  return Number(value.toFixed ? value.toFixed(2) : value).toLocaleString();
}
