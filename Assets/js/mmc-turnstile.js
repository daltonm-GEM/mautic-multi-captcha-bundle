        (function () {
            if (window.__mmcTurnstile) {
                return;
            }

            window.__mmcTurnstile = {
                apiLoading: false,

                ensureApi: function (onReady) {
                    if (window.turnstile) {
                        onReady && onReady();
                        return;
                    }

                    // Already loading: poll until ready
                    if (this.apiLoading) {
                        var tries = 0;
                        var t = setInterval(function () {
                            tries++;
                            if (window.turnstile) {
                                clearInterval(t);
                                onReady && onReady();
                            }
                            if (tries > 50) clearInterval(t);
                        }, 100);
                        return;
                    }

                    this.apiLoading = true;

                    // Inject Turnstile API once
                    if (!document.querySelector('script[data-mmc-turnstile-api="1"]')) {
                        var s = document.createElement('script');
                        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                        s.async = true;
                        s.defer = true;
                        s.setAttribute('data-mmc-turnstile-api', '1');
                        s.onload = function () {
                            onReady && onReady();
                        };
                        document.head.appendChild(s);
                    } else {
                        // Script exists; poll until ready
                        var tries2 = 0;
                        var t2 = setInterval(function () {
                            tries2++;
                            if (window.turnstile) {
                                clearInterval(t2);
                                onReady && onReady();
                            }
                            if (tries2 > 50) clearInterval(t2);
                        }, 100);
                    }
                },

                renderEligible: function (root) {
                    if (!window.turnstile) return;
                    root = root || document;

                    var nodes = root.querySelectorAll('.mmc-turnstile');
                    nodes.forEach(function (el) {
                        if (el.dataset.rendered === '1') return;

                        // Consent-gated widgets render only when granted
                        if (el.dataset.consentRequired === '1' && el.dataset.consentGranted !== '1') {
                            return;
                        }

                        el.dataset.rendered = '1';

                        window.turnstile.render(el, {
                            sitekey: el.dataset.sitekey,
                            size: el.dataset.size || 'normal',
                            theme: el.dataset.theme || 'auto',
                            'response-field-name': el.dataset.responseFieldName || 'cf-turnstile-response'
                        });
                    });
                },

                wireConsentCheckboxes: function () {
                    if (document.body.dataset.mmcTurnstileWired === '1') return;
                    document.body.dataset.mmcTurnstileWired = '1';

                    document.addEventListener('change', function (e) {
                        var cb = e.target;
                        if (!cb || !cb.classList || !cb.classList.contains('mmc-turnstile-consent')) return;
                        if (!cb.checked) return;

                        var wrapper = cb.closest('[data-mmc-turnstile-wrapper]');
                        if (!wrapper) return;

                        var widget = wrapper.querySelector('.mmc-turnstile');
                        if (!widget) return;

                        widget.dataset.consentGranted = '1';
                        cb.disabled = true;

                        window.__mmcTurnstile.ensureApi(function () {
                            window.__mmcTurnstile.renderEligible(wrapper);
                        });
                    }, true);
                },

                observe: function () {
                    if (document.body.dataset.mmcTurnstileObserved === '1') return;
                    document.body.dataset.mmcTurnstileObserved = '1';

                    // MutationObserver to handle dynamic inserts (page builders / script embed reinits)
                    if (!('MutationObserver' in window)) return;

                    var obs = new MutationObserver(function (mutations) {
                        for (var i = 0; i < mutations.length; i++) {
                            var m = mutations[i];
                            for (var j = 0; j < m.addedNodes.length; j++) {
                                var n = m.addedNodes[j];
                                if (!n || n.nodeType !== 1) continue;

                                // If the added node is (or contains) a turnstile placeholder, try rendering
                                if (n.classList && n.classList.contains('mmc-turnstile')) {
                                    window.__mmcTurnstile.ensureApi(function () {
                                        window.__mmcTurnstile.renderEligible(document);
                                    });
                                    return;
                                }
                                if (n.querySelector && n.querySelector('.mmc-turnstile')) {
                                    window.__mmcTurnstile.ensureApi(function () {
                                        window.__mmcTurnstile.renderEligible(document);
                                    });
                                    return;
                                }
                            }
                        }
                    });

                    obs.observe(document.body, { childList: true, subtree: true });
                }
            };

            window.__mmcTurnstile.wireConsentCheckboxes();
            window.__mmcTurnstile.observe();

            // Try render on DOM ready and Mautic page events
            document.addEventListener('DOMContentLoaded', function () {
                window.__mmcTurnstile.ensureApi(function () {
                    window.__mmcTurnstile.renderEligible(document);
                });
            });

            document.addEventListener('mauticPageOnLoad', function () {
                window.__mmcTurnstile.ensureApi(function () {
                    window.__mmcTurnstile.renderEligible(document);
                });
            });
        })();
