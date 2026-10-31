/** Pretty-prints JSON with keys picked out, for the oracle examples. */
export function JsonView({ value }: { value: unknown }) {
  const lines = JSON.stringify(value, null, 2).split('\n');
  return (
    <pre className="code json" tabIndex={0} role="region" aria-label="Sample oracle response">
      {lines.map((line, i) => {
        const m = /^(\s*)"(\w+)":(.*)$/.exec(line);
        return (
          <span key={i}>
            {m ? (
              <>
                {m[1]}
                <span className="k">"{m[2]}"</span>:{m[3]}
              </>
            ) : (
              line
            )}
            {'\n'}
          </span>
        );
      })}
    </pre>
  );
}
