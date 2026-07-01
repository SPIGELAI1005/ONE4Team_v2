export type Ai4TRoleKey =
  | "admin"
  | "trainer"
  | "player"
  | "member"
  | "staff"
  | "parent"
  | "sponsor"
  | "supplier"
  | "service_provider"
  | "consultant";

export interface Ai4TQuickPrompt {
  label: string;
  prompt: string;
}

/** Roles shown in the public intro modal (most relevant first). */
export const AI4T_INTRO_ROLES: Ai4TRoleKey[] = [
  "trainer",
  "admin",
  "player",
  "parent",
  "member",
  "staff",
  "sponsor",
  "supplier",
  "service_provider",
  "consultant",
];

export function isPartnerAiRole(role: Ai4TRoleKey): boolean {
  return role === "supplier" || role === "service_provider" || role === "consultant" || role === "sponsor";
}

export function getAi4TRoleWelcomeMessage(
  role: Ai4TRoleKey,
  language: "en" | "de",
  clubName: string,
): string {
  const de = language === "de";
  const persona = getAi4TAssistantRoleName(role);

  if (isPartnerAiRole(role)) {
    return de
      ? `Willkommen bei AI 4 T. Als ${persona} unterstützt dich der Assistent bei Marketplace-Listing, Club-Kooperationen, Nachrichten und Aufgaben — ohne Vereins-Trainingsplanung.`
      : `Welcome to AI 4 T. As ${persona}, get help with your marketplace listing, club collaborations, messages, and tasks — not club training schedules.`;
  }

  if (role === "admin") {
    return de
      ? `Willkommen bei AI 4 T. Als ${persona} für ${clubName} kannst du Prioritäten setzen, Vereins-Workflows starten und den Überblick behalten.`
      : `Welcome to AI 4 T. As ${persona} for ${clubName}, you can set priorities, run club workflows, and stay on top of operations.`;
  }
  if (role === "player") {
    return de
      ? `Willkommen bei AI 4 T. Als ${persona} bei ${clubName} hilfst du dir mit Trainingsfokus, Spielvorbereitung und persönlicher Entwicklung.`
      : `Welcome to AI 4 T. As ${persona} at ${clubName}, get help with training focus, match prep, and personal development.`;
  }
  if (role === "parent") {
    return de
      ? `Willkommen bei AI 4 T. Als ${persona} für ${clubName} siehst du Termine, Abläufe und klare Infos für die Familie.`
      : `Welcome to AI 4 T. As ${persona} for ${clubName}, get schedules, logistics, and clear family-friendly updates.`;
  }
  if (role === "trainer") {
    return de
      ? `Willkommen bei AI 4 T. Als ${persona} für ${clubName} planst du Training, analysierst Spiele und nutzt Agent-Workflows direkt im Chat.`
      : `Welcome to AI 4 T. As ${persona} for ${clubName}, plan sessions, review matches, and run agent workflows from chat.`;
  }
  return de
    ? `Willkommen bei AI 4 T. Als ${persona} für ${clubName} — frag alles rund um den Verein.`
    : `Welcome to AI 4 T. As ${persona} for ${clubName} — ask anything about your club.`;
}

export function getAi4TAssistantRoleName(role: Ai4TRoleKey): string {
  const roleNames: Record<Ai4TRoleKey, string> = {
    admin: "Co-Admin",
    trainer: "Co-Trainer",
    player: "Co-Player",
    member: "Co-Member",
    staff: "Co-Staff",
    parent: "Co-Parent",
    sponsor: "Co-Sponsor",
    supplier: "Co-Supplier",
    service_provider: "Co-Service",
    consultant: "Co-Consultant",
  };
  return roleNames[role];
}

