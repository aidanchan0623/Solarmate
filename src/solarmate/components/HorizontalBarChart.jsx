import { useRef, useState } from 'react';

const palette = {
  teal: '#27a1ad',
  gold: '#f2c94c',
  green: '#1c9a65',
  grey: '#8da0a8',
  blueGrey: '#6f8790',
  mutedBlue: '#6e93ad'
};

export default function HorizontalBarChart({ items, valuePrefix = '', valueSuffix = '' }) {
  const wrapperRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const max = Math.max(...items.map((item) => item.value), 1);

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

  function showTooltip(event, item) {
    setTooltip({
      ...pointFromEvent(event),
      item
    });
  }

  function moveTooltip(event) {
    setTooltip((current) => (current ? { ...current, ...pointFromEvent(event) } : current));
  }

  return (
    <div className="horizontal-chart interactive-chart" ref={wrapperRef}>
      {items.map((item) => (
        <div
          className="horizontal-chart-row"
          key={item.label}
          onMouseEnter={(event) => showTooltip(event, item)}
          onMouseMove={moveTooltip}
          onMouseLeave={() => setTooltip(null)}
          onPointerEnter={(event) => showTooltip(event, item)}
          onPointerMove={moveTooltip}
          onPointerLeave={() => setTooltip(null)}
          onClick={(event) => showTooltip(event, item)}
          onFocus={(event) => showTooltip(event, item)}
          onBlur={() => setTooltip(null)}
          tabIndex="0"
        >
          <div>
            <strong>{item.label}</strong>
            {item.note && <span>{item.note}</span>}
          </div>
          <div className="horizontal-track">
            <span
              style={{
                width: `${Math.max((item.value / max) * 100, 3)}%`,
                background: palette[item.color] || item.color
              }}
            />
          </div>
          <strong>{valuePrefix}{formatValue(item.value, valuePrefix)}{valueSuffix}</strong>
        </div>
      ))}
      {tooltip && (
        <div
          className="chart-tooltip horizontal-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          <strong>{tooltip.item.tooltipTitle || tooltip.item.label}</strong>
          <div className="chart-tooltip-body">
            {(tooltip.item.tooltipRows || [
              {
                label: tooltip.item.label,
                value: `${valuePrefix}${formatValue(tooltip.item.value, valuePrefix)}${valueSuffix}`,
                color: tooltip.item.color,
                active: true
              }
            ]).map((row) => (
              <span className={row.active ? 'is-active' : ''} key={`${row.label}-${row.value}`}>
                <i style={{ background: palette[row.color] || row.color }} />
                <span>{row.label}</span>
                <b>{row.value}</b>
              </span>
            ))}
            {tooltip.item.tooltipNote && <p>{tooltip.item.tooltipNote}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(value, valuePrefix) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: valuePrefix === 'RM' ? 2 : 0,
    maximumFractionDigits: valuePrefix === 'RM' ? 2 : 0
  });
}
