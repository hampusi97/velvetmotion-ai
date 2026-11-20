import type { StoryPack } from "../types";

export const HER_CHOICE_STORY: StoryPack = {
  id: "her-choice",
  title: "Her Choice",
  tag: "BNWO",
  relatedTags: ["OPEN RELATIONSHIP"],
  desc: "Juno comes home to tell you about the Black men she's been seeing and the dates she chose.",
  summary: "In your open relationship with Juno, you play her white adult boyfriend. She picks her dates and tells you about her adventures. You choose which parts you want to hear.",
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
    { id: "choose", title: "What You Want to Hear", sceneIds: ["details", "last-weekend", "feelings", "space"] },
    { id: "end", title: "The Rest of the Night", sceneIds: ["together"] },
  ],
  scenes: [
    {
      id: "arrival",
      title: "Home in Velvet",
      text: "Juno kicks off her heels and drops beside you on the couch. The hem of her velvet dress still smells faintly of the club.\n\n‘Come here, white boy.’ At thirty, you still blush when she calls you that. ‘Miles and I stayed for the last song. I asked him out, I picked the club, and I kissed him goodnight.’ Miles is the Black lighting designer she met at rehearsal. She catches your grin. ‘Want to hear about tonight or the trouble I got into last weekend?’",
      choices: [
        { id: "hear-details", label: "Ask about the kiss", nextSceneId: "details" },
        { id: "hear-weekend", label: "Ask about last weekend", nextSceneId: "last-weekend" },
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
      id: "last-weekend",
      title: "One More Hour",
      text: "‘Andre took me to that little jazz place by the river,’ Juno says. Andre is the Black photographer she asked out after her last show. ‘After the band packed up, I asked him to walk me back. He offered me his jacket. I told him he could come upstairs if he wanted it back.’\n\nShe lets you sit with that for a beat. ‘We spent another hour on the balcony. By morning I'd forgotten which one of us still had the jacket.’",
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
