import type { StoryPack } from "../types";

export const ADDED_STORY_PACKS: StoryPack[] = [
  {
    id: "rain-balcony",
    title: "Rain on the Balcony",
    tag: "ROMANCE",
    desc: "A storm, a borrowed book, and the kiss you both postponed",
    summary:
      "Lena Voss, 31, invites you, 33, up to return a novel and stays at the open door while the rain decides for both of you. Romantic, slow, and explicit only after she asks.",
    accent: "sky",
    character: {
      name: "Lena Voss",
      age: 31,
      role: "Novelist in the apartment above the bookshop",
      summary:
        "Dry humor, wet hair, and a careful heart. She writes love scenes for a living and still gets shy when one is happening to her.",
    },
    chapters: [
      { id: "door", title: "The Landing", sceneIds: ["landing", "balcony", "doorway"] },
      { id: "kiss", title: "The Question", sceneIds: ["kiss"] },
      { id: "inside", title: "Inside", sceneIds: ["bedroom", "window"] },
    ],
    scenes: [
      {
        id: "landing",
        title: "The Book",
        text: "The stairwell smells like paper and rain. Lena Voss opens the door in a gray sweater and bare feet, thirty-one and looking like she lost an argument with the weather. You are thirty-three, slightly out of breath, holding the novel she lent you three weeks ago.\n\n\"You didn't have to bring it back in this,\" she says, but she is already smiling, already stepping aside. The apartment is one room and a balcony. A lamp. A kettle ticking. The balcony door is open and the curtain is drinking the storm.\n\nShe takes the book and doesn't look at it. \"I was going to pretend I needed the last chapter,\" she says. \"I finished it the night I met you. Stay until the rain gets bored. Or don't. I want you to have the choice without an audience.\"\n\nThunder rolls over the bookshop roof. She tucks her hair behind her ear and waits, hopeful and not pushing.",
        choices: [
          { id: "out", label: "Step out onto the balcony with her", nextSceneId: "balcony" },
          { id: "talk", label: "Stay in the doorway and talk", nextSceneId: "doorway" },
        ],
      },
      {
        id: "balcony",
        title: "Out in It",
        nextSceneId: "kiss",
        text: "The rain is warm for the season. Lena laughs when it hits her sleeves and doesn't go back for a coat. You stand at the rail with her, shoulders touching, the street below reduced to lights and umbrellas.\n\n\"I write people who know what to say here,\" she says. \"I don't. I like you. I liked you when you recommended the poet I was pretending not to have read. I have thought about your mouth in a way that would embarrass my editor.\" She looks at you, rain on her lashes. \"If you want to kiss me, kiss me. If you want to finish the tea first, I will not turn that into a rejection.\"\n\nHer hand finds the rail beside yours, close enough that the next inch is the whole plot.",
      },
      {
        id: "doorway",
        title: "The Doorway",
        nextSceneId: "kiss",
        text: "You stay just inside. Lena leans on the frame, half in the weather, and the restraint makes her braver.\n\n\"All right. Talking.\" She crosses her arms and then uncrosses them. \"I have been writing you into a chapter and taking you out again because it felt like stealing. You are kinder in a room than you are in my notes. I don't want a muse. I want to date you, and I want to take you to bed tonight if you want that too, in that order, even if the order takes ten minutes.\"\n\nShe huffs a laugh at herself. \"Come outside? I think better when I'm a little wet and a little brave.\"\n\nYou do. The rain approves. She looks at your mouth and stops pretending she is only lending books.",
      },
      {
        id: "kiss",
        title: "Tell Me If You Want to Go In",
        nextSceneId: "bedroom",
        text: "The kiss starts careful and becomes honest. Lena makes a small surprised sound, then fists a hand in your coat and kisses you like the storm is a deadline. She tastes like mint tea. Her body fits against yours without a stumble, sweater damp, heart fast.\n\nShe breaks it only to breathe. \"I want you inside,\" she says, and then, because she is who she is, \"Not as a line. As a request. Tell me if you want to go in. We can also stay out here and kiss until we prune. I need the yes either way.\"\n\nHer thumbs stroke your jaw. The city is all white noise. There is nowhere to be but this landing and the room behind her.",
      },
      {
        id: "bedroom",
        title: "The Lamp",
        nextSceneId: "window",
        text: "You say yes. Lena walks you backward into the warm room and shuts the rain out to a hush. She undresses without theater, sweater, then the thin black top under it, then she pauses at your buttons. \"Can I?\" You nod. She is thorough and a little awed, palms learning you, mouth on your chest, a laugh when your belt fights her.\n\nOn the bed she pulls you over her and then changes her mind, rolls you, and straddles your hips. \"I want to see your face. I've imagined it badly. Let me correct the draft.\" She sinks onto you slowly, one hand braced on your shoulder, eyes fluttering and then opening again because she meant the seeing. The pace is deep and unhurried. She talks, not dirty for its own sake, specific. \"There. Stay. You feel like exactly enough.\"\n\nWhen she wants more she takes your hand and puts it where she needs pressure, and she comes with her forehead dropped to yours, shaking and smiling. You follow when she says, \"I want to feel it, come with me, yes,\" and she kisses the sound you make. After, she doesn't roll away. She stays, tracing the rainlight on your ribs.",
      },
      {
        id: "window",
        title: "Still Raining",
        text: "The storm has opinions and no intention of leaving. Lena makes fresh tea in your shirt and brings it back to bed, then forgets to drink it because kissing you is more interesting. Her hair is a wreck. She looks happy about the wreck.\n\n\"Stay,\" she says. \"Not forever, unless we get there honestly. Stay until morning. I'll read you the chapter I kept deleting, and you can tell me if the people in it are as lucky as I feel.\" She tucks her cold feet against your calf and laughs when you flinch. \"Romance is supposed to be ridiculous. Don't look at me like that. You came up the stairs in a downpour for a book you'd already finished.\"\n\nYou had. She knew. The lamp stays on, and the balcony ticks with rain, and neither of you owes the night a clever ending.",
      },
    ],
  },
  {
    id: "night-shift",
    title: "After Last Call",
    tag: "SLOW-BURN",
    desc: "Weeks of almosts, then one sober hour after the bar locks",
    summary:
      "Marisol Vega, 29, owns the bar. You are 32, and you have been closing the night with looks instead of sentences. Tonight she pours water, not whiskey, and asks you to stay while she counts the drawer.",
    accent: "orange",
    character: {
      name: "Marisol Vega",
      age: 29,
      role: "Bar owner who finally locks the door",
      summary:
        "Quick hands, slow trust. She flirts like it's part of the job and tells the truth only when the chairs are up.",
    },
    chapters: [
      { id: "close", title: "Last Call", sceneIds: ["locked-door", "bar", "around"] },
      {
        id: "heat",
        title: "The Office",
        sceneIds: ["kiss", "office-choice", "couch", "mouth-first"],
      },
      { id: "dawn", title: "Dawn Prep", sceneIds: ["morning"] },
    ],
    scenes: [
      {
        id: "locked-door",
        title: "Chairs Up",
        text: "The sign is flipped. The regulars have gone home to their real lives. Marisol Vega kills the neon and the bar becomes a room: wood, citrus, the low hum of the cooler. She is twenty-nine, sleeves shoved up, a streak of lime on her wrist. You are thirty-two, the last stool, the person she has been not-quite-touching for six weeks.\n\n\"I stopped serving you an hour ago,\" she says. She sets down two waters. \"I want you clear-headed if you're going to hear this. I've been waiting for a night with no audience. If you want to go, the side door is unlocked and I will still be glad you walked me through the weird Tuesday rush. If you want to stay, come help me count, and let me say the rest where the street can't help you answer.\"\n\nShe holds your gaze the way she holds a shaker, steady, ready to stop the motion.",
        choices: [
          { id: "bar", label: "Sit at the bar and let her lead", nextSceneId: "bar" },
          { id: "around", label: "Come around the bar to her", nextSceneId: "around" },
        ],
      },
      {
        id: "bar",
        title: "Your Side",
        nextSceneId: "kiss",
        text: "You stay on the customer side. Marisol's mouth quirks. \"Of course you did. You've been polite at me for weeks. It's very sexy and slightly rude.\" She counts a stack of bills, loses the count, and laughs at herself. \"I like you. Not as a tab. Not as a maybe. I go home and think about your hands on the glass and then I think about them on me, and I am too old to keep calling that a crush like it's a hobby.\"\n\nShe leans on the bar, close enough that you can see the tired at the corners of her eyes and the want underneath it. \"Come here and kiss me, or tell me to finish the drawer and walk you out. Both are kind.\"",
      },
      {
        id: "around",
        title: "Her Side",
        nextSceneId: "kiss",
        text: "You come around the bar. Marisol inhales like the night just changed temperature. \"Okay,\" she says softly. \"Hi.\" Up close she smells like orange peel and the soap she uses after the rush. She doesn't kiss you yet. She puts a hand on your chest and feels that you are real and sober and here.\n\n\"Rules, because I own the room,\" she says. \"No one else is coming in. If either of us gets weird, we stop and I call you a car. I don't sleep with people to keep them as customers. If we do this, you can still drink somewhere else and I will survive.\" Her thumb strokes once. \"I have wanted to kiss you since the night you stayed to help me bus after the game let out. Can I?\"",
      },
      {
        id: "kiss",
        title: "The Rail",
        nextSceneId: "office-choice",
        text: "The kiss is all the almosts paying out at once. Marisol makes a hungry sound and then reins it in, hands on your jaw, kissing you again more slowly so she can feel it. You lift her onto the service rail and she laughs into your mouth. \"The health inspector would die,\" she says. \"Office. There's a couch I pretend is for inventory.\"\n\nShe hops down, locks the pass, and looks back to make sure you are following because you want to. In the little office the lamp is gold. The couch is ugly and perfect. She shuts the door and leans on it. \"I want you,\" she says. \"I've thought about your mouth between my legs and about riding you with the cooler humming next door. Tell me where we start. I can take either. I just don't want to guess anymore.\"",
      },
      {
        id: "office-choice",
        title: "Inventory",
        text: "Marisol waits with her palms on the door and her pulse in her throat. The office is warm. A clipboard hangs from a nail. She has never looked less like someone performing hospitality.\n\n\"Your pick,\" she says. \"I'll still respect you at noon.\"",
        choices: [
          { id: "couch", label: "Sit. Let her ride.", nextSceneId: "couch" },
          { id: "mouth", label: "Kneel. Taste her first.", nextSceneId: "mouth-first" },
        ],
      },
      {
        id: "couch",
        title: "The Ugly Couch",
        nextSceneId: "morning",
        text: "You sit. Marisol undresses from the waist down and leaves the soft black shirt on, which somehow makes it filthier. She climbs into your lap, reaches between you, and strokes you while she watches your face. \"Weeks,\" she says. \"Do you know how annoying you've been, being decent?\" She rolls a condom on with steady hands, then sinks down and loses the joke for a second. \"Oh. Okay. That's... stay still. Let me have the first minute.\"\n\nShe rides you deep and close, arms around your shoulders, breath at your ear. The cooler hums. She tells you when to hold her hips and when to touch her clit, and she comes with a bitten-off moan she would never allow on the floor. \"Your turn,\" she says, still pulsing around you. \"I want it. Don't be polite.\" You aren't. She kisses you after like a thank-you and a beginning.",
      },
      {
        id: "mouth-first",
        title: "First",
        nextSceneId: "morning",
        text: "You kneel on the office rug. Marisol swears quietly, steps out of her jeans, and threads a hand into your hair without pushing. \"Yes. Like that. I've thought about this during closeout, which is irresponsible.\" You kiss the inside of her thigh until she laughs and then you stop teasing. She is wet, and she says so, and she tells you when to stay flat and slow. Her thighs shake. She comes standing up, one hand braced on the filing cabinet, the other gentle on your head, and she has to lock her knees after.\n\n\"Couch,\" she says, wrecked and happy. \"I want you inside me while I'm still like this.\" She gets the condom, straddles you, and takes you in with a long, grateful sigh. The second orgasm is quieter. Yours follows with her mouth on your neck and her voice saying, \"I've got you. Let go. I want to feel you.\" The clipboard rattles. Neither of you checks the totals.",
      },
      {
        id: "morning",
        title: "Citrus and Dawn",
        text: "You help her finish the drawer because it feels like part of the seduction now, the ordinary work. Marisol bumps your hip on purpose every time she passes. At the side door the sky is the color of a lime peel.\n\n\"I prep fruit at eight,\" she says. \"You can go home and sleep like a person who got laid, or you can stay and I'll teach you how not to murder a pineapple. Breakfast is coffee and whatever survives.\" She straightens your collar. \"I had a crush. Now I have a night. I'd like another one when the bar isn't the whole story. A walk. Your place. Something with daylight.\"\n\nShe kisses you once more, short and sure, and props the door with a crate so the morning can come in.",
      },
    ],
  },
  {
    id: "velvet-dare",
    title: "Three Dares",
    tag: "TEASE",
    desc: "A costume designer's game: three dares, one veto each, no score",
    summary:
      "June Hale, 27, pins muslin on a dress form and then turns the pins on you, 30. The game is playful, vetoable, and explicit by the third dare. She would rather lose than rush you.",
    accent: "pink",
    character: {
      name: "June Hale",
      age: 27,
      role: "Costume designer with a dare on a scrap of pattern paper",
      summary:
        "Bright, fast, impossible to embarrass for long. She treats sex like a fitting: specific, funny, and adjusted until it fits.",
    },
    chapters: [
      { id: "rules", title: "The Rules", sceneIds: ["apartment", "dare-one"] },
      { id: "two", title: "Dare Two", sceneIds: ["dare-two", "undress-her", "tell-you"] },
      { id: "three", title: "Dare Three", sceneIds: ["dare-three", "no-score"] },
    ],
    scenes: [
      {
        id: "apartment",
        title: "Pattern Paper",
        nextSceneId: "dare-one",
        text: "June Hale's apartment is half living room and half workshop. Dress forms stand around like patient guests. She is twenty-seven, barefoot, a tape measure around her neck. You are thirty, holding takeout she will forget to eat.\n\n\"Game,\" she says, before hello has finished. \"Three dares. Either of us can veto and replace. No photos. No pain. No keeping score, even though I will absolutely try to keep score and you should stop me. The point is I have wanted to touch you since the fitting room at the theater and I am too wired to just say that without a bit.\" She grins. \"I'm also saying it. I want you. The game is the ribbon.\"\n\nShe writes the veto word on pattern paper and sticks it to a form: PINS. \"Say pins and the dare dies. I will applaud. Dare one is verbal. We keep our clothes. You tell me, in detail, what you want to do to me, and I am allowed to squirm and not allowed to pretend I'm cool.\"",
      },
      {
        id: "dare-one",
        title: "Clothes On",
        nextSceneId: "dare-two",
        text: "You tell her. June lasts about four sentences before she hides her face in a bolt of velvet and makes a noise that is mostly laugh. \"You can't say that while I'm standing next to a pair of scissors,\" she says. \"Continue. Worse. Be specific about your mouth.\"\n\nYou are specific. She presses her thighs together and does not touch you, because the dare said clothes and distance, and she is a professional about constraints. Her cheeks are red. Her voice goes smaller and happier. \"Okay. Dare one is a problem. I am so wet and you are still over there like a gentleman with a filthy vocabulary. I veto nothing. I'm taking dare two before I lose the plot.\"\n\nShe fans herself with a sleeve. The dress forms offer no help.",
      },
      {
        id: "dare-two",
        title: "Pick the Dare",
        text: "June holds up two fingers. \"Dare two. I have one and you can have one, and we play yours if you want the power or mine if you want to be dismantled. Both end with someone's hands where they should have been an hour ago.\"\n\nShe is bouncing on her toes, delighted, already a little undone.\n\n\"Mine: you undress me with one hand and your mouth, and the other hand stays in your pocket like a tragedy. Yours: I tell you exactly where to touch me and I am not allowed to rush you. Pins still works. Who's dealing?\"",
        choices: [
          { id: "hers", label: "Her dare: undress her with one hand", nextSceneId: "undress-her" },
          { id: "yours", label: "Your dare: she tells you where", nextSceneId: "tell-you" },
        ],
      },
      {
        id: "undress-her",
        title: "One Hand",
        nextSceneId: "dare-three",
        text: "You keep your left hand in your pocket. June watches it like it personally offended her. \"This is the best stupid rule,\" she whispers. Your right hand and your mouth do the work: the knot of her wrap dress, the strap that falls when you kiss her shoulder, the laugh she tries to swallow when your teeth graze the side of her breast. You ask before you pull anything past her hips. She says, \"Yes, obviously, yes.\"\n\nShe is bare and restless and still not letting you use the other hand. You kiss down her stomach. She grabs the dress form to stay up. \"Pocket hand is banned, I veto it, pins, whatever the word is,\" she gasps, then shakes her head. \"No. I can take it. Your mouth. Please. Just your mouth.\" You give her that until her knees soften and she comes standing, shocked and bright-eyed, petting your hair. \"Dare two is a masterpiece,\" she says. \"Dare three is me getting both of your hands and all of you. If you want. Say so. I'm done pretending this is only a game.\"",
      },
      {
        id: "tell-you",
        title: "Where",
        nextSceneId: "dare-three",
        text: "\"Your dare,\" June says, and sits on the edge of the cutting table after sweeping pins into a tin. \"No rushing me, which means no rushing you. Kiss my neck. Slower. Now the inside of my knee. Now stop being poetic and put your hand in my underwear.\" She is soaked. She tells you the circles she wants and then tells you when the circles are wrong, cheerfully, like notes on a hem. \"Left. Up. There. Stay, stay, stay.\"\n\nShe comes with her forehead on your shoulder and a string of words that would scandalize a costume shop. Then she catches your wrist, kisses your fingers, and looks a little wrecked. \"I played it cool for three dates,\" she says. \"I would like to stop. Dare three: bed, both of us naked, you inside me, and if either of us wants to laugh we laugh. Yes?\"",
      },
      {
        id: "dare-three",
        title: "No Ribbon",
        nextSceneId: "no-score",
        text: "The bed is the one part of the apartment that isn't a workshop. June pulls you onto it and the game gets quiet in the right way. She asks about a condom, gets one, and guides you in with her hand around the base, eyes on yours. \"Oh, that's better than the dare,\" she says. \"Hi. Move. I want to feel you decide things.\"\n\nYou do. She is loud, then soft, then loud again when you hook her knee up. She touches herself without being embarrassed and comes a second time with her heel against your back. \"You now,\" she says. \"I want to see it. Don't hide.\" You come held close, and she kisses your cheek like you won something she refuses to score.\n\nAfter, she retrieves the pattern paper from the form and writes DONE across the dares. \"Exhibit A,\" she says. \"We are ridiculous. I like us.\"",
      },
      {
        id: "no-score",
        title: "Pins Down",
        text: "June eats cold takeout in your shirt and offers you the best dumpling like a medal. The dress forms have seen too much and will recover.\n\n\"For the record, the game was an excuse,\" she says. \"I wanted you the ordinary way. Dinner, a walk, your hand. We can still do dares when we're bored and happy. We don't need them to be allowed.\" She taps your knee with her toes. \"Stay over. I'll put you to work in the morning only in the sense that I make very good coffee and I hog the blanket.\"\n\nShe sticks the veto note back up, just in case. Then she turns the workshop lamp off and leaves the bedside one on, and the night becomes simple: her laugh, your name, a city that can wait.",
      },
    ],
  },
  {
    id: "atelier",
    title: "The Atelier Agreement",
    tag: "D/S",
    desc: "A painter, a yes list, and a safeword before any kneeling",
    summary:
      "Adeline Moreau, 34, does not start a dominant scene until you, 28, hear your own limits read back. Safeword: saffron. Yellow slows. Aftercare is not optional, and neither is the glass of water.",
    accent: "rose",
    character: {
      name: "Adeline Moreau",
      age: 34,
      role: "Painter who dominates by agreement",
      summary:
        "Exact, elegant, and impossible to rush past a check-in. She uses control as a form of attention, then puts the blanket around you herself.",
    },
    chapters: [
      { id: "paper", title: "The List", sceneIds: ["studio", "kneel", "stand"] },
      { id: "scene", title: "The Pose", sceneIds: ["pose", "chaise"] },
      { id: "care", title: "Aftercare", sceneIds: ["aftercare"] },
    ],
    scenes: [
      {
        id: "studio",
        title: "Read It Back",
        text: "The studio smells like linseed and orange peel. Adeline Moreau is thirty-four, sleeves rolled, a charcoal mark on her wrist. You are twenty-eight, and you have been her model and her lover long enough to know she will not skip the paper. It sits on the table between the brushes: a yes list, a no list, both in your handwriting and hers.\n\nYes: kneeling, being told when you may touch, edging, sex on the chaise, praise, her hand in your hair.\nNo: pain beyond a firm grip, photos, names you did not choose, anything that keeps going after saffron.\n\n\"Saffron stops the scene,\" she says, reading it the way she reads a contract she intends to keep. \"Yellow slows it. Green means you want more of what is already happening. I am going to enjoy telling you what to do. I am not going to enjoy guessing. You are an adult. I am an adult. If any line on this page is wrong tonight, we fix the page before we touch.\"\n\nShe looks up. The north light is clean on her face. \"If the page is right, we begin. You may kneel, or you may stay standing until I ask. Both please me. Choose.\"",
        choices: [
          { id: "kneel", label: "Kneel, as agreed", nextSceneId: "kneel" },
          { id: "stand", label: "Stay standing until she asks", nextSceneId: "stand" },
        ],
      },
      {
        id: "kneel",
        title: "Down",
        nextSceneId: "pose",
        text: "You kneel on the cushion she put down earlier, because she thinks of knees. Adeline's expression changes, focus sharpening into something warm. \"Good. Hands on your thighs. Look at me.\" She walks a slow circle, not inspecting a thing she owns, looking at a person who has offered her a pose. She tips your chin up. \"Color?\"\n\n\"Green.\"\n\n\"Then you will stay there while I tell you what I am going to do to you, and you will not touch yourself yet.\" Her thumb strokes your lip. \"I am going to undress you. I am going to stroke you until you shake and then I am going to stop. Twice. After that I will take you to the chaise and fuck you, and you will come when I say, not before. If that plan stops sounding good, saffron. Say it once now so I know you remember the shape of it.\"\n\nYou say it. She smiles, small and proud. \"Beautiful. Arms up.\"",
      },
      {
        id: "stand",
        title: "Until I Ask",
        nextSceneId: "pose",
        text: "You stay on your feet. Adeline's smile is immediate. \"Even better. You made me ask.\" She steps close enough that her blouse brushes your chest. \"Color?\"\n\n\"Green.\"\n\n\"Kneel for me.\" You do, and she exhales like the moment landed. \"Good. That was a choice both times. Remember it.\" She sets her hand in your hair, a hold, not a yank. \"You will not touch yourself until I give you your cock back as a privilege. I am going to edge you twice. Then the chaise. You come on my count, or you tell me you need to come sooner and I will decide with you, not against you. Saffron ends it. Say the word so I can hear you hold it calmly.\"\n\nYou say it. She kisses your forehead, which is not the scene and also is. \"Now the scene,\" she says. \"Arms up.\"",
      },
      {
        id: "pose",
        title: "Two Edges",
        nextSceneId: "chaise",
        text: "Adeline undresses you without clutter, folding your clothes because order is part of her kindness. She oils her palm and wraps it around you, slow, studying the hitch in your breath the way she studies a line. \"Look at me. That's it. You are so ready and we have barely started.\" She strokes you to the edge with infuriating accuracy, then stops and holds the base, kissing you through the frustration. \"Color?\"\n\n\"Green.\"\n\n\"Again.\" The second time is worse and better. Your thighs shake. She talks you down, proud, one hand spread over your heart. \"You could have grabbed me. You didn't. You used your mouth and asked. I adore that.\" She helps you stand when your knees need it, leads you to the chaise, and sits back like a woman settling into a throne she built out of a sofa and an agreement. \"Come here. Straddle me. I want you inside, slowly, and I want your eyes open.\"",
      },
      {
        id: "chaise",
        title: "On Her Count",
        nextSceneId: "aftercare",
        text: "You sink into her. Adeline's composure slips into a moan she doesn't apologize for. Her hands guide your hips and then stop guiding so you can feel the choice. \"Slow. Good. Now tell me green again, because I am about to be greedy.\"\n\n\"Green.\"\n\nShe sets a rhythm and a count. At five she tightens around you and smiles when your rhythm breaks. At eight she says, \"Not yet,\" and stills you with a hand on your stomach until the peak recedes. She kisses you, deep, praising, a little messy. \"You take direction so honestly. I love fucking you. Ten is yours. Move.\"\n\nYou move. She comes first, unexpectedly, laughing once against your mouth, and does not let the laugh turn into a stop. \"That's still your ten. Give it to me.\" You come inside her with her arms locked around your shoulders and her voice in your ear, steady and wrecked, telling you yes. She holds you there until the shaking is just breathing.",
      },
      {
        id: "aftercare",
        title: "Water, Blanket, Truth",
        text: "Adeline does not stay in the scene for the aftermath. She reaches for the blanket she staged on the chair, wraps it around both of you, and makes you drink water before she will accept a compliment. \"Anything sharp?\" she asks. \"Anything you want more of? The grip in your hair. The count. The stop.\"\n\nYou tell her. She nods at each one like notes for the next canvas and the next night, which are related and not the same. \"You were wonderful,\" she says, and the praise is plain now, no velvet on it. \"I like dominating you because you stay present. If you ever kneel because you think you owe me, I will put you back on your feet.\"\n\nShe cleans the charcoal off her own wrist, then off yours, and leaves the yes list on the table. The studio goes blue with evening. She pulls your head to her shoulder and stays until you are hungry, then she orders dinner like a woman who intends to keep you well.",
      },
    ],
  },
  {
    id: "moonlit-court",
    title: "The Moonlit Court",
    tag: "FANTASY",
    desc: "A moon rite that holds only while both adults keep saying yes",
    summary:
      "Seraphine Vale is a grown woman of the court, forty in the face she wears and older in the years she will actually admit. You are 30, an envoy. The compact refuses anyone younger. The magic amplifies touch and ends the moment either of you goes quiet.",
    accent: "indigo",
    character: {
      name: "Seraphine Vale",
      age: 40,
      role: "Court enchantress who keeps her bargains",
      summary:
        "Silver at the temples, voice like a low bell, incapable of pretending a vow is a chain. She wants a lover, not a subject.",
    },
    chapters: [
      { id: "garden", title: "The Compact", sceneIds: ["garden", "what-it-is"] },
      { id: "rite", title: "The Rite", sceneIds: ["hand", "rite", "explicit"] },
      { id: "dawn", title: "Dawn", sceneIds: ["dawn"] },
    ],
    scenes: [
      {
        id: "garden",
        title: "Only Adults",
        text: "The court garden is silver and black and full of flowers that open only when the moon is arrogant. Seraphine Vale waits by the pool. She looks forty, silver at the temples, unmistakably a woman grown, and she has told you the longer truth without romance: she has been an adult for longer than your city's maps. You are thirty. The compact on the stone table will not light for anyone younger, and she asks you to say your age out loud before she will touch the page.\n\n\"Thirty,\" you say.\n\nThe ink brightens. She exhales. \"Good. Then we may speak as equals. The rite is not a spell that takes you. It is a vow that amplifies what you already want, and only while both of us keep consenting. If you go quiet, it ends. If I go quiet, it ends. If you say release, it ends and there is no penalty, no mark, no story told against you at court.\"\n\nShe does not reach for you. The moon lays a clean edge along her cheek. \"You may offer me your hand, or you may ask me to name every part of the rite before you decide. I like both. I like you clear-eyed.\"",
        choices: [
          { id: "hand", label: "Offer her your hand", nextSceneId: "hand" },
          { id: "ask", label: "Ask what the rite includes", nextSceneId: "what-it-is" },
        ],
      },
      {
        id: "what-it-is",
        title: "Every Part",
        nextSceneId: "rite",
        text: "\"Name it,\" you say.\n\nSeraphine looks pleased, not impatient. \"First, a kiss, long enough that we learn each other. Second, shared breath, my forehead to yours, while the vow listens. Third, if you still want it, sex. I want you above me and I want to be above you. I am not shy about that. The magic will make touch feel brighter. It will not make you obedient. You can stop between one heartbeat and the next. There is no binding that outlives the dawn unless we both write our names a second time.\"\n\nShe turns her palm up on the stone. \"That is the whole of it. No one is owed. Will you begin with me?\"",
      },
      {
        id: "hand",
        title: "The Hand",
        nextSceneId: "rite",
        text: "You offer your hand. Seraphine takes it as if it is a rare book, then laughs at her own gravity and squeezes like a person. \"Thank you. I have wanted this since you argued with my steward and apologized to the steward after. Kindness looks good on an envoy.\"\n\nShe tells you the shape anyway, because wanting your hand is not the same as skipping the map. Kiss. Breath. Sex if the want survives the first two. Magic that brightens and never binds. Release as the word that unmakes the night. \"If any of that is too much, take your hand back,\" she says. \"I will still walk you to the gate and mean the courtesy.\"\n\nYou leave your hand in hers. The pool holds the moon still.",
      },
      {
        id: "rite",
        title: "While We Both Speak",
        nextSceneId: "explicit",
        text: "The kiss is human first. Seraphine sighs into it, one hand at the back of your neck, the other still holding yours like a second vow. The brightness arrives slowly: every place you touch her answers, warm, specific, easy to refuse and impossible to confuse with a command. She rests her forehead on yours.\n\n\"Say yes if you want the rest,\" she murmurs. \"Say it every time I ask. Silence is a closed door, not a mystery I get to solve.\"\n\n\"Yes.\"\n\nShe smiles against your mouth. \"Then come to the grass. I want the sky involved and the court very much not.\" She spreads her cloak, which is just a cloak, and draws you down. Between kisses she checks: here, this, more. You answer. The rite hums like a struck glass whenever the answer is real, and goes quiet and ordinary the moment either of you pauses to think. She prefers the quiet. \"See?\" she says. \"It serves us. It does not keep us.\"",
      },
      {
        id: "explicit",
        title: "Brighter",
        nextSceneId: "dawn",
        text: "Seraphine undresses you and then herself, unhurried, silver hair loose, body a woman's body, strong and soft in the moonlight. She guides your hand between her thighs and is gloriously wet, and she says so without poetry. \"I want your mouth, and then I want you inside me. Yes?\"\n\n\"Yes.\"\n\nYou taste her until she is shaking and saying your name like it is the only spell she trusts. Then she pulls you up and takes you in, a slow joining that the rite brightens until both of you laugh from the intensity. \"Still yes?\" she asks, voice breaking.\n\n\"Yes.\"\n\nShe rolls you, rides you, and the magic flickers with her breath. It does not hold her on you. She holds herself there because she wants to. When she comes she keeps her eyes open. When you are close she says, \"Only if you want the end with me. You can spill on the cloak and I will be just as glad.\" You choose her. The brightness crests and gentles. She stays draped over you, stroking your hair, until the hum is gone and there is only night air and her heartbeat.",
      },
      {
        id: "dawn",
        title: "No Mark Unless You Write It",
        text: "Dawn finds the garden ordinary. The flowers close. Seraphine wraps you in the cloak and sits beside you on the stone, passing a flask of water like any lover who remembers thirst.\n\n\"No mark,\" she says, showing you your wrist, then hers. \"The rite kept its word. If you want to see me again, it will not be because a vow is hungry. It will be because you walk back through the gate and ask for me by name. I will probably say yes. I am fond of you in a way that could become inconvenient and lovely.\"\n\nShe kisses your temple. A bird starts up in the hedge, rude and alive. \"Go be an envoy. Eat something sweet. If anyone at court asks what you did with the moon, tell them you kept your own counsel. That is the most adult magic I know.\"",
      },
    ],
  },
  {
    id: "orbit-nine",
    title: "Orbit Nine",
    tag: "SCI-FI",
    desc: "Off duty in the observation bubble, with the alarm set for an hour",
    summary:
      "Captain Irie Solano, 36, waits until the watch is over to tell you, 32, the systems engineer, that she wants you. Low gravity, a practical harness, and an hour neither of you will spend on the ship.",
    accent: "cyan",
    character: {
      name: "Irie Solano",
      age: 36,
      role: "Captain, off duty on purpose",
      summary:
        "Calm in emergencies and slightly hopeless at pretending she isn't fond of you. She sets timers so pleasure doesn't have to fight the job.",
    },
    chapters: [
      { id: "watch", title: "Off Watch", sceneIds: ["bubble", "say-it", "kiss-first"] },
      { id: "hour", title: "The Hour", sceneIds: ["harness", "drift"] },
      { id: "alarm", title: "Course Correction", sceneIds: ["alarm"] },
    ],
    scenes: [
      {
        id: "bubble",
        title: "Earthrise",
        text: "Orbit Nine's observation bubble is the only room that forgets to look like a machine. Earth hangs in it, blue and unreasonable. Captain Irie Solano has taken the rank pins off her collar. She is thirty-six. You are thirty-two, and the watch you just finished together was all business, radiation counts and a polite meter of distance.\n\n\"I'm off duty,\" she says, which on this ship is a love letter. \"I logged it. Commander Voss has the deck. No one is going to ping me unless something is actually on fire. I've been waiting for a window that wasn't stolen from the crew.\" She hooks a finger in a handhold so she doesn't drift, and looks at you like the view can wait. \"I want you. Not a crush I manage. You. If you don't want that, we can watch the planet and I will still be glad I said it out loud. If you do, we have about an hour before I need to be a captain again.\"\n\nThe bubble hums. Your sleeve floats. She waits without using the rank she just set down.",
        choices: [
          { id: "say", label: "Tell her you want her", nextSceneId: "say-it" },
          { id: "kiss", label: "Kiss her first", nextSceneId: "kiss-first" },
        ],
      },
      {
        id: "say-it",
        title: "On the Record",
        nextSceneId: "harness",
        text: "\"I want you,\" you say. \"I've wanted you since the repair on deck three, when you passed me tools and trusted me with the seal.\"\n\nIrie's smile is small and bright enough to navigate by. \"Good. Then we do this like adults who live in a can.\" She pulls a soft harness from a locker, not tactical, something the medical bay pretends is for physical therapy and everyone knows is also for this. \"We clip in so nobody knocks a tooth on the glass. We use a condom because the recyclers are heroes and I refuse to make them cry. And we stop if either of us says stop, same as an EVA. Clear?\"\n\n\"Clear.\"\n\n\"Then come here and kiss me before I start briefing the kiss.\"",
      },
      {
        id: "kiss-first",
        title: "Before the Briefing",
        nextSceneId: "harness",
        text: "You catch a handhold and kiss her. Irie makes a surprised, hungry sound and kisses you back with both hands on your shoulders, careful even while she is done being careful about the wanting. When you part, she is grinning.\n\n\"That was an excellent executive summary,\" she says. \"Addendum. Harness, so we don't bounce off the glass. Condom, because I respect the life-support team. Stop means stop, same word we'd use outside. I'm thirty-six and I still get nervous. It's disgusting. Come clip in with me.\"\n\nShe bumps her forehead to yours, weightless and fond, and the planet turns under you like it approves of the schedule.",
      },
      {
        id: "harness",
        title: "Clipped In",
        nextSceneId: "drift",
        text: "The harness is ridiculous until it isn't. Irie shows you the clips, checks your fit the way she checks a seal, and then the competence melts when you kiss her neck. Clothes are a puzzle. You solve it together, laughing when a sleeve won't pass an elbow, groaning when skin finally meets skin and there is nothing left to negotiate but desire.\n\nShe wraps a leg around your hip and the line keeps you from drifting apart. \"Touch me,\" she says. \"I've thought about your hands every time you talked about pressure gauges, which is not a sentence I will be putting in a log.\" She is wet, eager, and very clear. You stroke her until she is panting against the handhold, and she strokes you back, thumb slick, eyes bright. \"Inside. Now. Please. That's not an order. That's me asking.\"",
      },
      {
        id: "drift",
        title: "Low Gravity",
        nextSceneId: "alarm",
        text: "You sink into her and both of you swear, softly, at how deep it feels when nothing is weighing you down. Irie locks her ankles behind you and sets the pace with the line, a slow pull and release that would be impossible on a planet and is perfect here. Earthlight moves across her stomach. She watches your face more than the view.\n\n\"Stay with me,\" she says. \"Right there. I can come like this if you keep your hand where I put it.\" You do. She comes with a broken laugh, clenching around you, the harness creaking in a way she will deny later. She doesn't stop. \"Your turn. I want it. I want to feel you let go while I've got you.\" You come holding the same grip she trusts in an emergency, and she kisses you through it, murmuring good, good, I've got you, like the ship taught her how to be gentle and she saved it for this.\n\nYou float, clipped, breathing the same recycled air and making it better.",
      },
      {
        id: "alarm",
        title: "One Hour",
        text: "Irie set the alarm before she set the mood, because she is who she is. It chimes, kind and merciless, from her folded jacket. She silences it and does not leap for the pins.\n\n\"Ten minutes of after,\" she says. \"I budgeted.\" She cleans you both up with a cloth from the locker, helps you into a shirt, and traces your name on the glass where it will fog and vanish. \"I don't want a secret that makes the crew unsafe. I want a private life that stays private and a shift that stays sharp. We can have both if we keep saying the quiet parts out loud.\"\n\nShe kisses you once, captain-soft. \"Same time next orbit, if you want it. Bring the sealant specs if you must. I'll pretend to be annoyed and then I'll take your clothes off again.\" The bubble turns. Earth keeps being blue. Irie pins her collar back on and squeezes your hand before she goes to be in charge of anything else.",
      },
    ],
  },
];
