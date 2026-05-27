import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDropZone } from '../components/upload/FileDropZone.jsx';

function makeFile(name = 'genome.vcf', size = 1024) {
  return new File(['content'], name, { type: 'application/octet-stream' });
}

describe('FileDropZone — structure and initial state', () => {
  it('renders a button role drop zone', () => {
    render(<FileDropZone onFile={jest.fn()} />);
    expect(screen.getByRole('button', { name: /upload genomic file/i })).toBeInTheDocument();
  });

  it('renders a polite live region for announcements', () => {
    render(<FileDropZone onFile={jest.fn()} />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it('renders the formats description with an id for aria-describedby', () => {
    render(<FileDropZone onFile={jest.fn()} />);
    expect(document.getElementById('dropzone-formats')).toBeTruthy();
  });

  it('links drop zone to formats via aria-describedby', () => {
    render(<FileDropZone onFile={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /upload genomic file/i });
    expect(btn).toHaveAttribute('aria-describedby', 'dropzone-formats');
  });
});
