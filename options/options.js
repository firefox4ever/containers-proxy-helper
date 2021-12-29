const template = document.querySelector('#proxyInput');
const list = document.querySelector('#containers');
const system = {};
const direct = {
    type: 'direct'
};
const blocked = {
    type: 'socks',
    host: 'block-proxy.localhost',
    port: 1,
    failoverTimeout: 1,
    username: 'nonexistent user',
    password: 'random password',
    proxyDNS: true
};

let settings = {};

function getProxiesFromInput(text) {
//right now only one proxy 
    text = text.trim();
    if (!text) {
        return [blocked];
    }
    if (text.toLowerCase() === 'system') {
        return [system];
    }
    if (text.toLowerCase() === 'direct') {
        return [direct];
    }
    if (text.toLowerCase().match(/^[a-z]{2}\d{1,3}$/i)) {
        return [{
            type: 'socks',
            host: text.toLowerCase() + '-wg.socks5.mullvad.net',
            port: 1080,
            proxyDNS: true
        }];
    }
    const proxyRegexp = /(?<type>(socks4?)):\/\/(\b(?<username>\w+):(?<password>\w+)@)?(?<host>((?:\d{1,3}\.){3}\d{1,3}\b)|(\b([\w.-]+)+))(:(?<port>\d+))?/;
    const matches = proxyRegexp.exec(text);
    if (!matches) {
        return [blocked];
    }
    return [{...matches.groups, proxyDNS: true}];
}

function storeSettings(e) {
    const storeId = e.target.getAttribute('data-id');
    const text = e.target.value;
    const proxies = getProxiesFromInput(text);
    browser.storage.local.set({
        [storeId]: {
            input: e.target.value,
            proxies: proxies
        }
    });
}

function printContainerRow(identity) {
    const row = template.content.cloneNode(true);
    const div = row.querySelector('div');
    div.className = 'identity-icon-' + identity.icon + ' identity-color-' + identity.color;
    div.id = identity.cookieStoreId;
    row.querySelector('.userContext-label').textContent = identity.name;
    const input = row.querySelector('input');
    input.setAttribute('data-id', identity.cookieStoreId);
    if (settings[identity.cookieStoreId]) {
        input.value = settings[identity.cookieStoreId].input ?? '';
    }
    input.addEventListener('change', storeSettings);
    list.appendChild(row);
}

async function setupContainerFields() {
    settings = await browser.storage.local.get();
    const identities = await browser.contextualIdentities.query({});
    const incognito = await browser.extension.isAllowedIncognitoAccess();
    printContainerRow({name: "Default", icon: "default", color: "default", cookieStoreId: "firefox-default"});
    if (incognito) {
        printContainerRow({name: "Private", icon: "private", color: "private", cookieStoreId: "firefox-private"});
    }
    for (const identity of identities) {
        printContainerRow(identity);
    }
}

setupContainerFields(); //.catch(e => { console.log(e) });


/*
const blockedHostsTextArea = document.querySelector("#blocked-hosts");

// Store the currently selected settings using browser.storage.local.
function storeSettings() {
  let blockedHosts = blockedHostsTextArea.value.split("\n");
  browser.storage.local.set({
    blockedHosts
  });
}

// Update the options UI with the settings values retrieved from storage,
// or the default settings if the stored settings are empty.
function updateUI(restoredSettings) {
  blockedHostsTextArea.value = restoredSettings.blockedHosts.join("\n");
}

function onError(e) {
  console.error(e);
}
// On opening the options page, fetch stored settings and update the UI with them.
browser.storage.local.get().then(updateUI, onError);

// Whenever the contents of the textarea changes, save the new values
blockedHostsTextArea.addEventListener("change", storeSettings);
*/