export function buildAi4TRoleQuickPrompts(role: Ai4TRoleKey, language: "en" | "de"): Ai4TQuickPrompt[] {
  const isGerman = language === "de";

  if (role === "admin") {
    return [
      {
        label: isGerman ? "Wochendigest" : "Weekly admin digest",
        prompt: isGerman
          ? "Erstelle ein wochentliches Leadership-Digest mit Top-Prioritäten, Risiken und Verantwortlichen."
          : "Create a weekly leadership digest with top priorities, risks and owner actions.",
      },
      {
        label: isGerman ? "Beitrags-Follow-up" : "Payment follow-up plan",
        prompt: isGerman
          ? "Entwirf einen professionellen Follow-up-Plan für überfällige Mitgliedsbeiträge."
          : "Draft a professional follow-up plan for overdue membership dues.",
      },
      {
        label: isGerman ? "Vereinsankündigung" : "Club announcement",
        prompt: isGerman
          ? "Schreibe eine kurze vereinsweite Ankündigung für den Zeitplan der nächsten zwei Wochen."
          : "Write a concise club-wide announcement for the next two weeks schedule.",
      },
      {
        label: isGerman ? "Operations-Checkliste" : "Operations checklist",
        prompt: isGerman
          ? "Erstelle eine Operations-Checkliste für Spieltag, Training und Kommunikation."
          : "Generate an operations checklist for matchday, training and communication tasks.",
      },
      {
        label: isGerman ? "Aufgaben entwerfen" : "Draft club tasks",
        prompt: isGerman
          ? "Formuliere 5 konkrete Aufgaben für Trainer und Partner mit Priorität, Fälligkeit und Verantwortlichen. Ich trage sie danach unter Aufgaben ein."
          : "Draft 5 concrete tasks for trainers and partners with priority, due date, and owners. I will add them on the Tasks page.",
      },
    ];
  }

  if (role === "player") {
    return [
      {
        label: isGerman ? "Persönlicher 7-Tage-Plan" : "Personal improvement plan",
        prompt: isGerman
          ? "Erstelle einen persönlichen 7-Tage-Verbesserungsplan mit Fokus auf Fitness und Entscheidungen."
          : "Create a 7-day personal improvement plan focusing on fitness and decision-making.",
      },
      {
        label: isGerman ? "Match-Vorbereitung" : "Match preparation",
        prompt: isGerman
          ? "Gib mir eine Vorbereitungsroutine für den Abend vor dem Spiel und den Spieltag-Morgen."
          : "Give me a pre-match preparation routine for the evening before and match day morning.",
      },
      {
        label: isGerman ? "Leistungsanalyse" : "Performance review",
        prompt: isGerman
          ? "Hilf mir bei der Analyse meines letzten Spiels mit Stärken, Fehlern und 3 konkreten Verbesserungen."
          : "Help me review my last match with strengths, mistakes and 3 concrete improvements.",
      },
      {
        label: isGerman ? "Mentale Fokusroutine" : "Mental focus routine",
        prompt: isGerman
          ? "Schlage eine kurze mentale Fokusroutine vor Training und Spielen vor."
          : "Suggest a short mental focus routine before training and matches.",
      },
    ];
  }

  if (role === "parent") {
    return [
      {
        label: isGerman ? "Wochenplan Kind" : "Child's week at a glance",
        prompt: isGerman
          ? "Fasse Trainings, Spiele und wichtige Vereinstermine der nächsten Woche für Eltern zusammen."
          : "Summarize trainings, matches and key club dates for parents for the coming week.",
      },
      {
        label: isGerman ? "Heimweg & Ablauf" : "Pickup & schedule tips",
        prompt: isGerman
          ? "Erstelle eine kurze Eltern-Checkliste für Spieltag: Ankunft, Ausrüstung, Kommunikation mit Trainern."
          : "Create a short match-day checklist for parents: arrival, kit and coach communication.",
      },
      {
        label: isGerman ? "Unterstützung zu Hause" : "Support at home",
        prompt: isGerman
          ? "Welche 3 Übungen kann mein Kind zu Hause machen, um Technik und Kondition zu verbessern?"
          : "What 3 home exercises can help my child improve technique and fitness between sessions?",
      },
      {
        label: isGerman ? "Vereinsinfo verständlich" : "Explain club update",
        prompt: isGerman
          ? "Formuliere eine freundliche Eltern-Nachricht zu einer Terminänderung im Verein."
          : "Draft a friendly parent message explaining a schedule change at the club.",
      },
    ];
  }

  if (role === "member") {
    return [
      {
        label: isGerman ? "Verein entdecken" : "Discover the club",
        prompt: isGerman
          ? "Was sind die wichtigsten Infos für neue Mitglieder über Training, Teams und Kommunikation?"
          : "What should new members know about training, teams and club communication?",
      },
      {
        label: isGerman ? "Nächste Termine" : "Upcoming events",
        prompt: isGerman
          ? "Welche Vereinstermine und Aktivitäten stehen in den nächsten 14 Tagen an?"
          : "What club events and activities are coming up in the next 14 days?",
      },
      {
        label: isGerman ? "Mitmachen & Engagement" : "Get involved",
        prompt: isGerman
          ? "Schlage sinnvolle Wege vor, wie ich mich ehrenamtlich im Verein einbringen kann."
          : "Suggest meaningful ways I can volunteer and contribute to the club.",
      },
      {
        label: isGerman ? "FAQ für Mitglieder" : "Member FAQ draft",
        prompt: isGerman
          ? "Erstelle eine kurze FAQ für Mitglieder zu Beiträgen, Training und Kontaktwegen."
          : "Draft a short member FAQ covering dues, training and how to reach staff.",
      },
    ];
  }

  if (role === "staff") {
    return [
      {
        label: isGerman ? "Spieltags-Ablauf" : "Matchday run sheet",
        prompt: isGerman
          ? "Erstelle einen Spieltags-Ablaufplan für Helfer: Aufbau, Sicherheit, Abbau."
          : "Create a matchday run sheet for staff: setup, safety checks and teardown.",
      },
      {
        label: isGerman ? "Facility-Checkliste" : "Facility checklist",
        prompt: isGerman
          ? "Gib mir eine wöchentliche Checkliste für Platz, Material und Sanitäranlagen."
          : "Give me a weekly checklist for pitch, equipment and facility readiness.",
      },
      {
        label: isGerman ? "Kommunikation intern" : "Internal comms draft",
        prompt: isGerman
          ? "Formuliere eine interne Kurzinfo an Trainer und Helfer für das Wochenende."
          : "Draft a short internal note to trainers and volunteers for the weekend.",
      },
      {
        label: isGerman ? "Notfall & Wetter" : "Weather contingency",
        prompt: isGerman
          ? "Erstelle einen Plan B bei Regen oder Platzsperre für das nächste Training."
          : "Create a rain or pitch-closure contingency plan for the next training session.",
      },
    ];
  }

  if (role === "supplier") {
    return [
      {
        label: isGerman ? "Listing-Text" : "Listing copy",
        prompt: isGerman
          ? "Hilf mir, eine überzeugende Kurz- und Langbeschreibung für mein Lieferanten-Listing im Partner-Marketplace zu schreiben."
          : "Help me write a compelling short and detailed description for my supplier listing on the partner marketplace.",
      },
      {
        label: isGerman ? "Nachricht an Verein" : "Message to a club",
        prompt: isGerman
          ? "Formuliere eine professionelle erste Nachricht an einen Verein, mit dem ich zusammenarbeiten möchte."
          : "Draft a professional first message to a club I want to collaborate with.",
      },
      {
        label: isGerman ? "Aufgaben-Update" : "Task status update",
        prompt: isGerman
          ? "Fasse meine offenen Partner-Aufgaben in einem kurzen Status-Update für einen Verein zusammen."
          : "Summarize my open partner tasks in a short status update for a club contact.",
      },
      {
        label: isGerman ? "Angebotsstruktur" : "Package structure",
        prompt: isGerman
          ? "Schlage 3 klar benannte Service-Pakete mit Preishinweisen für mein Lieferantenprofil vor."
          : "Suggest 3 clearly named service packages with price indications for my supplier profile.",
      },
    ];
  }

  if (role === "service_provider") {
    return [
      {
        label: isGerman ? "Leistungsübersicht" : "Services overview",
        prompt: isGerman
          ? "Fasse unsere Leistungen für Vereinskunden in einer klaren Marketplace-Beschreibung zusammen."
          : "Summarize our services for club customers in a clear marketplace description.",
      },
      {
        label: isGerman ? "Status an Verein" : "Status to club",
        prompt: isGerman
          ? "Formuliere ein professionelles Status-Update zu laufenden Service-Aufträgen für einen Verein."
          : "Draft a professional status update on ongoing service work for a club.",
      },
      {
        label: isGerman ? "Angebotsentwurf" : "Proposal draft",
        prompt: isGerman
          ? "Erstelle einen strukturierten Angebotsentwurf für eine Vereinsanfrage aus dem Marketplace."
          : "Create a structured proposal draft for a club request from the marketplace.",
      },
      {
        label: isGerman ? "Lieferfenster" : "Delivery planning",
        prompt: isGerman
          ? "Welche Liefer- oder Einsatzfenster sollten wir vor Saisonstart mit Vereinen abstimmen?"
          : "What delivery or on-site windows should we align with clubs before season start?",
      },
    ];
  }

  if (role === "consultant") {
    return [
      {
        label: isGerman ? "Kooperations-Pitch" : "Partnership pitch",
        prompt: isGerman
          ? "Hilf mir, einen kurzen Wertevorschlag für eine Beratungskooperation mit einem Sportverein zu formulieren."
          : "Help me draft a short value proposition for a consulting collaboration with a sports club.",
      },
      {
        label: isGerman ? "Workshop-Agenda" : "Workshop agenda",
        prompt: isGerman
          ? "Entwirf eine 60-Minuten-Agenda für einen Strategie-Workshop mit Vereinsvorstand und Partnern."
          : "Draft a 60-minute agenda for a strategy workshop with club leadership and partners.",
      },
      {
        label: isGerman ? "KPI-Empfehlung" : "KPI recommendations",
        prompt: isGerman
          ? "Welche KPIs sollte ein Verein in einer Partner-Zusammenarbeit mit uns tracken?"
          : "Which KPIs should a club track in a partnership engagement with us?",
      },
      {
        label: isGerman ? "Follow-up Mail" : "Follow-up email",
        prompt: isGerman
          ? "Schreibe eine knappe Follow-up-Nachricht nach einem Marketplace-Gespräch mit einem Verein."
          : "Write a concise follow-up message after a marketplace conversation with a club.",
      },
    ];
  }

  if (role === "sponsor") {
    return [
      {
        label: isGerman ? "Sponsoring-Pitch" : "Sponsorship pitch",
        prompt: isGerman
          ? "Formuliere einen kurzen Sponsoring-Vorschlag für einen lokalen Sportverein über den Partner-Marketplace."
          : "Draft a short sponsorship proposal for a local sports club via the partner marketplace.",
      },
      {
        label: isGerman ? "Sichtbarkeitsplan" : "Visibility plan",
        prompt: isGerman
          ? "Schlage sinnvolle Sponsoring-Aktivierungen für die laufende Saison vor."
          : "Suggest meaningful sponsorship activations for the current season.",
      },
      {
        label: isGerman ? "Partnerschafts-Update" : "Partnership update",
        prompt: isGerman
          ? "Erstelle ein kurzes Update an einen Verein über erbrachte Sponsoring-Leistungen."
          : "Create a brief update to a club about sponsorship deliverables completed.",
      },
      {
        label: isGerman ? "Social-Post" : "Social post",
        prompt: isGerman
          ? "Schreibe einen kurzen Social-Media-Post über unsere Partnerschaft mit einem Verein."
          : "Write a short social post celebrating our partnership with a club.",
      },
    ];
  }

  // trainer (default coaching persona)
  return [
    {
      label: isGerman ? "Aufstellung vorschlagen" : "Suggest a lineup",
      prompt: isGerman
        ? "Schlage basierend auf der aktuellen Form eine optimale Startelf für unser nächstes Spiel vor."
        : "Based on recent form, suggest an optimal starting XI for our next match.",
    },
    {
      label: isGerman ? "Trainingsplan" : "Training plan",
      prompt: isGerman
        ? "Erstelle einen Wochen-Trainingsplan mit Fokus auf verbesserte Defensivorganisation."
        : "Create a week-long training plan focusing on improving our defensive organization.",
    },
    {
      label: isGerman ? "Leistung analysieren" : "Analyze performance",
      prompt: isGerman
        ? "Analysiere unsere letzten Spiele und identifiziere die wichtigsten Verbesserungsfelder."
        : "Analyze our recent match performance and identify key areas for improvement.",
    },
    {
      label: isGerman ? "Woche duplizieren" : "Duplicate last week",
      prompt: isGerman
        ? "Dupliziere die Trainings der letzten Woche für mein Team eine Woche nach vorne."
        : "Duplicate last week's training sessions for my team one week forward.",
    },
    {
      label: isGerman ? "Training anlegen" : "Plan a session (Agent)",
      prompt: isGerman
        ? "Lege ein Training für mein Team nächste Woche Dienstag 18:00 auf dem Hauptplatz an."
        : "Schedule a training for my team next Tuesday at 6pm on the main pitch.",
    },
  ];
}
