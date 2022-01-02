const template = document.querySelector('#proxyInput');
const containersList = document.querySelector('#containers');
const commonList = document.querySelector('#common');


const firefox = {};
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
const connectionTypes = {
    '': [],
    '$firefox': [firefox],
    '$direct': [direct],
    '$block': [blocked]
};

let settings = {};

//right now only one proxy
function getProxiesFromInput(text) {
    text = text.trim();
    if (text === '') {
        return [];
    }
    //mullvad aliases
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
    const row = e.target.closest('[data-identity-id]');
    const storeId = row.getAttribute('data-identity-id');
    if (storeId) {
        const select = row.querySelector('select.connectionType');
        let result = {};

        if (connectionTypes[select.value]) {
            result = {
                input: select.value,
                proxies: connectionTypes[select.value]
            }
        }
        else {
            const input = row.querySelector('input.userContext-proxy');
            result = {
                input: input.value,
                proxies: getProxiesFromInput(input.value)
            }
        }

        browser.storage.local.set({
            [storeId]: result
        });

    }
}

function showInfo(select) {
    select.parentElement.querySelectorAll('[data-value]').forEach(el => {
        if (el.getAttribute('data-value') === select.value) {
            el.removeAttribute('hidden');
        }
        else {
            el.setAttribute('hidden', '');
        }
    });
}

function printContainerRow(identity, list) {
    const row = template.content.cloneNode(true);
    const div = row.querySelector('div');
    div.className = 'identity-icon-' + identity.icon + ' identity-color-' + identity.color;
    div.setAttribute('data-identity-id', identity.cookieStoreId);

    row.querySelector('.userContext-label').textContent = identity.name;

    const select = row.querySelector('select.connectionType');
    const input = row.querySelector('input.userContext-proxy');
    if (identity.cookieStoreId === 'default') {
        select.querySelector('option').disabled = true;
    }

    if (settings[identity.cookieStoreId] && settings[identity.cookieStoreId].input) {
        let idx = Object.keys(connectionTypes).indexOf(settings[identity.cookieStoreId].input);
        if (idx > 0) {
            input.value = '';
            select.selectedIndex = idx;
        }
        else {
            input.value = settings[identity.cookieStoreId].input;
            select.selectedIndex = 4;
        }
    }
    else {
        input.value = '';
        select.selectedIndex = identity.cookieStoreId === 'default' ? 3 : 0;
    }
    showInfo(select);
    input.addEventListener('change', storeSettings);
    select.addEventListener('change', storeSettings);
    select.addEventListener('change', event => { showInfo(event.target) });
    list.appendChild(row);
}

async function setupContainerFields() {
    settings = await browser.storage.local.get();
    const identities = await browser.contextualIdentities.query({});
    const incognito = await browser.extension.isAllowedIncognitoAccess();
    printContainerRow({name: "Default", icon: "default", color: "default", cookieStoreId: "default"}, commonList);
    printContainerRow({name: "Unknown", icon: "unknown", color: "red", cookieStoreId: "firefox-unknown"}, commonList);
    printContainerRow({name: "No Container", icon: "nocontainer", color: "nocontainer", cookieStoreId: "firefox-default"}, commonList);
    if (incognito) {
        printContainerRow({name: "Private", icon: "private", color: "private", cookieStoreId: "firefox-private"}, commonList);
    }
    for (const identity of identities) {
        printContainerRow(identity, containersList);
    }
}

setupContainerFields().catch(e => { console.log(e) });