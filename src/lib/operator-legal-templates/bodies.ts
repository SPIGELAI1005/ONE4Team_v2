export type LegalTemplateId =
  | "club-msa"
  | "sla"
  | "dpa"
  | "partner-collaboration"
  | "sponsorship"
  | "pilot-loi";

export const LEGAL_TEMPLATE_BODIES_EN: Record<LegalTemplateId, string> = {
  "club-msa": `SOFTWARE SUBSCRIPTION AGREEMENT

This Software Subscription Agreement (the "Agreement") is entered into as of {{effectiveDate}} between {{providerLegalName}} ("Provider") and {{counterpartyName}} ("Customer").

1. SERVICES
   Provider grants Customer a non-exclusive, non-transferable right to access and use the ONE4Team platform under the "{{planName}}" plan, including the modules and usage limits associated with that plan.

2. TERM
   The initial term is {{termMonths}} months from the Effective Date and renews automatically for successive periods of equal length unless either party gives 30 days' written notice before renewal.

3. FEES
   Customer shall pay a subscription fee of EUR {{monthlyFee}} per month, invoiced in advance. Fees are exclusive of applicable VAT. Late payments may incur statutory default interest.

4. CUSTOMER DATA
   Customer retains all rights to data it uploads. Provider processes personal data solely as described in the Data Processing Agreement and applicable privacy policy.

5. AVAILABILITY & SUPPORT
   Provider will use commercially reasonable efforts to meet the service levels in the accompanying Service Level Agreement, targeting {{uptimeTarget}} monthly availability.

6. CONFIDENTIALITY
   Each party shall protect the other's confidential information with at least the same care it uses for its own, and no less than reasonable care.

7. LIABILITY
   To the extent permitted by law, neither party is liable for indirect or consequential damages. Aggregate liability is capped at the fees paid in the 12 months preceding the claim.

8. TERMINATION
   Either party may terminate for material breach not cured within 30 days of written notice. Upon termination, Provider will make Customer data available for export for 30 days.

9. GOVERNING LAW
   This Agreement is governed by {{governingLaw}}, with exclusive venue in {{jurisdiction}}.

Signed for and on behalf of the parties:

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Title / Date                           Name / Title / Date`,

  sla: `SERVICE LEVEL AGREEMENT (SLA)

This SLA supplements the Software Subscription Agreement between {{providerLegalName}} ("Provider") and {{counterpartyName}} ("Customer"), effective {{effectiveDate}}.

1. AVAILABILITY
   Provider targets {{uptimeTarget}} monthly availability of the ONE4Team platform, measured as (total minutes − downtime) / total minutes, excluding Scheduled Maintenance.

2. SCHEDULED MAINTENANCE
   Planned maintenance is announced at least 48 hours in advance and scheduled outside 08:00–20:00 CET where reasonably possible.

3. SUPPORT & RESPONSE TIMES
   Support requests may be submitted via the in-app support channel. Target first-response time is {{supportResponse}}. Severity levels:
     - Critical (platform down): response within 4 business hours.
     - High (major feature unavailable): response within 1 business day.
     - Normal (question / minor issue): response within 2 business days.

4. SERVICE CREDITS
   If monthly availability falls below the target, Customer may request service credits:
     - 99.0%–{{uptimeTarget}}: 5% of monthly fee
     - 95.0%–98.99%: 10% of monthly fee
     - below 95.0%: 25% of monthly fee
   Credits are the sole remedy for availability shortfalls and must be requested within 30 days.

5. EXCLUSIONS
   Downtime caused by factors outside Provider's reasonable control (force majeure, Customer misuse, third-party outages) is excluded from availability calculations.

6. REVIEW
   The parties will review service performance on a quarterly basis upon request.

Acknowledged:

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Title / Date                           Name / Title / Date`,

  dpa: `DATA PROCESSING AGREEMENT (DPA)

This DPA forms part of the agreement between {{providerLegalName}} ("Processor") and {{counterpartyName}} ("Controller"), effective {{effectiveDate}}, pursuant to Article 28 GDPR.

1. SUBJECT MATTER
   Processor processes personal data on behalf of Controller solely to provide the ONE4Team platform.

2. NATURE & PURPOSE
   Categories of data subjects: club members, players, guardians, staff, and partners. Categories of data: contact details, membership and team data, activity and communication records.

3. PROCESSOR OBLIGATIONS
   Processor shall: (a) process personal data only on documented instructions; (b) ensure persons authorized to process are bound by confidentiality; (c) implement appropriate technical and organizational measures; (d) assist Controller with data subject requests and breach notifications.

4. SUB-PROCESSORS
   Controller authorizes the use of vetted sub-processors (hosting, email, payment). Processor remains responsible for their compliance and will notify Controller of intended changes.

5. INTERNATIONAL TRANSFERS
   Any transfer outside the EEA will rely on an approved transfer mechanism (e.g. Standard Contractual Clauses).

6. SECURITY
   Processor maintains access controls, encryption in transit, row-level authorization, audit logging, and regular backups.

7. DATA BREACH
   Processor notifies Controller without undue delay after becoming aware of a personal data breach.

8. RETURN & DELETION
   Upon termination, Processor deletes or returns personal data within 30 days, except where retention is legally required.

9. AUDIT
   Processor makes available information necessary to demonstrate compliance and allows for reasonable audits.

10. GOVERNING LAW
   This DPA is governed by {{governingLaw}}.

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Title / Date                           Name / Title / Date`,

  "partner-collaboration": `PARTNER COLLABORATION AGREEMENT

This Partner Collaboration Agreement (the "Agreement") is made on {{effectiveDate}} between {{providerLegalName}} ("ONE4Team") and {{counterpartyName}} ("Partner").

1. PURPOSE
   The parties wish to collaborate so that Partner can offer goods and/or services to clubs through the ONE4Team marketplace.

2. PARTNER LISTING
   Partner may create and maintain a provider profile. Partner is solely responsible for the accuracy of its listings, pricing indications, and availability.

3. ENGAGEMENTS
   Individual engagements between Partner and a club are governed by the terms agreed between Partner and that club. ONE4Team is a facilitator and is not a party to those engagements unless expressly stated.

4. STANDARDS
   Partner shall deliver services professionally, comply with applicable laws, and respond to club requests in a timely manner. ONE4Team may remove listings that breach platform policies.

5. FEES & COMMERCIALS
   Any platform, referral, or listing fees are set out in the applicable order form or schedule. Unless stated otherwise, each party bears its own costs.

6. BRAND USE
   Each party may reference the other's name and logo solely to describe the collaboration, subject to the other's brand guidelines.

7. CONFIDENTIALITY & DATA
   Partner shall keep club and platform information confidential and process any personal data in compliance with GDPR.

8. LIABILITY
   Partner is responsible for the goods/services it provides. ONE4Team disclaims liability for Partner performance to the extent permitted by law.

9. TERM & TERMINATION
   This Agreement runs for {{termMonths}} months and may be terminated by either party on 30 days' notice, or immediately for material breach.

10. GOVERNING LAW
   Governed by {{governingLaw}}, venue {{jurisdiction}}.

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Title / Date                           Name / Title / Date`,

  sponsorship: `SPONSORSHIP AGREEMENT

This Sponsorship Agreement is entered into on {{effectiveDate}} between {{counterpartyName}} ("Sponsor") and the club, facilitated via {{providerLegalName}}.

1. SPONSORSHIP RIGHTS
   Sponsor is granted brand placement on agreed club digital properties (public club page, marketplace profile, selected communications) for the term.

2. CONSIDERATION
   Sponsor shall pay EUR {{monthlyFee}} per month (or the lump sum stated in the order form) in exchange for the sponsorship rights.

3. TERM
   The term is {{termMonths}} months from the Effective Date.

4. CONTENT APPROVAL
   Sponsor provides brand assets meeting technical specifications. The club may reject content that is unlawful or inconsistent with its values.

5. EXCLUSIVITY
   Any category exclusivity is only as expressly stated in the order form.

6. MEASUREMENT
   Where available, impression and engagement figures are provided on a best-efforts basis and are estimates.

7. GOVERNING LAW
   Governed by {{governingLaw}}, venue {{jurisdiction}}.

{{counterpartyName}} (Sponsor)                Club

_____________________________                 _____________________________
Name / Title / Date                           Name / Title / Date`,

  "pilot-loi": `LETTER OF INTENT — PILOT PROGRAM

Date: {{effectiveDate}}

Between {{providerLegalName}} ("Provider") and {{counterpartyName}} ("Pilot Partner").

1. INTENT
   The parties intend to run a non-binding pilot of the ONE4Team platform to evaluate fit for {{counterpartyName}}.

2. SCOPE
   Provider will enable the "{{planName}}" plan for the pilot. Pilot Partner will nominate an internal owner and provide feedback.

3. DURATION
   The pilot runs for {{termMonths}} months from the date above, after which the parties will decide whether to enter a full subscription.

4. FEES
   The pilot is provided at EUR {{monthlyFee}} per month (or free of charge if EUR 0 is stated).

5. DATA
   Data handling during the pilot follows Provider's standard Data Processing Agreement.

6. NON-BINDING
   Except for the confidentiality and data clauses, this letter is non-binding and creates no obligation to enter a definitive agreement.

7. GOVERNING LAW
   Governed by {{governingLaw}}.

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Title / Date                           Name / Title / Date`,
};

