export default function SimulationInput({ label, value, onChange, suffix, min = 0, step = 'any' }) {
  return (
    <label className="simulation-input">
      <span>{label}</span>
      <div>
        <input
          min={min}
          step={step}
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}
