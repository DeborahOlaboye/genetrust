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

describe('FileDropZone — live region announcements', () => {
  function getLiveRegion() {
    return document.querySelector('[aria-live="polite"]');
  }

  it('live region is empty on initial render', () => {
    render(<FileDropZone onFile={jest.fn()} />);
    expect(getLiveRegion().textContent).toBe('');
  });

  it('announces drag-over when a file is dragged over the zone', () => {
    render(<FileDropZone onFile={jest.fn()} />);
    const zone = screen.getByRole('button', { name: /upload genomic file/i });
    fireEvent.dragOver(zone, { preventDefault: () => {} });
    expect(getLiveRegion().textContent).toMatch(/release to upload/i);
  });

  it('clears announcement when drag leaves the zone', () => {
    render(<FileDropZone onFile={jest.fn()} />);
    const zone = screen.getByRole('button', { name: /upload genomic file/i });
    fireEvent.dragOver(zone, { preventDefault: () => {} });
    fireEvent.dragLeave(zone);
    expect(getLiveRegion().textContent).toBe('');
  });
});
