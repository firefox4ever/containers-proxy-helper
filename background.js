let settings = {};

const blocked = {
    type: 'socks',
    host: 'block-proxy.localhost',
    port: 1,
    failoverTimeout: 1,
    username: 'nonexistent user',
    password: 'random password',
    proxyDNS: true
};

function handleProxifiedRequest(requestInfo) {
    let storeId = requestInfo.cookieStoreId;
    if (!storeId) {
        if (requestInfo.incognito) {
            storeId = 'firefox-private';
        } else if (requestInfo.tabId !== -1) {
            storeId = 'firefox-default';
        } else {
            storeId = 'firefox-unknown';
        }
    }
    /* Maybe add in the future
    else if (storeId === 'firefox-default' && requestInfo.tabId === -1) {
        storeId = 'firefox-unknown';
    }
    */

    if (settings[storeId] && settings[storeId].proxies && settings[storeId].proxies.length) {
        let result = settings[storeId].proxies[0];

        return Object.keys(result).length ? {...result, connectionIsolationKey: '' + storeId, proxyDNS: true} : result;
    }
    if (settings.default && settings.default.proxies && settings.default.proxies.length) {
        let result = settings.default.proxies[0];

        return Object.keys(result).length ? {...result, connectionIsolationKey: '' + storeId, proxyDNS: true} : result;
    }

    return blocked;
}

async function updateIcon(tabInfo) {
    if (tabInfo.id === -1) {
        return;
    }
    try {
        let storeId = tabInfo.cookieStoreId;
        if (!storeId) {
            if (tabInfo.incognito) {
                storeId = 'firefox-private';
            } else {
                storeId = 'firefox-default';
            }
        }

        let result, icon, title;
        if (settings[storeId] && settings[storeId].proxies && settings[storeId].proxies.length) {
            result = settings[storeId].proxies[0];
        } else if (settings.default && settings.default.proxies && settings.default.proxies.length) {
            result = settings.default.proxies[0];
        }
        icon = 'icons/blocked.svg';
        title = 'Blocked';
        if (result) {
            if (result.type && result.type === 'direct') {
                icon = 'icons/unlocked.svg';
                title = 'Direct Connection';
            } else if (Object.keys(result).length === 0) {
                icon = 'icons/warning.svg';
                title = 'Firefox connection settings';
            } else if (result.type && result.type === 'socks' && result.host && result.host.match(/^[a-z]{2}\d{1,3}-wg\.socks5\.mullvad\.net$/i)) {
                icon = 'icons/flags/' + result.host.toUpperCase().substr(0, 2) + '.png';
                title = result.host;
            } else if (result.type && result.type === 'socks' && result.host !== 'block-proxy.localhost') {
                icon = 'icons/locked.svg';
                title = result.host;
            }
        }
        await browser.browserAction.setIcon({
            tabId: tabInfo.id, path: icon
        });
        await browser.browserAction.setTitle({
            tabId: tabInfo.id, title: title
        });

    } catch (error) {
        console.error(error);
    }
}


// Get the stored list and update icon
browser.storage.local.get((data) => {
    if (data) {
        settings = data;
    }

    browser.tabs.query({active: true}).then((tabs) => {
        if (tabs.length) {
            return updateIcon(tabs[0]);
        }
    });
});

// Listen for a request to open a webpage
browser.proxy.onRequest.addListener(handleProxifiedRequest, {urls: ["<all_urls>"]});

// Log any errors from the proxy script
browser.proxy.onError.addListener(error => {
    console.error(`Proxy error: ${error.message}`);
});

//open preferences on icon click
browser.browserAction.onClicked.addListener(async () => {
    await browser.runtime.openOptionsPage();
});

//update icon on tab activation
browser.tabs.onActivated.addListener(async (info) => {
    let tabInfo = await browser.tabs.get(info.tabId);
    await updateIcon(tabInfo);
});

//update icon on tab update
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tabInfo) => {
    await updateIcon(tabInfo);
});

// Listen for changes in extenstion storage
browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        let changedItems = Object.keys(changes);
        for (let item of changedItems) {
            settings[item] = changes[item].newValue;
        }
    }
});