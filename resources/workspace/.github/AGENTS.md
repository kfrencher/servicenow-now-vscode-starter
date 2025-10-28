# Project Coding Guidelines

This document outlines the coding standards and best practices for this project.

## Language-Specific Guidelines

### ServiceNow
See [ServiceNow Development Guidelines](instructions/servicenow.instructions.md) for:
- Best practices for ServiceNow development
- Script includes and business rules
- Client scripts and UI policies

### JavaScript
See [JavaScript Guidelines](instructions/javascript.instructions.md) for:
- TypeScript type safety with JSDoc annotations
- Modern ES6+ coding practices
- Variable declarations (const/let, never var)
- Array methods over for loops
- Naming conventions
- Performance considerations

## General Guidelines

### HTML
- Use semantic HTML5 elements (header, main, section, article, etc.)
- Include ARIA labels and roles
- Ensure keyboard navigation support
- Provide screen reader friendly content
- Include focus management

### CSS
- Use CSS custom properties for theming
- Follow mobile-first responsive design
- Support dark mode with `prefers-color-scheme`
- Respect `prefers-reduced-motion`
- Ensure minimum 4.5:1 color contrast ratio

## Technology Stack
- **Platform:** ServiceNow Now Platform
- **Languages:** HTML5, CSS3, JavaScript (ES6+)
- **Type Checking:** TypeScript compiler in check-only mode (`tsconfig.json`)
- **Accessibility:** WCAG 2.1 AA compliance required
- **Browser Support:** Modern browsers (ES6+ support)

## Accessibility Requirements

- **WCAG 2.1 Level AA** compliance required
- All interactive elements must be keyboard accessible
- Minimum touch target size: 44x44 pixels
- Support text resizing up to 200%
- Provide visible focus indicators
- Include alternative text for images
- Use proper heading hierarchy

## Validation Checklist

Before committing code:
2. ✅ Test keyboard navigation (Tab, Enter, Space, Arrows)
3. ✅ Verify ARIA labels and roles
4. ✅ Check color contrast ratios
5. ✅ Test responsive design on multiple screen sizes
6. ✅ Verify dark mode support
7. ✅ Test with screen reader (NVDA, JAWS, or VoiceOver)

## Additional Resources

- [JavaScript Guidelines](instructions/javascript.md)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Docs](https://developer.mozilla.org/)
