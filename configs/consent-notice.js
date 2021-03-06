import React from 'react'
import ConsentModal from './consent-modal'
import Apps from './apps'
import {getPurposes} from 'utils/config'

export default class ConsentNotice extends React.Component {

    componentWillReceiveProps(props){
        if (props.show)
            this.setState({modal : undefined})
    }

    render(){

        const {modal} = this.state
        const {config, manager, show, t} = this.props
        const {apps} = config

        const purposes = getPurposes(config)
        const purposesText = purposes.map((purpose) => t(['purposes', purpose])).join(", ")

        const showModal = (e) => {
            if (e !== undefined)
                e.preventDefault()
            manager.declineAll()
            this.setState({modal: true})
        }

        const toggle = (apps, value) => {
            apps.map((app)=>{
                if  (!app.required) {
                    manager.updateConsent(app.name, value)
                }
            })
        }

        const toggleAll = (value) => {
            toggle(apps, value)
        }

        const hide = (e) => {
            if (e !== undefined)
                e.preventDefault()
            this.setState({modal: false})
        }

        const acceptAndHide = (e) => {
            if (e !== undefined)
                e.preventDefault()
            manager.resetConsent()
            manager.saveAndApplyConsents()
            this.setState({modal: false})
        }

        const saveAndHide = (e) => {
            if (e !== undefined)
                e.preventDefault()
            manager.saveAndApplyConsents()
            this.setState({modal: false})
        }


        const declineAndHide = (e) => {
            manager.declineAll()
            manager.saveAndApplyConsents()
            this.setState({modal: false})
        }

        var changesText

        if (manager.changed)
            changesText = <p className="cn-changes">{t(['consentNotice', 'changeDescription'])}</p>

        if (manager.confirmed && !show)
            return <div />

        const modalIsOpen =
            modal
            || (show && modal === undefined)
            || (config.mustConsent && !manager.confirmed)
        const noticeIsVisible =
            !config.mustConsent && !manager.confirmed && !config.noNotice

        if (modal || (show && modal === undefined) || (config.mustConsent && !manager.confirmed))
            return <ConsentModal t={t} config={config} hide={hide} declineAndHide={declineAndHide} saveAndHide={saveAndHide} manager={manager} />
        return <div className={`cookie-notice ${!noticeIsVisible ? 'cookie-notice-hidden' : ''}`}>
            <div className="cn-body">

                <h2>{t(['Cookie Preferences'])}</h2>

                <h3>{t(['Cookie text 1'])}</h3>

                <ul>
                    <li><strong>{t(['Cookie text 2 heading'])}</strong> {t(['Cookie text 2'])}</li>
                    <li> <strong>{t(['Cookie text 3 heading'])}</strong> {t(['Cookie text 3'])}</li>
                    <li> <strong>{t(['Cookie text 4 heading'])}</strong> {t(['Cookie text 4'])}</li>
                </ul>

                <p>
                    <a href="#"> {t(['learnMore'])}...</a>
                </p>
                {changesText}
                <p className="cn-ok">
                    <button className="cm-btn cm-btn-sm cm-btn-success" type="button" onClick={acceptAndHide}>{t(['Accept Cookies'])}</button>
                    <button className="cm-btn cm-btn-sm cm-btn-danger cn-decline" type="button" onClick={showModal}>{t(['Cookie Settings'])}</button>
                </p>
            </div>
        </div>
    }
}
                                   