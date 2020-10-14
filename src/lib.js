/* globals module, require, VERSION */

import React from 'react'
import App from './components/app'
import ConsentManager from './consent-manager'
import KlaroApi from './utils/api';
import {render as reactRender} from 'react-dom'
import {convertToMap, update} from './utils/maps'
import {t, language} from './utils/i18n'
import {currentScript} from './utils/compat'
export {update as updateConfig} from './utils/config'
import './scss/klaro.scss'

let defaultConfig
const defaultTranslations = new Map([])
const eventHandlers = {}
const events = {}

// When webpack's hot loading is enabled, enable Preact's support for the
// React Dev Tools browser extension.
if(module.hot)
    require('preact/debug')

export function getElementID(config, ide){
    return (config.elementID || 'klaro') + (ide ? '-ide' : '')
}

export function getElement(config, ide){
    const id = getElementID(config, ide)
    let element = document.getElementById(id)
    if (element === null){
        element = document.createElement('div')
        element.id = id
        document.body.appendChild(element)
    }
    return element
}

export function addEventListener(eventType, handler){
    if (eventHandlers[eventType] === undefined)
        eventHandlers[eventType] = [handler]
    else
        eventHandlers[eventType].push(handler)
    // this event did already fire, we call the handler
    if (events[eventType] !== undefined)
        for(const event of events[eventType])
            if (handler(...event) === false)
                break
}

function executeEventHandlers(eventType, ...args){
    const handlers = eventHandlers[eventType]
    if (events[eventType] === undefined)
        events[eventType] = [args]
    else
        events[eventType].push(args)
    if (handlers !== undefined)
        for(const handler of handlers){
            if (handler(...args) === true)
                return true
        }
}

export function getConfigTranslations(config){
    const trans = new Map([])
    update(trans, defaultTranslations)
    update(trans, convertToMap(config.translations || {}))
    return trans
}

let cnt = 1
export function render(config, opts){
    if (config === undefined)
        return
    opts = opts || {}

    config = validateConfig(config)

    executeEventHandlers("render", config, opts)

    // we are using a count here so that we're able to repeatedly open the modal...
    let showCnt = 0
    if (opts.show)
        showCnt = cnt++
    const element = getElement(config)
    const manager = getManager(config)

    if (opts.api !== undefined)
        manager.watch(opts.api)

    const lang = language(config.lang)
    const configTranslations = getConfigTranslations(config)
    const tt = (...args) => t(configTranslations, lang, config.fallbackLang || 'zz', ...args)
    const app = reactRender(<App t={tt}
        lang={lang}
        manager={manager}
        config={config}
        testing={opts.testing}
        modal={opts.modal}
        api={opts.api}
        show={showCnt} />, element)
    return app
}

function showKlaroIDE(script) {
    const baseName = /^(.*)(\/[^/]+)$/.exec(script.src)[1] || ''
    const element = document.createElement('script')
    element.src = baseName !== '' ? baseName + '/ide.js' : 'ide.js'
    element.type = "application/javascript"
    for(const attribute of element.attributes){
        element.setAttribute(attribute.name, attribute.value)
    }
    document.head.appendChild(element)
}


function doOnceLoaded(handler){
    if (/complete|interactive|loaded/.test(document.readyState)){
        handler()
    } else {
        window.addEventListener('DOMContentLoaded', handler)
    }
}

function getKlaroId(script){
    const klaroId = script.getAttribute('data-klaro-id')
    if (klaroId !== null)
        return klaroId
    const regexMatch = /.*\/privacy-managers\/([a-f0-9]+)\/klaro.js/.exec(script.src)
    if (regexMatch !== null)
        return regexMatch[1]
    return null
}

function getKlaroApiUrl(script){
    const klaroApiUrl = script.getAttribute('data-klaro-api-url')
    if (klaroApiUrl !== null)
        return klaroApiUrl
    const regexMatch = /(http(?:s)?:\/\/[^/]+)\/v1\/privacy-managers\/([a-f0-9]+)\/klaro.js/.exec(script.src)
    if (regexMatch !== null)
        return regexMatch[1]
    return null
}

