export function AdminAuditLog() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Admin Audit Log (ADM-09)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Immutable log of administrative and moderation actions.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <th style={{ padding: '0.75rem 1rem' }}>Timestamp (WAT)</th>
              <th style={{ padding: '0.75rem 1rem' }}>Admin User</th>
              <th style={{ padding: '0.75rem 1rem' }}>Action</th>
              <th style={{ padding: '0.75rem 1rem' }}>Target</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                id: 1,
                time: '2026-09-25 14:10:00',
                admin: 'Super Admin',
                action: 'Approved Seller',
                target: 'Ibrahim Agro Farms',
              },
              {
                id: 2,
                time: '2026-09-25 11:22:15',
                admin: 'Super Admin',
                action: 'Created Category',
                target: 'Leafy Greens',
              },
            ].map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    color: '#64748b',
                    fontSize: '0.85rem',
                  }}
                >
                  {log.time}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                  {log.admin}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{log.action}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#15803d' }}>
                  {log.target}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminAuditLog;
