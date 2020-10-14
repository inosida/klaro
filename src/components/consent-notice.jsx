import React from 'react';
import ConsentModal from './consent-modal';
import { getPurposes } from '../utils/config';
import Text from './text';
import { asTitle } from '../utils/strings' 

export default class ConsentNotice extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            modal: props.modal,
            confirming: false,
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.modal !== this.props.modal)
            this.setState({ modal: this.props.modal });
    }

    executeButtonClicked = (setChangedAll, changedAllValue, eventType) => {
        const { modal } = this.state;
        let changedServices = 0;
        if (setChangedAll)
            changedServices = this.props.manager.changeAll(changedAllValue);
        const confirmed = this.props.manager.confirmed;
        const saveAndHide = () => {
            this.setState({ confirming: false });
            this.props.manager.saveAndApplyConsents(eventType);
            this.props.hide();
        };
        if (
            setChangedAll &&
            !confirmed &&
            (modal || this.props.config.mustConsent)
        ) {
            if (changedServices === 0) saveAndHide();
            else setTimeout(saveAndHide, 1000);
        } else saveAndHide();
    };

    saveAndHide = () => {
        this.executeButtonClicked(false, false, 'save');
    };

    acceptAndHide = () => {
        this.executeButtonClicked(true, true, 'accept');
    };

    declineAndHide = () => {
        this.executeButtonClicked(true, false, 'decline');
    };

    render() {
        const { lang, config, show, manager, testing, t } = this.props;
        const { modal, confirming } = this.state;
        const { embedded, noticeAsModal, hideLearnMore } = config;

        // we exclude functional services from this list, as they are always required and
        // the user cannot decline their use...
        const purposes = getPurposes(config).filter(purpose => purpose !== 'functional');
        const purposesTranslations = purposes
            .map((purpose) => t(['!', 'purposes', purpose, 'title?']) || asTitle(purpose))
        let purposesText = ''
        if (purposesTranslations.length === 1)
            purposesText = purposesTranslations[0]
        else
            purposesText = [...purposesTranslations.slice(0, -2), purposesTranslations.slice(-2).join(' & ')].join(', ');
        let ppUrl;
        // to do: deprecate and remove this 
        if (config.privacyPolicy !== undefined) {
            if (typeof config.privacyPolicy === 'string')
                ppUrl = config.privacyPolicy;
            else if (typeof config.privacyPolicy === 'object') {
                ppUrl =
                    config.privacyPolicy[lang] || config.privacyPolicy.default;
            }
        } else {
            // this is the modern way
            ppUrl = t(['!', 'privacyPolicyUrl'])
        }


        const showModal = (e) => {
            e.preventDefault();
            this.setState({ modal: true });
        };

        const hideModal = () => {
            if (config.mustConsent && !config.acceptAll) return;
            if (manager.confirmed && !testing) this.props.hide();
            else this.setState({ modal: false });
        };

        let changesText;
        if (manager.changed)
            changesText = (
                <p className="cn-changes">
                    {t(['consentNotice', 'changeDescription'])}
                </p>
            );
        if (!show && !testing) return <div />;

        const noticeIsVisible =
            (!config.mustConsent || noticeAsModal) &&
            !manager.confirmed &&
            !config.noNotice;

        const declineButton = config.hideDeclineAll ? (
            ''
        ) : (
            <button
                className="cm-btn cm-btn-danger cn-decline"
                type="button"
                onClick={this.declineAndHide}
            >
                {t(['decline'])}
            </button>
        );

        const acceptButton = config.acceptAll ? (
            <button
                className="cm-btn cm-btn-success"
                type="button"
                onClick={this.acceptAndHide}
            >
                {t(['ok'])}
            </button>
        ) : (
            <button
                className="cm-btn cm-btn-success"
                type="button"
                onClick={this.saveAndHide}
            >
                {t(['ok'])}
            </button>
        );

        const learnMoreLink = (extraText) =>
            noticeAsModal ? (
                <button
                    className="cm-btn cm-btn-lern-more cm-btn-info"
                    type="button"
                    onClick={showModal}
                >
                    {t(['consentNotice', 'configure'])}
                    {extraText}
                </button>
            ) : (
                <a
                    className="cm-link cn-learn-more"
                    href="#"
                    onClick={showModal}
                >
                    {t(['consentNotice', 'learnMore'])}
                    {extraText}
                </a>
            );

        let ppLink;

        if (ppUrl !== undefined)
            ppLink = (
                <a key="ppLink" href={ppUrl}>
                    {t(['consentNotice', 'privacyPolicy', 'name'])}
                </a>
            );

        if (
            modal ||
            (manager.confirmed && !testing) ||
            (!manager.confirmed && config.mustConsent)
        )
            return (
                <ConsentModal
                    t={t}
                    lang={lang}
                    confirming={confirming}
                    config={config}
                    hide={hideModal}
                    declineAndHide={this.declineAndHide}
                    saveAndHide={this.saveAndHide}
                    acceptAndHide={this.acceptAndHide}
                    manager={manager}
                />
            );
        const notice = (
            <div
                className={`cookie-notice ${
                    (!noticeIsVisible && !testing) ? 'cookie-notice-hidden' : ''
                } ${noticeAsModal ? 'cookie-modal-notice' : ''} ${
                    embedded ? 'cn-embedded' : ''
                }`}
            >
                <div className="cn-body">
                <h3 id="onetrust-policy-title">Du bestämmer vilka cookies som får användas.</h3>
                <p>IKEA och våra digitala samarbetspartners använder cookies på den här sidan. Vissa behövs för att sidan ska fungera korrekt. Följande cookies är valbara för dig: </p>
                <ul className="Notice-list">
                    <li className="Notice-list-item"> Cookies för att analysera hur vår webbplats används</li>
                    <li className="Notice-list-item">  Cookies som möjliggör en personaliserad upplevelse av vår webbplats</li>
                    <li className="Notice-list-item">  Cookies för annonsering och sociala medier</li>
                
                </ul>
                
                    {testing && <p>{t(['consentNotice', 'testing'])}</p>}
                    {changesText}
                    <div className="cn-ok">
                        {!hideLearnMore && learnMoreLink('...')}
                        <div className="cn-buttons">
                            {declineButton}
                            {acceptButton}
                        </div>
                    </div>
                </div>
            </div>
        );

        if (!noticeAsModal) return notice;


        return (
            <div className="cookie-modal">
                <div className="cm-bg" />
                {notice}
            </div>
        );
    }
}
