window.SC = { views: {}, state: null };

SC.partners = [
    { id: "u1", name: "Lena de Vries", sport: "Running", level: "Intermediate", area: "Amsterdam", rating: 4.8 },
    { id: "u2", name: "Mohammed Al-Rashid", sport: "Tennis", level: "Advanced", area: "Amsterdam", rating: 4.9 },
    { id: "u3", name: "Sofia Bianchi", sport: "Padel", level: "Beginner", area: "Utrecht", rating: 4.6 },
    { id: "u4", name: "Tom Jansen", sport: "Climbing", level: "Intermediate", area: "Amsterdam", rating: 4.7 },
    { id: "u5", name: "Priya Nair", sport: "Cycling", level: "Advanced", area: "Haarlem", rating: 5.0 },
    { id: "u6", name: "Daan Visser", sport: "Running", level: "Beginner", area: "Amsterdam", rating: 4.5 },
    { id: "u7", name: "Elif Yildiz", sport: "Tennis", level: "Intermediate", area: "Utrecht", rating: 4.8 },
    { id: "u8", name: "Oscar Lindqvist", sport: "Padel", level: "Intermediate", area: "Amsterdam", rating: 4.7 }
  ];

SC.sports = ["Running", "Tennis", "Padel", "Climbing", "Cycling"];
SC.levels = ["Beginner", "Intermediate", "Advanced"];

// Demo activities. Places are fictional; the exact place is only shown to confirmed participants.
SC.activities = [
  { id: "a1", title: "Padel doubles", sport: "Padel", level: "Intermediate", area: "Amsterdam", place: "Sportpark Zuid, court 2", date: "2026-10-24", time: "10:00", max: 8, joined: 3, organizer: "Oscar Lindqvist" },
  { id: "a2", title: "Sunday long run", sport: "Running", level: "All levels", area: "Amsterdam", place: "Vondelpark, main entrance", date: "2026-10-25", time: "09:00", max: 12, joined: 5, organizer: "Lena de Vries" },
  { id: "a3", title: "Beginner tennis rally", sport: "Tennis", level: "Beginner", area: "Utrecht", place: "Tennis club Oost, court 4", date: "2026-10-27", time: "18:30", max: 4, joined: 3, organizer: "Elif Yildiz", invited: true },
  { id: "a4", title: "Indoor climbing", sport: "Climbing", level: "Intermediate", area: "Amsterdam", place: "Boulder hall Noord", date: "2026-10-28", time: "19:00", max: 6, joined: 6, organizer: "Tom Jansen" },
  { id: "a5", title: "Evening ride", sport: "Cycling", level: "Advanced", area: "Haarlem", place: "Station Haarlem, east exit", date: "2026-10-29", time: "18:00", max: 10, joined: 4, organizer: "Priya Nair" }
];
