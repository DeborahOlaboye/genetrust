// Accessibility tests for WCAG 2.1 AA compliance
// Tests keyboard navigation, screen reader support, and color contrast

import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { auditAccessibility, checkContrastCompliance } from '../utils/accessibility';
import Button from '../components/common/Button';
import Modal from '../components/accessibility/Modal';
import { FormField } from '../components/ui/form/FormField';
import { FormProvider, useForm } from 'react-hook-form';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  describe('Button Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Button onClick={() => {}}>Test Button</Button>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick}>Test Button</Button>);
      
      const button = screen.getByRole('button', { name: 'Test Button' });
      
      // Test keyboard navigation
      await user.tab();
      expect(button).toHaveFocus();
      
      // Test activation with Enter
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Test activation with Space
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper ARIA attributes when loading', () => {
      render(
        <Button loading onClick={() => {}}>
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should support ARIA expanded state', () => {
      render(
        <Button aria-expanded={true} onClick={() => {}}>
          Menu
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Modal Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      const handleClose = jest.fn();
      
      render(
        <div>
          <button>Outside Button</button>
          <Modal isOpen={true} onClose={handleClose} title="Test Modal">
            <button>Inside Button 1</button>
            <button>Inside Button 2</button>
          </Modal>
        </div>
      );
      
      // Focus should be trapped within modal
      const insideButton1 = screen.getByRole('button', { name: 'Inside Button 1' });
      const insideButton2 = screen.getByRole('button', { name: 'Inside Button 2' });
      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      
      // Tab should cycle through modal elements only
      await user.tab();
      expect(closeButton).toHaveFocus();
      
      await user.tab();
      expect(insideButton1).toHaveFocus();
      
      await user.tab();
      expect(insideButton2).toHaveFocus();
      
      await user.tab();
      expect(closeButton).toHaveFocus(); // Should wrap back to first element
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      const handleClose = jest.fn();
      
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      await user.keyboard('{Escape}');
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should have proper ARIA attributes', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      
      const title = screen.getByText('Test Modal');
      expect(title).toBeInTheDocument();
    });
  });

  describe('Form Accessibility', () => {
    const TestForm = ({ children }) => {
      const methods = useForm();
      return (
        <FormProvider {...methods}>
          <form>{children}</form>
        </FormProvider>
      );
    };

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestForm>
          <FormField
            name="email"
            label="Email Address"
            required
            render={({ field }) => (
              <input {...field} type="email" />
            )}
          />
        </TestForm>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper label association', () => {
      render(
        <TestForm>
          <FormField
            name="email"
            label="Email Address"
            required
            render={({ field }) => (
              <input {...field} type="email" />
            )}
          />
        </TestForm>
      );
      
      const input = screen.getByRole('textbox', { name: /email address/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('required');
    });

    it('should announce errors to screen readers', () => {
      const methods = useForm({
        defaultValues: { email: '' },
        mode: 'onChange'
      });
      
      // Simulate form error
      methods.setError('email', { message: 'Email is required' });
      
      render(
        <FormProvider {...methods}>
          <form>
            <FormField
              name="email"
              label="Email Address"
              required
              render={({ field }) => (
                <input {...field} type="email" />
              )}
            />
          </form>
        </FormProvider>
      );
      
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Email is required');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA contrast requirements for primary colors', () => {
      const primaryBlue = '#1e40af';
      const white = '#ffffff';
      
      const contrast = checkContrastCompliance(white, primaryBlue, 'AA', 'normal');
      expect(contrast.passes).toBe(true);
      expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should meet contrast requirements for error states', () => {
      const errorRed = '#dc2626';
      const white = '#ffffff';
      
      const contrast = checkContrastCompliance(white, errorRed, 'AA', 'normal');
      expect(contrast.passes).toBe(true);
      expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should meet contrast requirements for success states', () => {
      const successGreen = '#166534';
      const white = '#ffffff';
      
      const contrast = checkContrastCompliance(white, successGreen, 'AA', 'normal');
      expect(contrast.passes).toBe(true);
      expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through interactive elements', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <button>Button 1</button>
          <a href="#test">Link</a>
          <input type="text" placeholder="Input" />
          <button>Button 2</button>
        </div>
      );
      
      const button1 = screen.getByRole('button', { name: 'Button 1' });
      const link = screen.getByRole('link', { name: 'Link' });
      const input = screen.getByRole('textbox');
      const button2 = screen.getByRole('button', { name: 'Button 2' });
      
      // Test forward tab navigation
      await user.tab();
      expect(button1).toHaveFocus();
      
      await user.tab();
      expect(link).toHaveFocus();
      
      await user.tab();
      expect(input).toHaveFocus();
      
      await user.tab();
      expect(button2).toHaveFocus();
      
      // Test backward tab navigation
      await user.tab({ shift: true });
      expect(input).toHaveFocus();
      
      await user.tab({ shift: true });
      expect(link).toHaveFocus();
    });

    it('should skip non-interactive elements', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <button>Interactive</button>
          <div>Non-interactive</div>
          <span>Also non-interactive</span>
          <button>Also Interactive</button>
        </div>
      );
      
      const button1 = screen.getByRole('button', { name: 'Interactive' });
      const button2 = screen.getByRole('button', { name: 'Also Interactive' });
      
      await user.tab();
      expect(button1).toHaveFocus();
      
      await user.tab();
      expect(button2).toHaveFocus(); // Should skip non-interactive elements
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper landmarks', () => {
      render(
        <div>
          <header>Header content</header>
          <nav>Navigation</nav>
          <main>Main content</main>
          <aside>Sidebar</aside>
          <footer>Footer content</footer>
        </div>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
      expect(screen.getByRole('complementary')).toBeInTheDocument(); // aside
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
    });

    it('should provide proper heading hierarchy', () => {
      render(
        <div>
          <h1>Main Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
        </div>
      );
      
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(3);
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Title');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Section Title');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Subsection Title');
    });

    it('should provide alternative text for images', () => {
      render(
        <div>
          <img src="test.jpg" alt="Descriptive alt text" />
          <img src="decorative.jpg" alt="" role="presentation" />
        </div>
      );
      
      const descriptiveImage = screen.getByAltText('Descriptive alt text');
      expect(descriptiveImage).toBeInTheDocument();
      
      const decorativeImage = screen.getByRole('presentation');
      expect(decorativeImage).toHaveAttribute('alt', '');
    });
  });

  describe('Automated Accessibility Audit', () => {
    it('should run comprehensive accessibility audit', () => {
      // Create a test DOM structure
      document.body.innerHTML = `
        <div>
          <h1>Test Page</h1>
          <button>Test Button</button>
          <img src="test.jpg" alt="Test Image" />
          <form>
            <label for="test-input">Test Input</label>
            <input id="test-input" type="text" />
          </form>
        </div>
      `;
      
      const results = auditAccessibility(document.body);
      
      expect(results).toHaveProperty('summary');
      expect(results).toHaveProperty('issues');
      expect(results).toHaveProperty('warnings');
      expect(results).toHaveProperty('passed');
      expect(results).toHaveProperty('recommendations');
      
      expect(results.summary.total).toBeGreaterThan(0);
      expect(results.summary.score).toBeGreaterThanOrEqual(0);
      expect(results.summary.score).toBeLessThanOrEqual(100);
    });
  });
});