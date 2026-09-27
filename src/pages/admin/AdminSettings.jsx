export function AdminSettings() {
  return (
    <div
      style={{
        maxWidth: '650px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Marketplace Settings (ADM-08)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Configure marketplace platform rules and operational parameters.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
        }}
      >
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <label
              htmlFor="settings-fee"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Default Delivery Fee (₦)
            </label>
            <input
              id="settings-fee"
              type="number"
              defaultValue="1000"
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="settings-cutoff"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Daily Order Cut-off Time (WAT)
            </label>
            <input
              id="settings-cutoff"
              type="time"
              defaultValue="17:00"
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}
          >
            <input
              id="auto-approve-sellers"
              type="checkbox"
              defaultChecked={false}
            />
            <label
              htmlFor="auto-approve-sellers"
              style={{ fontSize: '0.85rem', color: '#334155' }}
            >
              Auto-approve seller registrations (Disabled for security)
            </label>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              alignSelf: 'flex-start',
              marginTop: '1rem',
            }}
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminSettings;
