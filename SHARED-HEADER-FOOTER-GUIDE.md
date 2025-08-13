# Shared Header and Footer System Guide

## Overview

This guide explains how to implement and use the shared header and footer system for QuickNotes AI. The system provides consistent navigation and styling across all pages using JavaScript includes.

## Files Created

1. **`header.html`** - Contains the shared navigation header
2. **`footer.html`** - Contains the minimal footer with copyright
3. **`js/include.js`** - JavaScript system that loads and manages shared components
4. **`css/styles.css`** - Updated with header and footer styles
5. **`example-integration.html`** - Example page showing how to integrate the system

## Features

### Header Features
- **Logo**: "QuickNotes AI" with clickable link to home
- **Navigation Links**: Home, Tasks, Dashboard, Learn, Premium, Team, Team-Dashboard
- **Theme Toggle**: Switch between light and dark modes
- **User Welcome**: Dynamic display of user name (from localStorage)
- **Sign Out**: Logout functionality
- **Premium Banner**: Shows for premium users
- **Responsive Design**: Works on all screen sizes
- **Active Page Highlighting**: Current page is highlighted in navigation

### Footer Features
- **Minimal Design**: Clean, centered copyright notice
- **Consistent Styling**: Matches the overall design theme
- **Responsive**: Adapts to different screen sizes

## Implementation Steps

### 1. Include the Script

Add the include.js script to your HTML file:

```html
<script src="js/include.js"></script>
```

### 2. Replace Header

Replace your existing header with:

```html
<!-- Header will be loaded by include.js -->
<div id="header-placeholder"></div>
```

### 3. Replace Footer

Replace your existing footer with:

```html
<!-- Footer will be loaded by include.js -->
<div id="footer-placeholder"></div>
```

### 4. Ensure CSS is Loaded

Make sure your page includes the styles.css file:

```html
<link href="css/styles.css" rel="stylesheet">
```

## JavaScript API

The system provides a global `window.sharedComponents` object with these methods:

### Methods

- **`showPremiumBanner()`** - Show the premium banner
- **`hidePremiumBanner()`** - Hide the premium banner
- **`toggleTheme()`** - Toggle between light and dark themes manually

### Example Usage

```javascript
// Show premium banner for premium users
window.sharedComponents.showPremiumBanner();

// Hide premium banner
window.sharedComponents.hidePremiumBanner();

// Toggle theme programmatically
window.sharedComponents.toggleTheme();
```

## User Data Integration

The system automatically checks for user data in localStorage:

- `userName` - Display name for the welcome message
- `userEmail` - Email address (fallback if no userName)
- `userUID` - User ID for authentication

### Setting User Data

```javascript
// Set user data
localStorage.setItem('userName', 'John Doe');
localStorage.setItem('userEmail', 'john@example.com');
localStorage.setItem('userUID', 'user123');

// Reload page to see changes
location.reload();
```

### Clearing User Data

```javascript
// Clear user data (sign out)
localStorage.removeItem('userName');
localStorage.removeItem('userEmail');
localStorage.removeItem('userUID');

// Reload page to see changes
location.reload();
```

## Theme System

The theme system automatically:
- Persists theme preference in localStorage
- Updates theme icon based on current theme
- Applies theme to all components
- Provides smooth transitions

### Theme Toggle

Users can toggle themes by:
1. Clicking the theme toggle button in the header
2. Using the JavaScript API: `window.sharedComponents.toggleTheme()`

## Premium Banner

The premium banner is hidden by default and can be shown for premium users:

```javascript
// Show for premium users
window.sharedComponents.showPremiumBanner();

// Hide for regular users
window.sharedComponents.hidePremiumBanner();
```

## Responsive Design

The system is fully responsive and includes:

- **Mobile Navigation**: Collapsible hamburger menu
- **Adaptive Sizing**: Fonts and spacing adjust for mobile
- **Touch-Friendly**: Buttons and links are appropriately sized
- **Flexible Layout**: Components adapt to different screen sizes

## Fallback Support

If the header.html or footer.html files cannot be loaded, the system automatically creates fallback versions to ensure the page still works.

## Customization

### Modifying Header

To modify the header, edit `header.html`:
- Add/remove navigation links
- Change styling classes
- Modify user section layout
- Update premium banner content

### Modifying Footer

To modify the footer, edit `footer.html`:
- Change copyright text
- Add additional content
- Modify styling

### Styling

To customize styles, edit the header and footer sections in `css/styles.css`:
- Modify colors and fonts
- Adjust spacing and layout
- Add animations and effects
- Update responsive breakpoints

## Browser Compatibility

The system works with:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Performance

- **Lazy Loading**: Components load asynchronously
- **Caching**: Browser caches the header and footer files
- **Minimal Impact**: Small file sizes and efficient loading
- **Fallback Support**: Graceful degradation if files fail to load

## Troubleshooting

### Header/Footer Not Loading

1. Check that `include.js` is included in your HTML
2. Verify that `header.html` and `footer.html` exist in the root directory
3. Check browser console for errors
4. Ensure the page is served from a web server (not file:// protocol)

### Theme Not Working

1. Check that Bootstrap CSS is loaded
2. Verify that `data-bs-theme` attribute is set on the html element
3. Check browser console for JavaScript errors

### User Welcome Not Showing

1. Verify that user data is set in localStorage
2. Check that the user section is not hidden by CSS
3. Reload the page after setting user data

## Example Integration

See `example-integration.html` for a complete example of how to integrate the system into a new page.

## Migration Guide

### From Existing Pages

1. **Backup your current header and footer**
2. **Replace header section** with `<div id="header-placeholder"></div>`
3. **Replace footer section** with `<div id="footer-placeholder"></div>`
4. **Add include.js script** to your HTML
5. **Test the page** to ensure everything works correctly

### Testing

1. **Load the page** and verify header appears
2. **Test navigation links** to ensure they work
3. **Test theme toggle** functionality
4. **Test responsive design** on mobile devices
5. **Test user data** by setting localStorage values

## Support

For issues or questions about the shared header and footer system:
1. Check the browser console for errors
2. Verify all files are in the correct locations
3. Test with the example integration page
4. Review this documentation for troubleshooting steps 