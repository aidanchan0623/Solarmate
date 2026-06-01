import StatCard from './StatCard';

export default function MetricGrid({ metrics, columns = 'auto' }) {
  return (
    <section className={`metric-grid grid-${columns}`}>
      {metrics.map((metric) => (
        <StatCard key={metric.label} {...metric} />
      ))}
    </section>
  );
}
