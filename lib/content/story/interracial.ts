import type { StoryPack } from "../types";

export const INTERRACIAL_STORY_PACKS: StoryPack[] = [
  {
    id: "the-last-seat",
    title: "The Last Seat",
    tag: "INTERRACIAL",
    desc: "A late-night date debrief with room for curiosity, jealousy, or a quiet walk together.",
    summary: "Play Elliott, a white event producer of 30, as your partner Nia comes home from a date with Darius, a Black film programmer of 34. You and Nia agreed to date other people and ask before sharing the details. Tonight you get to choose what you want to hear.",
    accent: "amber",
    character: {
      name: "Nia Bell",
      age: 31,
      portraitUrl: "/portraits/romance-nia.webp",
      role: "Sound engineer and Elliott’s partner",
      summary: "Nia is a Black sound engineer with an ear for a good story. She’s building a live recording series for small theaters. At home she likes a direct question and remembers exactly how you take your tea.",
    },
    chapters: [
      { id: "last-seat-home", title: "Under the kitchen light", sceneIds: ["last-seat-arrival", "last-seat-laugh", "last-seat-jealousy"] },
      { id: "last-seat-check-in", title: "Room to think", sceneIds: ["last-seat-pause", "last-seat-next-time"] },
      { id: "last-seat-endings", title: "The rest of the night", sceneIds: ["last-seat-tease", "last-seat-walk", "last-seat-morning"] },
    ],
    scenes: [
      {
        id: "last-seat-arrival",
        title: "Two mugs",
        text: `Nia sets two mugs on the kitchen table and leaves her coat on. She has the smile you recognize from the moment a live recording goes right.

“Darius finally got the projector running at the Lantern,” she says. “We watched the last showing from the back row. He said I could tell you his apology to the projectionist if you want to hear it.”

She nudges your mug toward you. You agreed to ask each other before a debrief, even on the nights curiosity gets there first.

“A story, a check-in, or tea for now?”`,
        choices: [
          { id: "ask-about-the-laugh", label: "Ask what made her laugh", nextSceneId: "last-seat-laugh" },
          { id: "name-the-jealousy", label: "Say you felt jealous", nextSceneId: "last-seat-jealousy" },
          { id: "take-ten", label: "Take ten minutes", nextSceneId: "last-seat-pause" },
        ],
      },
      {
        id: "last-seat-laugh",
        title: "An apology in a whisper",
        text: `“Darius thanked the projector for its service,” Nia says. “Then he apologized to the projectionist for thanking the machine first.”

You laugh. Nia reaches for a napkin and sketches the two seats on either side of the aisle. She’s already thinking about where she’d put microphones for a live recording at the Lantern.

“I almost texted you the whole joke before the credits,” she says. “Can I tease you a little about the face you make when I keep a story for home?”`,
        choices: [
          { id: "welcome-the-tease", label: "Say yes and ask her to walk with you", nextSceneId: "last-seat-tease" },
          { id: "keep-it-sweet", label: "Keep it sweet and talk about next time", nextSceneId: "last-seat-next-time" },
        ],
      },
      {
        id: "last-seat-jealousy",
        title: "The part you rehearsed",
        text: `The sentence comes out more plainly than it sounded in your head. You were jealous when the theater’s lights went down and you had no idea when she’d be back.

Nia listens until you finish. Her hand stays around the mug.

“I had a lovely evening with him,” she says. “I also want to know what tonight felt like for you. Was it waiting to hear from me, or do we need to revisit the agreement?”

You watch a little steam rise between you. Either question can wait until you’re ready.`,
        choices: [
          { id: "tell-her-what-you-need", label: "Tell her what you need next time", nextSceneId: "last-seat-next-time" },
          { id: "pause-the-debrief", label: "Ask for a pause", nextSceneId: "last-seat-pause" },
        ],
      },
      {
        id: "last-seat-pause",
        title: "The kettle clicks off",
        text: `Nia sets her phone face down. The movie story stays where you left it.

You choose ten minutes in the sitting room with the window cracked. When the timer goes, Nia knocks once from the hall.

“Would you like me to sit with you? We can finish the conversation tomorrow, too.”

The air feels cooler. You can decide whether you have another sentence in you.`,
        choices: [
          { id: "return-to-the-table", label: "Return to the table and make a plan", nextSceneId: "last-seat-next-time" },
          { id: "leave-it-here", label: "Leave it here tonight", nextSceneId: "last-seat-morning" },
        ],
      },
      {
        id: "last-seat-next-time",
        title: "A small change for next time",
        text: `You ask whether she can send a message if an evening runs later than planned. She can do that, she says. She asks for the same when you’re the one going out.

For debriefs, you agree to start with one question and check in before adding details. Nia writes the agreement on the back of the napkin, below her little seating plan.

“Now,” she says, “I’d like five minutes with you outside. Is that something you’d like tonight?”`,
        choices: [
          { id: "say-yes-to-the-walk", label: "Say yes to the walk", nextSceneId: "last-seat-walk" },
          { id: "choose-the-quiet", label: "Choose a quiet end to the evening", nextSceneId: "last-seat-morning" },
        ],
      },
      {
        id: "last-seat-tease",
        title: "A familiar look",
        text: `“You raise one eyebrow when you’re dying to hear a story,” Nia says after you say yes. “It was up before I had both shoes off.”

You tell her she spent fifteen minutes choosing where you’d sit on your first date. Nia grins. “And you remember the seat, don’t you?”

You remember that she traded places with you so you could see the streetlights come on. You pull your coats from the peg.`,
        nextSceneId: "last-seat-walk",
      },
      {
        id: "last-seat-walk",
        title: "The next open seat",
        text: `You reach the bench at the end of the block. Nia asks if she can take your hand, then waits for your answer.

You ask what she’s planning to record next. She tells you about a pianist who starts every set with a song for whoever got there early. She’d like you to hear it with her next Friday. You ask her to save you a seat.`,
      },
      {
        id: "last-seat-morning",
        title: "The porch light",
        text: `You ask to put the debrief away for tonight. Nia turns the napkin over and offers you the dinner bread she brought home. You split the last piece on the porch.

Before bed, she asks whether you’d like her to check in after breakfast. You say yes. Then she tells you what she bought for the recording booth, a lamp with a switch that clicks loud enough to ruin a perfect take.

You both laugh at the imagined sound. The next conversation can start in the morning.`,
      },
    ],
  },
  {
    id: "the-print-exchange",
    title: "The Print Exchange",
    tag: "INTERRACIAL",
    desc: "A printmaker and an archivist ask what you want to keep after the gallery closes.",
    summary: "Play Jules, a white letterpress teacher of 33, at a late gallery exchange with Amina, a Black printmaker, and Caleb, a Black archivist of 36. The three of you have been getting closer in your own ways. Tonight there’s a print to credit, an invitation to make, and space for everyone to answer.",
    accent: "indigo",
    character: {
      name: "Amina Cross",
      age: 32,
      portraitUrl: "/portraits/romance-amina.webp",
      role: "Printmaker and exhibition organizer",
      summary: "Amina signs her prints in pencil and takes contracts seriously. She wants paid credit for each artist whose work appears at the exchange. She likes Jules’s company and has a standing Sunday date with Caleb, who is building an archive of neighborhood theater posters.",
    },
    chapters: [
      { id: "print-first-look", title: "The final exchange", sceneIds: ["print-arrival", "print-stay", "print-unsigned"] },
      { id: "print-after-hours", title: "After closing", sceneIds: ["print-pause", "print-invitation"] },
      { id: "print-endings", title: "Out in the rain", sceneIds: ["print-rain", "print-door"] },
    ],
    scenes: [
      {
        id: "print-arrival",
        title: "The last hour of the show",
        text: `Rain beads on the gallery window. Amina peels the sold sticker from a print and hands its buyer a card with the artist’s full name. Caleb is wrapping a salvaged theater poster with the care you use when setting a line of tiny type.

You brought a stack of your own proofs for the exchange. Amina slipped a violet print into your stack earlier, with the bottom margin unsigned. Caleb spotted it and said he hoped the two of you would talk before he went home.

The door latch clicks behind the last buyer. Amina looks up. “What would you like to do with the last few minutes?”`,
        choices: [
          { id: "invite-them-to-stay", label: "Invite them to stay after closing", nextSceneId: "print-stay" },
          { id: "ask-about-the-print", label: "Ask about the unsigned print", nextSceneId: "print-unsigned" },
          { id: "call-it-an-evening", label: "Call it an evening", nextSceneId: "print-pause" },
        ],
      },
      {
        id: "print-stay",
        title: "Three coats on the peg",
        text: `Amina says she can stay after the cash box is locked. Caleb checks his watch. He can stay for one cup of tea before his bus.

While you wait, he shows you the poster he’s been saving. The theater’s demolition starts next month, and he’s trying to find the people who remember the opening night. You give him the name of someone who taught you sign painting.

When Amina comes back with the kettle, she asks whether you meant the invitation as a date. Caleb sets the poster aside so he can hear your answer, too.`,
        choices: [
          { id: "ask-for-the-date", label: "Say you were hoping for a date", nextSceneId: "print-invitation" },
          { id: "keep-the-tea-friendly", label: "Share the tea and leave the question open", nextSceneId: "print-door" },
        ],
      },
      {
        id: "print-unsigned",
        title: "Room for both names",
        text: `Amina holds the print under the desk lamp. The violet lines trace the old theater marquee. “Caleb found the original lettering. I carved the block. We’re still talking about how we want to sign it.”

Caleb says he wants the people who made the marquee credited in the archive. Amina says she wants their names printed before a copy goes on sale. She sets down a pencil and writes a draft they can both read.

While Caleb checks the spelling, Amina tells you why she gave you the proof. “You always look closely at what I make. I’ve been wanting to take you out somewhere we can talk longer.”`,
        choices: [
          { id: "ask-what-a-date-could-be", label: "Ask what a date together could look like", nextSceneId: "print-invitation" },
          { id: "sit-with-it", label: "Ask for time to think it over", nextSceneId: "print-pause" },
        ],
      },
      {
        id: "print-pause",
        title: "A moment at the threshold",
        text: `You say you’d like to slow down. Amina puts the pencil back in its cup. Caleb offers to wrap your proofs for the rain, then asks if you’d rather pack them yourself.

The three of you spend a moment listening to the water run down the glass. You can take the rainy walk home on your own, or stay long enough to ask what each of them wants. They give you a moment to choose.`,
        choices: [
          { id: "ask-before-heading-out", label: "Stay and ask what each of them wants", nextSceneId: "print-invitation" },
          { id: "take-the-walk-home", label: "Head home and talk another day", nextSceneId: "print-door" },
        ],
      },
      {
        id: "print-invitation",
        title: "Two invitations",
        text: `Amina says she’d like dinner with you, somewhere far from a gallery. Caleb invites you to his quiet Saturday screening, where you can each pick a film. They’re happy for the first dates to be separate. Dinner with all three can wait until everyone wants it.

You tell them which idea you’re most curious about. Amina asks if she can walk you to the corner. Caleb has time to go that far before his bus, if you’d like him along.`,
        choices: [
          { id: "walk-together", label: "Invite them both to walk with you", nextSceneId: "print-rain" },
          { id: "say-goodnight-at-the-door", label: "Say goodnight at the door", nextSceneId: "print-door" },
        ],
      },
      {
        id: "print-rain",
        title: "Violet in the rain",
        text: `Caleb tucks the proofs beneath his coat and Amina steadies the umbrella between you. At the corner she asks if she can kiss you goodnight. You say yes, and she gives you one brief kiss under the awning.

Caleb hands you the prints and tells you the first film he’s thinking of choosing. You ask whether he’d save the seat by the aisle. He says he’ll put your name on it in pencil.

You stand with them until his bus arrives. By then you’ve all agreed to text tomorrow.`,
      },
      {
        id: "print-door",
        title: "The light at the door",
        text: `You ask to leave the rest of the conversation for another day. Amina holds the door open while you pull on your coat. Caleb hands you the theater’s archive flyer. He’d still love the sign painter’s name whenever you have a moment.

Amina asks if she can text you when the next print exchange is on the calendar. You say you’d like that. When you turn the corner, she is still there keeping the light on while Caleb finishes wrapping the last poster.`,
      },
    ],
  },
];
