# Chrome Web Store Listing — Smart Link & URL Redirector

> Last Updated: 2026-10-13

## Store Listing

**Extension Name** [REQUIRED]
Smart Link & URL Redirector

**Short Description** [REQUIRED]
Redirect links and websites instantly with automatic path and query preservation, domain swapping, and custom rules.

**Detailed Description** [REQUIRED]
Smart Link & URL Redirector allows you to seamlessly redirect websites and links to your preferred destinations with zero delay.

Whether you want to automatically swap domains while keeping your full path and query parameters (such as redirecting `originaldomain.com/aaa/bbb` to `newdomain.com/aaa/bbb`), reroute specific URLs, or configure advanced pattern matches, this extension handles it natively in the background.

Key Features:
- Domain Swapping with Path Preservation: Automatically preserve all subpaths, query strings, and hashes when swapping domains.
- Native Browser Performance: Uses Chrome's fast network redirection engine for zero-flicker, instantaneous redirects before page load.
- Live Redirect Simulator: Test any URL in real-time within the extension to see exact destination results before browsing.
- Individual & Master Controls: Easily toggle individual rules or pause all redirects with a single master switch.
- Multiple Rule Types: Support for Domain Swapping, Exact URL matching, and advanced Regex with capture groups.
- Backup & Portability: Export and import your rule configurations as JSON at any time.

How to Use:
1. Click the extension icon in your browser toolbar or open the Dashboard.
2. Enter your source domain (e.g. `originaldomain.com`) and target domain (e.g. `newdomain.com`).
3. Click "Save Rule".
4. Any link clicked or visited will now automatically redirect to the new domain while preserving `/aaa/bbb`.

Privacy & Security:
All redirection rules and settings are stored locally on your device. No user data, web history, or analytics are ever collected, transmitted, or shared.

Support & Feedback:
For questions or feature requests, contact support or file an issue in the project repository.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Automatically redirects web links and URLs based on user-defined domain swaps and custom rules.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon-128.png |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `declarativeNetRequest` | permissions | Required to execute fast, native browser redirects for user-configured rules. |
| `declarativeNetRequestFeedback` | permissions | Required in development mode to inspect matched rules and diagnose redirection rules. |
| `webNavigation` | permissions | Required to intercept top-level browser tab navigations (such as direct address bar input, service worker cached sites, and bookmarks) before page load. |
| `storage` | permissions | Required to save and persist the user's redirect rules and settings locally across browser sessions. |
| `<all_urls>` | host_permissions | Required by Chrome's declarativeNetRequest redirect action and content scripts so that the extension can redirect user-configured websites to their desired destinations. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
https://thoweb.com/privacy-policy

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]
thoweb

**Contact Email** [REQUIRED]
contact@thoweb.com

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-10-13 | Initial release with domain swapping, path preservation, live sandbox simulator, and JSON backup. | Draft |
