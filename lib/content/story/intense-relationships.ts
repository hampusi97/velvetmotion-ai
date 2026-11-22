import type { StoryPack } from "../types";

export const INTENSE_RELATIONSHIP_STORY_PACKS: StoryPack[] = [
  {
    id: "the-missed-call",
    title: "The Missed Call",
    tag: "KINK",
    desc: "A cheating confession, an uncertain reconciliation, and a later choice about consensual cuckold humiliation.",
    summary: "Play Ellis, a white projectionist of 33, when Casey admits she kept seeing Adrian, a Black photographer of 35, after promising to tell you before a second date. You can ask for the truth, take time apart, or consider rebuilding. The optional cuckold scene comes later and requires a fresh agreement.",
    accent: "amber",
    character: {
      name: "Casey Ward",
      age: 32,
      portraitUrl: "/portraits/roleplay-casey.webp",
      role: "Bookshop owner and Ellis’s partner",
      summary: "Casey turns a good conversation into a long evening. She has been working with Adrian on a photo exhibit at her shop, and she owes you a plain account of where their dates began.",
    },
    chapters: [
      { id: "missed-call-confession", title: "The call you missed", sceneIds: ["missed-call-arrival", "missed-call-truth", "missed-call-space"] },
      { id: "missed-call-decisions", title: "A week to think", sceneIds: ["missed-call-review", "missed-call-script", "missed-call-tease"] },
      { id: "missed-call-endings", title: "What you choose next", sceneIds: ["missed-call-aftercare", "missed-call-apart", "missed-call-repair"] },
    ],
    scenes: [
      {
        id: "missed-call-arrival",
        title: "An honest answer at the door",
        text: `The bookshop is dark except for Casey’s desk lamp. She tells you she missed your call while she was at Adrian’s, then puts her phone face down.

“There was a second date last Thursday,” she says. “And another tonight. I told you I’d let you know before either happened. I kept it from you.”

You both knew she was attracted to him. You’d agreed to tell each other before a second date. The radio is still playing quietly behind the counter. Casey switches it off and lets you decide whether to stay.`,
        choices: [
          { id: "ask-for-the-timeline", label: "Ask what she kept from you", nextSceneId: "missed-call-truth" },
          { id: "ask-for-space-tonight", label: "Ask for space tonight", nextSceneId: "missed-call-space" },
          { id: "end-the-relationship", label: "End the relationship", nextSceneId: "missed-call-apart" },
        ],
      },
      {
        id: "missed-call-truth",
        title: "Thursday, in her own words",
        text: `Casey tells you she kissed Adrian after they hung the last photograph, then spent the night with him on Thursday. He asked if she’d checked in with you. She said she would, then let the next invitation pass without bringing it up. She has now told him what she left out. He asked for time to decide how he feels about it.

You ask Casey one question at a time. The dates sound ordinary. That makes it easier to see how many small chances she had to tell you. She says she is sorry and gives you the keys to the shop so you can collect your things whenever suits you.`,
        choices: [
          { id: "meet-next-week", label: "Agree to meet again next week", nextSceneId: "missed-call-review" },
          { id: "stop-the-confession", label: "Stop the conversation here", nextSceneId: "missed-call-space" },
        ],
      },
      {
        id: "missed-call-space",
        title: "The way home alone",
        text: `You tell Casey you want the rest of the night to yourself. She asks whether you’d prefer a ride home or a walk. You choose the walk.

Casey says she’ll give you space and asks if she can send one message on Sunday so you can settle the practical things. You suggest a time. The missed call is still in your history when you put your phone away. You have until Sunday to decide what you want.`,
        choices: [
          { id: "schedule-the-conversation", label: "Schedule a conversation for Sunday", nextSceneId: "missed-call-review" },
          { id: "choose-time-apart", label: "Use Sunday to arrange a separation", nextSceneId: "missed-call-apart" },
        ],
      },
      {
        id: "missed-call-review",
        title: "A table in daylight",
        text: `At the next meeting, Casey asks where you’d like to start. You talk through which agreements can still work and which need time. Casey says Adrian wants to finish the exhibit and step back from dating for now. She accepts that. The three of you will handle the exhibit separately from any decisions about the relationship.

You remember a staged cuckold scenario you and Casey talked about months ago. If you’re curious about discussing it again, you can raise it as a separate possibility for later. You can also keep this conversation entirely about what happened.`,
        choices: [
          { id: "discuss-fiction-for-later", label: "Discuss a separate, staged cuckold scene for later", nextSceneId: "missed-call-script" },
          { id: "work-on-the-relationship", label: "Focus on rebuilding trust", nextSceneId: "missed-call-repair" },
          { id: "leave-the-relationship", label: "Say you want to end the relationship", nextSceneId: "missed-call-apart" },
        ],
      },
      {
        id: "missed-call-script",
        title: "A line you both choose",
        text: `Several weeks later, you bring up the idea again after a steady, ordinary day together. Casey asks what words feel fair. You choose “my little white boyfriend” as a private nickname for your part in the roleplay. You agree to hear it once, then pause and check in.

Casey asks what you’d like to say if you want to stop. You choose “lights up.” She repeats it once and puts the script on the table. This evening can stay quiet if that’s what you’d rather have.`,
        choices: [
          { id: "hear-the-agreed-humiliation", label: "Opt in to the agreed teasing line", nextSceneId: "missed-call-tease" },
          { id: "put-the-script-away", label: "Put the script away", nextSceneId: "missed-call-aftercare" },
        ],
      },
      {
        id: "missed-call-tease",
        title: "Your private nickname",
        text: `Casey waits for the nod you agreed on. Then she picks up the imaginary invitation and holds it where you can see it.

“My little white boyfriend,” she says. “You spent the whole evening rehearsing what you’d say when I came home. I can tell you where I spent the night, if you can manage to ask.”

She puts the invitation back on the table and leaves a pause. Her expression goes soft when she asks how the line landed. The room is yours again.`,
        choices: [
          { id: "close-the-scene-gently", label: "End the scene and check in", nextSceneId: "missed-call-aftercare" },
          { id: "lights-up", label: "Say lights up and stop now", nextSceneId: "missed-call-aftercare" },
        ],
      },
      {
        id: "missed-call-aftercare",
        title: "After the scene",
        text: `The script goes in a drawer. Casey offers water and asks whether you want company while you come back to the room. You tell her what felt right and what you’d set aside next time. She does the same.

Before she leaves, you confirm the separate time you set to talk about the relationship. She writes it down. Then you sit quietly together while the street outside empties.`,
      },
      {
        id: "missed-call-apart",
        title: "Separate keys",
        text: `You tell Casey you’ve decided to leave. She asks if you want her to arrange a time to collect her things. You choose a day for the keys, the books, and the two boxes in the front hall.

Adrian’s show will still go on, and you give Casey the number of another projectionist for their opening. That takes a small weight off your shoulders. When you step outside, you know exactly where you’re going for the night.`,
      },
      {
        id: "missed-call-repair",
        title: "A time to talk again",
        text: `You tell Casey you want to try, slowly. You each write down what “tell me beforehand” means to you and read the two versions aloud. You agree which parts still fit and choose a time to revisit the rest in two weeks.

Later, as you gather your things, Casey asks if she can walk with you to the bus stop. You invite her along. The next bus has room enough for you both to pick your seats.`,
      },
    ],
  },
  {
    id: "after-the-final-cue",
    title: "After the Final Cue",
    tag: "KINK",
    desc: "A staged cuckold scene with optional size humiliation and fictional breeding talk before the lights come up.",
    summary: "Play Jamie, a white stage carpenter of 32, in a private theater rehearsal with your partner Mina, a costume designer of 33, and Desmond, a Black lighting designer of 34. Each adult chooses their own role. The staged cuckolding, size humiliation (SPH), and fictional breeding talk each have separate choices.",
    accent: "violet",
    character: {
      name: "Mina Reed",
      age: 33,
      portraitUrl: "/portraits/roleplay-mina.webp",
      role: "Costume designer and Jamie’s partner",
      summary: "Mina likes to run a scene on time and check in between cues. She’s finishing the last costume alterations for opening night. For the three of you, she brought a dance record and a clean page for the lines you want to agree on together.",
    },
    chapters: [
      { id: "final-cue-check-in", title: "Before the rehearsal", sceneIds: ["final-cue-work-light", "final-cue-dance"] },
      { id: "final-cue-options", title: "Choose the next cue", sceneIds: ["final-cue-size", "final-cue-fantasy-terms", "final-cue-fantasy", "final-cue-quiet"] },
      { id: "final-cue-endings", title: "House lights", sceneIds: ["final-cue-aftercare", "final-cue-stop"] },
    ],
    scenes: [
      {
        id: "final-cue-work-light",
        title: "Under the work light",
        text: `The theater is empty and you still have sawdust on one sleeve. Desmond sets the lights to a warm wash and tests the switch that will bring the room back to full light. Mina leaves a chair where you can move it or stand whenever you like.

You agree that anyone can say “curtain” and end the scene straight away. Mina asks if you want to play the observer while she and Desmond dance. You can choose later whether you want any teasing or fantasy talk. For now, you can choose the staged scene, the song alone, or a check-in with the lights on.`,
        choices: [
          { id: "try-staged-cuckolding", label: "Opt in to the staged cuckold scene", nextSceneId: "final-cue-dance" },
          { id: "rehearse-the-song", label: "Keep it to the rehearsal song", nextSceneId: "final-cue-quiet" },
          { id: "check-in-before-starting", label: "Keep the lights up and check in", nextSceneId: "final-cue-stop" },
        ],
      },
      {
        id: "final-cue-dance",
        title: "The chair by the aisle",
        text: `You take the chair. Desmond asks Mina for the dance, and she accepts. You watch him count them in under his breath while she offers a hand on the first beat. When they turn toward you, Mina gives you a smile she knows you’ll recognize.

The song fades a little sooner than you expected. Desmond gives you a moment to decide how close you want to stay to the scene. Mina asks whether you want the line about size you agreed on earlier, a discussion of the breeding fantasy, or the next song.`,
        choices: [
          { id: "request-size-teasing", label: "Request the agreed size humiliation (SPH)", nextSceneId: "final-cue-size" },
          { id: "discuss-the-breeding-fantasy", label: "Discuss the fictional breeding fantasy", nextSceneId: "final-cue-fantasy-terms" },
          { id: "keep-to-the-dance", label: "Keep to the dance", nextSceneId: "final-cue-quiet" },
          { id: "call-curtain-from-the-chair", label: "Say curtain and stop", nextSceneId: "final-cue-stop" },
        ],
      },
      {
        id: "final-cue-size",
        title: "One agreed tease",
        text: `You say yes to the single line you picked. Mina comes to the light at the edge of the stage.

“You asked for my verdict on your size. Small, sweetheart. You were so bold before the first cue. Look how quiet you get when you hear it from me.”

She stops where you agreed she would. Desmond waits next to the record player. You can choose a different subject, ask how the breeding fantasy would be framed, or bring the lights back up.`,
        choices: [
          { id: "ask-about-the-fantasy", label: "Ask how the fictional breeding scene would work", nextSceneId: "final-cue-fantasy-terms" },
          { id: "finish-after-one-tease", label: "Finish here and check in", nextSceneId: "final-cue-aftercare" },
          { id: "curtain-after-tease", label: "Say curtain and stop", nextSceneId: "final-cue-stop" },
        ],
      },
      {
        id: "final-cue-fantasy-terms",
        title: "What belongs in the story",
        text: `Mina checks what you mean by breeding fantasy. You agree it’s a line about an imaginary pregnancy in the play you’re making up together. Desmond says he’ll play the lover in that future if everyone is comfortable hearing it. You each keep your actual plans and decisions outside the scene.

Mina offers to say the line once, then pause. You can hear it, leave the fantasy here, or call the scene to an end.`,
        choices: [
          { id: "hear-the-fictional-line", label: "Opt in to the imaginary pregnancy line", nextSceneId: "final-cue-fantasy" },
          { id: "leave-the-fantasy-offstage", label: "Skip the line and check in", nextSceneId: "final-cue-aftercare" },
          { id: "curtain-before-the-line", label: "Say curtain and stop", nextSceneId: "final-cue-stop" },
        ],
      },
      {
        id: "final-cue-fantasy",
        title: "An imagined future",
        text: `Mina waits until you’ve said you want to hear it. Then she takes Desmond’s hand where you can see them both under the warm light.

“In this story, Desmond, I’d want to get pregnant with you. I’d want to tell Jamie myself.”

Desmond stays with her until the end of the line. Then Mina lets go of his hand and turns toward your chair. She asks whether you want her to come sit with you.`,
        choices: [
          { id: "check-in-after-the-fantasy", label: "Invite her over for a check-in", nextSceneId: "final-cue-aftercare" },
          { id: "curtain-after-the-line", label: "Say curtain and stop", nextSceneId: "final-cue-stop" },
        ],
      },
      {
        id: "final-cue-quiet",
        title: "Just one more song",
        text: `Desmond puts on a slower record. Mina starts a turn and then forgets the count. She laughs and steps out of the way so you can come up onto the stage if you’d like.

You listen to the rest of the song together. When it ends, Desmond asks what time you’ll need the work light tomorrow. You tell him, and he makes a note on the back of the set plan.`,
        choices: [
          { id: "finish-with-the-song", label: "Let the song finish and check in", nextSceneId: "final-cue-aftercare" },
          { id: "curtain-during-the-song", label: "Say curtain and stop", nextSceneId: "final-cue-stop" },
        ],
      },
      {
        id: "final-cue-aftercare",
        title: "After the record ends",
        text: `Mina fetches your water. Desmond brings the lights up and gives you a minute to name anything you want done differently. You talk about which cues felt good and which ones you’d keep off the page next time. A different choice will be welcome then, too.

You collect your coat and shut the theater door together. Tomorrow the space belongs to the work again.`,
      },
      {
        id: "final-cue-stop",
        title: "The house lights come up",
        text: `Desmond brings the lights up and takes his hand off the record player. Mina asks whether you’d like a little space or company at your side, without making you explain the choice.

You decide what to do with the rest of the evening. The three of you leave the script face down on the stage. Anyone can decide later whether there will be another rehearsal.`,
      },
    ],
  },
];
