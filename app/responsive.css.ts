// Shared responsive CSS string — inject via <style> tag in each page
export const responsiveCSS = `
  * { box-sizing: border-box; }
  
  /* Mobile: stack 2-col grids to 1 col */
  @media (max-width: 600px) {
    .grid-2 { grid-template-columns: 1fr !important; }
    .grid-3 { grid-template-columns: 1fr !important; }
    .hide-mobile { display: none !important; }
    .full-mobile { width: 100% !important; max-width: 100% !important; }
    .pad-mobile { padding: 16px !important; }
    .stack-mobile { flex-direction: column !important; }
    .text-sm-mobile { font-size: 13px !important; }
    .gap-mobile { gap: 8px !important; }
  }

  /* Inputs and selects full width on mobile */
  @media (max-width: 600px) {
    input, select, textarea {
      font-size: 16px !important; /* prevents iOS zoom */
    }
  }

  /* Smooth scrolling */
  html { scroll-behavior: smooth; }

  /* Remove tap highlight */
  * { -webkit-tap-highlight-color: transparent; }

  /* Better button touch targets */
  button, a { min-height: 40px; }
`
