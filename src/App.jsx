import React, { useState, useEffect } from "react";
import "./styles.css";

// SEND on Base
const SEND_PRICE_API =
    "https://api.dexscreener.com/latest/dex/tokens/0xEab49138BA2Ea6dd776220fE26b7b8E446638956";

// Canton (CC) token (example you gave)
const CANTON_PRICE_API =
    "https://api.coingecko.com/api/v3/simple/price?ids=canton-network&vs_currencies=usd";

export default function App() {
    const [cantonAmount, setCantonAmount] = useState("");
    const [frequencyMinutes, setFrequencyMinutes] = useState("11");

    const [sendHoldings, setSendHoldings] = useState(""); // NEW: SEND holdings

    const [sendPrice, setSendPrice] = useState(null); // USD
    const [cantonPrice, setCantonPrice] = useState(null); // USD

    const [loadingPrices, setLoadingPrices] = useState(false);
    const [priceError, setPriceError] = useState(null);

    const [results, setResults] = useState(null);

    // Load live prices on mount
    useEffect(() => {
        const fetchPrices = async () => {
            setLoadingPrices(true);
            setPriceError(null);

            try {
                // 1) SEND price from DexScreener
                const sendRes = await fetch(SEND_PRICE_API);
                if (!sendRes.ok) {
                    throw new Error("Failed to fetch SEND price");
                }
                const sendData = await sendRes.json();
                const sendUsd = Number(sendData?.pairs?.[0]?.priceUsd);
                if (!isNaN(sendUsd) && sendUsd > 0) {
                    setSendPrice(sendUsd);
                }

                // 2) Canton price from DexScreener
                const cantonRes = await fetch(CANTON_PRICE_API);
                if (!cantonRes.ok) {
                    throw new Error("Failed to fetch Canton price");
                }
                const cantonData = await cantonRes.json();
                const cantonUsd = cantonData["canton-network"].usd;

                if (!isNaN(cantonUsd) && cantonUsd > 0) {
                    setCantonPrice(cantonUsd);
                }
            } catch (err) {
                console.error(err);
                setPriceError(
                    "Could not load live prices. You can still calculate in CC only."
                );
            } finally {
                setLoadingPrices(false);
            }
        };

        fetchPrices();
    }, []);

    const formatNumber = (value) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        });

    const formatUsd = (value) =>
        value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        });

    const formatPercent = (value) =>
        value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const handleCalculate = (e) => {
        e.preventDefault();

        const amount = parseFloat(cantonAmount);
        const freq = parseFloat(frequencyMinutes);

        if (isNaN(amount) || isNaN(freq) || freq <= 0 || amount < 0) {
            setResults(null);
            return;
        }

        // CC per minute
        const perMinute = amount / freq;
        const perHour = perMinute * 60;
        const perDay = perHour * 24;
        const perMonth = perDay * 30; // 30-day month
        const perYear = perDay * 365; // 365-day year

        const data = {
            perHour,
            perDay,
            perMonth,
            perYear,
        };

        // If we have a valid Canton price, also compute USD outputs
        if (cantonPrice != null && !isNaN(cantonPrice) && cantonPrice > 0) {
            data.usdPerHour = perHour * cantonPrice;
            data.usdPerDay = perDay * cantonPrice;
            data.usdPerMonth = perMonth * cantonPrice;
            data.usdPerYear = perYear * cantonPrice;
        }

        // APR calculation in USD
        const sendHold = parseFloat(sendHoldings);
        if (
            sendHold &&
            !isNaN(sendHold) &&
            sendHold > 0 &&
            sendPrice != null &&
            !isNaN(sendPrice) &&
            sendPrice > 0 &&
            data.usdPerYear != null
        ) {
            const positionValueUsd = sendHold * sendPrice;
            if (positionValueUsd > 0) {
                const aprPercent = (data.usdPerYear / positionValueUsd) * 100;
                data.aprPercent = aprPercent;
                data.positionValueUsd = positionValueUsd;
            }
        }

        setResults(data);
    };

    return (
        <div className="app-root">
            <div className="glass-card">
                <header className="header">
                    <span className="logo-dot" />
                    <h1 className="title">My Send Rewards</h1>
                    <p className="subtitle">
                        Calculate how many <span className="highlight">Canton (CC)</span> you
                        generate based on your reward frequency.
                    </p>
                </header>

                {/* Price pills section */}
                <section className="prices-section">
                    <div className="prices-row">
                        <div className="price-pill">
                            <span className="pill-label">SEND PRICE</span>
                            <span className="pill-value">
                {loadingPrices && sendPrice == null && "Loading..."}
                                {!loadingPrices && sendPrice == null && "--"}
                                {sendPrice != null && formatUsd(sendPrice)}
              </span>
                        </div>

                        <div className="price-pill">
                            <span className="pill-label">CC PRICE</span>
                            <span className="pill-value">
                {loadingPrices && cantonPrice == null && "Loading..."}
                                {!loadingPrices && cantonPrice == null && "--"}
                                {cantonPrice != null && formatUsd(cantonPrice)}
              </span>
                        </div>
                    </div>

                    {priceError && (
                        <p className="results-placeholder prices-error">
                            {priceError}
                        </p>
                    )}
                </section>

                {/* Form section */}
                <form className="form" onSubmit={handleCalculate}>
                    <div className="field-group">
                        <label className="label" htmlFor="cantonAmount">
                            Canton amount per reward
                        </label>
                        <input
                            id="cantonAmount"
                            type="number"
                            step="0.0001"
                            min="0"
                            className="input"
                            placeholder="e.g. 3.5"
                            value={cantonAmount}
                            onChange={(e) => setCantonAmount(e.target.value)}
                        />
                    </div>

                    <div className="field-group">
                        <label className="label" htmlFor="frequencyMinutes">
                            Frequency (in minutes)
                        </label>
                        <input
                            id="frequencyMinutes"
                            type="number"
                            step="1"
                            min="1"
                            className="input"
                            placeholder="e.g. 11"
                            value={frequencyMinutes}
                            onChange={(e) => setFrequencyMinutes(e.target.value)}
                        />
                        <p className="help-text">
                            Example: if you receive rewards every 15 minutes, enter{" "}
                            <strong>15</strong>.
                        </p>
                    </div>

                    <div className="field-group">
                        <label className="label" htmlFor="sendHoldings">
                            SEND holdings
                        </label>
                        <input
                            id="sendHoldings"
                            type="number"
                            step="1"
                            min="0"
                            className="input"
                            placeholder="e.g. 500000"
                            value={sendHoldings}
                            onChange={(e) => setSendHoldings(e.target.value)}
                        />
                        <p className="help-text">
                            Total SEND you have in this farm (used to compute APR).
                        </p>
                    </div>

                    <button type="submit" className="button-primary">
                        Calculate
                    </button>
                </form>

                {/* Results section */}
                <section className="results-section">
                    <h2 className="results-title">Results</h2>

                    {!results && (
                        <p className="results-placeholder">
                            Enter your data and click <span className="highlight">Calculate</span>.
                        </p>
                    )}

                    {results && (
                        <>
                            <div className="results-grid">
                                <div className="result-card">
                                    <span className="result-label">Per hour</span>
                                    <span className="result-value">
                    {formatNumber(results.perHour)} CC
                  </span>
                                    {results.usdPerHour != null && (
                                        <span className="result-subvalue">
                      ≈ {formatUsd(results.usdPerHour)}
                    </span>
                                    )}
                                </div>
                                <div className="result-card">
                                    <span className="result-label">Per day</span>
                                    <span className="result-value">
                    {formatNumber(results.perDay)} CC
                  </span>
                                    {results.usdPerDay != null && (
                                        <span className="result-subvalue">
                      ≈ {formatUsd(results.usdPerDay)}
                    </span>
                                    )}
                                </div>
                                <div className="result-card">
                                    <span className="result-label">Per month (30 days)</span>
                                    <span className="result-value">
                    {formatNumber(results.perMonth)} CC
                  </span>
                                    {results.usdPerMonth != null && (
                                        <span className="result-subvalue">
                      ≈ {formatUsd(results.usdPerMonth)}
                    </span>
                                    )}
                                </div>
                                <div className="result-card">
                                    <span className="result-label">Per year (365 days)</span>
                                    <span className="result-value">
                    {formatNumber(results.perYear)} CC
                  </span>
                                    {results.usdPerYear != null && (
                                        <span className="result-subvalue">
                      ≈ {formatUsd(results.usdPerYear)}
                    </span>
                                    )}
                                </div>
                            </div>

                            {results.aprPercent != null && (
                                <div className="apr-card">
                                    <span className="result-label">Estimated APR (USD)</span>
                                    <span className="apr-value">
                    {formatPercent(results.aprPercent)}%
                  </span>
                                    {results.positionValueUsd != null && (
                                        <span className="result-subvalue">
                      Position value ≈ {formatUsd(results.positionValueUsd)}
                    </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </section>
                <section className="referral-section">
                    <p className="ref-text icon-line">
                        <img src="/src/assets/mushroom.png" alt="mushroom" className="mushroom-icon" />
                        Developed with love <span className="heart">❤️</span> by
                        <a
                            href="https://x.com/ocebotSend"
                            target="_blank"
                            className="ref-link"
                        >
                            &nbsp;/ocebot
                        </a>
                    </p>

                    <p className="ref-text icon-line">
                        If you want to join SEND, please consider using my referral:{" "}
                        <a
                            href="https://send.app?referral=ocebot"
                            target="_blank"
                            className="ref-link"
                        >
                            send.app?referral=ocebot
                        </a>
                    </p>

                    <p className="ref-text funny-text icon-line">
                        Buy me a coffee <span className="coffee">☕</span> if this helped you!
                    </p>
                </section>


                <footer className="footer">
                    <span className="badge">SEND · Canton Rewards</span>
                </footer>
            </div>
        </div>
    );
}
