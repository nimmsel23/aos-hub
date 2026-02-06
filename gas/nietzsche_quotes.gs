// ================================================================
// NIETZSCHE QUOTES (local pool, no external API)
// ================================================================
const NIETZSCHE_QUOTES = [
  'He who has a why to live can bear almost any how.',
  'That which does not kill us makes us stronger.',
  'Without music, life would be a mistake.',
  'There are no facts, only interpretations.',
  'We have art in order not to die of the truth.',
  'He who fights with monsters should look to it that he himself does not become a monster.',
  'When you gaze long into an abyss, the abyss also gazes into you.',
  'Become who you are.',
  'One must still have chaos in oneself to be able to give birth to a dancing star.',
  'In individuals, insanity is rare; in groups, parties, nations and epochs, it is the rule.',
  'The higher we soar, the smaller we appear to those who cannot fly.',
  'No price is too high to pay for the privilege of owning yourself.',
  'All truly great thoughts are conceived by walking.',
  'A thought comes when it wants, not when I want.',
  'He who cannot obey himself will be commanded.',
  'Convictions are more dangerous enemies of truth than lies.',
  'There is always some madness in love. But there is also always some reason in madness.',
  'We should consider every day lost on which we have not danced at least once.',
  'What is great in man is that he is a bridge and not a goal.',
  'The individual has always had to struggle to keep from being overwhelmed by the tribe.',
  'To live is to suffer, to survive is to find some meaning in the suffering.',
  'I am not a man, I am dynamite.',
  'The snake which cannot cast its skin has to die.',
  'It is not a lack of love, but a lack of friendship that makes unhappy marriages.',
  'You must be ready to burn yourself in your own flame; how could you rise anew if you have not first become ashes?',
  'There are no moral phenomena at all, only a moral interpretation of phenomena.',
  'Whoever despises himself still respects himself as one who despises.',
  'The surest way to corrupt a youth is to instruct him to hold in higher esteem those who think alike than those who think differently.',
  'One repays a teacher badly if one always remains nothing but a pupil.',
  'The man of knowledge must be able not only to love his enemies but also to hate his friends.',
  'All things are subject to interpretation; whichever interpretation prevails at a given time is a function of power.',
  'Every deep thinker is more afraid of being understood than of being misunderstood.',
  'We love life, not because we are used to living but because we are used to loving.',
  'There are no eternal facts, just as there are no absolute truths.',
  'In heaven, all the interesting people are missing.',
  'A little poison now and then: that makes for pleasant dreams.',
  'The surest way to lose your self is to lose it in the service of others.',
  'One must learn to love oneself with a wholesome and healthy love.',
  'It is my ambition to say in ten sentences what others say in a whole book.'
];

function nietzsche_getRandomQuote_() {
  if (!NIETZSCHE_QUOTES || !NIETZSCHE_QUOTES.length) return '';
  const idx = Math.floor(Math.random() * NIETZSCHE_QUOTES.length);
  return NIETZSCHE_QUOTES[idx];
}
