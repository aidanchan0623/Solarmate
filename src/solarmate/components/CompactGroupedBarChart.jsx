import { useRef, useState } from 'react';

const palette = {
  teal: '#27a1ad',
  gold: '#f2c94c',
  green: '#1c9a65',
  grey: '#8da0a8',
  blueGrey: '#6f8790',
  mutedBlue: '#6e93ad'
};

export default function CompactGroupedBarChart({
  data,
  series,
  xKey,
  height = 240,
  stacked = false,
  valuePrefix = '',
  valueSuffix = '',
  tooltipTitle,
  tooltipItems,
  tooltipExtra,
  emptyMessage = 'No chart data yet.'
}) {
  const wrapperRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const chartData = Array.isArray(data) ? data : [];
  const width = 760;
  const padding = { top: 18, right: 12, bottom: 42, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = stacked
    ? chartData.map((item) => series.reduce((sum, entry) => sum + (Number(item[entry.key]) || 0), 0))
    : chartData.flatMap((item) => series.map((entry) => Number(item[entry.key]) || 0));
  const maxValue = Math.max(...values, 1);
  const groupWidth = chartData.length ? chartWidth / chartData.length : chartWidth;
  const barGap = 3;
  const barWidth = stacked
    ? Math.max(groupWidth - 16, 16)
    : Math.max((groupWidth - 8 - barGap * (series.length - 1)) / series.length, 6);

  function y(value) {
    return padding.top + chartHeight - (Number(value) / maxValue) * chartHeight;
  }

  function pointFromEvent(event) {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number') {
      const target = event.currentTarget?.getBoundingClientRect();
      return {
        x: target ? target.left - bounds.left + target.width / 2 : bounds.width / 2,
        y: target ? target.top - bounds.top : bounds.height / 2
      };
    }
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  }

  function showTooltip(event, item, activeKey) {
    setTooltip({
      ...pointFromEvent(event),
      item,
      activeKey
    });
  }

  function moveTooltip(event) {
    setTooltip((current) => (current ? { ...current, ...pointFromEvent(event) } : current));
  }

  const tooltipRows = tooltip
    ? [
        ...(tooltipItems
          ? tooltipItems(tooltip.item)
          : series.map((entry) => ({
              label: entry.tooltipLabel || entry.label,
              value: `${valuePrefix}${formatValue(Number(tooltip.item[entry.key]) || 0, valuePrefix)}${valueSuffix}`,
              color: entry.color,
              active: entry.key === tooltip.activeKey
            }))),
        ...(tooltipExtra ? tooltipExtra(tooltip.item) : [])
      ]
    : [];

  return (
    <div className="chart-panel compact-chart interactive-chart" ref={wrapperRef}>
      <div className="chart-legend">
        {series.map((entry) => (
          <span key={entry.key}>
            <i style={{ background: palette[entry.color] || entry.color }} />
            {entry.label}
          </span>
        ))}
      </div>
      {chartData.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <svg className="grouped-bar-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grouped bar chart">
          {[0, 0.5, 1].map((line) => {
            const gridY = padding.top + chartHeight * line;
            const label = Math.round(maxValue * (1 - line));
            return (
              <g key={line}>
                <line x1={padding.left} x2={width - padding.right} y1={gridY} y2={gridY} />
                <text x={padding.left - 6} y={gridY + 4} textAnchor="end">{label.toLocaleString()}</text>
              </g>
            );
          })}

          {chartData.map((item, index) => {
            const groupStart = padding.left + index * groupWidth;
            const groupX = groupStart + 2;
            const stackedX = groupStart + Math.max((groupWidth - barWidth) / 2, 2);
            let stackedOffset = 0;
            return (
              <g key={item[xKey]}>
                {series.map((entry, entryIndex) => {
                  const value = Number(item[entry.key]) || 0;
                  const barHeight = chartHeight - (y(value) - padding.top);
                  const x = stacked ? stackedX : groupX + entryIndex * (barWidth + barGap);
                  const stackedY = padding.top + chartHeight - stackedOffset - barHeight;
                  stackedOffset += barHeight;
                  return (
                    <rect
                      fill={palette[entry.color] || entry.color}
                      height={barHeight}
                      key={entry.key}
                      className="chart-bar"
                      onMouseEnter={(event) => showTooltip(event, item, entry.key)}
                      onMouseMove={moveTooltip}
                      onMouseLeave={() => setTooltip(null)}
                      onPointerEnter={(event) => showTooltip(event, item, entry.key)}
                      onPointerMove={moveTooltip}
                      onPointerLeave={() => setTooltip(null)}
                      onClick={(event) => showTooltip(event, item, entry.key)}
                      onFocus={(event) => showTooltip(event, item, entry.key)}
                      onBlur={() => setTooltip(null)}
                      rx="3"
                      tabIndex="0"
                      width={barWidth}
                      x={x}
                      y={stacked ? stackedY : y(value)}
                    >
                      <title>{entry.label}: {valuePrefix}{formatValue(value)}{valueSuffix}</title>
                    </rect>
                  );
                })}
                <text x={groupStart + groupWidth / 2} y={height - 14} textAnchor="middle">
                  {item[xKey]}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          <strong>{tooltipTitle ? tooltipTitle(tooltip.item) : tooltip.item[xKey]}</strong>
          <div className="chart-tooltip-body">
            {tooltipRows.map((row) => (
              <span className={row.active ? 'is-active' : ''} key={`${row.label}-${row.value}`}>
                <i style={{ background: palette[row.color] || row.color }} />
                <span>{row.label}</span>
                <b>{row.value}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(value, valuePrefix = '') {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: valuePrefix === 'RM' ? 2 : 0,
    maximumFractionDigits: 2
  });
}
