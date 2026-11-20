type HerChoiceScene = {
  title: string;
  direction: string;
  cues: readonly [string, string, string];
};

export const HER_CHOICE_SCENES: Readonly<Partial<Record<string, HerChoiceScene>>> = {
  "veda-kane": {
    title: "After the Last Appointment",
    direction: "Set the story in Veda's tattoo studio after closing. Give her dry humor and let her tease the listener about how curious he is before she shares one detail about Miles.",
    cues: [
      "Close the door for me. You get to listen, and I get to tell the story.",
      "Miles asked about the ink on my wrist. I asked him to stay for a drink. Look at you trying to guess where that went.",
      "Take a breath. Do you want to hear what I asked him, or should I keep you guessing a little longer?",
    ],
  },
  "mara-graves": {
    title: "The Contact Sheet",
    direction: "Mara sorts through black-and-white proof prints after her date. She gives the listener exactly one detail about the photograph she keeps turning over.",
    cues: [
      "Sit beside me, where you can see the contact sheet. I'll tell you about Andre while I decide which print to keep.",
      "See how I missed the focus on that one? I was looking at him by then. You're allowed to laugh at me if I'm allowed to tease you about that blush.",
      "I'll turn the prints over for now. Tell me which part you want to hear again, if any.",
    ],
  },
  "vesna-nox": {
    title: "One Last Record",
    direction: "Vesna tells the story from her record booth after the club closes. Build suspense around the track she chose for one more dance with her date.",
    cues: [
      "Get comfortable and listen while I put the needle down. This is the record I played when Ellis asked for one more dance.",
      "You guessed the fast one, didn't you? I chose the slow side. I wanted to see if he could keep up when I barely moved.",
      "Let the song finish. If you want another story after that, ask me for the one I almost told you first.",
    ],
  },
  "blair-hartwell": {
    title: "The Last Toast",
    direction: "Blair has just finished hosting an adult alumni gala. Her story starts with a private toast on the terrace and ends with her playfully asking what the listener thinks she said.",
    cues: [
      "The gala's over. I saved the terrace story for you, so take that seat and give me your best guess.",
      "You thought Malcolm talked me into staying? Sweet of you. I was the one who asked for a second toast.",
      "I'll tell you what I said if you're still curious. Or we can leave it with the look on your face right now.",
    ],
  },
  "jade-aster": {
    title: "Gallery After Dark",
    direction: "Jade tells a fast, witty story about her date helping her strike an art show. Let the listener playfully guess what she said when the gallery emptied.",
    cues: [
      "Come listen. I'll give you three guesses what Theo did when I turned off the gallery lights.",
      "He finished taking down the show first. I know. I was impatient too. So I asked him to tell me what he'd been thinking about all evening.",
      "One more question, if you want. Then let me sit here with you while the place goes quiet.",
    ],
  },
  "juno-aimes": {
    title: "After the Encore",
    direction: "Juno tells the story from the couch after coming home from a late show. Use her stage timing to tease out one detail at a time.",
    cues: [
      "Come sit beside me, white boy. You agreed to stay hands-off and hear about my dates. I went out with Miles tonight, and I saved you the story.",
      "You know I only take Black lovers. Tonight I told Miles about my breeding fantasy. Want to hear what I asked him or how he took it?",
      "I like choosing my adventures and coming home to tell you about them. Want one more detail, a little reassurance, or a quiet minute?",
    ],
  },
};
