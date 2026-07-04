export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand:    { DEFAULT:'#FF5A1F', dark:'#E04918', light:'#FF7A45' },
        campus:   { dark:'#1A1A2E', mid:'#2D2D4E' },
        success:  '#06B96F',
        danger:   '#E53E3E',
        warning:  '#F59E0B',
        muted:    '#7B7B8F',
      },
      fontFamily: { sans:['Inter','system-ui','sans-serif'] },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-dot': 'bounce 1s infinite',
        'slide-up':   'slideUp 0.3s ease-out',
        'fade-in':    'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp:  { from:{ opacity:0, transform:'translateY(16px)' }, to:{ opacity:1, transform:'translateY(0)' } },
        fadeIn:   { from:{ opacity:0 }, to:{ opacity:1 } },
      }
    }
  },
  plugins: []
};
