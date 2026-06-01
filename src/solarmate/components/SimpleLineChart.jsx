const palette = {
  teal: '#27a1ad',
  gold: '#f2c94c',
  grey: '#9aa8ad',
  blue: '#3f7fb8',
  green: '#1c9a65'
};

export default function SimpleLineChart({ data, series, xKey, height = 280 }) {
  const width = 760;
  const padding = { top: 22, right: 24, bottom: 42, left: 44 };
  const values = data.flatMap((item) => series.map((line) => Number(item[line.key]) || 0));
  const maxValue = Math.max(...values, 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  function x(index) {
    if (data.length === 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  }

  function y(value) {
    return padding.top + chartHeight - (Number(value) / maxValue) * chartHeight;
  }

  function pathFor(key) {
    return data
      .map((item, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(item[key]).toFixed(1)}`)
      .join(' ');
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="chart-panel">
      <div className="chart-legend">
        {series.map((line) => (
          <span key={line.key}>
            <i style={{ background: palette[line.color] || line.color }} />
            {line.label}
          </span>
        ))}
      </div>
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart">
        {gridLines.map((position) => {
          const gridY = padding.top + chartHeight * position;
          const label = Math.round(maxValue * (1 - position));
          return (
            <g key={position}>
              <line x1={padding.left} x2={width - padding.right} y1={gridY} y2={gridY} />
              <text x={padding.left - 10} y={gridY + 4}>{label}</text>
            </g>
          );
        })}
        {series.map((line) => (
          <path
            d={pathFor(line.key)}
            fill="none"
            key={line.key}
            stroke={palette[line.color] || line.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        ))}
        {data.map((item, index) => (
          <text key={item[xKey]} x={x(index)} y={height - 14} textAnchor="middle">
            {item[xKey]}
          </text>
        ))}
      </svg>
    </div>
  );
}
