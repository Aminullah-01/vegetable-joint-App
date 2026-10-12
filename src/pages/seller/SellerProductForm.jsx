import { useParams, Link } from 'react-router-dom';
import { useAuth, useToast } from '../../hooks';
import {
  getSellerApprovalStatus,
  canSellerPublish,
  getSellerStatusMeta,
} from '../../utils/sellerStatus.js';
import { SellerStatusBadge } from '../../components/seller/SellerStatusBadge.jsx';
import { SellerApprovalNotice } from '../../components/seller/SellerApprovalNotice.jsx';

export function SellerProductForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();

  const status = getSellerApprovalStatus(user);
  const canPublish = canSellerPublish(user);
  const statusMeta = getSellerStatusMeta(status);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canPublish) {
      toast.error(
        `Cannot publish listing: Your seller account is ${statusMeta.label.toLowerCase()} (AUTH-03).`
      );
      return;
    }
    toast.success(isEditing ? 'Listing updated successfully!' : 'Listing published successfully!');
  };

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
        <Link
          to="/seller/products"
          style={{
            color: '#15803d',
            textDecoration: 'none',
            fontSize: '0.85rem',
          }}
        >
          ← Back to My Products
        </Link>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            margin: '0.5rem 0 0 0',
          }}
        >
          <h1
            style={{
              fontSize: '1.75rem',
              color: '#1e293b',
              margin: 0,
            }}
          >
            {isEditing
              ? `Edit Vegetable Listing #${id}`
              : 'Add New Vegetable Listing'}{' '}
            (SEL-02, SEL-03)
          </h1>
          <SellerStatusBadge user={user} />
        </div>
      </div>

      {!canPublish && <SellerApprovalNotice inline status={status} />}

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
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="prod-name"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Vegetable Name
            </label>
            <input
              id="prod-name"
              type="text"
              defaultValue={isEditing ? 'Fresh Ugwu (Fluted Pumpkin)' : ''}
              placeholder="e.g. Fresh Ugwu"
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
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}
          >
            <div>
              <label
                htmlFor="prod-price"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                }}
              >
                Price (₦)
              </label>
              <input
                id="prod-price"
                type="number"
                defaultValue={isEditing ? '1200' : ''}
                placeholder="1200"
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
                htmlFor="prod-unit"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                }}
              >
                Unit
              </label>
              <select
                id="prod-unit"
                defaultValue={isEditing ? 'bunch' : 'kg'}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="bunch">per bunch</option>
                <option value="basket">per basket</option>
                <option value="kg">per kg</option>
                <option value="bag">per bag</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="prod-stock"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Stock Quantity Available
            </label>
            <input
              id="prod-stock"
              type="number"
              defaultValue={isEditing ? '45' : '10'}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={!canPublish}
              aria-disabled={!canPublish}
              data-testid="save-product-submit-btn"
              title={
                !canPublish
                  ? `Publishing disabled: account is ${statusMeta.label.toLowerCase()} (AUTH-03)`
                  : undefined
              }
              style={{
                backgroundColor: canPublish ? '#15803d' : '#94a3b8',
                color: '#ffffff',
                padding: '0.65rem 1.5rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                cursor: canPublish ? 'pointer' : 'not-allowed',
                opacity: canPublish ? 1 : 0.85,
              }}
            >
              {canPublish
                ? isEditing
                  ? 'Update Listing'
                  : 'Save & Publish Listing'
                : `Publishing Disabled (${statusMeta.label})`}
            </button>
            <Link
              to="/seller/products"
              style={{
                padding: '0.65rem 1.25rem',
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SellerProductForm;
