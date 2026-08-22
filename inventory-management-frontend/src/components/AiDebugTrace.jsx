function AiDebugTrace({ trace, userMessage, reply }) {
  if (!trace) {
    return <p className="muted">No trace data for this turn.</p>;
  }

  return (
    <div className="ai-debug-trace">
      <section className="ai-debug-section">
        <h4>User Input</h4>
        <pre>{userMessage || "—"}</pre>
      </section>

      <section className="ai-debug-section">
        <h4>Agent Decision</h4>
        <dl className="ai-debug-dl">
          <dt>Flow type</dt>
          <dd>{trace.flowType || "direct_response"}</dd>
          <dt>Model</dt>
          <dd>{trace.model || "—"}</dd>
          <dt>Latency</dt>
          <dd>{trace.latencyMs != null ? `${trace.latencyMs}ms` : "—"}</dd>
          <dt>Success</dt>
          <dd>{trace.success === false ? "failed" : "ok"}</dd>
        </dl>
      </section>

      {(trace.toolCalls || []).length > 0 && (
        <section className="ai-debug-section">
          <h4>Tool Calls</h4>
          {trace.toolCalls.map((call, index) => (
            <div key={index} className="ai-debug-card">
              <strong>{call.name}</strong>
              <pre>{JSON.stringify(call.args || {}, null, 2)}</pre>
              <p className="small">
                Status: {call.status || (call.success ? "success" : "error")}
                {call.durationMs != null ? ` · ${call.durationMs}ms` : ""}
              </p>
              {call.result && (
                <>
                  <h5>Result</h5>
                  <pre>{JSON.stringify(call.result, null, 2)}</pre>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      {trace.ragRetrieval && (
        <section className="ai-debug-section">
          <h4>RAG Retrieval</h4>
          <dl className="ai-debug-dl">
            <dt>Query</dt>
            <dd>{trace.ragRetrieval.query || "—"}</dd>
          </dl>
          <ul className="ai-debug-list">
            {(trace.ragRetrieval.sources || []).map((source, index) => (
              <li key={index}>
                {source.sourceFile} — {source.section} (score: {source.score})
              </li>
            ))}
          </ul>
        </section>
      )}

      {trace.hybridSummary && (
        <section className="ai-debug-section">
          <h4>Hybrid Summary</h4>
          <pre>{JSON.stringify(trace.hybridSummary, null, 2)}</pre>
        </section>
      )}

      {trace.confirmationRequired && (
        <section className="ai-debug-section">
          <h4>Confirmation</h4>
          <pre>{JSON.stringify(trace.confirmationRequired, null, 2)}</pre>
        </section>
      )}

      <section className="ai-debug-section">
        <h4>Final Response</h4>
        <pre>{reply || trace.finalResponse || "—"}</pre>
      </section>
    </div>
  );
}

export default AiDebugTrace;
