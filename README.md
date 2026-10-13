# Smart Link & URL Redirector

[![Chrome Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/tag/peterko753/smart-link-redirector?label=version)](https://github.com/peterko753/smart-link-redirector/releases)

A modern, high-performance Google Chrome extension (Manifest V3) that seamlessly redirects URLs and links with **automatic path & query preservation**, domain swapping, exact matching, and custom regex rules.

---

## 🚀 Key Features

* **Automatic Path & Query Preservation**:
  Swapping domains keeps the entire path, query parameters, and hashes intact with zero data loss:
  $$\text{https://originaldomain.com/aaa/bbb?token=123\#sec} \longrightarrow \text{https://newdomain.com/aaa/bbb?token=123\#sec}$$
* **🛡️ Bulletproof 3-Layer Redirection**:
  1. **Network Engine (`declarativeNetRequest`)**: Native, zero-delay redirect before web pages even load.
  2. **Navigation Hook (`chrome.webNavigation`)**: Catches address-bar typing, bookmarks, and bypasses persistent PWA Service Workers (such as `x.com` offline caches).
  3. **In-Page Click Interceptor (`content.js`)**: Immediately intercepts link clicks at the DOM level and updates hover tooltips on links.
* **🧪 Live URL Simulator**:
  Test and preview any URL in real-time inside the extension popup or dashboard before using it.
* **🎛️ Full Rule Management**:
  * Individual On/Off toggle switches per rule.
  * Global master switch to pause all redirects instantly.
  * Search, filter, duplicate, and edit existing rules.
* **💾 Backup & Easy Sharing**:
  Export your configured rules as a `.json` file and share them with friends to import with 1 click.

---

## 📦 How to Install (For You and Your Friends)

### 1. Download the Extension
* **Direct Download:** [**Download latest release v1.0.2 (.zip)**](https://github.com/peterko753/smart-link-redirector/archive/refs/tags/v1.0.2.zip)
* *Or clone via git:*
  ```bash
  git clone https://github.com/peterko753/smart-link-redirector.git
  ```

### 2. Load into Google Chrome
1. Extract the downloaded `.zip` file on your computer.
2. Open Google Chrome and enter `chrome://extensions` in the address bar.
3. In the top-right corner, switch the **Developer mode** toggle to **ON**.
4. In the top-left corner, click **Load unpacked**.
5. Select the extracted folder (`smart-link-redirector`).
6. Pin the extension to your Chrome toolbar for easy access!

---

## 🛠️ How to Set Up a Redirect (Example: X to GoyimX)

1. Click the **Smart Link Redirector** icon in your Chrome toolbar.
2. Click **+ Add Rule** (or click *Full Settings & Regex Rules*).
3. Fill in the fields:
   * **Rule Type**: Domain Swap
   * **Original Domain**: `x.com`
   * **Target Domain**: `goyimx.com`
4. Click **Save Rule**.

Now, whenever you click or navigate to any link like:
```text
https://x.com/username/status/123456
```
Chrome will immediately redirect you to:
```text
https://goyimx.com/username/status/123456
```

*(Tip: You can also add another rule for `twitter.com` $\rightarrow$ `goyimx.com` to cover legacy Twitter links).*

---

## 📂 Project Structure

```text
smart-link-redirector/
├── manifest.json        # Manifest V3 extension configuration
├── background.js        # Background service worker (DNR & webNavigation hooks)
├── rules-engine.js      # Core engine for compiling, normalizing & simulating rules
├── content.js           # In-page link click interceptor & status bar preview
├── popup/               # Toolbar popup UI (quick controls & live tester)
├── options/             # Full dashboard (rules table, editor, backup/presets)
├── icons/               # Extension icons (16px, 48px, 128px)
├── LICENSE              # MIT License
└── README.md            # Documentation & install guide
```

---

## 🤝 Sharing Configs with Friends

If you have rules configured and want to share them:
1. Open the extension's dashboard (*Full Settings*).
2. Click **Export Rules JSON**.
3. Send the downloaded `.json` file to your friends.
4. Your friends can click **Import Rules JSON** to load your exact ruleset instantly.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
