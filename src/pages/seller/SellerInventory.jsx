export function SellerInventory() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Inventory Management (SEL-08, SEL-09)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Real-time stock quantities and low-stock warnings.
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
              <th style={{ padding: '0.75rem 1rem' }}>Vegetable</th>
              <th style={{ padding: '0.75rem 1rem' }}>Current Stock</th>
              <th style={{ padding: '0.75rem 1rem' }}>Alert Threshold</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                id: 1,
                name: 'Fresh Ugwu',
                stock: '45 bunches',
                threshold: '10 bunches',
                status: 'Healthy',
              },
              {
                id: 2,
                name: 'Roma Tomatoes',
                stock: '3 baskets',
                threshold: '5 baskets',
                status: 'Low Stock',
              },
            ].map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                  {item.name}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{item.stock}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{item.threshold}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      backgroundColor:
                        item.status === 'Low Stock' ? '#fee2e2' : '#dcfce7',
                      color:
                        item.status === 'Low Stock' ? '#dc2626' : '#15803d',
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontWeight: '600',
                    }}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SellerInventory;
