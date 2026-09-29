import { createRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Input,
  Select,
  Textarea,
  Checkbox,
  Radio,
  RadioGroup,
  FormField,
} from '../index.js';

describe('Form Field Components (FE-024, UI-05, NFR-USAB-05)', () => {
  // ============================================================================
  // 1. Input Component Tests
  // ============================================================================
  describe('Input Component', () => {
    it('renders label and links htmlFor to input id automatically', () => {
      render(<Input label="Email Address" />);

      const label = screen.getByText('Email Address');
      const input = screen.getByLabelText('Email Address');

      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
    });

    it('uses explicit id when provided', () => {
      render(<Input id="custom-email-id" label="Customer Email" />);

      const input = screen.getByLabelText('Customer Email');
      expect(input).toHaveAttribute('id', 'custom-email-id');
    });

    it('displays required asterisk and sets aria-required when required is true', () => {
      render(<Input label="Full Name" required />);

      const input = screen.getByLabelText(/Full Name/i);
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toBeRequired();
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });

    it('displays optional indicator when optional prop is true or string', () => {
      const { rerender } = render(<Input label="Delivery Notes" optional />);
      expect(screen.getByText('(optional)')).toBeInTheDocument();

      rerender(<Input label="Delivery Notes" optional="Not mandatory" />);
      expect(screen.getByText('Not mandatory')).toBeInTheDocument();
    });

    it('supports correct input types and autocomplete attributes (NFR-USAB-05)', () => {
      render(
        <Input
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="buyer@example.com"
        />
      );

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('autocomplete', 'email');
      expect(input).toHaveAttribute('placeholder', 'buyer@example.com');
    });

    it('displays inline validation error and sets aria-invalid and aria-describedby (UI-05)', () => {
      render(
        <Input
          id="test-phone"
          type="tel"
          label="Phone Number"
          error="Please enter a valid Nigerian phone number"
        />
      );

      const input = screen.getByLabelText(/Phone Number/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'test-phone-error');

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'Please enter a valid Nigerian phone number'
      );
      expect(alert).toHaveAttribute('id', 'test-phone-error');
    });

    it('displays helper text and links aria-describedby when there is no error', () => {
      render(
        <Input
          id="test-code"
          label="Coupon Code"
          helperText="Enter code FRESH20 for 20% discount"
        />
      );

      const input = screen.getByLabelText('Coupon Code');
      expect(input).toHaveAttribute('aria-describedby', 'test-code-helper');
      expect(
        screen.getByText('Enter code FRESH20 for 20% discount')
      ).toBeInTheDocument();
    });

    it('displays success message when success prop is a string and no error', () => {
      render(
        <Input
          id="username"
          label="Username"
          value="aminu_farmer"
          onChange={() => {}}
          success="Username is available"
        />
      );

      expect(screen.getByText('Username is available')).toBeInTheDocument();
    });

    it('toggles password visibility between password and text', async () => {
      const user = userEvent.setup();
      render(
        <Input
          type="password"
          label="Password"
          defaultValue="SecretPass123"
          showPasswordToggle
        />
      );

      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getByRole('button', { name: /Show password/i });
      expect(toggleBtn).toBeInTheDocument();

      await user.click(toggleBtn);
      expect(input).toHaveAttribute('type', 'text');
      expect(
        screen.getByRole('button', { name: /Hide password/i })
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Hide password/i }));
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders startIcon/prefix and endIcon/suffix adornments', () => {
      render(
        <Input
          label="Price per kg"
          prefix={<span>₦</span>}
          suffix={<span>/ basket</span>}
        />
      );

      expect(screen.getByText('₦')).toBeInTheDocument();
      expect(screen.getByText('/ basket')).toBeInTheDocument();
    });

    it('clears input value when clear button is clicked', async () => {
      const user = userEvent.setup();
      const handleClear = vi.fn();

      render(
        <Input
          label="Search"
          value="Fresh tomatoes"
          clearable
          onClear={handleClear}
          onChange={() => {}}
        />
      );

      const clearBtn = screen.getByRole('button', { name: 'Clear input' });
      expect(clearBtn).toBeInTheDocument();

      await user.click(clearBtn);
      expect(handleClear).toHaveBeenCalledTimes(1);
    });

    it('respects disabled state', () => {
      render(<Input label="Disabled Field" disabled value="Locked data" />);

      const input = screen.getByLabelText('Disabled Field');
      expect(input).toBeDisabled();
    });

    it('triggers onChange, onFocus, and onBlur handlers', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();

      render(
        <Input
          label="Address"
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      );

      const input = screen.getByLabelText('Address');
      await user.click(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);

      await user.type(input, '12 Market Rd');
      expect(handleChange).toHaveBeenCalled();

      await user.tab();
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('forwards ref correctly to the input DOM node', () => {
      const inputRef = createRef();
      render(<Input ref={inputRef} label="With Ref" />);

      expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  // ============================================================================
  // 2. Select Component Tests
  // ============================================================================
  describe('Select Component', () => {
    const categoryOptions = [
      { value: 'leafy', label: 'Leafy Vegetables (Spinach, Ugwu)' },
      { value: 'root', label: 'Root Vegetables (Carrots, Potatoes)' },
      { value: 'fruit', label: 'Fruit Vegetables (Tomatoes, Peppers)' },
      { value: 'allium', label: 'Alliums (Onions, Garlic)', disabled: true },
    ];

    it('renders label with accessible association', () => {
      render(
        <Select
          label="Vegetable Category"
          placeholder="Choose category..."
          options={categoryOptions}
        />
      );

      const label = screen.getByText('Vegetable Category');
      const select = screen.getByLabelText('Vegetable Category');
      expect(label).toBeInTheDocument();
      expect(select).toBeInTheDocument();
      expect(label.getAttribute('for')).toBe(select.getAttribute('id'));
    });

    it('renders options from options array with disabled option support', () => {
      render(
        <Select
          label="Category"
          placeholder="Choose category..."
          options={categoryOptions}
        />
      );

      expect(
        screen.getByRole('option', { name: 'Choose category...' })
      ).toBeDisabled();
      expect(
        screen.getByRole('option', {
          name: 'Leafy Vegetables (Spinach, Ugwu)',
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Alliums (Onions, Garlic)' })
      ).toBeDisabled();
    });

    it('supports nested optgroups in options array', () => {
      const groupedOptions = [
        {
          label: 'Fresh Produce',
          options: [
            { value: 'spinach', label: 'Spinach' },
            { value: 'ugwu', label: 'Ugwu' },
          ],
        },
        {
          label: 'Tubers',
          options: [{ value: 'yam', label: 'Yam' }],
        },
      ];

      render(<Select label="Produce" options={groupedOptions} />);

      expect(
        screen.getByRole('group', { name: 'Fresh Produce' })
      ).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Tubers' })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Spinach' })
      ).toBeInTheDocument();
    });

    it('supports direct JSX children options', () => {
      render(
        <Select label="Measurement Unit">
          <option value="kg">Kilogram (kg)</option>
          <option value="basket">Basket</option>
          <option value="bag">Bag (50kg)</option>
        </Select>
      );

      expect(
        screen.getByRole('option', { name: 'Kilogram (kg)' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Basket' })
      ).toBeInTheDocument();
    });

    it('handles inline error messages and aria-invalid (UI-05)', () => {
      render(
        <Select
          id="cat-select"
          label="Category"
          options={categoryOptions}
          error="Please select a vegetable category"
        />
      );

      const select = screen.getByLabelText(/Category/i);
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(select).toHaveAttribute('aria-describedby', 'cat-select-error');

      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent('Please select a vegetable category');
    });

    it('triggers onChange when selection changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <Select
          label="Category"
          options={categoryOptions}
          onChange={handleChange}
        />
      );

      const select = screen.getByLabelText('Category');
      await user.selectOptions(select, 'root');

      expect(handleChange).toHaveBeenCalled();
      expect(select.value).toBe('root');
    });

    it('forwards ref to select DOM node', () => {
      const selectRef = createRef();
      render(
        <Select ref={selectRef} label="Category" options={categoryOptions} />
      );

      expect(selectRef.current).toBeInstanceOf(HTMLSelectElement);
    });
  });

  // ============================================================================
  // 3. Textarea Component Tests
  // ============================================================================
  describe('Textarea Component', () => {
    it('renders label with accessible association', () => {
      render(<Textarea label="Product Description" rows={5} />);

      const label = screen.getByText('Product Description');
      const textarea = screen.getByLabelText('Product Description');
      expect(label).toBeInTheDocument();
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('displays character counter when showCount is true', async () => {
      const user = userEvent.setup();

      function ControlledTextarea() {
        const [text, setText] = useState('');
        return (
          <Textarea
            label="Bio"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            showCount
          />
        );
      }

      render(<ControlledTextarea />);

      expect(screen.getByText('0 / 100')).toBeInTheDocument();

      const textarea = screen.getByLabelText('Bio');
      await user.type(textarea, 'Farm in Kaduna');

      expect(screen.getByText('14 / 100')).toBeInTheDocument();
    });

    it('displays inline validation errors and helper text (UI-05)', () => {
      render(
        <Textarea
          id="desc-field"
          label="Description"
          error="Description must be at least 20 characters"
          helperText="Include farm location and harvesting dates"
        />
      );

      const textarea = screen.getByLabelText(/Description/i);
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
      expect(textarea).toHaveAttribute('aria-describedby', 'desc-field-error');

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'Description must be at least 20 characters'
      );
    });

    it('forwards ref to HTMLTextAreaElement', () => {
      const textareaRef = createRef();
      render(<Textarea ref={textareaRef} label="Notes" />);

      expect(textareaRef.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  // ============================================================================
  // 4. Checkbox Component Tests
  // ============================================================================
  describe('Checkbox Component', () => {
    it('renders accessible checkbox with label and description', () => {
      render(
        <Checkbox
          label="Agree to Terms"
          description="I agree to the Vegetable Joint marketplace policies"
        />
      );

      const checkbox = screen.getByRole('checkbox', {
        name: /Agree to Terms/i,
      });
      expect(checkbox).toBeInTheDocument();
      expect(
        screen.getByText('I agree to the Vegetable Joint marketplace policies')
      ).toBeInTheDocument();
    });

    it('toggles checked state when clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Checkbox label="Organic Produce" onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox', {
        name: 'Organic Produce',
      });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(handleChange).toHaveBeenCalled();
      expect(checkbox).toBeChecked();
    });

    it('displays inline validation error message (UI-05)', () => {
      render(
        <Checkbox
          id="terms-check"
          label="Terms of Service"
          error="You must agree to the Terms of Service to continue"
        />
      );

      const checkbox = screen.getByRole('checkbox', {
        name: /Terms of Service/i,
      });
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'You must agree to the Terms of Service to continue'
      );
    });

    it('handles indeterminate state correctly via ref', () => {
      const checkboxRef = createRef();
      render(
        <Checkbox
          ref={checkboxRef}
          label="Select All Vegetables"
          indeterminate
        />
      );

      expect(checkboxRef.current.indeterminate).toBe(true);
    });

    it('respects disabled state', () => {
      render(<Checkbox label="Locked Setting" disabled />);

      const checkbox = screen.getByRole('checkbox', {
        name: 'Locked Setting',
      });
      expect(checkbox).toBeDisabled();
    });
  });

  // ============================================================================
  // 5. Radio and RadioGroup Component Tests
  // ============================================================================
  describe('Radio and RadioGroup Components', () => {
    const roleOptions = [
      {
        value: 'buyer',
        label: 'Vegetable Buyer',
        description: 'Browse fresh crops and purchase from local sellers',
      },
      {
        value: 'seller',
        label: 'Vegetable Seller / Farmer',
        description: 'List produce, manage inventory and receive orders',
      },
    ];

    it('renders radio group with options and legend', () => {
      render(
        <RadioGroup
          name="userRole"
          label="Choose Your Role"
          options={roleOptions}
        />
      );

      expect(screen.getByText('Choose Your Role')).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: /Vegetable Buyer/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: /Vegetable Seller/i })
      ).toBeInTheDocument();
    });

    it('allows selecting radio options', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <RadioGroup
          name="userRole"
          label="Role"
          options={roleOptions}
          onChange={handleChange}
        />
      );

      const buyerRadio = screen.getByRole('radio', {
        name: /Vegetable Buyer/i,
      });
      const sellerRadio = screen.getByRole('radio', {
        name: /Vegetable Seller/i,
      });

      await user.click(sellerRadio);
      expect(handleChange).toHaveBeenCalled();
      expect(sellerRadio).toBeChecked();
      expect(buyerRadio).not.toBeChecked();
    });

    it('displays inline validation error for RadioGroup (UI-05)', () => {
      render(
        <RadioGroup
          name="roleGroup"
          label="Account Type"
          options={roleOptions}
          error="Please choose an account type to proceed"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'Please choose an account type to proceed'
      );
    });

    it('renders standalone Radio with label, description, and forwards ref', () => {
      const radioRef = createRef();
      render(
        <Radio
          ref={radioRef}
          id="custom-radio"
          name="standalone"
          value="direct"
          label="Direct Farm Delivery"
          description="Delivered straight from the farm gate"
        />
      );

      const radio = screen.getByRole('radio', {
        name: /Direct Farm Delivery/i,
      });
      expect(radio).toBeInTheDocument();
      expect(
        screen.getByText('Delivered straight from the farm gate')
      ).toBeInTheDocument();
      expect(radioRef.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  // ============================================================================
  // 6. FormField Wrapper Component Tests
  // ============================================================================
  describe('FormField Wrapper Component', () => {
    it('renders custom children with accessible label, error, and helperText', () => {
      render(
        <FormField
          id="custom-control"
          label="Custom Color Picker"
          required
          helperText="Pick a theme hue"
          error="Invalid color format"
        >
          <input id="custom-control" type="color" defaultValue="#15803d" />
        </FormField>
      );

      expect(screen.getByText('Custom Color Picker')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid color format'
      );
    });
  });
});
