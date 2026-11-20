import type { StoryPack } from "../types";

export const HER_CHOICE_STORY: StoryPack = {
  id: "her-choice",
  title: "Her Choice",
  tag: "OPEN RELATIONSHIP",
  desc: "Juno picked the date, the last dance, and the kiss. She tells you about it if you ask.",
  summary: "Juno returns from a date she planned for herself. In your open relationship, she decides what she wants and you decide which parts of the night to hear.",
  accent: "rose",
  character: {
    companionId: "juno-aimes",
    name: "Juno",
    age: 29,
    role: "Burlesque choreographer",
    summary: "Bold onstage and candid off it, Juno likes being able to tell you what she wants.",
  },
  chapters: [
    { id: "home", title: "After the Show", sceneIds: ["arrival"] },
    { id: "choose", title: "What You Want to Hear", sceneIds: ["details", "feelings", "space"] },
    { id: "end", title: "The Rest of the Night", sceneIds: ["together"] },
  ],
  scenes: [
    {
      id: "arrival",
      title: "Home in Velvet",
      text: "Juno kicks off her heels and drops beside you on the couch. The hem of her velvet dress still smells faintly of the club.\n\n‘Miles and I stayed for the last song,’ she says. ‘I asked him out, I picked the club, and I kissed him goodnight.’ She watches you take that in. ‘Want the good part, the honest part, or a minute to yourself?’",
      choices: [
        { id: "hear-details", label: "Ask about the kiss", nextSceneId: "details" },
        { id: "hear-feelings", label: "Ask how she felt", nextSceneId: "feelings" },
        { id: "ask-space", label: "Take a quiet minute", nextSceneId: "space" },
      ],
    },
    {
      id: "details",
      title: "The Last Kiss",
      text: "‘He almost called a cab,’ Juno says, biting back a smile. ‘I took his hand and asked him to stay for one more song. When he wanted to know if I was flirting, I told him exactly what I meant.’\n\nShe taps a rhythm against your knee. ‘Two beats after the music stopped, I kissed him. The look on his face almost made me forget we were standing in the doorway.’",
      nextSceneId: "together",
    },
    {
      id: "feelings",
      title: "What She Wanted",
      text: "Juno gives that some thought. ‘I spend all week watching people wait to be asked. Tonight I wanted to do the asking.’ She turns on the couch to face you. ‘I had fun. And I like coming home to someone I can tell that to. What did hearing it bring up for you?’",
      nextSceneId: "together",
    },
    {
      id: "space",
      title: "A Quiet Minute",
      text: "‘Yeah. We can leave the story there.’ Juno slips out of the room and brings back two glasses of water. She sets yours within reach, curls up at the other end of the couch, and puts on a record at barely audible volume. A whole side plays before either of you speaks again.",
      nextSceneId: "together",
    },
    {
      id: "together",
      title: "One More Song",
      text: "Juno rises when the needle lifts. ‘I do want one more dance tonight. With you, if you're in the mood.’ She offers her hand and waits, close enough for you to see the last trace of stage glitter on her wrist.",
    },
  ],
};
