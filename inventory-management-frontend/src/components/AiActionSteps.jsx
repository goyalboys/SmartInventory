import { buildActionSteps } from "../utils/aiTraceFormat";

function AiActionSteps({ trace, compact = false }) {
  const steps = buildActionSteps(trace);

  if (!steps.length) return null;

  return (
    <div className={`ai-action-steps ${compact ? "compact" : ""}`}>
      {steps.map((step, index) => (
        <div key={`${step.type}-${index}`} className={`ai-action-step status-${step.status}`}>
          <span className="ai-action-icon">{step.icon}</span>
          <div className="ai-action-body">
            <strong>{step.label}</strong>
            {step.detail && <span className="ai-action-detail">{step.detail}</span>}
          </div>
          {step.status === "success" && <span className="ai-action-badge">✓</span>}
          {step.status === "error" && <span className="ai-action-badge error">✗</span>}
          {step.status === "pending" && <span className="ai-action-badge pending">…</span>}
        </div>
      ))}
    </div>
  );
}

export default AiActionSteps;
