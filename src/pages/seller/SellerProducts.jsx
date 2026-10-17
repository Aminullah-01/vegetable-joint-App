import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { canSellerPublish } from '../../utils/sellerStatus';

export function SellerProducts() {
  const { user } = useAuth();
  const canPublish = canSellerPublish(user);

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
            My Vegetables & Listings (SEL-02, SEL-03)
          </h1>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: '0.25rem 0 0 0',
            }}
          >
            Manage and edit vegetables listed on the public marketplace.
          </p>
        </div>
        {canPublish ? (
          <Link
            to="/seller/products/new"
            data-testid="add-product-link"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            + Add Product
          </Link>
        ) : (
          <button
            type="button"
            disabled
            data-testid="add-product-disabled-btn"
            title="You cannot publish product listings until your seller account is approved by an administrator (AUTH-03)."
            style={{
              backgroundColor: '#f1f5f9',
              color: '#94a3b8',
              border: '1px solid #cbd5e1',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span aria-hidden="true">🔒</span>
            <span>+ Add Product (Locked)</span>
          </button>
        )}
      </div>

      {/* Publishing disabled notice (FE-064 / AUTH-03) */}
      {!canPublish && (
        <div
          data-testid="products-publishing-disabled-notice"
          role="alert"
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}
        >
          ⚠️ <strong>Publishing disabled:</strong> You cannot create new product
          listings until an administrator approves your seller account
          (AUTH-03). Existing listings below remain visible only to you.
        </div>
      )}

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div className="table-responsive">
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
                <th style={{ padding: '0.75rem 1rem' }}>Product</th>
                <th style={{ padding: '0.75rem 1rem' }}>Price</th>
                <th style={{ padding: '0.75rem 1rem' }}>Stock</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  id: 1,
                  name: 'Fresh Ugwu',
                  price: '₦1,200',
                  stock: '45 bunches',
                  status: 'Available',
                },
                {
                  id: 2,
                  name: 'Roma Tomatoes',
                  price: '₦8,500',
                  stock: '12 baskets',
                  status: 'Available',
                },
              ].map((prod) => (
                <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                    {prod.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{prod.price}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{prod.stock}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {prod.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Link
                      to={`/seller/products/${prod.id}/edit`}
                      style={{
                        color: '#15803d',
                        textDecoration: 'none',
                        fontWeight: '500',
                        fontSize: '0.85rem',
                      }}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SellerProducts;
