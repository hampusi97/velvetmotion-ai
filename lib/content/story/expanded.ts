import type { StoryPack } from "../types";

/**
 * Historical packs whose original title, tag, short desc, and opening
 * text are preserved, then continued with consensual adult scenes.
 * Incest and racial-humiliation packs from the old inline list are not
 * registered: the content rules for this catalog forbid them.
 */
export const EXPANDED_STORY_PACKS: StoryPack[] = [
  {
    id: "office",
    title: "Office Cuck",
    tag: "CUCK",
    desc: "She fucks her boss and sends proof",
    summary:
      "Camille Ortiz, 33, and you, 35, planned this night with Julian Peck, 40. The caption still says boss. The rules say any one of you can stop it. You choose whether to stay on the phone, call her home, or take one more line of proof.",
    accent: "amber",
    character: {
      name: "Camille Ortiz",
      age: 33,
      role: "Your partner, on a planned night with a colleague",
      summary:
        "Warm, direct, and unwilling to skip a check-in. She likes being explicit on the phone and gentle when she gets home.",
    },
    chapters: [
      { id: "caption", title: "The Caption", sceneIds: ["opening", "check-in"] },
      {
        id: "call",
        title: "Your Call",
        sceneIds: ["on-the-line", "come-home", "one-more-proof"],
      },
      { id: "after", title: "After", sceneIds: ["aftercare"] },
    ],
    scenes: [
      {
        id: "opening",
        title: "Proof",
        nextSceneId: "check-in",
        text: "Photo from the office bathroom stall.\n\nHer makeup slightly ruined, thick cock inside her.\n\nCaption: “Boss is busy. Keep stroking under your desk.”",
      },
      {
        id: "check-in",
        title: "Sunday's Rules",
        text: "The picture is a description you both agreed would count as proof. No one's real photo is in it. Your phone buzzes before you can answer the caption.\n\nCamille Ortiz is thirty-three. You are thirty-five. Julian Peck is forty, and he is not her manager. The word boss is the game you named on Sunday, when the three of you wrote the night down and signed it: she can stop, he can stop, you can close the phone.\n\nHer voice is low, a little breathless, completely clear. \"You saw the caption. I'm still in the stall. Julian is with me and he knows you're listening. Before I say another filthy word, are you in? If you say no, I fix my dress and I come home. If you say yes, I tell you exactly how he feels.\"\n\nA man murmurs, close and careful, \"Only if he wants it, Cam.\"\n\nShe waits. The office hums behind her. Your hand is already on your thigh, and the choice is still yours.",
        choices: [
          { id: "stay", label: "Stay on the line", nextSceneId: "on-the-line" },
          { id: "home", label: "Ask her to come home", nextSceneId: "come-home" },
          { id: "proof", label: "Ask for one more line of proof", nextSceneId: "one-more-proof" },
        ],
      },
      {
        id: "on-the-line",
        title: "Same Pace",
        nextSceneId: "aftercare",
        text: "\"Yes,\" you say, and her laugh is warm enough to lean on.\n\n\"Good. Then listen.\" She sets the phone where it can catch the slow, wet sound of him moving in her. Not a show for a crowd. A sound she wants you to have. \"He's deep. I'm holding the rail. I told him to stay slow so you can stroke with us. Hand around yourself. Same pace as his hips. When I moan, you do not speed up. You stay with me.\"\n\nJulian's voice is rough and respectful. \"She's looking at your name on the screen.\"\n\n\"I want you aching and close,\" Camille says. \"Not because you are less than anyone. Because you asked to be the one who hears it. Thumb over the head on the way up. Good. I'm going to come on him while you stay just behind me. Don't finish yet. I want the last of you when I get home, unless you need my voice to take you there. Say so and I will.\"\n\nShe keeps you with her: the grip of her body, the kiss she puts on Julian's throat, the moment she breaks and laughs because it is that good. \"Still with me?\" she asks, and she does not go on until you answer. When she has shaken through it she thanks Julian, kisses him once, and tells him the night is over. \"I'm coming home to you,\" she says. \"Stay hard if you can. If you can't, I'll be sweet about it.\"",
      },
      {
        id: "come-home",
        title: "The Door",
        nextSceneId: "aftercare",
        text: "\"Come home,\" you tell her.\n\n\"Then I'm done here.\" You hear her thank Julian, hear him say, \"Tell him I had a good time only because she wanted it,\" and the soft rush of clothes. Twenty minutes later your door opens. She smells like soap from the office sink and rain from the walk. She cups your face before she touches anything else.\n\n\"Thank you for calling me back,\" she says. \"I'm still worked up. I want you. Not as a consolation prize. As the person I come home to.\" She undoes your belt and kisses you like she missed your mouth, then sinks onto you on the couch. She is slick and specific and entirely here. She puts your hands on her hips. \"Feel that. Tell me if you want it slower.\"\n\nYou talk while she rides. She tells you what she liked in the stall and what she likes more, which is your eyes on her now. The city ticks against the window. When you come she stays seated, forehead to yours, breathing you down from the high. \"There you are,\" she says. \"Hi.\"",
      },
      {
        id: "one-more-proof",
        title: "One More Line",
        text: "\"One more piece of proof,\" you say.\n\nShe does not send a photograph of a person. She sends a line, the way Sunday's paper said proof would work.\n\nHis hand on my waist. My lipstick at his collar. I'm looking at the phone the way I look at you.\n\n\"That's the only picture,\" she says. \"Julian says hello. He'll leave the second I say the word. Now pick the rest of the night. I stay on this line and talk you through his cock, or I come home and you finish inside me. I am good either way. I love you in both directions.\"\n\nHer breathing is steady. She is smiling. You can hear it.",
        choices: [
          { id: "line", label: "Stay on the line", nextSceneId: "on-the-line" },
          { id: "home", label: "Tell her to come home", nextSceneId: "come-home" },
        ],
      },
      {
        id: "aftercare",
        title: "The Paper on the Counter",
        text: "Later the apartment is quiet. Camille is in your shirt. There is water in both your hands and the rules are folded on the counter where you can see them.\n\n\"Anything you didn't like?\" she asks.\n\nYou tell her the truth. She nods, kisses your knuckles, and adds a line to the paper if you need one. \"Then we're still us,\" she says. \"Office, home, all of it. I had a filthy night and a careful one. That's the only way I want this.\"\n\nShe tucks herself under your arm. The caption feels smaller than her weight, her laugh, and the ordinary dark of your own room. If you want the night again, you will write it down first. She kisses your shoulder and means the promise.",
      },
    ],
  },
  {
    id: "locked",
    title: "Chastity Night",
    tag: "CUCK",
    desc: "Locked while she gets used",
    summary:
      "Day 19 of a lock you asked Rhea Quinn, 32, to hold. You are 34. Callum Brooks, 36, is the lover you both invited. The key is a tease, not a trap: red means she unlocks you, yellow slows the other room, green means keep going.",
    accent: "violet",
    character: {
      name: "Rhea Quinn",
      age: 32,
      role: "Your partner and keyholder",
      summary:
        "She likes the ritual of the lock and likes checking on you more. Her voice goes soft the second you need her in the room.",
    },
    chapters: [
      { id: "wall", title: "Through the Wall", sceneIds: ["opening", "ping"] },
      {
        id: "pace",
        title: "The Pace",
        sceneIds: ["green-detail", "green-slow", "come-back"],
      },
      { id: "key", title: "The Key", sceneIds: ["her-return", "key-choice", "unlocked", "held"] },
    ],
    scenes: [
      {
        id: "opening",
        title: "Day 19",
        nextSceneId: "ping",
        text: "Day 19 locked.\n\nYou can hear her getting fucked through the wall.\n\nShe left the key on the table… just far enough that you can’t reach it while you’re stroking.",
      },
      {
        id: "ping",
        title: "Color",
        text: "The rhythm next door is unhurried. A headboard, a laugh, Rhea's voice breaking into a moan she does not bother to hide. You are thirty-four. She is thirty-two. The lock was your idea, written into the same note as the guest list. Callum Brooks is thirty-six, and he only came over after you said his name out loud and meant it.\n\nYour phone lights up on the pillow.\n\nRhea: Color? Red and I walk out and unlock you. Yellow and I tell him to slow down. Green and I keep going. I can hear you breathing. I love you. Answer me.\n\nThe key glints on the table, a pretty piece of theater. The real key is the word you send. Your hand moves, frustrated and aching, and the cage holds exactly as much as you asked it to hold.",
        choices: [
          { id: "detail", label: "Green. Tell me all of it.", nextSceneId: "green-detail" },
          { id: "slow", label: "Green, but slower.", nextSceneId: "green-slow" },
          { id: "back", label: "Come back in here.", nextSceneId: "come-back" },
        ],
      },
      {
        id: "green-detail",
        title: "All of It",
        nextSceneId: "her-return",
        text: "You send green. A moment later the door is still shut and her voice is in your ear, a call, breathy and precise.\n\n\"He's on his back. I'm riding him. I'm looking at the wall like I can see you through it.\" She rocks, and you hear the change in the mattress. \"Stroke the inside of your thigh if you can't touch your cock. I want you involved. Callum says hello. He says thank you for trusting him with me.\"\n\nCallum's voice, warm, a little wrecked: \"She's stunning. We'll stop if you say.\"\n\n\"Don't you dare come in that cage,\" Rhea says, fond and filthy. \"Feel the edge and stay under it. I'm going to describe his hands. One is on my waist. One is in my hair, gentle, because I told him gentle. I'm clenching around him and thinking about your mouth. Stay with me. There. I'm coming. Listen.\"\n\nShe does, openly, and the sound goes through you harder than a hand would. She laughs after, kisses someone, and says, \"I'm not done with you. Give me a minute. I want to see your face.\"",
      },
      {
        id: "green-slow",
        title: "Slower",
        nextSceneId: "her-return",
        text: "Yellow-close, you tell her. Green, but slower.\n\nThe headboard eases. You hear her murmur, \"He asked for slower,\" and Callum's immediate, \"Then slower.\" The new pace is deep and lazy. Rhea calls you.\n\n\"Better?\" she asks. \"I can talk now. His cock is thick and I'm taking it in long strokes. I'm not performing. I'm enjoying him, and I'm enjoying you listening. Put your hand flat on your stomach and feel how worked up you are. Good. That's the point of the lock tonight. You get the heat without the finish unless you ask me for the key.\"\n\nShe breathes with you for a while. City traffic. Skin. A quiet swear from Callum when she tightens. \"I'm going to come like this,\" she says. \"Soft. You can groan. I want to hear it.\" When she comes it is a low, shaken sound, and she stays on the line until your breathing matches hers again. \"We're coming to you,\" she says. \"Both of us, only to say goodnight, unless you want him gone first. I'll send him home if you do.\"",
      },
      {
        id: "come-back",
        title: "In the Room",
        nextSceneId: "key-choice",
        text: "\"Come back in here,\" you say.\n\nThe other room stops. No argument. You hear Callum laugh once, gently, and Rhea's bare feet in the hall. She comes in wearing a sheet and the look she saves for you. She leaves the door open so you can hear Callum gathering his clothes.\n\n\"Hi,\" she says, and kneels by the bed so you are eye to eye. She smells like sex and her own perfume. She does not touch the cage yet. She touches your cheek. \"You called and I came. That's the rule I love most. He's leaving. He says you were generous.\"\n\nFrom the hall: \"I had a good night. She's yours to check on. I'm gone.\" The front door clicks.\n\nRhea rests her forehead on yours. \"Color again, love. I can unlock you and have you properly. Or I can keep the cage on and hold you until the shake goes out of your hands. Both are me wanting you.\"",
      },
      {
        id: "her-return",
        title: "She Comes In",
        nextSceneId: "key-choice",
        text: "The other room quiets. A low conversation, a thank-you, the shower running for a minute. Then Rhea is in your doorway in a robe, hair damp at the temples, eyes bright. Callum pauses behind her, dressed, respectful.\n\n\"I'm heading out,\" he says. \"She's wonderful. You two have a good night. Text if you ever want this again. If you don't, that's complete too.\" He leaves. The apartment exhales.\n\nRhea sits on the bed and takes your caged cock in her palm through the metal, not to tease past what you can stand, just to say she knows. \"You did so well,\" she says. \"I'm proud of the check-in, not of the suffering. Talk to me. Do you want the key, or do you want to stay locked and be held?\"\n\nThe key is still on the table. She could have moved it closer at any time. She will, if you ask.",
      },
      {
        id: "key-choice",
        title: "The Real Key",
        text: "Rhea puts the key in your hand and closes your fingers around it, which ruins the theater and restores the point. \"You can give it back,\" she says. \"Or you can use it. I want you either way. Tell me.\"\n\nHer thumb strokes your wrist. The apartment is only yours now. Whatever you pick, she is staying.",
        choices: [
          { id: "unlock", label: "Unlock me. I want you.", nextSceneId: "unlocked" },
          { id: "stay", label: "Keep me locked. Just stay.", nextSceneId: "held" },
        ],
      },
      {
        id: "unlocked",
        title: "Unlocked",
        text: "You give her the key. She opens the lock with the focus she uses for things that matter, kisses the red line on your skin, and waits while the feeling floods back. \"Easy,\" she says. \"I've got you.\"\n\nWhen you are ready she swings a leg over and sinks down, slick from the night and careful about the sensitivity. You groan. She grins. \"There he is.\" She rides you slowly, one hand on your chest, watching your face more than the performance. \"You can come. I want it. I've wanted it all night, even with him. Especially after him, because I get to see you.\"\n\nIt does not take long, and she doesn't mock you for that. She kisses you through it, clenches to meet you, and stays after, tracing the place the cage used to be. \"Day 19 is over,\" she says. \"We can start day one again tomorrow, or not. Tonight you sleep unlocked, next to me.\"",
      },
      {
        id: "held",
        title: "Held",
        text: "You give the key back. Rhea nods like you handed her something precious, sets it on the nightstand where you can see it, and gets under the blanket with you. She guides your hand between her legs so you can feel that she is still wet, still yours to touch.\n\n\"You don't have to do anything with that,\" she says. \"I just want you to know how the night treated me.\" She tucks your head against her shoulder. The cage is warm and annoying and exactly the ache you chose. She scratches your scalp. \"If it stops being fun, you say red in the dark and I wake up and open it. Deal?\"\n\n\"Deal.\"\n\nShe kisses your hair. Through the wall there is nothing left to hear. Only her heartbeat, your breath, and the small bright key waiting if you change your mind.",
      },
    ],
  },
  {
    id: "group",
    title: "Group Use",
    tag: "GROUP",
    desc: "Multiple men, you only watch",
    summary:
      "Nadia Beltran, 30, invited three adults you already said yes to: Chris Adelman, 33, Evan Brooks, 29, and Paul Silva, 35. You are 31, in the chair, because that is the seat you picked. The phone recording stops the second anyone wants it to.",
    accent: "fuchsia",
    character: {
      name: "Nadia Beltran",
      age: 30,
      role: "Your partner, hosting a planned group night",
      summary:
        "Playful in public and precise about consent in private. She checks your color before she checks her own pleasure, then enjoys both.",
    },
    chapters: [
      { id: "chair", title: "The Chair", sceneIds: ["opening", "green-check"] },
      {
        id: "during",
        title: "While You Watch",
        sceneIds: ["keep-watching", "eye-contact", "no-record"],
      },
      { id: "after", title: "After They Leave", sceneIds: ["goodnight", "with-you", "talk"] },
    ],
    scenes: [
      {
        id: "opening",
        title: "Three of Them",
        nextSceneId: "green-check",
        text: "Three of them.\n\nShe’s in the middle of the bed getting used from both ends while the third records.\n\nYou’re on the chair in the corner.\n\n“Stroke slow. You’re not allowed to cum until they finish with me.”",
      },
      {
        id: "green-check",
        title: "Still Green?",
        text: "Nadia turns her head, mouth wet, and finds your eyes. She is thirty. You are thirty-one. Chris, thirty-three, is the one she is kissing around. Evan, twenty-nine, is behind her, waiting for her nod before he pushes back in. Paul, thirty-five, lowers the phone the moment she lifts a hand.\n\n\"Pause,\" she says, and they pause. No one groans about it. She wipes her mouth with the back of her wrist and smiles at you, breathless and lucid. \"That line was the scene. This is the check. Still green? You can keep watching and stroking. You can ask me to look at you while I take them. Or the recording ends now and we only keep what we remember. I am having a very good time. I will have a better one if I know you are.\"\n\nChris kisses her shoulder and stays quiet. The room smells like skin and the orange oil she put on an hour ago, when the four of you went over the list in the kitchen. Your chair creaks. Your hand is still.",
        choices: [
          { id: "watch", label: "I'm green. I'll watch.", nextSceneId: "keep-watching" },
          { id: "eyes", label: "I'm green. Look at me.", nextSceneId: "eye-contact" },
          { id: "camera", label: "Stop the recording.", nextSceneId: "no-record" },
        ],
      },
      {
        id: "keep-watching",
        title: "From the Chair",
        nextSceneId: "goodnight",
        text: "\"Watch,\" you say. \"I'm green.\"\n\nNadia's smile goes bright and filthy. \"Then stroke slow, like I said. Same rule. You don't come until I've had mine.\" She looks at Paul. \"You can film my back and his hands. No faces but mine, and only because I already said my face is fine.\"\n\nThey find the rhythm again. Evan sinks into her and holds there when she asks, Chris feeds her his cock with a hand gentle on her jaw, and Paul circles for the angle she likes. Nadia narrates for you between moans. \"He's deep. I'm dripping on the sheet. Chris tastes like the mint I made him use. I love that you're hard in that chair. I love that you trust me with this.\"\n\nShe comes with Evan's hands on her hips and your name in her mouth, then laughs and taps Chris's thigh when she wants a breath. They are careful with the aftershocks. One by one they finish where she points, on her chest, never anywhere she did not name. She thanks each of them like a hostess who has just thrown the best dinner of her life. \"Coats, water, door,\" she says kindly. \"I need the rest of the night with him.\"",
      },
      {
        id: "eye-contact",
        title: "Look at Me",
        nextSceneId: "goodnight",
        text: "\"Look at me,\" you say.\n\nNadia shifts so she can. Evan adjusts without being asked. Chris stays to the side, stroking himself, waiting his turn instead of blocking her face. Paul sets the phone down. \"No video if she's looking at you,\" he says. \"That's yours.\"\n\nShe holds your gaze while Evan fucks her in long strokes. The eye contact makes her noisier. \"This is the part I wanted,\" she says. \"Them in my body and you in my head. Don't look away unless you need to. If you need to, I stop.\" You don't look away. She reaches a hand toward the chair, not far enough to touch, close enough to mean it. \"Slow strokes. Match him. Good. I'm going to come looking at you.\"\n\nShe does. It wrinkles her nose and then softens her whole face, and she keeps her eyes open for it because she promised. After, she kisses Chris and Paul and Evan in turn, thanks them, and tells them the door is the next kind thing they can do. They go, laughing quietly, leaving water on the nightstand.",
      },
      {
        id: "no-record",
        title: "Phone Down",
        nextSceneId: "goodnight",
        text: "\"Phone down,\" you say.\n\nPaul locks the screen and puts it on the dresser, face down, without a speech. \"Gone,\" he says. \"Want me gone too, or just the camera?\"\n\nYou look at Nadia. She waits. \"He can stay if you want the bodies and not the footage,\" she says. \"Your room as much as mine.\"\n\nYou nod. The mood changes into something warmer without the lens. They stop performing angles and start listening. Evan asks, \"Here?\" before he thrusts. Chris asks before he guides himself back to her mouth. Nadia moans like she can finally be messy. She talks less and looks at you more. When she comes she grabs the sheet and your name.\n\n\"Enough,\" she says after, tender and hoarse. \"That was perfect. Gentlemen, there is fruit on the counter and you are darlings. Out you go.\" They kiss her cheek, bump your fist on the way past, and leave the apartment quieter than they found it.",
      },
      {
        id: "goodnight",
        title: "Just You",
        text: "The door shuts. Nadia pulls on your shirt and comes to the chair instead of the bed. She climbs into your lap, knees outside your hips, and holds your wrist so your hand stops moving.\n\n\"Your turn to pick,\" she says. \"You can have me now. I'm sensitive and I want it anyway. Or we can lie here and you can tell me what you loved and what you don't want next time. I will not be hurt by either. I am so glad you stayed.\"\n\nShe smells like orange oil and salt. Her forehead rests on yours. The chair is too small and neither of you moves to fix it yet.",
        choices: [
          { id: "you", label: "I want you now.", nextSceneId: "with-you" },
          { id: "talk", label: "Let's just talk.", nextSceneId: "talk" },
        ],
      },
      {
        id: "with-you",
        title: "The Chair",
        text: "\"I want you,\" you say.\n\nNadia reaches between you, feels how hard you stayed, and sinks down with a shaky breath. \"Oh, that's good. Tell me if it's too much on my side. It isn't yet.\" She rolls her hips slowly, arms around your neck, the chair tapping the wall. You were told not to come until they finished. They are finished. She kisses the corner of your mouth and says, \"Now. If you want. I want to feel you let go while I'm the only one here.\"\n\nYou hold her and do. She follows, smaller than the orgasm on the bed and sweeter, and laughs into your shoulder when the chair finally complains. \"Bed,\" she decides. \"Water. Then you tell me your favorite second. I bet I know it. It was when I looked at you.\"\n\nShe is right, or she isn't, and either answer makes her glow. She falls asleep with a hand over your heart like she is keeping count.",
      },
      {
        id: "talk",
        title: "After the Door",
        text: "\"Let's talk,\" you say.\n\nNadia nods, relieved and fond, and leads you to the bed that still needs clean sheets. She strips the top layer without ceremony, throws a blanket down, and pulls you in. You talk about the pause, the phone, the moment you almost said yellow and didn't. She listens like it matters, because it does.\n\n\"Next time, no recording at all,\" she repeats back, if that is what you asked. Or: \"Next time I look at you the whole time.\" She writes nothing down. She remembers. \"You were so good in that chair,\" she says. \"Not because you obeyed a dirty line. Because you stayed a person while I was having a wild night.\"\n\nShe kisses you once, long and closed-mouth, and turns off the lamp. The apartment is yours again. Her hand finds yours under the blanket and stays.",
      },
    ],
  },
  {
    id: "reject-revenge",
    title: "Rejection Revenge",
    tag: "CUCK",
    desc: "The girl who rejected you now begs for it",
    summary:
      "Sloane Mercer, 26, texted you, 28, and asked to play the rejection over as a scene. The kneeling line is the script. The next breath is hers: a safeword, a list she wrote, and no photos of anyone. She begs only for what she already circled.",
    accent: "red",
    character: {
      name: "Sloane Mercer",
      age: 26,
      role: "The woman who asked to restage a rejection",
      summary:
        "Sharp, funny, and done pretending she doesn't know what she wants. She will drop a scene in half a second if it stops being a game you both like.",
    },
    chapters: [
      { id: "script", title: "The Script", sceneIds: ["opening", "break"] },
      {
        id: "list",
        title: "Her List",
        sceneIds: ["long-kiss", "her-mouth", "she-rides"],
      },
      { id: "after", title: "No Score", sceneIds: ["afterglow"] },
    ],
    scenes: [
      {
        id: "opening",
        title: "The Line",
        nextSceneId: "break",
        text: "She rejected you on Tinder.\n\nNow she’s on her knees, looking up at you with that same face from the screenshot.\n\n“I was stupid to swipe left… use me however you want.”\n\nWhat do you make her do?",
      },
      {
        id: "break",
        title: "Off Script",
        text: "Sloane Mercer stands up. The kneel was a beat, not a debt. She is twenty-six, you are twenty-eight, and the message that started tonight was hers: Come over. I want to play the swipe-left thing. I have a safeword and a list.\n\nShe puts her phone face down on the table. \"No pictures. I don't want a screenshot of a real person in the room, including me. I'm Sloane. That line was the fantasy. This is the part where I make sure you're not confusing it with payback.\" She is flushed, lipstick a little off, eyes clear. \"Yellow cab stops the scene. I am not being punished for a date I didn't want then. I want you now. I wrote down three things I will actually beg for. Pick one. If none of them are good, we order noodles and I still had a nice time seeing you.\"\n\nShe offers you the note. Her handwriting is terrible and certain.\n\nOne: kiss me until I forget the script.\nTwo: I'll use my mouth, and you tell me what you like.\nThree: you lie back and I set the pace.\n\nOutside, a bus sighs. Inside, she waits like an adult who does not kneel until the terms are real.",
        choices: [
          { id: "kiss", label: "Kiss me until I forget the script.", nextSceneId: "long-kiss" },
          { id: "mouth", label: "Use your mouth. I'll tell you what I like.", nextSceneId: "her-mouth" },
          { id: "pace", label: "Lie back. You set the pace.", nextSceneId: "she-rides" },
        ],
      },
      {
        id: "long-kiss",
        title: "Until the Script Is Gone",
        nextSceneId: "afterglow",
        text: "\"Kiss me,\" you say. \"The long way.\"\n\nSloane's shoulders drop. She steps in and kisses you like she has been thinking about it on the train. It is not a porn kiss at first. It is a test of fit. Then she makes a small sound and it deepens, her hands in your hair, your hands at her waist where she put them. \"More,\" she says against your mouth. \"That's the begging. More of that.\"\n\nYou walk each other to the couch without breaking it. She climbs into your lap and rolls her hips once, grinning when she feels you. \"Still a kiss,\" she says, and keeps it a kiss until you are both restless. Then she asks, \"Shirt?\" and waits for the yes before she pulls it off. Skin, at last. She guides your hand between her thighs. She is wet, and she is not shy about the fact. \"Fingers. Then I want you inside. Tell me if you want a condom. I have them. I want this to be easy tomorrow.\"\n\nYou take care of it. She sinks down and sighs like the swipe-left joke can finally die. The pace is a conversation. When she comes she laughs in surprise and kisses you through the aftershocks, then keeps moving until you follow. \"There,\" she says, forehead to yours. \"That's what I came here for. Not revenge. This.\"",
      },
      {
        id: "her-mouth",
        title: "Tell Her",
        nextSceneId: "afterglow",
        text: "\"Your mouth,\" you say. \"I'll tell you.\"\n\nSloane smiles, wicked and pleased, and sinks down because she wants to, one hand on your hip as a brace she can push against if she needs a break. \"Talk,\" she says, before she takes you in. \"I like instructions when I asked for them.\"\n\nYou tell her slower. You tell her tongue under the head. You tell her she looks unreal with her lipstick going. She hums, pleased, and the hum nearly undoes the whole plan. She pulls off to breathe and to check your face. \"Good? Don't be polite.\" You tell her the truth, which is better than polite. She goes back with focus, one hand stroking what her mouth isn't covering, and looks up often enough that you never forget she is choosing it.\n\n\"I'm close,\" you warn.\n\nShe pulls off, kisses your hip, and says, \"Then I want the rest of you in me, unless you want to finish like this. Dealer's choice. I already got what I begged for. I got to hear you want me.\" You choose her body. She laughs, grabs a condom from her bag like she packed for a weekend, and rides you until the rejection is a story you will not be telling unkindly. You come with her name in your mouth. She comes after, using her fingers and your cock together, and looks delighted about the sequence.",
      },
      {
        id: "she-rides",
        title: "Her Pace",
        nextSceneId: "afterglow",
        text: "You lie back on her bed. Sloane looks at you for a second like she is saving the picture in her head and nowhere else. \"Hands on the pillow,\" she says. \"Not because you lost a game. Because I want to be the one who moves. You can move them the second you want to touch me. Yellow cab if I get cocky.\"\n\nShe undresses without a performance, then undresses you with more care. A condom. A kiss. Then she takes you in, slow enough that you both feel the first inch as its own event. \"Hi,\" she says, ridiculous and perfect, and starts to ride. She braces on your chest. Her hair sticks to her lip. She is noisy in a way she clearly likes being. \"I kept thinking about this after I said no to coffee,\" she admits. \"Not because no was a trick. Because I didn't know you yet. I know enough now. Touch my clit. Please. That is me begging for real.\"\n\nYou do. She comes with her head tipped back and her hand over yours so the pressure stays right. She keeps going, softer, until you gasp a warning, and she nods. \"Yes. I want it. Give it to me.\" You do. She folds down onto your chest after, breathing hard, laughing once. \"Revenge is stupid,\" she says. \"This is better.\"",
      },
      {
        id: "afterglow",
        title: "Noodles Optional",
        text: "Sloane pulls the blanket up and steals the cold half of the pillow. Her mascara survived nothing. She does not seem interested in fixing it.\n\n\"For the record,\" she says, \"I still would have swiped left on that opening message. It was bad. You are better in a room than you are in an app.\" She pokes your ribs so the insult stays a joke. \"I had fun. I felt safe. If you want to do it again, ask me like a person, not like a scoreboard.\"\n\nYou lie there with the script finished and nothing left to win. She orders noodles anyway, extra chili, and kisses you between bites like the scene was only the door you both walked through.",
      },
    ],
  },
];