function getKlaroConfigName(hashParams, script){
    // hash parameters always win
    if (hashParams.has('klaro-config')){
        return hashParams.get('klaro-config')
    }
    // afterwards we check the script tag
    const klaroConfigName = script.getAttribute('data-klaro-config')
    if (klaroConfigName !== null)
        return klaroConfigName
    // if nothing works we return the default value
    return 'default'
}

function getHashParams(){
    return new Map(decodeURI(location.hash.slice(1)).split("&").map(kv => kv.split("=")).map(kv => (kv.length === 1 ? [kv[0], true] : kv)))
}

export function validateConfig(config){
    const validatedConfig = {...config}
    if (validatedConfig.version === 2)
        return validatedConfig
    if (validatedConfig.apps !== undefined && validatedConfig.services === undefined){
        validatedConfig.services = validatedConfig.apps
        console.warn("Warning, your configuration file is outdated. Please change `apps` to `services`")
        delete validatedConfig.apps
    }
    if (validatedConfig.translations !== undefined){
        if (validatedConfig.translations.apps !== undefined && validatedConfig.services === undefined){
            validatedConfig.translations.services = validatedConfig.translations.apps
            console.warn("Warning, your configuration file is outdated. Please change `apps` to `services` in the `translations` key")
            delete validatedConfig.translations.apps
        }
    }
    return validatedConfig
}

export function setup(config){
    const script = currentScript("klaro");
    const hashParams = getHashParams();

    const initialize = (opts) => {
        const fullOpts = {...opts, testing: hashParams.get('klaro-testing')}
        if (!defaultConfig.noAutoLoad)
            render(defaultConfig, fullOpts)
    }

    if (config !== undefined){
        // we initialize directly with a config
        defaultConfig = config;
        doOnceLoaded(() => initialize({}))
    } else if (script !== null) {
        // we initialize with a script tag
        const klaroId = getKlaroId(script)
        const klaroApiUrl = getKlaroApiUrl(script)
        const klaroConfigName = getKlaroConfigName(hashParams, script);
        if (klaroId !== null){
            // we initialize with an API backend
            const api = new KlaroApi(klaroApiUrl, klaroId, {testing: hashParams.get('klaro-testing')})
            api.loadConfig(klaroConfigName).then((config) => {

                // an event handler can interrupt the initialization, e.g. if it wants to perform
                // its own initialization given the API configs
                if (executeEventHandlers("apiConfigsLoaded", [config], api) === true){
                    return
                }
                defaultConfig = config
                doOnceLoaded(() => initialize({api: api}))

            }).catch((err) => {
                console.error(err, "cannot load Klaro configs")
                executeEventHandlers("apiConfigsFailed", err)
            })
        } else {
            // we initialize with a local config instead
            const configName = script.getAttribute('data-klaro-config') || "klaroConfig"
            defaultConfig = window[configName];
            if (defaultConfig !== undefined)
                doOnceLoaded(() => initialize({}))
        }
    }
    // If requested, we show the Klaro IDE
    if (hashParams.has('klaro-ide')){
        showKlaroIDE(script)
    }
}

export function show(config, modal, api){
    config = config || defaultConfig
    render(config, {show: true, modal: modal, api: api})
    return false
}

/* Consent Managers */

const managers = {}

export function resetManagers(){
    for(const key in Object.keys(managers))
        delete managers[key]
}

export function getManager(config){
    config = config || defaultConfig
    const name = config.storageName || config.cookieName || 'default' // deprecated: cookieName
    if (managers[name] === undefined)
        managers[name] = new ConsentManager(validateConfig(config))
    return managers[name]
}

export function version(){
    // we remove the 'v'
    if (VERSION[0] === 'v')
        return VERSION.slice(1)
    return VERSION
}

export {language, defaultConfig, defaultTranslations}
