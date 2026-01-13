/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ProblemStatement } from '../ProblemStatement';

const stripMotionProps = (props: any) => {
  const {
    initial,
    animate,
    exit,
    transition,
    variants,
    whileInView,
    viewport,
    whileHover,
    whileTap,
    layout,
    layoutId,
    ...rest
  } = props;
  return <div {...rest} />;
};

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => stripMotionProps,
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

describe('ProblemStatement', () => {
  it('does not emit styled-jsx attribute warnings', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ProblemStatement />);
    const hasJsxWarning = errorSpy.mock.calls.some(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('non-boolean attribute') &&
        call.includes('jsx')
    );
    errorSpy.mockRestore();

    expect(hasJsxWarning).toBe(false);
  });
});
