import type { DifficultyLevel, TypingLesson } from '../types/typing';

export const TYPING_LESSONS: TypingLesson[] = [
  // BEGINNER
  {
    id: 'beg-home-1',
    title: 'Home Row Foundations',
    subtitle: 'Anchor your fingers on A S D F and J K L ;',
    level: 'beginner',
    category: 'home-row',
    targetWpm: 20,
    focusKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'],
    text: 'fff jjj ddd kkk sss lll aaa ;;; fjfj dkdk slsl a;a; fjdksla; asdf jkl; fdsa ;lkj ask lad fall sad dad all fall ask lad',
  },
  {
    id: 'beg-home-2',
    title: 'Home Row Reach (G & H)',
    subtitle: 'Stretch index fingers cleanly to G and H and return home',
    level: 'beginner',
    category: 'home-row',
    targetWpm: 22,
    focusKeys: ['g', 'h', 'a', 's', 'd', 'f', 'j', 'k', 'l'],
    text: 'fgf jhj fgf jhj glad half dash flash hall shall glad fall lash gash had has glass flags alas half a glass had a glad dash',
  },
  {
    id: 'beg-upper-1',
    title: 'Upper Row Practice',
    subtitle: 'Reach upward to Q W E R T and Y U I O P without lifting palms',
    level: 'beginner',
    category: 'upper-row',
    targetWpm: 24,
    focusKeys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    text: 'frf juj ded kik sws lol aqa ;p; ftf jyj true tree quiet power write route your type poet quite trip wire pier pure quote',
  },
  {
    id: 'beg-lower-1',
    title: 'Lower Row Mastery',
    subtitle: 'Reach down smoothly to Z X C V B N M , . /',
    level: 'beginner',
    category: 'lower-row',
    targetWpm: 24,
    focusKeys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
    text: 'fvf jmj fbf jnj dcd k,k sxs l.l aza ;/; calm zoom next vine bench music box cave move mint zero. come back, move on.',
  },
  {
    id: 'beg-words-1',
    title: 'Everyday Beginner Words',
    subtitle: 'Build rhythm across all three letter rows with common words',
    level: 'beginner',
    category: 'words',
    targetWpm: 28,
    text: 'hand mind book desk lamp rain wind star time road tree home work play read note page word step path fast calm clear bright',
  },
  {
    id: 'beg-sent-1',
    title: 'Simple Beginner Sentences',
    subtitle: 'Short, steady sentences to connect words with smooth spacing',
    level: 'beginner',
    category: 'sentences',
    targetWpm: 30,
    text: 'keep your hands calm on the home keys. look at the screen and not at your fingers. steady accuracy builds lasting speed every single day.',
  },

  // INTERMEDIATE
  {
    id: 'int-words-1',
    title: 'Capitalization & Shift Rhythm',
    subtitle: 'Use the opposite-hand Shift key for crisp uppercase letters',
    level: 'intermediate',
    category: 'words',
    targetWpm: 38,
    text: 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday London Tokyo Delhi Paris Cairo Sydney March April August October December',
  },
  {
    id: 'int-sent-1',
    title: 'Natural Sentences & Punctuation',
    subtitle: 'Practice commas, periods, apostrophes, and steady cadence',
    level: 'intermediate',
    category: 'sentences',
    targetWpm: 42,
    text: "Good typists don't rush; they find a relaxed, even rhythm. When your fingers return automatically to the home row, errors drop quickly and confidence grows.",
  },
  {
    id: 'int-sent-2',
    title: 'Numbers & Everyday Symbols',
    subtitle: 'Top number row precision mixed with realistic sentences',
    level: 'intermediate',
    category: 'sentences',
    targetWpm: 36,
    text: 'Flight 408 departs at 07:35 from Gate 19. Please confirm 25 copies, 14 notebooks, and 60% completion before 3:00 PM on November 18, 2026.',
  },
  {
    id: 'int-para-1',
    title: 'Focused Study Paragraph',
    subtitle: 'Sustained paragraph flow for endurance and low error rate',
    level: 'intermediate',
    category: 'paragraphs',
    targetWpm: 45,
    text: 'Reading attentively and typing from clean notes strengthens both memory and concentration. Rather than racing through unfamiliar words, pause briefly to register each phrase, keep your wrists neutral, and let muscle memory guide every keystroke.',
  },

  // ADVANCED
  {
    id: 'adv-words-1',
    title: 'High-Velocity Word Combinations',
    subtitle: 'Challenging letter transitions and uncommon consonant clusters',
    level: 'advanced',
    category: 'words',
    targetWpm: 58,
    text: 'rhythm sphinx zephyr labyrinth psychology equilibrium phenomenon kaleidoscope nuance exquisite bureaucracy juxtaposition trajectory quintessential',
  },
  {
    id: 'adv-para-1',
    title: 'Technical & Engineering Prose',
    subtitle: 'Dense multi-clause paragraphs with symbols and rapid transitions',
    level: 'advanced',
    category: 'paragraphs',
    targetWpm: 62,
    text: 'Reliable software systems balance throughput, latency, and fault tolerance under unpredictable load. When engineers instrument critical pathways—measuring p95 response times, cache hit ratios, and queue depths—bottlenecks reveal themselves without guesswork.',
  },
  {
    id: 'adv-para-2',
    title: 'Classic Literary Passage',
    subtitle: 'Nuanced punctuation, varied sentence length, and sustained speed',
    level: 'advanced',
    category: 'paragraphs',
    targetWpm: 68,
    text: 'Across the quiet harbor, morning mist lifted slowly from the stone pier, revealing wooden boats rocking gently against weathered pilings. Every craft had its own story: scratched paint, coiled hemp rope, and brass fittings dulled by years of salt spray.',
  },
];

