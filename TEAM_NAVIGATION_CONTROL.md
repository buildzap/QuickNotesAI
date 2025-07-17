# Team Navigation Control

## Overview
This feature ensures that Team and Team Dashboard navigation links are only visible to premium users. Free users will not see these links in the navigation bar.

## How It Works

### 1. Default State
- All team navigation items are hidden by default (`style="display: none;"`)
- This is set in the HTML for all pages

### 2. Navigation Control Script (`nav-utils.js`)
The `nav-utils.js` script handles the visibility of team navigation elements:

#### Functions:
- `showTeamNavigation()` - Shows team links for premium users
- `hideTeamNavigation()` - Hides team links for free users
- `checkPremiumIndicators()` - Checks multiple indicators of premium status

#### Premium Status Detection:
The script checks multiple indicators to determine if a user is premium:
- User role in Firebase (`userData.role === 'premium'`)
- Body class (`premium-user`)
- Window variables (`window.userRole`, `window.isPremiumUser`)
- Premium email list
- Premium banner visibility

### 3. Implementation Details

#### Navigation Elements Controlled:
- `#teamNavItem` - Team navigation link
- `#teamDashboardNavItem` - Team Dashboard navigation link
- `#teamDashboardBtn` - Team Dashboard button (if exists)
- `#footerTeamLink` - Footer team link
- `#footerTeamDashboardLink` - Footer team dashboard link

#### CSS Classes Supported:
- `.team-nav-item`
- `.team-dashboard-nav-item`
- `.team-dashboard-btn`
- `.footer-team-link`
- `.footer-team-dashboard-link`

#### Data Attributes Supported:
- `[data-team-nav]`
- `[data-team-dashboard-nav]`

### 4. Pages with Team Navigation Control

The following pages include `nav-utils.js` and have team navigation control:

#### Main Pages:
- `dashboard.html`
- `task.html`
- `learn.html`
- `premium.html`
- `team.html`
- `team-dashboard.html`
- `login.html`

#### Test Pages:
- `test-team-nav.html`
- `test-team-nav-control.html`

### 5. Testing

#### Test Page: `test-team-nav-control.html`
This page provides:
- Real-time status monitoring
- Manual controls to simulate premium/free users
- Visual indicators of navigation element visibility
- Automatic status refresh every 3 seconds

#### Manual Testing:
1. Open any page with team navigation
2. Check that team links are hidden for free users
3. Upgrade to premium and verify links become visible
4. Use the test page to simulate different user states

### 6. Fallback Mechanisms

The system includes multiple fallback checks:
- Initial check on page load
- Fallback check after 2 seconds
- Additional fallback check after 5 seconds
- Multiple premium status indicators

### 7. Console Logging

The script provides detailed console logging for debugging:
- `[Nav Utils]` prefix for all navigation-related logs
- Status changes and element visibility updates
- Error handling and fallback activations

### 8. Error Handling

- Graceful handling of missing elements
- Fallback to hide navigation if authentication fails
- Multiple premium status checks for reliability

## Usage

### For Developers:
1. Include `nav-utils.js` in your page
2. Add team navigation elements with appropriate IDs or classes
3. The script will automatically handle visibility based on user status

### For Users:
- Free users: Team features are not visible in navigation
- Premium users: Team and Team Dashboard links are visible
- Automatic detection of premium status

## Troubleshooting

### Common Issues:
1. **Team links not hiding for free users**
   - Check if `nav-utils.js` is included
   - Verify Firebase authentication is working
   - Check console for error messages

2. **Team links not showing for premium users**
   - Verify user role is set to 'premium' in Firebase
   - Check if premium banner is visible
   - Use test page to simulate premium status

3. **Navigation not updating**
   - Check browser console for JavaScript errors
   - Verify Firebase configuration
   - Use test page to debug status

### Debug Commands:
```javascript
// Check premium status
console.log(checkPremiumIndicators());

// Manually show/hide team navigation
showTeamNavigation();
hideTeamNavigation();

// Check navigation elements
console.log(document.getElementById('teamNavItem').style.display);
console.log(document.getElementById('teamDashboardNavItem').style.display);
``` 