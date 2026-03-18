"use client";

type Props = {
    status: string;
    currentPrice: number;
    entryZoneLow: number;
    entryZoneHigh: number;
    stopLoss: number;
    resistanceZoneLow: number;
    resistanceZoneHigh: number;
    liveMode: boolean;
    lastTickLabel: string;
};

export default function MentorFocusPanel({
    status,
    currentPrice,
    entryZoneLow,
    entryZoneHigh,
    stopLoss,
    resistanceZoneLow,
    resistanceZoneHigh,
    liveMode,
    lastTickLabel,
}: Props) {
    const inBuyZone =
        currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
    const aboveBuyZone = currentPrice > entryZoneHigh;
    const belowBuyZone = currentPrice < entryZoneLow;

    let liveSentence = "";
    let focusTitle = "";
    let focusText = "";
    let learnTitle = "";
    let learnText = "";

    if (inBuyZone) {
        liveSentence =
            "De prijs zit nu in de koopzone. Dit is het gebied waar ik liever een entry laat bekijken.";
        focusTitle = "Jouw focus nu";
        focusText =
            "Niet haasten. Kijk of de prijs rustig in deze zone blijft in plaats van meteen weer weg te springen.";
        learnTitle = "Wat je vandaag leert";
        learnText =
            "Een goede entry gaat niet alleen over richting. Het gaat over waar je instapt.";
    } else if (aboveBuyZone) {
        liveSentence =
            "De prijs zit nu nog boven de koopzone. Daarom wil ik dat je nog niet achter de prijs aanjaagt.";
        focusTitle = "Jouw focus nu";
        focusText =
            "Wachten is nu sterker dan klikken. Jij verliest niets door discipline te houden.";
        learnTitle = "Wat je vandaag leert";
        learnText =
            "Een setup kan goed zijn, maar jouw entry kan nog steeds slecht zijn als je te hoog koopt.";
    } else if (belowBuyZone) {
        liveSentence =
            "De prijs zit nu onder de koopzone. Dat kan kans geven, maar ook extra onrust betekenen.";
        focusTitle = "Jouw focus nu";
        focusText =
            "Koop niet alleen omdat iets lager staat. Wacht op stabiliteit en bevestiging.";
        learnTitle = "Wat je vandaag leert";
        learnText =
            "Goedkoop is niet automatisch slim. Eerst moet je begrijpen of de markt nog valt of begint te houden.";
    } else {
        liveSentence =
            "De markt is nog niet duidelijk genoeg voor een mooie entry. Daarom blijft wachten nu logisch.";
        focusTitle = "Jouw focus nu";
        focusText =
            "Kijk, leer en forceer niets. De beste trades voelen meestal rustiger dan je denkt.";
        learnTitle = "Wat je vandaag leert";
        learnText =
            "Niet traden is soms de slimste keuze. Discipline is ook winstbescherming.";
    }

    const safetyText =
        status === "Vandaag niet kopen"
            ? "Ik bescherm je nu tegen een zwakke setup."
            : status === "Nog even wachten"
                ? "Ik houd je nu weg van een te vroege entry."
                : "Ik laat je nu kijken naar een sterkere kans, maar nog steeds met discipline.";

    return (
        <section className="mentor-focus-shell">
            <div className="mentor-focus-main card">
                <div className="label">Live uitleg van dit moment</div>
                <div className="mentor-focus-live-line">
                    {liveSentence}
                </div>
                <div className="mentor-focus-subline">
                    {liveMode
                        ? `Mentor kijkt live mee • laatste tick ${lastTickLabel || "-"}`
                        : "Mentor werkt op laatste analyse"}
                </div>
            </div>

            <div className="mentor-focus-side card">
                <div className="label">{focusTitle}</div>
                <div className="mentor-focus-side-title">{focusText}</div>
            </div>

            <div className="mentor-focus-side card">
                <div className="label">{learnTitle}</div>
                <div className="mentor-focus-side-title">{learnText}</div>
            </div>

            <div className="mentor-focus-soft card">
                <div className="label">Veilig gevoel</div>
                <div className="mentor-focus-soft-text">{safetyText}</div>
                <div className="mentor-focus-soft-row">
                    <span>
                        Koopzone: ${Math.round(entryZoneLow).toLocaleString("en-US")} - $
                        {Math.round(entryZoneHigh).toLocaleString("en-US")}
                    </span>
                    <span>
                        Stop-loss: ${Math.round(stopLoss).toLocaleString("en-US")}
                    </span>
                    <span>
                        Resistance: ${Math.round(resistanceZoneLow).toLocaleString("en-US")} - $
                        {Math.round(resistanceZoneHigh).toLocaleString("en-US")}
                    </span>
                </div>
            </div>
        </section>
    );
}
