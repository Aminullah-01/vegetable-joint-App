import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks';
import {
  getSellerApprovalStatus,
  canSellerPublish,
  getSellerStatusMeta,
} from '../../utils/sellerStatus.js';
import { SellerStatusBadge } from '../../components/seller/SellerStatusBadge.jsx';

export function SellerProducts() {
  const { user } = useAuth();
  const status = getSellerApprovalStatus(user);
  const canPublish = canSellerPublish(user);
  const statusMeta = getSellerStatusMeta(status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
              My Vegetables & Listings (SEL-02, SEL-03)
            </h1>
            <SellerStatusBadge user={user} />
          </div>
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
            aria-disabled="true"
            data-testid="add-product-btn-disabled"
            title={`Publishing disabled: account is ${statusMeta.label.toLowerCase()} (AUTH-03)`}
            style={{
              backgroundColor: '#94a3b8',
              color: '#ffffff',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'not-allowed',
              opacity: 0.85,
            }}
          >
            + Add Product (Publishing Disabled)
          </button>
        )}
      </div>

      {!canPublish && (
        <div
          role="status"
          data-testid="seller-products-restricted-notice"
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span aria-hidden="true">⚠️</span>
          <span>
            <strong>Publishing Notice:</strong> While your account is {statusMeta.label.toLowerCase()},
            new listings cannot be published to the marketplace and existing products will not be visible to buyers (AUTH-03, BR-11).
          </span>
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
