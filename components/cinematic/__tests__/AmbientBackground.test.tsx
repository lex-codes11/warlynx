/**
 * Unit tests for AmbientBackground component
 * 
 * Tests the rendering of ambient background effects with particles,
 * intensity prop handling, and graceful degradation.
 */

import { render } from '@testing-library/react';
import { AmbientBackground } from '../AmbientBackground';
import { CINEMATIC_COLORS, Z_INDEX } from '@/lib/cinematic';

describe('AmbientBackground', () => {
  describe('Requirement 1.1: Cinematic Background Color', () => {
    it('should render with cinematic background color #0B0B12', () => {
      const { container } = render(<AmbientBackground />);
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toBeInTheDocument();
      // Browser converts hex to rgb format
      expect(backgroundDiv.style.backgroundColor).toBe('rgb(11, 11, 18)');
    });
  });

  describe('Requirement 1.2: Subtle Motion Effects', () => {
    it('should render particles for motion effects', () => {
      const { container } = render(<AmbientBackground />);
      
      // Check for particle elements (motion.div with rounded-full class)
      const particles = container.querySelectorAll('.rounded-full');
      expect(particles.length).toBeGreaterThan(0);
    });

    it('should render nebula gradient overlay', () => {
      const { container } = render(<AmbientBackground />);
      
      // Check for gradient overlay div (it's the last child of the main container)
      const backgroundDiv = container.firstChild as HTMLElement;
      const children = Array.from(backgroundDiv.children);
      const gradientOverlay = children[children.length - 1] as HTMLElement;
      
      expect(gradientOverlay).toBeInTheDocument();
      // Verify it has opacity set (gradient overlay should have low opacity)
      const opacity = parseFloat(gradientOverlay.style.opacity);
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThan(1);
    });
  });

  describe('Requirement 7.4: Ambient Particle Effects', () => {
    it('should render with low intensity by default', () => {
      const { container } = render(<AmbientBackground />);
      
      // Low intensity should have ~20 particles
      const particles = container.querySelectorAll('.rounded-full');
      expect(particles.length).toBeGreaterThanOrEqual(15);
      expect(particles.length).toBeLessThanOrEqual(25);
    });

    it('should increase particle count with medium intensity', () => {
      const { container } = render(<AmbientBackground intensity="medium" />);
      
      // Medium intensity should have ~30 particles
      const particles = container.querySelectorAll('.rounded-full');
      expect(particles.length).toBeGreaterThanOrEqual(25);
      expect(particles.length).toBeLessThanOrEqual(35);
    });

    it('should increase particle count with high intensity', () => {
      const { container } = render(<AmbientBackground intensity="high" />);
      
      // High intensity should have ~50 particles
      const particles = container.querySelectorAll('.rounded-full');
      expect(particles.length).toBeGreaterThanOrEqual(45);
      expect(particles.length).toBeLessThanOrEqual(55);
    });

    it('should use low opacity particles for subtle effect', () => {
      const { container } = render(<AmbientBackground intensity="low" />);
      
      const particles = container.querySelectorAll('.rounded-full');
      const firstParticle = particles[0] as HTMLElement;
      
      // Low intensity should have opacity around 0.15
      const opacity = parseFloat(firstParticle.style.opacity);
      expect(opacity).toBeLessThanOrEqual(0.2);
    });

    it('should use neon accent colors for particles', () => {
      const { container } = render(<AmbientBackground />);
      
      const particles = container.querySelectorAll('.rounded-full');
      const firstParticle = particles[0] as HTMLElement;
      
      // Browser converts hex to rgb format
      const validColorsRgb = [
        'rgb(6, 182, 212)',    // cyan
        'rgb(168, 85, 247)',   // purple
        'rgb(249, 115, 22)',   // orange
        'rgb(236, 72, 153)',   // magenta
      ];
      
      const bgColor = firstParticle.style.backgroundColor;
      expect(validColorsRgb).toContain(bgColor);
    });
  });

  describe('Component Behavior', () => {
    it('should render without errors', () => {
      const { container } = render(<AmbientBackground />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle missing intensity prop gracefully', () => {
      const { container } = render(<AmbientBackground />);
      
      // Should default to low intensity
      const particles = container.querySelectorAll('.rounded-full');
      expect(particles.length).toBeGreaterThanOrEqual(15);
      expect(particles.length).toBeLessThanOrEqual(25);
    });

    it('should be fixed positioned and cover full screen', () => {
      const { container } = render(<AmbientBackground />);
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveClass('fixed', 'inset-0');
    });

    it('should not interfere with pointer events', () => {
      const { container } = render(<AmbientBackground />);
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveClass('pointer-events-none');
    });

    it('should have correct z-index for background layer', () => {
      const { container } = render(<AmbientBackground />);
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv.style.zIndex).toBe(String(Z_INDEX.background));
    });

    it('should be hidden from screen readers', () => {
      const { container } = render(<AmbientBackground />);
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all intensity values', () => {
      const intensities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      
      intensities.forEach((intensity) => {
        const { container } = render(<AmbientBackground intensity={intensity} />);
        const particles = container.querySelectorAll('.rounded-full');
        expect(particles.length).toBeGreaterThan(0);
      });
    });

    it('should generate unique particle positions', () => {
      const { container } = render(<AmbientBackground />);
      
      const particles = container.querySelectorAll('.rounded-full');
      const positions = Array.from(particles).map((p) => {
        const element = p as HTMLElement;
        return `${element.style.left},${element.style.top}`;
      });
      
      // Most positions should be unique (allowing for rare collisions)
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBeGreaterThan(particles.length * 0.8);
    });

    it('should apply blur filter to particles', () => {
      const { container } = render(<AmbientBackground />);
      
      const particles = container.querySelectorAll('.rounded-full');
      const firstParticle = particles[0] as HTMLElement;
      
      expect(firstParticle.style.filter).toContain('blur');
    });
  });

  describe('Performance', () => {
    it('should not create excessive particles even on high intensity', () => {
      const { container } = render(<AmbientBackground intensity="high" />);
      
      const particles = container.querySelectorAll('.rounded-full');
      // Should not exceed 60 particles for performance
      expect(particles.length).toBeLessThanOrEqual(60);
    });

    it('should overflow hidden to prevent scrollbars', () => {
      const { container } = render(<AmbientBackground />);
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveClass('overflow-hidden');
    });
  });
});
