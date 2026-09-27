export function AdminCategories() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
            Vegetable Categories (ADM-05)
          </h1>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: '0.25rem 0 0 0',
            }}
          >
            Manage category taxonomy for marketplace navigation.
          </p>
        </div>
        <button
          type="button"
          style={{
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '0.6rem 1.2rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          + Add Category
        </button>
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
              <th style={{ padding: '0.75rem 1rem' }}>Category</th>
              <th style={{ padding: '0.75rem 1rem' }}>Slug</th>
              <th style={{ padding: '0.75rem 1rem' }}>Product Count</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                id: 1,
                name: 'Leafy Greens (Ugwu, Waterleaf, Spinach)',
                slug: 'leafy-greens',
                count: 24,
              },
              {
                id: 2,
                name: 'Root Vegetables (Carrots, Onions, Beetroot)',
                slug: 'root-vegetables',
                count: 18,
              },
              {
                id: 3,
                name: 'Peppers & Tomatoes (Tatase, Rodo, Roma)',
                slug: 'peppers-tomatoes',
                count: 32,
              },
            ].map((cat) => (
              <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                  {cat.name}
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    color: '#64748b',
                    fontFamily: 'monospace',
                  }}
                >
                  {cat.slug}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {cat.count} listings
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <button
                    type="button"
                    style={{
                      border: '1px solid #cbd5e1',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      backgroundColor: '#fff',
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminCategories;