export interface SpeedTestPoolItem {
  id: string;
  title: string;
  level: DifficultyLevel;
  format: 'words' | 'sentences' | 'paragraphs';
  text: string;
}

export const SPEED_TEST_PASSAGES: SpeedTestPoolItem[] = [
  {
    id: 'st-beg-words',
    title: 'Core Vocabulary Sprint',
    level: 'beginner',
    format: 'words',
    text: 'time work hand life day part place case week company system program question number night point home water room mother area money story fact month lot right study book eye job word business issue side kind head house service friend father power hour game line end member law car city community name president team minute idea kid body information back parent face others level office door health person art war history party result change morning reason research girl guy moment air teacher force education foot boy age policy everything process music market sense service nation plan college interest death experience effect use class control care field development role effort rate heart drug show leader light voice wife whole police mind finally pull return free military price report less according decision explain son hope even develop view relationship carry town road arm true federal break better difference thank receive value international building action full model join season society because tax director position player agree especially record pick wear paper special space ground form support event official whose matter everyone center couple site end project hit base activity star table need court produce eat teach oil half situation easy cost industry figure street image itself phone either data cover quite picture clear practice piece land recent describe product doctor wall patient worker news test movie certain north love personal open support simply third technology catch step baby computer type attention draw film tree source red nearly organization choose cause hair look century evidence window difficult listen soon culture billion chance brother energy period course summer less realize hundred available plant likely opportunity term short letter condition choice place single rule daughter administration south husband congress floor campaign material population well call economy medical hospital church close thousand risk current fire future wrong involve defense anyone increase security bank myself certainly west sport board seek per subject officer private rest behavior deal performance fight throw top quickly past goal second bed order author fill represent focus foreign drop blood agency nature color recently store reduce sound note fine before near movement page enter share than common poor natural race concern series significant similar hot language each usually response dead rise animal factor decade article shoot east save seven artist away scene stock career despite central eight thus treatment beyond happy exactly protect approach lie size dog fund serious occur media ready sign thought list individual simple quality pressure accept answer hard resource identify left meeting determine prepare disease whatever success argue cup particularly amount ability staff recognize indicate character growth loss degree wonder attack herself region television box training pretty trade deal election everybody physical lay general feeling standard bill message fail outside arrive analysis benefit name sex forward lawyer present section environmental glass answer skill sister',
  },
  {
    id: 'st-beg-sent',
    title: 'Everyday Clarity Sentences',
    level: 'beginner',
    format: 'sentences',
    text: 'Typing well is a skill that rewards patience more than haste. Keep both hands relaxed on the home row keys and let each finger return after every press. Good posture keeps your shoulders loose and helps you type longer without fatigue. Look ahead at the next word on the screen while your fingers finish the current one. Small daily sessions of ten minutes beat long sessions once a week. Accuracy always comes first because fixing mistakes costs more time than typing smoothly. Over time, common letter pairs begin to feel effortless and natural. Calm breathing also helps steady your pace when the countdown clock is running. Clear focus turns routine drills into real progress you can measure every day.',
  },
  {
    id: 'st-int-para',
    title: 'The Craft of Deliberate Practice',
    level: 'intermediate',
    format: 'paragraphs',
    text: 'Deliberate practice is very different from simply repeating what you already know. When you sit down to improve a physical or mental skill, real growth happens at the edge of your current comfort zone. Instead of rushing through familiar passages at maximum speed, notice which key combinations make you hesitate or mistype. Slowing down for just two minutes on a tricky sequence allows your nervous system to encode the cleaner motion. Before long, what once felt awkward becomes completely automatic. Great musicians, athletes, and writers all rely on this same principle: isolate the friction point, refine the movement calmly, and then reintegrate it into full-speed flow. Within a few weeks of honest measurement, both your confidence and your net words per minute climb steadily.',
  },
  {
    id: 'st-int-sent',
    title: 'Modern Work & Learning',
    level: 'intermediate',
    format: 'sentences',
    text: 'Digital notebooks and paper journals each serve a distinct role in thoughtful learning. Writing ideas by hand slows your thoughts down enough to connect concepts deeply, while typing lets you organize, search, and share those notes effortlessly. When you review handwritten pages and transcribe them accurately, you reinforce comprehension twice. Clear communication depends not only on strong vocabulary, but also on translating ideas swiftly from mind to page. Maintaining a quiet workspace with deliberate screen breaks prevents eye strain and keeps your attention sharp throughout the day.',
  },
  {
    id: 'st-adv-para',
    title: 'Architecture of Precision Systems',
    level: 'advanced',
    format: 'paragraphs',
    text: 'Precision instruments rarely draw attention to themselves; their excellence lies in predictable, low-friction behavior under demanding conditions. Consider a finely tuned mechanical keyboard or an aircraft altimeter: every spring tension, detent, and visual indicator exists to convey immediate feedback without cognitive clutter. In software design, the same discipline applies. Interfaces that respect human attention eliminate ornamental noise, surface critical metrics with tabular clarity, and respond within milliseconds of input. Whether transcribing dense archival manuscripts, mastering unfamiliar multilingual vocabulary, or composing technical specifications under tight deadlines, fluency at the keyboard bridges raw intention and finished craft.',
  },
  {
    id: 'st-adv-words',
    title: 'Precision Vocabulary Challenge',
    level: 'advanced',
    format: 'words',
    text: 'ephemeral ubiquitous resilient eloquent pragmatic meticulous lucid paradox catalyst synthesis paradigm cadence kinetic equilibrium threshold heuristic vernacular empathy clarity velocity tenacity nuance catalyst spectrum resonance synthesis synergy discipline alchemy momentum trajectory coherence fortitude articulate dexterity intuition discernment brevity acuity precision',
  },
];