export const LEGAL_TEMPLATE_BODIES_DE: Record<LegalTemplateId, string> = {
  "club-msa": `SOFTWARE-ABONNEMENTVERTRAG

Dieser Software-Abonnementvertrag (der „Vertrag") wird am {{effectiveDate}} zwischen {{providerLegalName}} („Anbieter") und {{counterpartyName}} („Kunde") geschlossen.

1. LEISTUNGEN
   Der Anbieter gewährt dem Kunden ein nicht-exklusives, nicht übertragbares Recht, die ONE4Team-Plattform im Paket „{{planName}}" einschließlich der zugehörigen Module und Nutzungslimits zu nutzen.

2. LAUFZEIT
   Die Erstlaufzeit beträgt {{termMonths}} Monate ab dem Gültigkeitsdatum und verlängert sich automatisch um gleiche Perioden, sofern nicht eine Partei 30 Tage vor Verlängerung schriftlich kündigt.

3. GEBÜHREN
   Der Kunde zahlt eine Abonnementgebühr von EUR {{monthlyFee}} pro Monat im Voraus. Gebühren verstehen sich zzgl. USt. Verzugszinsen können gesetzlich anfallen.

4. KUNDENDATEN
   Der Kunde behält alle Rechte an hochgeladenen Daten. Der Anbieter verarbeitet personenbezogene Daten nur gemäß Auftragsverarbeitungsvertrag und Datenschutzerklärung.

5. VERFÜGBARKEIT & SUPPORT
   Der Anbieter bemüht sich nach bestem Bemühen, die im SLA vereinbarten Service Levels zu erfüllen, mit Ziel {{uptimeTarget}} monatlicher Verfügbarkeit.

6. VERTRAULICHKEIT
   Jede Partei schützt vertrauliche Informationen der anderen Partei mit mindestens der Sorgfalt wie bei eigenen Informationen.

7. HAFTUNG
   Soweit gesetzlich zulässig, haftet keine Partei für indirekte oder Folgeschäden. Die Gesamthaftung ist auf die in den vorangegangenen 12 Monaten gezahlten Gebühren begrenzt.

8. KÜNDIGUNG
   Jede Partei kann bei wesentlicher Verletzung kündigen, wenn diese nicht innerhalb von 30 Tagen nach schriftlicher Mitteilung behoben wird. Nach Vertragsende stellt der Anbieter Kundendaten 30 Tage zum Export bereit.

9. ANWENDARES RECHT
   Dieser Vertrag unterliegt {{governingLaw}}; ausschließlicher Gerichtsstand ist {{jurisdiction}}.

Unterschriften:

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Funktion / Datum                       Name / Funktion / Datum`,

  sla: `SERVICE-LEVEL-VEREINBARUNG (SLA)

Diese SLA ergänzt den Software-Abonnementvertrag zwischen {{providerLegalName}} („Anbieter") und {{counterpartyName}} („Kunde"), gültig ab {{effectiveDate}}.

1. VERFÜGBARKEIT
   Der Anbieter strebt {{uptimeTarget}} monatliche Verfügbarkeit der ONE4Team-Plattform an, gemessen als (Gesamtminuten − Ausfallminuten) / Gesamtminuten, ohne geplante Wartung.

2. GEPLANTE WARTUNG
   Geplante Wartung wird mindestens 48 Stunden im Voraus angekündigt und nach Möglichkeit außerhalb 08:00–20:00 MEZ durchgeführt.

3. SUPPORT & REAKTIONSZEITEN
   Support-Anfragen über den In-App-Support-Kanal. Ziel für erste Antwort: {{supportResponse}}. Schweregrade:
     - Kritisch (Plattform ausgefallen): Antwort innerhalb von 4 Werktagen.
     - Hoch (wesentliche Funktion nicht verfügbar): Antwort innerhalb von 1 Werktag.
     - Normal (Frage / kleineres Problem): Antwort innerhalb von 2 Werktagen.

4. SERVICE-GUTSCHRIFTEN
   Fällt die monatliche Verfügbarkeit unter das Ziel, kann der Kunde Gutschriften beantragen:
     - 99,0 %–{{uptimeTarget}}: 5 % der Monatsgebühr
     - 95,0 %–98,99 %: 10 % der Monatsgebühr
     - unter 95,0 %: 25 % der Monatsgebühr
   Gutschriften sind das ausschließliche Rechtsmittel und müssen innerhalb von 30 Tagen beantragt werden.

5. AUSSCHLÜSSE
   Ausfälle außerhalb des zumutbaren Einflussbereichs des Anbieters (höhere Gewalt, Fehlgebrauch, Drittanbieter-Ausfälle) werden nicht angerechnet.

6. REVIEW
   Die Parteien überprüfen die Service-Performance auf Anfrage vierteljährlich.

Bestätigt:

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Funktion / Datum                       Name / Funktion / Datum`,

  dpa: `AUFTRAGSVERARBEITUNGSVERTRAG (AVV)

Dieser AVV ist Bestandteil der Vereinbarung zwischen {{providerLegalName}} („Auftragsverarbeiter") und {{counterpartyName}} („Verantwortlicher"), gültig ab {{effectiveDate}}, gemäß Art. 28 DSGVO.

1. GEGENSTAND
   Der Auftragsverarbeiter verarbeitet personenbezogene Daten ausschließlich zur Bereitstellung der ONE4Team-Plattform im Auftrag des Verantwortlichen.

2. ART & ZWECK
   Betroffene: Vereinsmitglieder, Spieler, Erziehungsberechtigte, Mitarbeitende, Partner. Datenkategorien: Kontaktdaten, Mitglieds- und Teamdaten, Aktivitäts- und Kommunikationsdaten.

3. PFLICHTEN DES AUFTRAGSVERARBEITERS
   Der Auftragsverarbeiter: (a) verarbeitet nur auf dokumentierte Weisung; (b) stellt Vertraulichkeit sicher; (c) implementiert angemessene technische und organisatorische Maßnahmen; (d) unterstützt bei Betroffenenanfragen und Meldungen von Datenschutzverletzungen.

4. UNTERAUFTRAGSVERARBEITER
   Der Verantwortliche genehmigt geprüfte Unterauftragsverarbeiter (Hosting, E-Mail, Zahlung). Der Auftragsverarbeiter informiert über beabsichtigte Änderungen.

5. DRITTLANDTRANSFERS
   Transfers außerhalb des EWR erfolgen auf Basis anerkannter Transfermechanismen (z. B. Standardvertragsklauseln).

6. SICHERHEIT
   Zugriffskontrollen, Verschlüsselung in Transit, zeilenbasierte Autorisierung, Audit-Logging und regelmäßige Backups.

7. DATENSCHUTZVERLETZUNG
   Der Auftragsverarbeiter informiert den Verantwortlichen unverzüglich nach Kenntnisnahme.

8. RÜCKGABE & LÖSCHUNG
   Nach Vertragsende Löschung oder Rückgabe innerhalb von 30 Tagen, soweit keine gesetzliche Aufbewahrungspflicht besteht.

9. AUDIT
   Der Auftragsverarbeiter stellt Compliance-Nachweise bereit und ermöglicht angemessene Prüfungen.

10. ANWENDARES RECHT
   Dieser AVV unterliegt {{governingLaw}}.

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Funktion / Datum                       Name / Funktion / Datum`,

  "partner-collaboration": `PARTNER-KOOPERATIONSVEREINBARUNG

Diese Partner-Kooperationsvereinbarung (der „Vertrag") wird am {{effectiveDate}} zwischen {{providerLegalName}} („ONE4Team") und {{counterpartyName}} („Partner") geschlossen.

1. ZWECK
   Die Parteien möchten zusammenarbeiten, damit der Partner Waren und/oder Dienstleistungen über den ONE4Team-Marktplatz an Vereine anbieten kann.

2. PARTNER-PROFIL
   Der Partner kann ein Anbieterprofil pflegen und ist allein verantwortlich für Richtigkeit von Einträgen, Preisangaben und Verfügbarkeit.

3. ENGAGEMENTS
   Einzelne Engagements zwischen Partner und Verein unterliegen deren Vereinbarung. ONE4Team ist Vermittler und nicht Vertragspartei, sofern nicht ausdrücklich anders vereinbart.

4. STANDARDS
   Der Partner erbringt Leistungen professionell, hält geltendes Recht ein und reagiert zeitnah auf Vereinsanfragen. ONE4Team kann Einträge bei Verstößen entfernen.

5. GEBÜHREN
   Plattform-, Referral- oder Listing-Gebühren ergeben sich aus dem jeweiligen Angebot. Jede Partei trägt eigene Kosten, sofern nicht anders vereinbart.

6. MARKENNUTZUNG
   Jede Partei darf Name und Logo der anderen Partei nur zur Beschreibung der Kooperation nutzen, gemäß Brand Guidelines.

7. VERTRAULICHKEIT & DATEN
   Der Partner behandelt Vereins- und Plattforminformationen vertraulich und verarbeitet personenbezogene Daten DSGVO-konform.

8. HAFTUNG
   Der Partner haftet für seine Waren/Dienstleistungen. ONE4Team lehnt Haftung für Partnerleistungen im gesetzlich zulässigen Umfang ab.

9. LAUFZEIT & KÜNDIGUNG
   Laufzeit {{termMonths}} Monate; Kündigung mit 30 Tagen Frist oder bei wesentlicher Verletzung sofort.

10. ANWENDARES RECHT
   Es gilt {{governingLaw}}, Gerichtsstand {{jurisdiction}}.

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Funktion / Datum                       Name / Funktion / Datum`,

  sponsorship: `SPONSORING-VEREINBARUNG

Diese Sponsoring-Vereinbarung wird am {{effectiveDate}} zwischen {{counterpartyName}} („Sponsor") und dem Verein geschlossen, vermittelt über {{providerLegalName}}.

1. SPONSORING-RECHTE
   Der Sponsor erhält Markenplatzierung auf vereinbarten digitalen Vereinsflächen (öffentliche Vereinsseite, Marktplatzprofil, ausgewählte Kommunikation) für die Laufzeit.

2. GEGENLEISTUNG
   Der Sponsor zahlt EUR {{monthlyFee}} pro Monat (oder die im Angebot genannte Pauschale) für die Sponsoring-Rechte.

3. LAUFZEIT
   Die Laufzeit beträgt {{termMonths}} Monate ab dem Gültigkeitsdatum.

4. CONTENT-FREIGABE
   Der Sponsor stellt Markenassets gemäß technischer Vorgaben bereit. Der Verein kann rechtswidrige oder wertefremde Inhalte ablehnen.

5. EXKLUSIVITÄT
   Kategorie-Exklusivität gilt nur, wenn sie ausdrücklich im Angebot genannt ist.

6. MESSUNG
   Soweit verfügbar, werden Impressions- und Engagement-Zahlen nach bestem Bemühen als Schätzwerte bereitgestellt.

7. ANWENDARES RECHT
   Es gilt {{governingLaw}}, Gerichtsstand {{jurisdiction}}.

{{counterpartyName}} (Sponsor)               Verein

_____________________________                 _____________________________
Name / Funktion / Datum                       Name / Funktion / Datum`,

  "pilot-loi": `ABSICHTSERKLÄRUNG — PILOTPROGRAMM

Datum: {{effectiveDate}}

Zwischen {{providerLegalName}} („Anbieter") und {{counterpartyName}} („Pilot-Partner").

1. ABSICHT
   Die Parteien beabsichtigen einen unverbindlichen Pilot der ONE4Team-Plattform zur Evaluierung für {{counterpartyName}}.

2. UMFANG
   Der Anbieter aktiviert das Paket „{{planName}}" für den Pilot. Der Pilot-Partner benennt einen internen Owner und liefert Feedback.

3. DAUER
   Der Pilot läuft {{termMonths}} Monate ab obigem Datum; danach entscheiden die Parteien über ein Vollabonnement.

4. GEBÜHREN
   Der Pilot kostet EUR {{monthlyFee}} pro Monat (oder ist kostenfrei, wenn EUR 0 angegeben ist).

5. DATEN
   Datenverarbeitung im Pilot folgt dem standardmäßigen Auftragsverarbeitungsvertrag des Anbieters.

6. UNVERBINDLICHKEIT
   Außer Vertraulichkeit und Datenschutz ist diese Erklärung unverbindlich und begründet keine Pflicht zum Abschluss eines Hauptvertrags.

7. ANWENDARES RECHT
   Es gilt {{governingLaw}}.

{{providerLegalName}}                         {{counterpartyName}}

_____________________________                 _____________________________
Name / Funktion / Datum                       Name / Funktion / Datum`,
};

export const LEGAL_TEMPLATE_IDS: readonly LegalTemplateId[] = [
  "club-msa",
  "sla",
  "dpa",
  "partner-collaboration",
  "sponsorship",
  "pilot-loi",
];
